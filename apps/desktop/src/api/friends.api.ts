import { apiFetchProto } from './http-client';
import {
    ensureWasm,
    encodeFriendRequestBody,
    decodeUserSummaryList,
    decodePendingRequestList,
    decodeFriendRequestResult,
    decodeStatusResponse,
    decodeRemovedResponse,
} from '../lib/wasm-codec';
import { UserSummary } from '../models/serverAuth.model';
import { FriendRequestResult, PendingRequest } from '../models/friend.model';

/** GET /api/friends — accepted friends list. */
export const listFriends = async (): Promise<UserSummary[]> => {
    await ensureWasm();
    const res = await apiFetchProto('/api/friends');
    return decodeUserSummaryList(res) as UserSummary[];
};

/**
 * POST /api/friends/request — sends a friend request.
 * @param toUserId - Target user's server-side UUID.
 */
export const sendFriendRequest = async (toUserId: string): Promise<FriendRequestResult> => {
    await ensureWasm();
    const bytes = encodeFriendRequestBody({ toUserId });
    const res = await apiFetchProto('/api/friends/request', { method: 'POST', body: bytes });
    return decodeFriendRequestResult(res) as FriendRequestResult;
};

/** GET /api/friends/pending — incoming pending requests. */
export const listPending = async (): Promise<PendingRequest[]> => {
    await ensureWasm();
    const res = await apiFetchProto('/api/friends/pending');
    return decodePendingRequestList(res) as PendingRequest[];
};

/**
 * POST /api/friends/:id/accept — accepts a pending request.
 * @param requestId - Friend request UUID.
 */
export const acceptRequest = async (requestId: string): Promise<{ status: string }> => {
    await ensureWasm();
    const res = await apiFetchProto(`/api/friends/${requestId}/accept`, { method: 'POST' });
    return decodeStatusResponse(res) as { status: string };
};

/**
 * POST /api/friends/:id/reject — rejects a pending request.
 * @param requestId - Friend request UUID.
 */
export const rejectRequest = async (requestId: string): Promise<{ status: string }> => {
    await ensureWasm();
    const res = await apiFetchProto(`/api/friends/${requestId}/reject`, { method: 'POST' });
    return decodeStatusResponse(res) as { status: string };
};

/**
 * DELETE /api/friends/:id — removes a friend or cancels a request.
 * @param friendshipId - Friendship record UUID.
 */
export const removeFriend = async (friendshipId: string): Promise<{ removed: boolean }> => {
    await ensureWasm();
    const res = await apiFetchProto(`/api/friends/${friendshipId}`, { method: 'DELETE' });
    return decodeRemovedResponse(res) as { removed: boolean };
};
