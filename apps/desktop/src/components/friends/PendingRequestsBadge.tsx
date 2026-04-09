import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, X } from 'lucide-react';
import { PendingRequestsBadgeProps } from '../../models/social/friendsBarProps.model';

/**
 * Badge showing pending friend requests count.
 * Expands into a fixed-position dropdown with accept/reject actions.
 * Position is computed from button rect on click.
 */
const PendingRequestsBadge = ({ pending, onAccept, onReject }: PendingRequestsBadgeProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);

    const handleToggle = () => {
        if (!isOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const dropW = 288; // w-72
            const margin = 8;
            let top = rect.bottom + 8;
            let left = rect.right - dropW;

            // Clamp so the dropdown never overflows the viewport
            left = Math.max(margin, Math.min(left, window.innerWidth - dropW - margin));
            if (top + 240 > window.innerHeight) top = rect.top - 240 - 8;

            setPos({ top, left });
        }
        setIsOpen(prev => !prev);
    };

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            const _target = e.target as Node;
            if (
                dropRef.current && !dropRef.current.contains(_target) &&
                btnRef.current && !btnRef.current.contains(_target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    if (pending.length === 0) return null;

    return (
        <>
            <button
                ref={btnRef}
                onClick={handleToggle}
                className="relative w-7 h-7 rounded-lg bg-[#0a0b14] border border-cyan-500/20
                    flex items-center justify-center text-cyan-400/50 hover:text-cyan-300
                    hover:border-cyan-400 transition-all duration-300 cursor-pointer shrink-0"
            >
                <Bell size={14} />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white
                    text-[9px] font-black flex items-center justify-center shadow-lg">
                    {pending.length}
                </span>
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropRef}
                    className="fixed z-50 w-72 max-h-60 overflow-y-auto
                        glass-heavy rounded-xl border border-white/6 shadow-2xl p-2
                        animate-in fade-in zoom-in-95 duration-150 custom-scrollbar"
                    style={{ top: pos.top, left: pos.left }}
                >
                    <p className="text-[11px] text-cyan-500/60 font-bold uppercase tracking-wider px-2 py-1">
                        Pending requests ({pending.length})
                    </p>
                    {pending.map(req => (
                        <div key={req.id} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/4 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-[#0a0b14] border border-cyan-500/20
                                flex items-center justify-center shrink-0"
                            >
                                {req.from?.avatar ? (
                                    <img src={req.from.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <span className="text-cyan-200/70 text-xs font-bold">
                                        {req.from?.displayName?.charAt(0).toUpperCase() ?? '?'}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-cyan-100 font-medium truncate">
                                    {req.from?.displayName ?? 'Unknown'}
                                </div>
                                <div className="text-[10px] text-cyan-500/40">@{req.from?.username}</div>
                            </div>
                            <button
                                onClick={() => onAccept(req.id)}
                                className="w-7 h-7 rounded-lg bg-green-600/20 border border-green-500/30
                                    flex items-center justify-center text-green-400 hover:bg-green-600/40
                                    transition-colors shrink-0"
                            >
                                <Check size={14} />
                            </button>
                            <button
                                onClick={() => onReject(req.id)}
                                className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30
                                    flex items-center justify-center text-red-400 hover:bg-red-600/40
                                    transition-colors shrink-0"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>,
                document.body,
            )}
        </>
    );
};

export default PendingRequestsBadge;



