import { MessageSquare, UserMinus } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface FriendContextMenuProps {
    /** Pixel coordinates relative to the viewport. */
    x: number;
    y: number;
    /** Display name of the targeted friend (for the destructive label). */
    displayName: string;
    /** Triggers a 1-to-1 DM open. */
    onOpenDm: () => void;
    /** Triggers a bilateral friendship removal. */
    onRemove: () => void;
    /** Dismisses the menu (click-out or Escape). */
    onClose: () => void;
}

/**
 * Lightweight contextual menu rendered next to a friend avatar.
 * Closes on outside click and on Escape.
 */
export const FriendContextMenu = ({
    x,
    y,
    displayName,
    onOpenDm,
    onRemove,
    onClose,
}: FriendContextMenuProps) => {
    const _ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const _onClick = (e: MouseEvent) => {
            if (_ref.current && !_ref.current.contains(e.target as Node)) onClose();
        };
        const _onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', _onClick);
        document.addEventListener('keydown', _onKey);
        return () => {
            document.removeEventListener('mousedown', _onClick);
            document.removeEventListener('keydown', _onKey);
        };
    }, [onClose]);

    return (
        <div
            ref={_ref}
            role="menu"
            className="fixed z-50 min-w-[180px] glass-heavy rounded-lg border border-white/8
                shadow-[0_8px_24px_rgba(0,0,0,0.5)] py-1 animate-in fade-in zoom-in-95 duration-150"
            style={{ left: x, top: y }}
        >
            <button
                role="menuitem"
                type="button"
                onClick={() => {
                    onOpenDm();
                    onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px]
                    text-cyan-100/90 hover:bg-cyan-500/15 hover:text-cyan-100 transition-colors"
            >
                <MessageSquare size={14} className="text-cyan-400/80" />
                <span>Send a message</span>
            </button>
            <div className="my-1 h-px bg-white/8" />
            <button
                role="menuitem"
                type="button"
                onClick={() => {
                    onRemove();
                    onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px]
                    text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-colors"
            >
                <UserMinus size={14} />
                <span>Remove {displayName}</span>
            </button>
        </div>
    );
};

export default FriendContextMenu;

