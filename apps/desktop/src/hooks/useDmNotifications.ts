// Copyright (c) 2025 Raphael Taibi. All rights reserved.
// Licensed under the Business Source License 1.1 (BUSL-1.1).
// Use of this source code is governed by the LICENSE file at the
// repository root. Change Date: 2031-04-07. Change License:
// GPL-3.0-or-later.
// SPDX-License-Identifier: BUSL-1.1

import { useEffect, useRef } from 'react';
import { DmConversation } from '../models/social/dmConversation.model';
import { DmMessage } from '../models/social/dmMessage.model';
import { UserSummary } from '../models/auth/serverAuth.model';
import { subscribeSignalingEvent } from '../lib/signalingBus';
import { useToast } from '../context/ToastContext';

/**
 * Maximum number of characters from the message body shown inside the toast.
 * Anything longer is truncated with an ellipsis to keep the toast compact.
 */
const PREVIEW_MAX = 60;

export interface UseDmNotificationsProps {
    /** Authenticated user id — used to filter out our own echoed messages. */
    selfUserId: string | null;
    /** Current conversation map — drives the "is the panel open?" check. */
    conversations: Record<string, DmConversation>;
    /** Currently focused conversation, if any. */
    activePeerId: string | null;
    /** Friends list — resolves a friendly display name for the toast. */
    friends: UserSummary[];
}

/**
 * Surfaces a toast every time a direct message arrives while the user is
 * unable to read it: either the DM panel is fully closed (no conversation
 * tab) or another peer's tab is focused. Travels on the existing WS
 * `dm-message` event — no extra socket/SSE channel introduced.
 */
export function useDmNotifications({
    selfUserId,
    conversations,
    activePeerId,
    friends,
}: UseDmNotificationsProps): void {
    const { addToast } = useToast();

    // Snapshot the latest props so the bus subscriber (registered once per
    // selfUserId change) reads fresh values without re-subscribing on every
    // keystroke in the DM composer — which would race-drop messages.
    const _conversationsRef = useRef(conversations);
    const _activePeerIdRef = useRef(activePeerId);
    const _friendsRef = useRef(friends);
    _conversationsRef.current = conversations;
    _activePeerIdRef.current = activePeerId;
    _friendsRef.current = friends;

    useEffect(() => {
        if (!selfUserId) return;

        const _off = subscribeSignalingEvent('dm-message', (msg: DmMessage) => {
            // Skip our own echoed messages (server fans out to both peers).
            if (msg.fromUserId === selfUserId) return;

            const _peerId = msg.fromUserId;
            const _isFocused =
                _activePeerIdRef.current === _peerId
                && Boolean(_conversationsRef.current[_peerId]);
            // User is actively reading this conversation — no need to toast.
            if (_isFocused) return;

            const _friend = _friendsRef.current.find((f) => f.id === _peerId);
            const _name = _friend?.displayName
                ?? _friend?.username
                ?? _peerId.slice(0, 8);
            const _preview = msg.message.length > PREVIEW_MAX
                ? `${msg.message.slice(0, PREVIEW_MAX - 1)}…`
                : msg.message;
            addToast(`${_name}: ${_preview}`, 'dm');
        });

        return () => {
            _off();
        };
    }, [selfUserId, addToast]);
}

