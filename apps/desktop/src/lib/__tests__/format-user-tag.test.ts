import { describe, it, expect } from 'vitest';
import { formatUserTag } from '../../lib/format-user-tag';

describe('formatUserTag', () => {
    it('returns pseudo#XXXX from last 4 chars of key', () => {
        expect(formatUserTag('Alice', 'abcdef1234567890')).toBe('Alice#7890');
    });

    it('uppercases the suffix', () => {
        expect(formatUserTag('Bob', 'aabbccdd')).toBe('Bob#CCDD');
    });

    it('returns pseudo only when key is shorter than 4 chars', () => {
        expect(formatUserTag('Eve', 'ab')).toBe('Eve');
    });

    it('returns pseudo only when key is empty', () => {
        expect(formatUserTag('Eve', '')).toBe('Eve');
    });

    it('handles exactly 4-char key', () => {
        expect(formatUserTag('Zoe', 'wxyz')).toBe('Zoe#WXYZ');
    });
});

