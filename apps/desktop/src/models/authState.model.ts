export interface AuthState {
    username: string | null;
    userId: string | null;
    isAuthenticated: boolean;
    login: (name: string) => void;
    logout: () => void;
    updateUsername: (newName: string) => void;
}

