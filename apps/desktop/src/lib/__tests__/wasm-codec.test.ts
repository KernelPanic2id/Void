import { describe, it, expect } from 'vitest';
import {
    ensureWasm,
    decodeAuthResponse,
    encodeRegisterBody,
    encodeLoginBody,
    decodeUserProfile,
} from '../../lib/wasm-codec';

describe('wasm-codec (mocked)', () => {
    it('ensureWasm resolves without error', async () => {
        await expect(ensureWasm()).resolves.toBeUndefined();
    });

    it('ensureWasm is idempotent', async () => {
        const _p1 = ensureWasm();
        const _p2 = ensureWasm();
        expect(_p1).toBe(_p2);
    });

    it('encodeRegisterBody returns Uint8Array', () => {
        const result = encodeRegisterBody({
            username: 'a', displayName: 'A', publicKey: 'pk', nonce: 'n', signature: 's',
        });
        expect(result).toBeInstanceOf(Uint8Array);
    });

    it('encodeLoginBody returns Uint8Array', () => {
        const result = encodeLoginBody({ publicKey: 'pk', nonce: 'n', signature: 's' });
        expect(result).toBeInstanceOf(Uint8Array);
    });

    it('decodeAuthResponse returns token and user', () => {
        const result = decodeAuthResponse(new Uint8Array([0]));
        expect(result).toHaveProperty('token');
        expect(result).toHaveProperty('user');
    });

    it('decodeUserProfile returns a user profile', () => {
        const result = decodeUserProfile(new Uint8Array([0]));
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('username');
    });
});

