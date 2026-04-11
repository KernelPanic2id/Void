import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectInput } from '../../../components/ui/SelectInput';

const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
];

describe('SelectInput', () => {
    it('shows placeholder when no value selected', () => {
        render(<SelectInput value="" options={options} onChange={vi.fn()} />);
        expect(screen.getByText('Sélectionner...')).toBeInTheDocument();
    });

    it('shows selected label', () => {
        render(<SelectInput value="b" options={options} onChange={vi.fn()} />);
        expect(screen.getByText('Beta')).toBeInTheDocument();
    });

    it('opens dropdown on click', () => {
        render(<SelectInput value="" options={options} onChange={vi.fn()} />);
        fireEvent.click(screen.getByRole('button'));
        expect(screen.getByText('Alpha')).toBeInTheDocument();
        expect(screen.getByText('Gamma')).toBeInTheDocument();
    });

    it('calls onChange and closes dropdown on option click', () => {
        const onChange = vi.fn();
        render(<SelectInput value="" options={options} onChange={onChange} />);

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('Gamma'));

        expect(onChange).toHaveBeenCalledWith('c');
    });

    it('supports custom placeholder', () => {
        render(<SelectInput value="" options={options} onChange={vi.fn()} placeholder="Pick one" />);
        expect(screen.getByText('Pick one')).toBeInTheDocument();
    });
});

