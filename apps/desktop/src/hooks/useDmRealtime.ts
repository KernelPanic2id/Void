import { Dispatch, SetStateAction, useEffect } from 'react';
import { DmConversation } from '../models/social/dmConversation.model';
import { DmMessage } from '../models/social/dmMessage.model';
import { subscribeSignalingEvent } from '../lib/signalingBus';

export interface UseDmRealtimeProps {
    /** Setter for the conversation map keyed by peer id. */
    setConversations: Dispatch<SetStateAction<Record<string, DmConversation>>>;
    /** Authenticated user id (used to derive the conversation key). */
    selfUserId: string | null;
    /**
     * Called when a DM is received from a peer for which no conversation
     * is currently open — lets the host context lazy-open a tab. The full
     * message is forwarded so the host can append it immediately to the
     * freshly created conversation (otherwise the message would be lost
     * until the user manually opens the DM, which is the regression where
     * incoming DMs were no longer instantaneous).
     */
    onUnknownPeer?: (peerId: string, message: DmMessage) => void;
}

/**
 * Subscribes to `dm-message` and `dm-ack` bus events and applies them to
 * the per-peer conversation buffers. Per AGENTS.md, all state mutations
 * live here rather than in the context body.
 */
export function useDmRealtime({
    setConversations,
    selfUserId,
    onUnknownPeer,
}: UseDmRealtimeProps): void {
    useEffect(() => {
        if (!selfUserId) return;

        const _offMessage = subscribeSignalingEvent('dm-message', (msg: DmMessage) => {
            const _peerId = msg.fromUserId === selfUserId ? msg.toUserId : msg.fromUserId;
            setConversations((prev) => {
                const _existing = prev[_peerId];
                if (!_existing) {
                    // Forward the message to the host so it can lazy-open the
                    // tab AND surface the incoming DM in the same tick.
                    onUnknownPeer?.(_peerId, msg);
                    return prev;
                }
                if (_existing.messages.some((m) => m.id === msg.id)) return prev;

                // Resolve the optimistic placeholder. Preferred path:
                // server echoes back our `clientMsgId`. Fallback (current
                // server contract does NOT propagate clientMsgId on the
                // `dm-message` echo, only on `dm-ack`): for our own echoes
                // match the most recent pending placeholder with the same
                // body — prevents the duplicate-message regression on the
                // sender side until the backend gains an echoed clientMsgId.
                let _placeholderIdx = msg.clientMsgId
                    ? _existing.messages.findIndex(
                        (m) => m.pending && m.clientMsgId && m.clientMsgId === msg.clientMsgId,
                    )
                    : -1;
                if (_placeholderIdx < 0 && msg.fromUserId === selfUserId) {
                    for (let _i = _existing.messages.length - 1; _i >= 0; _i--) {
                        const _m = _existing.messages[_i];
                        if (_m.pending && _m.fromUserId === selfUserId && _m.message === msg.message) {
                            _placeholderIdx = _i;
                            break;
                        }
                    }
                }
                let _next: DmMessage[];
                if (_placeholderIdx >= 0) {
                    _next = [..._existing.messages];
                    _next[_placeholderIdx] = { ...msg, pending: false };
                } else {
                    _next = [..._existing.messages, { ...msg, pending: false }];
                }
                return { ...prev, [_peerId]: { ..._existing, messages: _next } };
            });
        });

        const _offAck = subscribeSignalingEvent('dm-ack', (ack) => {
            // Resolve any optimistic placeholder identified by clientMsgId.
            if (!ack.clientMsgId) return;
            setConversations((prev) => {
                const _next: Record<string, DmConversation> = { ...prev };
                let _changed = false;
                for (const [pid, conv] of Object.entries(prev)) {
                    const _idx = conv.messages.findIndex(
                        (m) => m.pending && m.clientMsgId === ack.clientMsgId,
                    );
                    if (_idx < 0) continue;
                    const _messages = [...conv.messages];
                    _messages[_idx] = { ..._messages[_idx], id: ack.id, timestamp: ack.timestamp, pending: false };
                    _next[pid] = { ...conv, messages: _messages };
                    _changed = true;
                }
                return _changed ? _next : prev;
            });
        });

        return () => {
            _offMessage();
            _offAck();
        };
    }, [setConversations, selfUserId, onUnknownPeer]);
}
