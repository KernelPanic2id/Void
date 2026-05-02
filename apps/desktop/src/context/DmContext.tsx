import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useState,
} from 'react';
import { UserSummary } from '../models/auth/serverAuth.model';
import { DmConversation } from '../models/social/dmConversation.model';
import { DmContextValue } from '../models/social/dmContextValue.model';
import { DmMessage } from '../models/social/dmMessage.model';
import { fetchDmHistory, sendDmWs } from '../api/dm.ws';
import { useAuth } from './AuthContext';
import { useFriends } from './FriendsContext';
import { useDmRealtime } from '../hooks/useDmRealtime';

const DmContext = createContext<DmContextValue | undefined>(undefined);

/** Generates a short-lived correlation id for optimistic placeholders. */
const _newClientMsgId = (): string =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Provider for the 1-to-1 direct-message feature. Travels on the same
 * authenticated WebSocket as the rest of the control plane (friends,
 * server presence) — voice/video media stays on its own WebRTC pipeline.
 */
export const DmProvider = ({ children }: { children: ReactNode }) => {
    const { userId } = useAuth();
    const { friends } = useFriends();
    const [conversations, setConversations] = useState<Record<string, DmConversation>>({});
    const [activePeerId, setActivePeerId] = useState<string | null>(null);

    /**
     * Lazy-opens a conversation when an inbound DM arrives from a peer
     * that has no tab yet. Without this the message would be dropped by
     * `useDmRealtime` until the user manually clicks the friend — which
     * is the "DMs no longer instantaneous" regression. Peer metadata is
     * resolved from the friends list; an unknown sender falls back to a
     * minimal stub keyed on the user id.
     */
    const handleUnknownPeer = useCallback(
        (peerId: string, message: DmMessage) => {
            const _friend = friends.find((f) => f.id === peerId);
            const _peer: UserSummary = _friend ?? {
                id: peerId,
                username: peerId.slice(0, 8),
                displayName: peerId.slice(0, 8),
                avatar: null,
                publicKey: null,
            };
            setConversations((prev) => {
                if (prev[peerId]) return prev;
                return {
                    ...prev,
                    [peerId]: {
                        peer: _peer,
                        messages: [{ ...message, pending: false }],
                        loading: false,
                    },
                };
            });
        },
        [friends],
    );

    useDmRealtime({
        setConversations,
        selfUserId: userId,
        onUnknownPeer: handleUnknownPeer,
    });

    const openDm = useCallback(async (peer: UserSummary) => {
        setActivePeerId(peer.id);
        setConversations((prev) => {
            if (prev[peer.id]) return prev;
            return {
                ...prev,
                [peer.id]: { peer, messages: [], loading: true },
            };
        });
        try {
            const _history = await fetchDmHistory(peer.id);
            setConversations((prev) => {
                const _existing = prev[peer.id];
                if (!_existing) return prev;
                return {
                    ...prev,
                    [peer.id]: { ..._existing, messages: _history, loading: false },
                };
            });
        } catch (e) {
            console.error('[dm] history fetch failed', e);
            setConversations((prev) => {
                const _existing = prev[peer.id];
                if (!_existing) return prev;
                return { ...prev, [peer.id]: { ..._existing, loading: false } };
            });
        }
    }, []);

    const closeDm = useCallback((peerId: string) => {
        setConversations((prev) => {
            if (!prev[peerId]) return prev;
            const _next = { ...prev };
            delete _next[peerId];
            return _next;
        });
        setActivePeerId((cur) => (cur === peerId ? null : cur));
    }, []);

    const focusDm = useCallback((peerId: string) => {
        setActivePeerId(peerId);
    }, []);

    const sendDm = useCallback(
        async (peerId: string, message: string) => {
            const _trimmed = message.trim();
            if (!_trimmed || !userId) return;
            const _clientMsgId = _newClientMsgId();
            const _placeholder: DmMessage = {
                id: _clientMsgId,
                fromUserId: userId,
                toUserId: peerId,
                message: _trimmed,
                timestamp: Date.now(),
                clientMsgId: _clientMsgId,
                pending: true,
            };
            setConversations((prev) => {
                const _existing = prev[peerId];
                if (!_existing) return prev;
                return {
                    ...prev,
                    [peerId]: { ..._existing, messages: [..._existing.messages, _placeholder] },
                };
            });
            try {
                await sendDmWs(peerId, _trimmed, _clientMsgId);
            } catch (e) {
                console.error('[dm] send failed', e);
            }
        },
        [userId],
    );

    return (
        <DmContext.Provider
            value={{ conversations, activePeerId, openDm, closeDm, focusDm, sendDm }}
        >
            {children}
        </DmContext.Provider>
    );
};

/**
 * @throws {Error} If used outside a DmProvider.
 * @returns DM state and actions.
 */
export const useDm = (): DmContextValue => {
    const ctx = useContext(DmContext);
    if (!ctx) throw new Error('useDm must be used within a DmProvider');
    return ctx;
};

