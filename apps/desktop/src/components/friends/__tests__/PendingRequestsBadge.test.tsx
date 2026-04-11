import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PendingRequestsBadge from '../../../components/friends/PendingRequestsBadge';
import { PendingRequest } from '../../../models/social/friend.model';

const pending: PendingRequest[] = [
    {
        id: 'req1',
        from: { id: 'u1', username: 'alice', displayName: 'Alice', avatar: null, publicKey: 'pk1' },
        createdAtMs: 0,
    },
    {
        id: 'req2',
        from: { id: 'u2', username: 'bob', displayName: 'Bob', avatar: 'https://img.com/bob.png', publicKey: 'pk2' },
        createdAtMs: 0,
    },
];

describe('PendingRequestsBadge', () => {
    it('renders nothing when pending is empty', () => {
        const { container } = render(
            <PendingRequestsBadge pending={[]} onAccept={vi.fn()} onReject={vi.fn()} />,
        );
        expect(container.innerHTML).toBe('');
    });

    it('shows badge count', () => {
        render(<PendingRequestsBadge pending={pending} onAccept={vi.fn()} onReject={vi.fn()} />);
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('opens dropdown on click and shows requests', () => {
        render(<PendingRequestsBadge pending={pending} onAccept={vi.fn()} onReject={vi.fn()} />);
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.getByText(/Pending requests \(2\)/)).toBeInTheDocument();
    });

    it('calls onAccept with the correct request id', () => {
        const onAccept = vi.fn();
        render(<PendingRequestsBadge pending={pending} onAccept={onAccept} onReject={vi.fn()} />);

        fireEvent.click(screen.getByRole('button')); // open dropdown

        // Accept buttons (Check icons)
        const _acceptButtons = document.querySelectorAll('.bg-green-600\\/20');
        fireEvent.click(_acceptButtons[0]);
        expect(onAccept).toHaveBeenCalledWith('req1');
    });

    it('calls onReject with the correct request id', () => {
        const onReject = vi.fn();
        render(<PendingRequestsBadge pending={pending} onAccept={vi.fn()} onReject={onReject} />);

        fireEvent.click(screen.getByRole('button'));

        const _rejectButtons = document.querySelectorAll('.bg-red-600\\/20');
        fireEvent.click(_rejectButtons[0]);
        expect(onReject).toHaveBeenCalledWith('req1');
    });
});

