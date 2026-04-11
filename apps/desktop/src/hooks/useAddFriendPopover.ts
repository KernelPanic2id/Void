import { useState, useRef, useEffect, useCallback } from 'react';
import { searchUsers } from '../api/auth.api';
import { UserSummary } from '../models/auth/serverAuth.model';

const POPOVER_WIDTH = 300;
const POPOVER_HEIGHT = 320;
const MARGIN = 8;
const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

/**
 * Encapsulates all state and side-effects for the AddFriendPopover.
 * @param onSend - Callback fired when the user sends a friend request.
 */
export function useAddFriendPopover(onSend: (userId: string) => void) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState<string | null>(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const btnRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const _debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    /** Computes the popover position relative to the trigger button. */
    const computePosition = useCallback(() => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        let top = rect.bottom + MARGIN;
        let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
        left = Math.max(MARGIN, Math.min(left, window.innerWidth - POPOVER_WIDTH - MARGIN));
        if (top + POPOVER_HEIGHT > window.innerHeight) top = rect.top - POPOVER_HEIGHT - MARGIN;
        setPos({ top, left });
    }, []);

    const handleToggle = useCallback(() => {
        if (!isOpen) computePosition();
        setIsOpen(prev => !prev);
        setQuery('');
        setResults([]);
        setSent(null);
    }, [isOpen, computePosition]);

    /* Auto-focus the input when the popover opens */
    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    /* Close on outside click */
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

    const doSearch = useCallback(async (q: string) => {
        if (q.trim().length < MIN_QUERY_LENGTH) { setResults([]); return; }
        setLoading(true);
        try {
            const _users = await searchUsers(q.trim());
            setResults(_users);
        } catch (err) { console.warn('search failed:', err); setResults([]); }
        finally { setLoading(false); }
    }, []);

    const handleInputChange = useCallback((val: string) => {
        setQuery(val);
        setSent(null);
        if (_debounceRef.current) clearTimeout(_debounceRef.current);
        _debounceRef.current = setTimeout(() => doSearch(val), DEBOUNCE_MS);
    }, [doSearch]);

    const handleSend = useCallback((userId: string) => {
        onSend(userId);
        setSent(userId);
    }, [onSend]);

    return {
        isOpen,
        query,
        results,
        loading,
        sent,
        pos,
        btnRef,
        popoverRef,
        inputRef,
        handleToggle,
        handleInputChange,
        handleSend,
    };
}


