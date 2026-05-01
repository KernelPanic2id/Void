import { UserSummary } from '../auth/serverAuth.model';
import { DmMessage } from './dmMessage.model';

/**
 * Open conversation tab — keeps a peer summary plus the message buffer
 * loaded for that pair. Mutated immutably from the DM context.
 */
export interface DmConversation {
    /** Friend the conversation is with. */
    peer: UserSummary;
    /** Oldest-first list of messages exchanged with `peer`. */
    messages: DmMessage[];
    /** True while the initial history RPC is in flight. */
    loading: boolean;
}

