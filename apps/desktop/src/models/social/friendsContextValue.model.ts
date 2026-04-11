import { UserSummary } from '../auth/serverAuth.model';
import { PendingRequest } from './friend.model';

export default interface FriendsContextValue {
    friends: UserSummary[];
    pending: PendingRequest[];
    loading: boolean;
    refresh: () => Promise<void>;
    sendRequest: (toUserId: string) => Promise<void>;
    acceptRequest: (requestId: string) => Promise<void>;
    rejectRequest: (requestId: string) => Promise<void>;
    removeFriend: (friendshipId: string) => Promise<void>;
    removeFriendByUser: (userId: string) => Promise<void>;
}

