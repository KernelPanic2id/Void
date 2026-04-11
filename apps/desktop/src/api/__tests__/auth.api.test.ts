import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── Mocks — must be set up before importing subjects ── */
vi.mock('@tauri-apps/api/core');
vi.mock('../../api/http-client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../api/http-client')>();
    return {
        ...actual,
        apiFetchProto: vi.fn(async () => new Uint8Array([0])),
        apiFetch: vi.fn(async () => ({})),
    };
});
vi.mock('../../api/nonce.api', () => ({ fetchNonce: vi.fn(async () => 'nonce-xyz') }));

import { registerAccount, loginAccount, getMe, updateMe, searchUsers, syncPublicKey } from '../../api/auth.api';
import { apiFetchProto, apiFetch } from '../../api/http-client';
import { invoke } from '@tauri-apps/api/core';

beforeEach(() => vi.clearAllMocks());

describe('auth.api', () => {
    it('registerAccount calls apiFetchProto with POST /api/auth/register', async () => {
        await registerAccount('alice', 'Alice', 'pk1');
        expect(invoke).toHaveBeenCalledWith('sign_message', expect.any(Object));
        expect(apiFetchProto).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({ method: 'POST' }));
    });

    it('loginAccount calls apiFetchProto with POST /api/auth/login', async () => {
        await loginAccount('pk1');
        expect(apiFetchProto).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }));
    });

    it('getMe calls apiFetchProto with /api/auth/me', async () => {
        await getMe();
        expect(apiFetchProto).toHaveBeenCalledWith('/api/auth/me');
    });

    it('updateMe calls PATCH /api/auth/me', async () => {
        await updateMe({ displayName: 'New' });
        expect(apiFetchProto).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({ method: 'PATCH' }));
    });

    it('searchUsers encodes query param', async () => {
        await searchUsers('hel lo');
        expect(apiFetchProto).toHaveBeenCalledWith('/api/auth/users/search?q=hel%20lo');
    });

    it('syncPublicKey calls apiFetch with JSON PATCH', async () => {
        await syncPublicKey('pk-new');
        expect(apiFetch).toHaveBeenCalledWith('/api/auth/me', expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ publicKey: 'pk-new' }),
        }));
    });
});

