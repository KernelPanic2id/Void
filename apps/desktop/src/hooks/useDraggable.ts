import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'void-sidebar-position';

/**
 * Hook providing free drag-to-move logic for a floating panel.
 * Persists position in localStorage.
 *
 * @param defaultPosition - Initial { x, y } in px
 */
export const useDraggable = (defaultPosition = { x: 8, y: 8 }) => {
    const [position, setPosition] = useState<{ x: number; y: number }>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
            } catch { /* ignore */ }
        }
        return defaultPosition;
    });

    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const posRef = useRef(position);
    posRef.current = position;

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('button, input, a, [data-no-drag]')) return;
        e.preventDefault();
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - posRef.current.x,
            y: e.clientY - posRef.current.y,
        };
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const newX = Math.max(0, e.clientX - dragOffset.current.x);
            const newY = Math.max(0, e.clientY - dragOffset.current.y);
            setPosition({ x: newX, y: newY });
        };

        const onMouseUp = () => {
            if (!isDragging.current) return;
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    }, [position]);

    return { position, handleDragStart };
};

