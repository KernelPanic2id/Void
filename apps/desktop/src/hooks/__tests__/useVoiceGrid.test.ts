// Copyright (c) 2025 Raphael Taibi. All rights reserved.
// Licensed under the Business Source License 1.1 (BUSL-1.1).
// Use of this source code is governed by the LICENSE file at the
// repository root. Change Date: 2031-04-07. Change License:
// GPL-3.0-or-later.
// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVoiceGrid } from '../../hooks/useVoiceGrid';
import VoicePeer from '../../models/voice/voicePeer.model';

/** Lightweight `MediaStream` stub — VoiceGrid never inspects its tracks. */
const _fakeStream = (): MediaStream => ({} as MediaStream);

const _baseProps = (overrides: Partial<Parameters<typeof useVoiceGrid>[0]> = {}) => ({
    participants: [] as VoicePeer[],
    localUserId: 'me',
    localUsername: 'Me',
    localStream: null,
    localScreenStream: null,
    remoteStreams: new Map<string, MediaStream>(),
    remoteVideoStreams: new Map<string, MediaStream>(),
    speakingUsers: new Map<string, boolean>(),
    voiceAvatar: null,
    channelId: 'chan-1',
    isMuted: false,
    isDeafened: false,
    ...overrides,
});

describe('useVoiceGrid', () => {
    it('attaches the remote audio stream to non-local tiles', () => {
        const _audio = _fakeStream();
        const _remoteStreams = new Map<string, MediaStream>([['peer-1', _audio]]);
        const _participants: VoicePeer[] = [
            { userId: 'me', username: 'Me' },
            { userId: 'peer-1', username: 'Peer' },
        ];

        const { result } = renderHook(() =>
            useVoiceGrid(_baseProps({ participants: _participants, remoteStreams: _remoteStreams })),
        );

        const _peerTile = result.current.tiles.find(t => t.userId === 'peer-1');
        const _localTile = result.current.tiles.find(t => t.userId === 'me');

        expect(_peerTile?.audioStream).toBe(_audio);
        // The local user must never sink its own audio (mic-loop / echo).
        expect(_localTile?.audioStream).toBeNull();
    });

    it('propagates the local deafen flag to every tile', () => {
        const { result } = renderHook(() =>
            useVoiceGrid(
                _baseProps({
                    participants: [
                        { userId: 'me', username: 'Me' },
                        { userId: 'peer-1', username: 'Peer' },
                    ],
                    isDeafened: true,
                }),
            ),
        );

        for (const _t of result.current.tiles) {
            expect(_t.localDeafened).toBe(true);
        }
    });

    it('returns an empty list when no channel is active', () => {
        const { result } = renderHook(() => useVoiceGrid(_baseProps({ channelId: null })));
        expect(result.current.tiles).toEqual([]);
    });

    it('falls back to a synthetic local participant before the server confirms', () => {
        const { result } = renderHook(() => useVoiceGrid(_baseProps()));
        // No participants from the server yet → local user is still rendered.
        expect(result.current.tiles).toHaveLength(1);
        expect(result.current.tiles[0]?.userId).toBe('me');
        expect(result.current.tiles[0]?.isLocal).toBe(true);
    });
});

