import { UserSummary } from './serverAuth.model';
import { PendingRequest } from './friend.model';

export interface FriendsBarProps {
    friends: UserSummary[];
    pending: PendingRequest[];
    onSendRequest: (userId: string) => void;
    onAccept: (requestId: string) => void;
    onReject: (requestId: string) => void;
    onRemove: (friendshipId: string) => void;
}

export interface FriendAvatarProps {
    avatar: string | null;
    displayName: string;
    username: string;
}

export interface AddFriendPopoverProps {
    onSend: (userId: string) => void;
}

export interface PendingRequestsBadgeProps {
    pending: PendingRequest[];
    onAccept: (requestId: string) => void;
    onReject: (requestId: string) => void;
}

