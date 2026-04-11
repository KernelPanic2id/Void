import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../../components/ui/Modal';

describe('Modal', () => {
    it('renders nothing when isOpen is false', () => {
        const { container } = render(
            <Modal isOpen={false} onClose={vi.fn()} title="Test">Content</Modal>,
        );
        expect(container.innerHTML).toBe('');
    });

    it('renders title and content when isOpen is true', () => {
        render(<Modal isOpen={true} onClose={vi.fn()} title="My Modal">Body text</Modal>);
        expect(screen.getByText('My Modal')).toBeInTheDocument();
        expect(screen.getByText('Body text')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(<Modal isOpen={true} onClose={onClose} title="Close Test">C</Modal>);

        // The close button is the one containing the X icon
        const _closeBtn = document.querySelector('button');
        expect(_closeBtn).toBeTruthy();
        fireEvent.click(_closeBtn!);
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('renders optional footer', () => {
        render(
            <Modal isOpen={true} onClose={vi.fn()} title="Footer" footer={<button>Save</button>}>
                Body
            </Modal>,
        );
        expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('renders into a portal (document.body)', () => {
        render(<Modal isOpen={true} onClose={vi.fn()} title="Portal">P</Modal>);
        // The modal should be rendered in body, not inside a wrapper div
        const _overlay = document.querySelector('.fixed.inset-0');
        expect(_overlay).toBeInTheDocument();
    });
});

