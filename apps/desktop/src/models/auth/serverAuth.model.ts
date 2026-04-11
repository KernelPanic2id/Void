export interface UserProfile {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    publicKey: string | null;
    createdAtMs: number;
}

export interface UserSummary {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    publicKey: string | null;
}

export interface AuthResponse {
    token: string;
    user: UserProfile;
}

export interface UpdateProfilePayload {
    displayName?: string;
    avatar?: string;
    publicKey?: string;
}

