import { UserSummary } from '../auth/serverAuth.model';

export interface PendingRequest {
    id: string;
    from: UserSummary;
    createdAtMs: number;
}

export interface FriendRequestResult {
    id: string;
    status: string;
}

