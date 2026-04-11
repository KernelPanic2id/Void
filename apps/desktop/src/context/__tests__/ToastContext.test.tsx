import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../../context/ToastContext';
import React from 'react';

function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(ToastProvider, null, children);
}

beforeEach(() => { vi.useFakeTimers(); });

describe('ToastContext', () => {
    it('useToast throws outside provider', () => {
        expect(() => renderHook(() => useToast())).toThrow('useToast must be used within ToastProvider');
    });

    it('addToast adds a toast to the list', () => {
        const { result } = renderHook(() => useToast(), { wrapper });

        act(() => result.current.addToast('Hello'));
        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0].message).toBe('Hello');
        expect(result.current.toasts[0].type).toBe('info');
    });

    it('addToast supports custom type', () => {
        const { result } = renderHook(() => useToast(), { wrapper });

        act(() => result.current.addToast('Error!', 'error'));
        expect(result.current.toasts[0].type).toBe('error');
    });

    it('auto-removes toast after 3500ms', () => {
        const { result } = renderHook(() => useToast(), { wrapper });

        act(() => result.current.addToast('Temp'));
        expect(result.current.toasts).toHaveLength(1);

        act(() => { vi.advanceTimersByTime(3500); });
        expect(result.current.toasts).toHaveLength(0);
    });

    it('can stack multiple toasts', () => {
        const { result } = renderHook(() => useToast(), { wrapper });

        act(() => {
            result.current.addToast('A');
            result.current.addToast('B');
        });
        expect(result.current.toasts).toHaveLength(2);
    });
});

