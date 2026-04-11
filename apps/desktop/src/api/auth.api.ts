import { invoke } from '@tauri-apps/api/core';
import { apiFetch, apiFetchProto } from './http-client';
import { fetchNonce } from './nonce.api';
import {
    ensureWasm,
    encodeRegisterBody,
    encodeLoginBody,
    encodeUpdateProfile,
    decodeAuthResponse,
    decodeUserProfile,
    decodeUserSummaryList,
} from '../lib/wasm-codec';
import {
    AuthResponse,
    UpdateProfilePayload,
    UserProfile,
    UserSummary,
} from '../models/auth/serverAuth.model';


/**
 * Signs a message with the local Ed25519 private key via Tauri.
 * @param publicKey - Base64-encoded public key identifying the signer.
 * @param message - Plain text message to sign.
 */
async function signMessage(publicKey: string, message: string): Promise<string> {
    return invoke<string>('sign_message', { publicKey, message });
}

/**
 * POST /api/auth/register — password-free, nonce-challenged registration.
 * The server authenticates via Ed25519 signature only.
 * @param username - Unique display name (min 2 chars, lowercased server-side).
 * @param displayName - Display name shown to other users.
 * @param publicKey - Ed25519 public key (identity proof via nonce challenge).
 */
export const registerAccount = async (
    username: string,
    displayName: string,
    publicKey: string,
): Promise<AuthResponse> => {
    await ensureWasm();
    const nonce = await fetchNonce();
    const challenge = `register:${username.trim().toLowerCase()}:${nonce}`;
    const signature = await signMessage(publicKey, challenge);
    const bytes = encodeRegisterBody({ username, displayName, publicKey, nonce, signature });
    const res = await apiFetchProto('/api/auth/register', { method: 'POST', body: bytes });
    return decodeAuthResponse(res) as AuthResponse;
};

/**
 * POST /api/auth/login — password-free, nonce-challenged authentication.
 * The server identifies the user by public_key via `pubkey_index`.
 * @param publicKey - Ed25519 public key (identity proof via nonce challenge).
 */
export const loginAccount = async (
    publicKey: string,
): Promise<AuthResponse> => {
    await ensureWasm();
    const nonce = await fetchNonce();
    const challenge = `login:${publicKey}:${nonce}`;
    const signature = await signMessage(publicKey, challenge);
    const bytes = encodeLoginBody({ publicKey, nonce, signature });
    const res = await apiFetchProto('/api/auth/login', { method: 'POST', body: bytes });
    return decodeAuthResponse(res) as AuthResponse;
};

/** GET /api/auth/me — returns the authenticated user's profile. */
export const getMe = async (): Promise<UserProfile> => {
    await ensureWasm();
    const res = await apiFetchProto('/api/auth/me');
    return decodeUserProfile(res) as UserProfile;
};

/**
 * PATCH /api/auth/me — updates the authenticated user's profile.
 * @param payload - Fields to update (displayName, avatar).
 */
export const updateMe = async (payload: UpdateProfilePayload): Promise<UserProfile> => {
    await ensureWasm();
    const bytes = encodeUpdateProfile(payload);
    const res = await apiFetchProto('/api/auth/me', { method: 'PATCH', body: bytes });
    return decodeUserProfile(res) as UserProfile;
};

/**
 * GET /api/auth/users/search?q=<query>
 * @param query - Search string matched against username and displayName.
 */
export const searchUsers = async (query: string): Promise<UserSummary[]> => {
    await ensureWasm();
    const res = await apiFetchProto(`/api/auth/users/search?q=${encodeURIComponent(query)}`);
    return decodeUserSummaryList(res) as UserSummary[];
};

/**
 * PATCH /api/auth/me (JSON) — syncs the local Ed25519 public key with the
 * server-side user record. Uses JSON instead of protobuf to avoid requiring
 * a WASM recompilation when only the pk field is sent.
 * @param publicKey - Current Ed25519 public key from local identity.
 */
export const syncPublicKey = async (publicKey: string): Promise<void> => {
    await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ publicKey }),
    });
};

