import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
        if (cmd === 'create_identity') {
            return { timestamp: Date.now(), public_key: 'AAAA1234BBBB5678', pseudo: args?.pseudo ?? 'test' };
        }
        if (cmd === 'recover_identity') {
            return { timestamp: Date.now(), public_key: 'AAAA1234BBBB5678', pseudo: args?.pseudo ?? 'test' };
        }
        if (cmd === 'find_identity_by_pubkey') {
            return { timestamp: Date.now(), public_key: args?.publicKey ?? 'pk', pseudo: 'found' };
        }
        if (cmd === 'update_identity_pseudo') {
            return { timestamp: Date.now(), public_key: args?.publicKey ?? 'pk', pseudo: args?.newPseudo ?? 'updated' };
        }
        if (cmd === 'update_identity_avatar') {
            return { timestamp: Date.now(), public_key: args?.publicKey ?? 'pk', pseudo: 'test', avatar: args?.avatarData ?? null };
        }
        return null;
    }),
}));
vi.mock('../../api/auth.api', () => ({
    registerAccount: vi.fn(async () => ({
        token: 'jwt-new',
        user: { id: 'u1', username: 'alice', displayName: 'Alice', avatar: null, publicKey: 'pk1', createdAtMs: 0 },
    })),
    loginAccount: vi.fn(async () => ({
        token: 'jwt-recover',
        user: { id: 'u2', username: 'bob', displayName: 'Bob', avatar: null, publicKey: 'pk2', createdAtMs: 0 },
    })),
    getMe: vi.fn(async () => ({
        id: 'u1', username: 'alice', displayName: 'Alice', avatar: null, publicKey: 'pk1', createdAtMs: 0,
    })),
    updateMe: vi.fn(async () => ({})),
    syncPublicKey: vi.fn(async () => {}),
}));

import { AuthProvider, useAuth } from '../../context/AuthContext';

function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(AuthProvider, null, children);
}

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
});

describe('AuthContext', () => {
    it('useAuth throws outside provider', () => {
        expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
    });

    it('starts unauthenticated', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.identity).toBeNull();
    });

    it('login creates identity and authenticates', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            await result.current.login('alice', 'pass');
        });

        expect(result.current.identity).toBeTruthy();
        expect(result.current.identity?.pseudo).toBe('alice');
        expect(result.current.token).toBe('jwt-new');
        expect(result.current.isAuthenticated).toBe(true);
    });

    it('recover authenticates via loginAccount', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            await result.current.recover('bob', 'pass');
        });

        expect(result.current.token).toBe('jwt-recover');
        expect(result.current.isAuthenticated).toBe(true);
    });

    it('logout clears all state', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => { await result.current.login('alice', 'pass'); });
        expect(result.current.isAuthenticated).toBe(true);

        act(() => result.current.logout());
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.identity).toBeNull();
        expect(result.current.token).toBeNull();
    });
});


