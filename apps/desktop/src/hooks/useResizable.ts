import { useState, useEffect, useRef, useCallback } from 'react';

const WIDTH_KEY = 'void-sidebar-width';
const HEIGHT_KEY = 'void-sidebar-height';

interface ResizableOptions {
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    defaultHeight?: number;
    minHeight?: number;
    maxHeight?: number;
}

type Axis = 'x' | 'y' | 'xy';

/**
 * Hook providing 2D drag-resize logic for a floating panel.
 * Supports horizontal (right edge), vertical (bottom edge), and corner (both axes).
 * Persists dimensions in localStorage.
 */
export const useResizable = ({
    defaultWidth = 240,
    minWidth = 180,
    maxWidth = 480,
    defaultHeight = 500,
    minHeight = 200,
    maxHeight = 900,
}: ResizableOptions = {}) => {
    const [width, setWidth] = useState<number>(() => {
        const stored = localStorage.getItem(WIDTH_KEY);
        if (stored) {
            const v = parseInt(stored, 10);
            if (!isNaN(v) && v >= minWidth && v <= maxWidth) return v;
        }
        return defaultWidth;
    });

    const [height, setHeight] = useState<number>(() => {
        const stored = localStorage.getItem(HEIGHT_KEY);
        if (stored) {
            const v = parseInt(stored, 10);
            if (!isNaN(v) && v >= minHeight && v <= maxHeight) return v;
        }
        return defaultHeight;
    });

    const axis = useRef<Axis | null>(null);
    const startPos = useRef({ x: 0, y: 0 });
    const startSize = useRef({ w: 0, h: 0 });
    const widthRef = useRef(width);
    const heightRef = useRef(height);
    widthRef.current = width;
    heightRef.current = height;

    const startResize = useCallback((e: React.MouseEvent, dir: Axis) => {
        e.preventDefault();
        e.stopPropagation();
        axis.current = dir;
        startPos.current = { x: e.clientX, y: e.clientY };
        startSize.current = { w: widthRef.current, h: heightRef.current };
        document.body.style.cursor = dir === 'x' ? 'col-resize' : dir === 'y' ? 'row-resize' : 'nwse-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const handleResizeRight = useCallback((e: React.MouseEvent) => startResize(e, 'x'), [startResize]);
    const handleResizeBottom = useCallback((e: React.MouseEvent) => startResize(e, 'y'), [startResize]);
    const handleResizeCorner = useCallback((e: React.MouseEvent) => startResize(e, 'xy'), [startResize]);

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!axis.current) return;
            const dx = e.clientX - startPos.current.x;
            const dy = e.clientY - startPos.current.y;

            if (axis.current === 'x' || axis.current === 'xy') {
                setWidth(Math.max(minWidth, Math.min(maxWidth, startSize.current.w + dx)));
            }
            if (axis.current === 'y' || axis.current === 'xy') {
                setHeight(Math.max(minHeight, Math.min(maxHeight, startSize.current.h + dy)));
            }
        };

        const onMouseUp = () => {
            if (!axis.current) return;
            axis.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            localStorage.setItem(WIDTH_KEY, widthRef.current.toString());
            localStorage.setItem(HEIGHT_KEY, heightRef.current.toString());
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [minWidth, maxWidth, minHeight, maxHeight]);

    return { width, height, handleResizeRight, handleResizeBottom, handleResizeCorner };
};

