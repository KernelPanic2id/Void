// src/hooks/useAuth.ts
import { useState, useCallback } from 'react';

export const useAuth = () => {
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

    return { username, isAuthenticated: !!username, login, logout };
};