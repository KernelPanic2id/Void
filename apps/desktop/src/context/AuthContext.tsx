import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AuthState } from '../models/auth/authState.model';
import Identity from '../models/auth/identity.model';
import { formatUserTag } from '../lib/format-user-tag';
import { mapIdentity } from '../lib/map-identity';
import { registerAccount, loginAccount, getMe, updateMe, syncPublicKey } from '../api/auth.api';
import { getToken, setToken, clearToken } from '../api/http-client';

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Checks JWT expiry client-side (avoids flash when token is stale).
 * @returns Valid stored token or null when expired / malformed.
 */
const _validStoredToken = (): string | null => {
    const _t = getToken();
    if (!_t) return null;
    try {
        const _payload = JSON.parse(atob(_t.split('.')[1]));
        if (_payload.exp * 1000 < Date.now()) {
            clearToken();
            return null;
        }
        return _t;
    } catch {
        clearToken();
        return null;
    }
};

/**
 * Authentication provider combining local Ed25519 identity (Tauri) with
 * server-side auth (JWT + protobuf store on signaling server).
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [identity, setIdentity] = useState<Identity | null>(null);
    const [serverUserId, setServerUserId] = useState<string | null>(null);
    // Token state starts null — set only AFTER pk sync completes (prevents stale fetchServers)
    const [token, setTokenState] = useState<string | null>(null);

    // Restore session on mount: identity + JWT validation + pk sync
    useEffect(() => {
        const _lastKey = localStorage.getItem('last_public_key');
        if (_lastKey) {
            invoke('find_identity_by_pubkey', { publicKey: _lastKey })
                .then((raw) => setIdentity(mapIdentity(raw)))
                .catch(() => localStorage.removeItem('last_public_key'));
        }

        const _jwt = _validStoredToken();
        if (_jwt) {
            getMe()
                .then(async (profile) => {
                    setServerUserId(profile.id);
                    // Sync pk when local identity diverges from server record
                    if (_lastKey && profile.publicKey !== _lastKey) {
                        try { await syncPublicKey(_lastKey); } catch { /* noop */ }
                    }
                    // Token set AFTER sync so fetchServers uses consistent data
                    setTokenState(_jwt);
                })
                .catch(() => { clearToken(); });
        }
    }, []);

    /**
     * Persists local identity and sets token state after server auth.
     */
    const _finalizeAuth = useCallback((_identity: Identity, res: { token: string; user: { id: string } }) => {
        const _pk = _identity.publicKey ?? (_identity as any).public_key;
        localStorage.setItem('last_public_key', _pk);
        setIdentity(_identity);
        setToken(res.token);
        setTokenState(res.token);
        setServerUserId(res.user.id);
    }, []);

    /**
     * "Créer" — generates a brand-new Ed25519 identity locally (pseudo + password
     * only unlock the local keystore) and registers on the server via nonce
     * challenge. Password never leaves the client.
     */
    const login = useCallback(async (pseudo: string, password: string) => {
        const _raw = await invoke('create_identity', { pseudo, password });
        const _identity = mapIdentity(_raw);
        const _pk = _identity.publicKey ?? (_identity as any).public_key;

        const res = await registerAccount(pseudo, pseudo, _pk);
        _finalizeAuth(_identity, res);
    }, [_finalizeAuth]);

    /**
     * "Connexion" — recovers an existing local identity (or regenerates the
     * keypair when local files are lost) using pseudo + password as local
     * keystore unlock, then authenticates on the server via Ed25519 nonce
     * challenge only. Password never leaves the client.
     */
    const recover = useCallback(async (pseudo: string, password: string) => {
        let _identity: Identity;
        try {
            const _raw = await invoke('recover_identity', { pseudo, password });
            _identity = mapIdentity(_raw);
        } catch {
            const _raw = await invoke('create_identity', { pseudo, password });
            _identity = mapIdentity(_raw);
        }

        const _pk = _identity.publicKey ?? (_identity as any).public_key;
        const res = await loginAccount(_pk);
        _finalizeAuth(_identity, res);
    }, [_finalizeAuth]);

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
            isAuthenticated: !!identity && !!token,
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
