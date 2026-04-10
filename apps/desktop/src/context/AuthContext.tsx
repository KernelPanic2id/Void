import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AuthState } from '../models/auth/authState.model';
import Identity from '../models/auth/identity.model';
import { formatUserTag } from '../lib/format-user-tag';
import { mapIdentity } from '../lib/map-identity';
import { registerAccount, loginAccount, getMe, updateMe } from '../api/auth.api';
import { getToken, setToken, clearToken } from '../api/http-client';

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Authentication provider combining local Ed25519 identity (Tauri) with
 * server-side auth (JWT + protobuf store on signaling server).
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [identity, setIdentity] = useState<Identity | null>(null);
    const [serverUserId, setServerUserId] = useState<string | null>(null);
    const [token, setTokenState] = useState<string | null>(getToken());

    // Restore session on mount
    useEffect(() => {
        const _lastKey = localStorage.getItem('last_public_key');
        if (_lastKey) {
            console.debug('[Auth] restoring identity for pk:', _lastKey.slice(0, 12) + '…');
            invoke('find_identity_by_pubkey', { publicKey: _lastKey })
                .then((raw) => {
                    const _id = mapIdentity(raw);
                    console.debug('[Auth] identity restored:', _id.pseudo, 'pk:', _id.publicKey?.slice(0, 12) + '…');
                    setIdentity(_id);
                })
                .catch((e) => {
                    console.warn('[Auth] identity restore failed:', e);
                    localStorage.removeItem('last_public_key');
                });
        } else {
            console.debug('[Auth] no last_public_key in localStorage');
        }
        // Restore server session from stored JWT
        if (getToken()) {
            console.debug('[Auth] validating stored JWT via /me');
            getMe()
                .then((profile) => {
                    console.debug('[Auth] /me success — serverUserId:', profile.id, 'pk:', (profile as any).publicKey?.slice(0, 12) ?? 'none');
                    setServerUserId(profile.id);
                })
                .catch((e) => {
                    console.warn('[Auth] /me failed — clearing token:', e);
                    clearToken();
                    setTokenState(null);
                });
        } else {
            console.debug('[Auth] no stored JWT');
        }
    }, []);

    /**
     * Creates or recovers a local Ed25519 identity then authenticates on the server.
     * Tries recovering an existing identity first to preserve the original keypair
     * (important: server-side membership is keyed by public_key).
     */
    const login = useCallback(async (pseudo: string, password: string) => {
        let _identity: Identity;
        let _isNew = false;

        // Prefer recovering an existing local identity to keep the original keypair
        try {
            const _raw = await invoke('recover_identity', { pseudo, password });
            _identity = mapIdentity(_raw);
            console.debug('[Auth] recover_identity OK — pk:', _identity.publicKey?.slice(0, 12) + '…');
        } catch (recoverErr) {
            console.debug('[Auth] recover_identity failed:', recoverErr, '— creating new identity');
            // No existing identity — generate a fresh Ed25519 keypair
            const _raw = await invoke('create_identity', { pseudo, password });
            _identity = mapIdentity(_raw);
            _isNew = true;
            console.debug('[Auth] create_identity OK — NEW pk:', _identity.publicKey?.slice(0, 12) + '…');
        }

        const _pk = _identity.publicKey ?? (_identity as any).public_key;
        localStorage.setItem('last_public_key', _pk);
        setIdentity(_identity);

        try {
            if (_isNew) {
                console.debug('[Auth] registering new account on server…');
                const res = await registerAccount(pseudo, password, pseudo, _pk);
                setToken(res.token);
                setTokenState(res.token);
                setServerUserId(res.user.id);
                console.debug('[Auth] register OK — serverUserId:', res.user.id);
            } else {
                console.debug('[Auth] logging in to server…');
                const res = await loginAccount(pseudo, password, _pk);
                setToken(res.token);
                setTokenState(res.token);
                setServerUserId(res.user.id);
                console.debug('[Auth] login OK — serverUserId:', res.user.id);
            }
        } catch (serverErr) {
            console.warn('[Auth] server auth failed:', serverErr, '_isNew:', _isNew);
            if (_isNew) {
                // New identity but username taken on server → try login
                try {
                    console.debug('[Auth] fallback: trying loginAccount for new identity…');
                    const res = await loginAccount(pseudo, password, _pk);
                    setToken(res.token);
                    setTokenState(res.token);
                    setServerUserId(res.user.id);
                    console.debug('[Auth] fallback login OK — serverUserId:', res.user.id);
                } catch (fallbackErr) {
                    console.warn('[Auth] fallback login also failed:', fallbackErr);
                }
            } else {
                // Existing identity but server login failed → try register
                try {
                    console.debug('[Auth] fallback: trying registerAccount for existing identity…');
                    const res = await registerAccount(pseudo, password, pseudo, _pk);
                    setToken(res.token);
                    setTokenState(res.token);
                    setServerUserId(res.user.id);
                    console.debug('[Auth] fallback register OK — serverUserId:', res.user.id);
                } catch (fallbackErr) {
                    console.warn('[Auth] fallback register also failed:', fallbackErr);
                }
            }
        }
    }, []);

    /** Recovers local identity + logs in on server (syncing public key). */
    const recover = useCallback(async (pseudo: string, password: string) => {
        const _raw = await invoke('recover_identity', { pseudo, password });
        const _identity = mapIdentity(_raw);
        const _pk = _identity.publicKey ?? ((_raw as any).public_key);
        console.debug('[Auth] recover OK — pk:', _pk?.slice(0, 12) + '…');

        localStorage.setItem('last_public_key', _pk);
        setIdentity(_identity);

        // Try login first, fall back to register if account doesn't exist
        try {
            console.debug('[Auth] recover → loginAccount…');
            const res = await loginAccount(pseudo, password, _pk);
            setToken(res.token);
            setTokenState(res.token);
            setServerUserId(res.user.id);
            console.debug('[Auth] recover login OK — serverUserId:', res.user.id);
        } catch (loginErr) {
            console.warn('[Auth] recover login failed:', loginErr, '— trying register');
            try {
                const res = await registerAccount(pseudo, password, pseudo, _pk);
                setToken(res.token);
                setTokenState(res.token);
                setServerUserId(res.user.id);
                console.debug('[Auth] recover register OK — serverUserId:', res.user.id);
            } catch (registerErr) {
                console.warn('[Auth] recover register also failed:', registerErr);
            }
        }
    }, []);

    /** Updates the pseudo for the current identity (local + server). */
    const updateUsername = useCallback(async (newName: string) => {
        if (!identity) return;
        const _pk = identity.publicKey ?? (identity as any).public_key;
        const _raw = await invoke('update_identity_pseudo', {
            publicKey: _pk,
            newPseudo: newName,
        });
        setIdentity(mapIdentity(_raw));

        if (getToken()) {
            try { await updateMe({ displayName: newName }); } catch { /* noop */ }
        }
    }, [identity]);

    /** Updates or removes the avatar (local + server). */
    const updateAvatar = useCallback(async (avatarData: string | null) => {
        if (!identity) return;
        const _pk = identity.publicKey ?? (identity as any).public_key;
        const _raw = await invoke('update_identity_avatar', {
            publicKey: _pk,
            avatarData,
        });
        setIdentity(mapIdentity(_raw));

        if (getToken() && avatarData) {
            try { await updateMe({ avatar: avatarData }); } catch { /* noop */ }
        }
    }, [identity]);

    const logout = useCallback(() => {
        localStorage.removeItem('last_public_key');
        clearToken();
        setIdentity(null);
        setServerUserId(null);
        setTokenState(null);
    }, []);

    const resolvedPublicKey = identity?.publicKey ?? (identity as any)?.public_key ?? null;

    // Diagnostic: trace the exact pk exposed to ServerContext
    useEffect(() => {
        console.debug('[Auth] resolvedPublicKey:', resolvedPublicKey?.slice(0, 20) + '…', 'token:', !!token);
    }, [resolvedPublicKey, token]);

    const userTag = useMemo(() => {
        return identity?.pseudo && resolvedPublicKey
            ? formatUserTag(identity.pseudo, resolvedPublicKey)
            : null;
    }, [identity, resolvedPublicKey]);

    return (
        <AuthContext.Provider value={{
            identity,
            username: identity?.pseudo ?? null,
            userId: resolvedPublicKey,
            publicKey: resolvedPublicKey,
            avatar: identity?.avatar ?? null,
            userTag,
            serverUserId,
            token,
            isAuthenticated: !!identity,
            login,
            recover,
            logout,
            updateUsername,
            updateAvatar,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * @throws {Error} If called outside of an AuthProvider.
 * @returns {AuthState} The current authentication state.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
