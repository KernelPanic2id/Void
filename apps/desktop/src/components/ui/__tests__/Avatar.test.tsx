import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../../../components/ui/Avatar';

describe('Avatar', () => {
    it('renders an img tag when avatarUrl is provided', () => {
        render(<Avatar publicKey="pk1" avatarUrl="https://example.com/avatar.png" size={40} />);
        const img = screen.getByRole('img', { name: 'Avatar' });
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
        expect(img).toHaveAttribute('width', '40');
    });

    it('renders an identicon div when no avatarUrl', () => {
        const { container } = render(<Avatar publicKey="pk1" size={32} />);
        // Should render an SVG identicon via dangerouslySetInnerHTML
        const _div = container.querySelector('div');
        expect(_div).toBeInTheDocument();
        expect(_div?.innerHTML).toContain('svg');
    });

    it('uses default size of 32', () => {
        const { container } = render(<Avatar publicKey="pk1" />);
        const _div = container.querySelector('div');
        expect(_div?.style.width).toBe('32px');
        expect(_div?.style.height).toBe('32px');
    });

    it('applies custom className', () => {
        const { container } = render(<Avatar publicKey="pk1" className="my-class" />);
        const _div = container.querySelector('div');
        expect(_div?.className).toContain('my-class');
    });
});

