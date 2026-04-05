import { createContext, ReactNode, useCallback, useContext, useState, useMemo } from 'react';
import { AuthState } from '../models/authState.model';

const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Authentication Context Provider.
 * Manages user state, including login status, persistent username, and a stable generated user ID.
 * Retrieves initial authentication states from localStorage.
 * 
 * @param {Object} props Component properties.
 * @param {ReactNode} props.children The child components that will consume this context.
 * @returns {JSX.Element} The Provider component wrapping its children.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [username, setUsername] = useState<string | null>(
        () => localStorage.getItem('emergency_user')
    );

    // Générer un userId stable basé sur le pseudo ou un ID aléatoire persistant
    const userId = useMemo(() => {
        if (!username) return null;
        let id = localStorage.getItem(`user_id_${username}`);
        if (!id) {
            id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem(`user_id_${username}`, id);
        }
        return id;
    }, [username]);

    /**
     * Authenticates the user by their name and persists the session.
     * 
     * @param {string} name - The user's name to log in with.
     */
    const login = useCallback((name: string) => {
        localStorage.setItem('emergency_user', name);
        setUsername(name);
    }, []);

    const updateUsername = useCallback((newName: string) => {
        if (!username || newName === username || !newName.trim()) return;

        const currentId = localStorage.getItem(`user_id_${username}`);
        if (currentId) {
            localStorage.setItem(`user_id_${newName}`, currentId);
            localStorage.removeItem(`user_id_${username}`);
        }
        localStorage.setItem('emergency_user', newName.trim());
        setUsername(newName.trim());
    }, [username]);

    /**
     * Logs out the current user and clears persistent session data.
     */
    const logout = useCallback(() => {
        localStorage.removeItem('emergency_user');
        setUsername(null);
    }, []);

    return (
        <AuthContext.Provider value={{ username, userId, isAuthenticated: !!username, login, logout, updateUsername }}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Custom hook to consume the AuthContext.
 * 
 * @throws {Error} If called outside of an AuthProvider.
 * @returns {AuthState} The current authentication state and functions.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
