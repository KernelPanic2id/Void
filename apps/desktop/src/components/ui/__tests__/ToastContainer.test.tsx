import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ToastContainer } from '../../../components/ui/ToastContainer';

/* Mock useToast to inject controlled toast data */
const mockToasts = vi.fn(() => ({ toasts: [], addToast: vi.fn() }));

vi.mock('../../../context/ToastContext', () => ({
    useToast: () => mockToasts(),
}));

describe('ToastContainer', () => {
    it('renders nothing when there are no toasts', () => {
        mockToasts.mockReturnValue({ toasts: [], addToast: vi.fn() });
        const { container } = render(<ToastContainer />);
        expect(container.innerHTML).toBe('');
    });

    it('renders toast messages', () => {
        mockToasts.mockReturnValue({
            toasts: [
                { id: 't1', message: 'User joined', type: 'join' as const },
                { id: 't2', message: 'Something failed', type: 'error' as const },
            ],
            addToast: vi.fn(),
        });
        render(<ToastContainer />);
        expect(screen.getByText('User joined')).toBeInTheDocument();
        expect(screen.getByText('Something failed')).toBeInTheDocument();
    });

    it('renders correct border classes per type', () => {
        mockToasts.mockReturnValue({
            toasts: [
                { id: 't1', message: 'Success!', type: 'success' as const },
            ],
            addToast: vi.fn(),
        });
        const { container } = render(<ToastContainer />);
        const _toast = container.querySelector('.border-l-emerald-500');
        expect(_toast).toBeInTheDocument();
    });
});

