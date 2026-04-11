import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/http-client', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../api/http-client')>();
    return { ...actual, apiFetchProto: vi.fn(async () => new Uint8Array([0])) };
});

import {
    listFriends, sendFriendRequest, listPending,
    acceptRequest, rejectRequest, removeFriend, removeFriendByUser,
} from '../../api/friends.api';
import { apiFetchProto } from '../../api/http-client';

beforeEach(() => vi.clearAllMocks());

describe('friends.api', () => {
    it('listFriends calls GET /api/friends', async () => {
        await listFriends();
        expect(apiFetchProto).toHaveBeenCalledWith('/api/friends');
    });

    it('sendFriendRequest calls POST /api/friends/request', async () => {
        await sendFriendRequest('u42');
        expect(apiFetchProto).toHaveBeenCalledWith('/api/friends/request', expect.objectContaining({ method: 'POST' }));
    });

    it('listPending calls GET /api/friends/pending', async () => {
        await listPending();
        expect(apiFetchProto).toHaveBeenCalledWith('/api/friends/pending');
    });

    it('acceptRequest calls POST /api/friends/:id/accept', async () => {
        await acceptRequest('req1');
        expect(apiFetchProto).toHaveBeenCalledWith('/api/friends/req1/accept', expect.objectContaining({ method: 'POST' }));
    });

    it('rejectRequest calls POST /api/friends/:id/reject', async () => {
        await rejectRequest('req2');
        expect(apiFetchProto).toHaveBeenCalledWith('/api/friends/req2/reject', expect.objectContaining({ method: 'POST' }));
    });

    it('removeFriend calls DELETE /api/friends/:id', async () => {
        await removeFriend('f1');
        expect(apiFetchProto).toHaveBeenCalledWith('/api/friends/f1', expect.objectContaining({ method: 'DELETE' }));
    });

    it('removeFriendByUser calls DELETE /api/friends/by-user/:userId', async () => {
        await removeFriendByUser('u99');
        expect(apiFetchProto).toHaveBeenCalledWith('/api/friends/by-user/u99', expect.objectContaining({ method: 'DELETE' }));
    });
});

