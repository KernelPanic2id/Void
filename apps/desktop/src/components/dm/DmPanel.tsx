import { X } from 'lucide-react';
import { useDm } from '../../context/DmContext';
import { useAuth } from '../../context/AuthContext';
import { useBentoLayout } from '../../hooks/useBentoLayout';
import { useBentoDrag } from '../../hooks/useBentoDrag';
import { useBentoResize } from '../../hooks/useBentoResize';
import ResizeHandle from '../layout/ResizeHandle';
import DmMessageList from './DmMessageList';
import DmComposer from './DmComposer';
import DmTabs from './DmTabs';

/**
 * Floating DM panel rendered when at least one conversation is open.
 *
 * Travels on the same authenticated WebSocket as friends/server presence;
 * the voice/video pipeline (WebRTC SFU) is untouched.
 */
export const DmPanel = () => {
    const { conversations, activePeerId, focusDm, closeDm, sendDm } = useDm();
    // Use the server-side UUID so `DmMessageList` can correctly tell apart
    // outgoing vs. incoming bubbles — DM payloads use server UUIDs, not the
    // local Ed25519 public key exposed as `userId`.
    const { serverUserId } = useAuth();

    const { x, y, w, h, onMove, onResize } = useBentoLayout('dm-panel');
    const handleDragStart = useBentoDrag(onMove);
    const handleResizeStart = useBentoResize(onResize, 'corner');

    const _peerIds = Object.keys(conversations);
    if (_peerIds.length === 0) return null;

    const _activeId = activePeerId && conversations[activePeerId]
        ? activePeerId
        : _peerIds[0];
    const _active = conversations[_activeId];
    const _peerName = _active.peer.displayName || _active.peer.username;

    return (
        <div
            className="absolute z-30"
            style={{ left: x, top: y, width: w, height: h, overflow: 'visible' }}
        >
            <div className="relative w-full h-full glass-heavy rounded-2xl border border-white/6
                overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col"
            >
                {/* Drag handle */}
                <div
                    onMouseDown={handleDragStart}
                    className="h-6 cursor-grab active:cursor-grabbing flex items-center justify-center
                        hover:bg-white/4 transition-colors shrink-0"
                >
                    <div className="w-12 h-1.5 rounded-full bg-cyan-400/20" />
                </div>

                {/* Header */}
                <header className="h-11 flex items-center px-4 border-b border-white/6 shrink-0">
                    <span className="text-cyan-400/50 mr-2 font-mono font-bold">@</span>
                    <h1 className="font-bold text-cyan-100/85 text-[13px] tracking-wide flex-1 truncate">
                        {_peerName}
                    </h1>
                    <button
                        onClick={() => closeDm(_activeId)}
                        className="p-1.5 hover:bg-white/8 rounded-lg text-cyan-500/50
                            hover:text-cyan-300 transition-all cursor-pointer"
                        aria-label="Close conversation"
                    >
                        <X size={15} />
                    </button>
                </header>

                <DmTabs
                    conversations={conversations}
                    activePeerId={_activeId}
                    onFocus={focusDm}
                    onClose={closeDm}
                />

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar min-h-0
                    flex flex-col bg-[#050511]/40"
                >
                    <div className="mt-auto">
                        {_active.loading ? (
                            <div className="text-center text-cyan-500/40 text-[12px] py-4">
                                Loading…
                            </div>
                        ) : (
                            <DmMessageList
                                messages={_active.messages}
                                selfUserId={serverUserId}
                            />
                        )}
                    </div>
                </div>

                {/* Composer */}
                <div className="p-3 pt-2 shrink-0">
                    <DmComposer
                        peerName={_peerName}
                        onSubmit={(body) => sendDm(_activeId, body)}
                    />
                </div>

                <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5
                    rounded-full blur-[120px] pointer-events-none" />
            </div>
            <ResizeHandle onMouseDown={handleResizeStart} />
        </div>
    );
};

export default DmPanel;

