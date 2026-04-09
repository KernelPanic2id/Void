import { useState } from 'react';
import { FriendAvatarProps } from '../../models/friendsBarProps.model';

/**
 * Single friend avatar circle with tooltip on hover.
 * Displays the user's avatar image or a letter fallback.
 */
const FriendAvatar = ({ avatar, displayName, username }: FriendAvatarProps) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const _initial = displayName.charAt(0).toUpperCase();

    return (
        <div
            className="relative shrink-0 group/friend"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className="w-9 h-9 rounded-full border border-cyan-500/20 overflow-hidden cursor-pointer
                hover:border-cyan-400/60 hover:shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all duration-300
                bg-[#0a0b14] flex items-center justify-center"
            >
                {avatar ? (
                    <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-cyan-200/70 text-sm font-bold">{_initial}</span>
                )}
            </div>

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5
                    glass-heavy rounded-lg border border-white/6 shadow-xl
                    text-[11px] text-cyan-100 font-medium whitespace-nowrap pointer-events-none
                    animate-in fade-in zoom-in-95 duration-150"
                >
                    <div className="font-bold">{displayName}</div>
                    <div className="text-cyan-500/50 text-[10px]">@{username}</div>
                </div>
            )}
        </div>
    );
};

export default FriendAvatar;

