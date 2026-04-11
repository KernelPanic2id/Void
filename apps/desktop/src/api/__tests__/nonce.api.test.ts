import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNonce } from '../../api/nonce.api';
import * as httpClient from '../../api/http-client';

vi.spyOn(httpClient, 'apiFetch').mockResolvedValue({ nonce: 'abc123' });

describe('fetchNonce', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls /api/auth/nonce and returns the nonce string', async () => {
        const result = await fetchNonce();
        expect(result).toBe('abc123');
        expect(httpClient.apiFetch).toHaveBeenCalledWith('/api/auth/nonce');
    });
});

