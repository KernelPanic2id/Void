import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

interface AuthState {
    username: string | null;
    isAuthenticated: boolean;
    login: (name: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [username, setUsername] = useState<string | null>(
        () => localStorage.getItem('emergency_user')
    );

    const login = useCallback((name: string) => {
        localStorage.setItem('emergency_user', name);
        setUsername(name);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('emergency_user');
        setUsername(null);
    }, []);

    return (
        <AuthContext.Provider value={{ username, isAuthenticated: !!username, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

