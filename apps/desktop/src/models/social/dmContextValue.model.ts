import { UserSummary } from '../auth/serverAuth.model';
import { DmConversation } from './dmConversation.model';

/**
 * Public surface of the DM context.
 */
export interface DmContextValue {
    /** Currently open conversations keyed by peer userId. */
    conversations: Record<string, DmConversation>;
    /** Conversation peer userId currently focused (visible panel), if any. */
    activePeerId: string | null;
    /** Opens (or focuses) a DM with `peer`, fetching history on first open. */
    openDm: (peer: UserSummary) => Promise<void>;
    /** Closes a DM tab. */
    closeDm: (peerId: string) => void;
    /** Focuses an already-open conversation. */
    focusDm: (peerId: string) => void;
    /** Sends a DM to `peerId` and optimistically appends a placeholder. */
    sendDm: (peerId: string, message: string) => Promise<void>;
}

