import { apiFetch } from './http-client';

/** GET /api/auth/nonce — fetches a single-use nonce for challenge signing. */
export const fetchNonce = async (): Promise<string> => {
    const { nonce } = await apiFetch<{ nonce: string }>('/api/auth/nonce');
    return nonce;
};

