import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePushToTalk } from '../../hooks/usePushToTalk';

/** Helper: creates a fake MediaStream whose audio tracks have an `enabled` property. */
function createFakeStream(enabled = true) {
    const _track = { enabled, kind: 'audio' };
    return { getAudioTracks: () => [_track] } as unknown as MediaStream;
}

describe('usePushToTalk', () => {
    it('does nothing in VAD mode on keydown', () => {
        const _stream = createFakeStream(true);
        const localStreamRef = { current: _stream };

        const { result } = renderHook(() =>
            usePushToTalk({ vadMode: 'VAD', pttKey: 'KeyV', isMuted: false, localStreamRef }),
        );

        act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' })); });

        expect(result.current.isPttActive).toBe(false);
    });

    it('activates on keydown and deactivates on keyup in PTT mode', () => {
        const _stream = createFakeStream(false);
        const localStreamRef = { current: _stream };

        const { result } = renderHook(() =>
            usePushToTalk({ vadMode: 'PTT', pttKey: 'KeyV', isMuted: false, localStreamRef }),
        );

        act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' })); });
        expect(result.current.isPttActive).toBe(true);
        expect(_stream.getAudioTracks()[0].enabled).toBe(true);

        act(() => { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyV' })); });
        expect(result.current.isPttActive).toBe(false);
        expect(_stream.getAudioTracks()[0].enabled).toBe(false);
    });

    it('ignores keys other than the pttKey', () => {
        const _stream = createFakeStream(false);
        const localStreamRef = { current: _stream };

        const { result } = renderHook(() =>
            usePushToTalk({ vadMode: 'PTT', pttKey: 'KeyV', isMuted: false, localStreamRef }),
        );

        act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' })); });
        expect(result.current.isPttActive).toBe(false);
    });

    it('keeps track disabled when muted even if PTT is active', () => {
        const _stream = createFakeStream(false);
        const localStreamRef = { current: _stream };

        const { result } = renderHook(() =>
            usePushToTalk({ vadMode: 'PTT', pttKey: 'KeyV', isMuted: true, localStreamRef }),
        );

        act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' })); });
        expect(result.current.isPttActive).toBe(true);
        expect(_stream.getAudioTracks()[0].enabled).toBe(false);
    });
});

