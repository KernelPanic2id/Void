import { describe, it, expect, vi } from 'vitest';
import { mapIdentity } from '../../lib/map-identity';

/* Silence the console.log inside mapIdentity */
vi.spyOn(console, 'log').mockImplementation(() => {});

describe('mapIdentity', () => {
    it('maps camelCase keys correctly', () => {
        const _raw = { timestamp: 100, publicKey: 'pk1', pseudo: 'Alice', avatar: 'img.png' };
        expect(mapIdentity(_raw)).toEqual({
            timestamp: 100,
            publicKey: 'pk1',
            pseudo: 'Alice',
            avatar: 'img.png',
        });
    });

    it('maps snake_case keys from Rust backend', () => {
        const _raw = { timestamp: 200, public_key: 'pk2', pseudo: 'Bob', avatar: null };
        expect(mapIdentity(_raw)).toEqual({
            timestamp: 200,
            publicKey: 'pk2',
            pseudo: 'Bob',
            avatar: null,
        });
    });

    it('defaults avatar to null when missing', () => {
        const _raw = { timestamp: 300, publicKey: 'pk3', pseudo: 'Eve' };
        expect(mapIdentity(_raw).avatar).toBeNull();
    });

    it('prefers camelCase publicKey over snake_case', () => {
        const _raw = { timestamp: 400, publicKey: 'camel', public_key: 'snake', pseudo: 'Zoe' };
        expect(mapIdentity(_raw).publicKey).toBe('camel');
    });
});

