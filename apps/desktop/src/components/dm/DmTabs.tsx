import { X } from 'lucide-react';
import { DmConversation } from '../../models/social/dmConversation.model';

export interface DmTabsProps {
    conversations: Record<string, DmConversation>;
    activePeerId: string | null;
    onFocus: (peerId: string) => void;
    onClose: (peerId: string) => void;
}

/** Horizontal tab strip showing every open DM conversation. */
export const DmTabs = ({ conversations, activePeerId, onFocus, onClose }: DmTabsProps) => {
    const _entries = Object.values(conversations);
    if (_entries.length === 0) return null;

    return (
        <div className="flex items-center gap-1 px-2 pt-2 overflow-x-auto custom-scrollbar shrink-0">
            {_entries.map(({ peer }) => {
                const _isActive = peer.id === activePeerId;
                const _label = peer.displayName || peer.username;
                return (
                    <div
                        key={peer.id}
                        className={`shrink-0 flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-md
                            text-[11px] font-medium cursor-pointer transition-all
                            ${_isActive
                                ? 'bg-cyan-500/15 border border-cyan-400/30 text-cyan-100'
                                : 'bg-white/5 border border-white/10 text-cyan-300/60 hover:text-cyan-200'}`}
                        onClick={() => onFocus(peer.id)}
                    >
                        <span className="truncate max-w-[110px]">{_label}</span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose(peer.id);
                            }}
                            className="p-0.5 hover:bg-white/10 rounded-sm"
                            aria-label={`Close DM with ${_label}`}
                        >
                            <X size={11} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default DmTabs;

