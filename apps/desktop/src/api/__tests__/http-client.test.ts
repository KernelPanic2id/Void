import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, apiFetchProto, getToken, setToken, clearToken } from '../../api/http-client';

/* ── Stub global fetch ── */
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
    mockFetch.mockReset();
    clearToken();
});

describe('token helpers', () => {
    it('getToken returns null when empty', () => {
        expect(getToken()).toBeNull();
    });

    it('setToken / getToken round-trips', () => {
        setToken('my-jwt');
        expect(getToken()).toBe('my-jwt');
    });

    it('clearToken removes the token', () => {
        setToken('my-jwt');
        clearToken();
        expect(getToken()).toBeNull();
    });
});

describe('apiFetch', () => {
    it('sends JSON GET with Authorization header when token exists', async () => {
        setToken('tok123');
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: 42 }),
        });

        const result = await apiFetch('/api/test');
        expect(result).toEqual({ data: 42 });

        const [url, opts] = mockFetch.mock.calls[0];
        expect(url).toContain('/api/test');
        expect(opts.headers['Authorization']).toBe('Bearer tok123');
        expect(opts.headers['Content-Type']).toBe('application/json');
    });

    it('omits Authorization when no token is set', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        await apiFetch('/api/open');

        const [, opts] = mockFetch.mock.calls[0];
        expect(opts.headers['Authorization']).toBeUndefined();
    });

    it('throws on non-ok response', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: async () => ({ error: 'Nope' }),
        });

        await expect(apiFetch('/api/fail')).rejects.toThrow('Nope');
    });
});

describe('apiFetchProto', () => {
    it('sets Accept header to application/x-protobuf', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(4),
        });

        const result = await apiFetchProto('/api/proto');
        expect(result).toBeInstanceOf(Uint8Array);

        const [, opts] = mockFetch.mock.calls[0];
        expect(opts.headers['Accept']).toBe('application/x-protobuf');
    });

    it('sets Content-Type for Uint8Array body', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(2),
        });

        await apiFetchProto('/api/proto', { method: 'POST', body: new Uint8Array([1, 2]) });
        const [, opts] = mockFetch.mock.calls[0];
        expect(opts.headers['Content-Type']).toBe('application/x-protobuf');
    });
});

