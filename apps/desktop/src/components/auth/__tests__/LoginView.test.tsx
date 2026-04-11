import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginView } from '../../../components/auth/LoginView';

const defaultProps = {
    onLogin: vi.fn(async () => {}),
    onRecover: vi.fn(async () => {}),
};

beforeEach(() => vi.clearAllMocks());

describe('LoginView', () => {
    it('renders in create mode by default', () => {
        render(<LoginView {...defaultProps} />);
        expect(screen.getByText('Générer mon identité')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Ton pseudo…')).toBeInTheDocument();
    });

    it('switches to recover mode', async () => {
        render(<LoginView {...defaultProps} />);
        fireEvent.click(screen.getByText('Connexion'));
        expect(screen.getByText('Se connecter')).toBeInTheDocument();
    });

    it('submit button disabled when pseudo too short in create mode', () => {
        render(<LoginView {...defaultProps} />);
        const _submit = screen.getByText('Générer mon identité');
        expect(_submit).toBeDisabled();
    });

    it('calls onLogin on valid create submission', async () => {
        const user = userEvent.setup();
        render(<LoginView {...defaultProps} />);

        const _pseudoInput = screen.getByPlaceholderText('Ton pseudo…');
        const _pwInputs = screen.getAllByPlaceholderText('••••••••');

        await user.type(_pseudoInput, 'Alice');
        await user.type(_pwInputs[0], 'secure');
        await user.type(_pwInputs[1], 'secure');

        const _submit = screen.getByText('Générer mon identité');
        expect(_submit).not.toBeDisabled();

        await user.click(_submit);
        expect(defaultProps.onLogin).toHaveBeenCalledWith('Alice', 'secure');
    });

    it('shows error when passwords dont match', async () => {
        const user = userEvent.setup();
        render(<LoginView {...defaultProps} />);

        await user.type(screen.getByPlaceholderText('Ton pseudo…'), 'Alice');
        const _pwInputs = screen.getAllByPlaceholderText('••••••••');
        await user.type(_pwInputs[0], 'aaaa');
        await user.type(_pwInputs[1], 'bbbb');

        // Submit button should be disabled
        expect(screen.getByText('Générer mon identité')).toBeDisabled();
    });

    it('shows error when password too short', async () => {
        const user = userEvent.setup();
        render(<LoginView {...defaultProps} />);

        await user.type(screen.getByPlaceholderText('Ton pseudo…'), 'Alice');
        const _pwInputs = screen.getAllByPlaceholderText('••••••••');
        await user.type(_pwInputs[0], 'ab');
        await user.type(_pwInputs[1], 'ab');

        expect(screen.getByText('Générer mon identité')).toBeDisabled();
    });

    it('calls onRecover on valid recover submission', async () => {
        const user = userEvent.setup();
        render(<LoginView {...defaultProps} />);

        await user.click(screen.getByText('Connexion'));
        await user.type(screen.getByPlaceholderText('Ton pseudo…'), 'Bob');
        await user.type(screen.getByPlaceholderText('••••••••'), 'pass');

        await user.click(screen.getByText('Se connecter'));
        expect(defaultProps.onRecover).toHaveBeenCalledWith('Bob', 'pass');
    });

    it('displays error message from onLogin failure', async () => {
        const onLogin = vi.fn(async () => { throw new Error('already taken'); });
        const user = userEvent.setup();
        render(<LoginView onLogin={onLogin} onRecover={defaultProps.onRecover} />);

        await user.type(screen.getByPlaceholderText('Ton pseudo…'), 'Alice');
        const _pwInputs = screen.getAllByPlaceholderText('••••••••');
        await user.type(_pwInputs[0], 'secure');
        await user.type(_pwInputs[1], 'secure');
        await user.click(screen.getByText('Générer mon identité'));

        await waitFor(() => {
            expect(screen.getByText(/pseudo est déjà pris/i)).toBeInTheDocument();
        });
    });

    it('displays error from onRecover failure', async () => {
        const onRecover = vi.fn(async () => { throw new Error('Unauthorized'); });
        const user = userEvent.setup();
        render(<LoginView onLogin={defaultProps.onLogin} onRecover={onRecover} />);

        await user.click(screen.getByText('Connexion'));
        await user.type(screen.getByPlaceholderText('Ton pseudo…'), 'Bob');
        await user.type(screen.getByPlaceholderText('••••••••'), 'pass');
        await user.click(screen.getByText('Se connecter'));

        await waitFor(() => {
            expect(screen.getByText(/Aucun compte trouvé/i)).toBeInTheDocument();
        });
    });

    it('resets fields when switching modes', async () => {
        const user = userEvent.setup();
        render(<LoginView {...defaultProps} />);

        await user.type(screen.getAllByPlaceholderText('••••••••')[0], 'password');
        await user.click(screen.getByText('Connexion'));

        // Password should be reset
        const _pwInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
        expect(_pwInput.value).toBe('');
    });
});

