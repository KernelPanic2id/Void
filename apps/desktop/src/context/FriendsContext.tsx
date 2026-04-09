import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { UserSummary } from '../models/auth/serverAuth.model';
import { PendingRequest } from '../models/social/friend.model';
import {
    listFriends,
    listPending,
    sendFriendRequest,
    acceptRequest as apiAccept,
    rejectRequest as apiReject,
    removeFriend as apiRemove,
} from '../api/friends.api';
import { useAuth } from './AuthContext';

interface FriendsContextValue {
    friends: UserSummary[];
    pending: PendingRequest[];
    loading: boolean;
    refresh: () => Promise<void>;
    sendRequest: (toUserId: string) => Promise<void>;
    acceptRequest: (requestId: string) => Promise<void>;
    rejectRequest: (requestId: string) => Promise<void>;
    removeFriend: (friendshipId: string) => Promise<void>;
}

const FriendsContext = createContext<FriendsContextValue | undefined>(undefined);

/**
 * Provider managing the friends list and pending requests.
 * Fetches on mount when authenticated, re-fetches after each mutation.
 */
export const FriendsProvider = ({ children }: { children: ReactNode }) => {
    const { token } = useAuth();
    const [friends, setFriends] = useState<UserSummary[]>([]);
    const [pending, setPending] = useState<PendingRequest[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [_friends, _pending] = await Promise.all([listFriends(), listPending()]);
            setFriends(_friends);
            setPending(_pending);
        } catch (e) {
            console.error('Failed to fetch friends', e);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { refresh(); }, [refresh]);

    const sendRequest = useCallback(async (toUserId: string) => {
        await sendFriendRequest(toUserId);
        await refresh();
    }, [refresh]);

    const acceptRequest = useCallback(async (requestId: string) => {
        await apiAccept(requestId);
        await refresh();
    }, [refresh]);

    const rejectRequest = useCallback(async (requestId: string) => {
        await apiReject(requestId);
        await refresh();
    }, [refresh]);

    const removeFriend = useCallback(async (friendshipId: string) => {
        await apiRemove(friendshipId);
        await refresh();
    }, [refresh]);

    return (
        <FriendsContext.Provider value={{
            friends, pending, loading, refresh,
            sendRequest, acceptRequest, rejectRequest, removeFriend,
        }}>
            {children}
        </FriendsContext.Provider>
    );
};

/**
 * @throws {Error} If called outside of a FriendsProvider.
 * @returns {FriendsContextValue} Friends state and actions.
 */
export const useFriends = (): FriendsContextValue => {
    const ctx = useContext(FriendsContext);
    if (!ctx) throw new Error('useFriends must be used within a FriendsProvider');
    return ctx;
};

