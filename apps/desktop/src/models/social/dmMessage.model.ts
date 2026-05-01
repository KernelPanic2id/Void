/**
 * Single direct-message entry as exchanged on the WebSocket.
 *
 * Mirrors the server-side `ServerMessage::DmMessage` shape (camelCase).
 */
export interface DmMessage {
    /** Server-assigned UUID. */
    id: string;
    /** Sender user id. */
    fromUserId: string;
    /** Recipient user id. */
    toUserId: string;
    /** Plain-text body (server trims whitespace). */
    message: string;
    /** Server epoch milliseconds. */
    timestamp: number;
    /**
     * Client-supplied correlation id for optimistic UI. Present only on
     * locally-emitted placeholders before the server ACK arrives.
     */
    clientMsgId?: string;
    /** Set to `true` while the sender's ACK has not yet been received. */
    pending?: boolean;
}

