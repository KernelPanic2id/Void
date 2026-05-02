// Copyright (c) 2025 Raphael Taibi. All rights reserved.
// Licensed under the Business Source License 1.1 (BUSL-1.1).
// Use of this source code is governed by the LICENSE file at the
// repository root. Change Date: 2031-04-07. Change License:
// GPL-3.0-or-later.
// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { ToastProvider, useToast } from '../../context/ToastContext';
import {
    useDmNotifications,
    UseDmNotificationsProps,
} from '../../hooks/useDmNotifications';
import { emitSignalingEvent } from '../../lib/signalingBus';
import { DmConversation } from '../../models/social/dmConversation.model';
import { DmMessage } from '../../models/social/dmMessage.model';
import { UserSummary } from '../../models/auth/serverAuth.model';

const _wrapper = ({ children }: { children: ReactNode }) => (
    <ToastProvider>{children}</ToastProvider>
);

const _msg = (overrides: Partial<DmMessage> = {}): DmMessage => ({
    id: 'm-1',
    fromUserId: 'peer-1',
    toUserId: 'me',
    message: 'hello',
    timestamp: 1,
    ...overrides,
});

const _friend: UserSummary = {
    id: 'peer-1',
    username: 'alice',
    displayName: 'Alice',
    avatar: null,
    publicKey: null,
};

/**
 * Renders the hook under test alongside `useToast` so the spec can assert
 * directly on the dispatched toast list — no spying on the addToast pipe
 * itself, keeping the test resilient to ToastContext refactors.
 */
const _renderProbe = (props: UseDmNotificationsProps) =>
    renderHook(
        () => {
            useDmNotifications(props);
            return useToast();
        },
        { wrapper: _wrapper },
    );

describe('useDmNotifications', () => {
    it('toasts when a DM arrives and no conversation is open', () => {
        const { result } = _renderProbe({
            selfUserId: 'me',
            conversations: {},
            activePeerId: null,
            friends: [_friend],
        });

        act(() =>
            emitSignalingEvent('dm-message', _msg({ message: 'hi there' })),
        );

        expect(result.current.toasts).toHaveLength(1);
        const _toast = result.current.toasts[0];
        expect(_toast.type).toBe('dm');
        expect(_toast.message).toContain('Alice');
        expect(_toast.message).toContain('hi there');
    });

    it('ignores echoes of the local user own messages', () => {
        const { result } = _renderProbe({
            selfUserId: 'me',
            conversations: {},
            activePeerId: null,
            friends: [],
        });

        act(() =>
            emitSignalingEvent(
                'dm-message',
                _msg({ fromUserId: 'me', toUserId: 'peer-1' }),
            ),
        );

        expect(result.current.toasts).toHaveLength(0);
    });

    it('does not toast when the panel is focused on the sender', () => {
        const _conversations: Record<string, DmConversation> = {
            'peer-1': { peer: _friend, messages: [], loading: false },
        };
        const { result } = _renderProbe({
            selfUserId: 'me',
            conversations: _conversations,
            activePeerId: 'peer-1',
            friends: [_friend],
        });

        act(() => emitSignalingEvent('dm-message', _msg()));

        expect(result.current.toasts).toHaveLength(0);
    });

    it('toasts when another peer tab is focused (not the sender)', () => {
        const _other: UserSummary = {
            ..._friend,
            id: 'peer-2',
            username: 'bob',
            displayName: 'Bob',
        };
        const _conversations: Record<string, DmConversation> = {
            'peer-1': { peer: _friend, messages: [], loading: false },
            'peer-2': { peer: _other, messages: [], loading: false },
        };
        const { result } = _renderProbe({
            selfUserId: 'me',
            conversations: _conversations,
            activePeerId: 'peer-2',
            friends: [_friend, _other],
        });

        act(() => emitSignalingEvent('dm-message', _msg()));

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].message).toContain('Alice');
    });

    it('truncates very long DM bodies in the preview', () => {
        const _long = 'x'.repeat(200);
        const { result } = _renderProbe({
            selfUserId: 'me',
            conversations: {},
            activePeerId: null,
            friends: [_friend],
        });

        act(() => emitSignalingEvent('dm-message', _msg({ message: _long })));

        const _toast = result.current.toasts[0];
        expect(_toast.message.endsWith('…')).toBe(true);
        expect(_toast.message.length).toBeLessThan(_long.length);
    });
});


