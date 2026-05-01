import { useState } from 'react';
import { FriendAvatarProps } from '../../models/social/friendsBarProps.model';
import { useDm } from '../../context/DmContext';
import { useFriends } from '../../context/FriendsContext';
import FriendContextMenu from './FriendContextMenu';

/**
 * Single friend avatar circle with tooltip on hover.
 *
 * Interactions:
 * - Left click → opens a 1-to-1 DM panel with this friend.
 * - Right click → contextual menu (DM / Remove).
 *
 * Business logic lives in {@link DmContext} and {@link FriendsContext};
 * this component stays presentation-light.
 */
const FriendAvatar = ({ id, avatar, displayName, username, publicKey }: FriendAvatarProps) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
    const { openDm } = useDm();
    const { removeFriendByUser } = useFriends();

    const _safeDisplay = (displayName?.trim() || username?.trim() || '?');
    const _initial = _safeDisplay.charAt(0).toUpperCase();
    const _suffix = publicKey && publicKey.length >= 4
        ? publicKey.slice(-4).toUpperCase()
        : null;

    const _peer = { id, username, displayName, avatar, publicKey };

    return (
        <>
            <div
                className="relative shrink-0 group/friend"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuPos({ x: e.clientX, y: e.clientY });
                    setShowTooltip(false);
                }}
                onClick={() => {
                    void openDm(_peer);
                }}
            >
                <div className="w-9 h-9 rounded-full border border-cyan-500/20 overflow-hidden cursor-pointer
                    hover:border-cyan-400/60 hover:shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all duration-300
                    bg-[#0a0b14] flex items-center justify-center"
                >
                    {avatar ? (
                        <img src={avatar} alt={_safeDisplay} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-cyan-200/70 text-sm font-bold">{_initial}</span>
                    )}
                </div>

                {showTooltip && !menuPos && (
                    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5
                        glass-heavy rounded-lg border border-white/6 shadow-xl
                        whitespace-nowrap pointer-events-none max-w-[220px]
                        animate-in fade-in zoom-in-95 duration-150"
                    >
                        <div className="flex items-baseline gap-1 text-[11px] leading-tight">
                            <span className="font-bold text-cyan-100 truncate">{_safeDisplay}</span>
                            {_suffix && (
                                <span className="font-mono text-cyan-400/60 shrink-0">#{_suffix}</span>
                            )}
                        </div>
                        <div className="text-[10px] text-cyan-500/60 mt-0.5">
                            Click to chat • Right-click for options
                        </div>
                    </div>
                )}
            </div>

            {menuPos && (
                <FriendContextMenu
                    x={menuPos.x}
                    y={menuPos.y}
                    displayName={_safeDisplay}
                    onOpenDm={() => {
                        void openDm(_peer);
                    }}
                    onRemove={() => {
                        void removeFriendByUser(id);
                    }}
                    onClose={() => setMenuPos(null)}
                />
            )}
        </>
    );
};

export default FriendAvatar;
