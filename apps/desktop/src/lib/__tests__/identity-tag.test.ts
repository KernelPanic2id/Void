import { describe, it, expect } from 'vitest';
import { identityTag, displayNameWithTag } from '../../lib/identity-tag';

describe('identityTag', () => {
    it('returns last 4 chars lowercased (no trailing =)', () => {
        expect(identityTag('ABCDEF1234')).toBe('1234');
    });

    it('strips trailing = padding before slicing', () => {
        expect(identityTag('ABCDEF1234==')).toBe('1234');
    });

    it('supports custom length', () => {
        expect(identityTag('ABCDEF1234', 6)).toBe('ef1234');
    });

    it('handles short key gracefully', () => {
        expect(identityTag('AB')).toBe('ab');
    });
});

describe('displayNameWithTag', () => {
    it('formats name with tag', () => {
        expect(displayNameWithTag('Alice', 'ABCDEF1234')).toBe('Alice #1234');
    });
});

