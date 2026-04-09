import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus } from 'lucide-react';
import { AddFriendPopoverProps } from '../../models/friendsBarProps.model';

/**
 * Compact "+" button with a portal-rendered popover for sending friend requests.
 * Portal escapes backdrop-filter containing blocks that break fixed positioning.
 */
const AddFriendPopover = ({ onSend }: AddFriendPopoverProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [value, setValue] = useState('');
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleToggle = () => {
        if (!isOpen && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const popoverW = 240;
            const margin = 8;
            let top = rect.bottom + 8;
            let left = rect.left + rect.width / 2 - popoverW / 2;

            left = Math.max(margin, Math.min(left, window.innerWidth - popoverW - margin));
            if (top + 120 > window.innerHeight) top = rect.top - 120 - 8;

            setPos({ top, left });
        }
        setIsOpen(prev => !prev);
    };

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            const _target = e.target as Node;
            if (
                popoverRef.current && !popoverRef.current.contains(_target) &&
                btnRef.current && !btnRef.current.contains(_target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const _trimmed = value.trim();
        if (_trimmed) {
            onSend(_trimmed);
            setValue('');
            setIsOpen(false);
        }
    };

    return (
        <>
            <button
                ref={btnRef}
                onClick={handleToggle}
                className="w-7 h-7 rounded-lg bg-[#0a0b14] border border-cyan-500/20 flex items-center justify-center
                    text-cyan-400/50 hover:text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(34,211,238,0.4)]
                    transition-all duration-300 cursor-pointer shrink-0"
            >
                <UserPlus size={14} />
            </button>

            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed z-50 w-60 glass-heavy rounded-xl border border-white/6 shadow-2xl p-3
                        animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: pos.top, left: pos.left }}
                >
                    <p className="text-[11px] text-cyan-500/60 font-bold uppercase tracking-wider mb-2">
                        Add a friend
                    </p>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            placeholder="User ID"
                            className="w-full bg-[#0a0b14]/60 border border-cyan-500/20 rounded-lg px-3 py-1.5
                                text-cyan-100 text-sm placeholder-cyan-500/30 focus:outline-none
                                focus:border-cyan-500 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!value.trim()}
                            className="w-full py-1.5 rounded-lg bg-cyan-600/30 border border-cyan-500/30
                                text-cyan-200 text-xs font-bold hover:bg-cyan-600/50
                                disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            Send
                        </button>
                    </form>
                </div>,
                document.body,
            )}
        </>
    );
};

export default AddFriendPopover;


