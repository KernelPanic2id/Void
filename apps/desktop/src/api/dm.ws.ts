/**
 * WebSocket DM API. All calls travel on the same authenticated control
 * socket as friends/server presence; the voice/video WebRTC pipelines are
 * untouched (media flows directly between peers and the SFU).
 */
import { DmMessage } from '../models/social/dmMessage.model';
import { UserSummary } from '../models/auth/serverAuth.model';
import { rpc, sendSignalingMessage } from '../lib/signalingTransport';

/**
 * Fires a DM down the WS. The server replies asynchronously with a
 * `dm-ack` (success) or an `rpc-result` carrying an error.
 *
 * @param toUserId Recipient id (must be an accepted friend).
 * @param message  Plain-text body (server trims whitespace).
 * @param clientMsgId Correlation id echoed back in the ACK to resolve the
 *   sender's optimistic placeholder.
 */
export const sendDmWs = (
    toUserId: string,
    message: string,
    clientMsgId: string,
): Promise<void> =>
    sendSignalingMessage({
        type: 'dm-send',
        toUserId,
        message,
        clientMsgId,
    }) as Promise<void>;

/** Fetches the full message history with a single peer (oldest-first). */
export const fetchDmHistory = (withUserId: string): Promise<DmMessage[]> =>
    rpc<DmMessage[]>('dm.history', { userId: withUserId });

/** Lists every friend the user has ever exchanged a DM with, recent-first. */
export const fetchDmPartners = (): Promise<UserSummary[]> =>
    rpc<UserSummary[]>('dm.partners');

