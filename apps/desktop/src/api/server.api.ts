import { invoke } from '@tauri-apps/api/core';
import { apiFetch } from './http-client';
import { fetchNonce } from './nonce.api';
import { Server } from '../models/server/server.model';
import { UserSummary } from '../models/auth/serverAuth.model';
import ChatMessage from '../models/chat/chatMessage.model';

/**
 * Signs a message with the local Ed25519 private key via Tauri.
 * @param publicKey - Base64-encoded public key identifying the signer.
 * @param message - Plain text message to sign.
 * @returns Base64-encoded Ed25519 signature.
 */
async function signMessage(publicKey: string, message: string): Promise<string> {
    return invoke<string>('sign_message', { publicKey, message });
}

/**
 * POST /api/servers — creates a server with a nonce-challenged Ed25519 ownership proof.
 * @param name - Display name of the server.
 * @param ownerPublicKey - Creator's Ed25519 public key.
 */
export async function createServer(name: string, ownerPublicKey: string): Promise<Server> {
    const nonce = await fetchNonce();
    const message = `create:${name}:${nonce}`;
    const signature = await signMessage(ownerPublicKey, message);

    return apiFetch<Server>('/api/servers', {
        method: 'POST',
        body: JSON.stringify({ name, ownerPublicKey, nonce, signature }),
    });
}

/** GET /api/servers — lists all servers. */
export async function listServers(): Promise<Server[]> {
    return apiFetch<Server[]>('/api/servers');
}

/** GET /api/servers/:id */
export async function getServer(id: string): Promise<Server> {
    return apiFetch<Server>(`/api/servers/${id}`);
}

/**
 * DELETE /api/servers/:id — deletes a server (owner only, nonce-challenged).
 * @param id - Server UUID.
 * @param ownerPublicKey - Owner's Ed25519 public key.
 */
export async function deleteServer(id: string, ownerPublicKey: string): Promise<void> {
    const nonce = await fetchNonce();
    const message = `delete:${id}:${nonce}`;
    const signature = await signMessage(ownerPublicKey, message);

    await apiFetch(`/api/servers/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ ownerPublicKey, nonce, signature }),
    });
}

/**
 * POST /api/servers/:id/join — joins a server via invite key.
 * @param id - Server UUID.
 * @param inviteKey - Invite code.
 * @param userPublicKey - Joining user's public key.
 */
export async function joinServer(
    id: string,
    inviteKey: string,
    userPublicKey: string,
): Promise<Server> {
    return apiFetch<Server>(`/api/servers/${id}/join`, {
        method: 'POST',
        body: JSON.stringify({ inviteKey, userPublicKey }),
    });
}

/**
 * POST /api/servers/join-by-invite — joins a server using only the invite key.
 * @param inviteKey - Invite code shared by the server owner.
 * @param userPublicKey - Joining user's public key.
 */
export async function joinServerByInvite(
    inviteKey: string,
    userPublicKey: string,
): Promise<Server> {
    return apiFetch<Server>('/api/servers/join-by-invite', {
        method: 'POST',
        body: JSON.stringify({ inviteKey, userPublicKey }),
    });
}

/**
 * POST /api/servers/:id/channels — creates a channel (owner only, nonce-challenged).
 * @param serverId - Server UUID.
 * @param name - Channel display name.
 * @param type - Channel type (text | voice | video).
 * @param ownerPublicKey - Owner's Ed25519 public key.
 */
export async function createChannel(
    serverId: string,
    name: string,
    type: string,
    ownerPublicKey: string,
): Promise<Server> {
    const nonce = await fetchNonce();
    const message = `create_channel:${serverId}:${name}:${nonce}`;
    const signature = await signMessage(ownerPublicKey, message);

    return apiFetch<Server>(`/api/servers/${serverId}/channels`, {
        method: 'POST',
        body: JSON.stringify({ name, type, ownerPublicKey, nonce, signature }),
    });
}

/**
 * DELETE /api/servers/:id/channels/:channelId — deletes a channel (owner only, nonce-challenged).
 * @param serverId - Server UUID.
 * @param channelId - Channel UUID.
 * @param ownerPublicKey - Owner's Ed25519 public key.
 */
export async function deleteChannel(
    serverId: string,
    channelId: string,
    ownerPublicKey: string,
): Promise<Server> {
    const nonce = await fetchNonce();
    const message = `delete_channel:${serverId}:${channelId}:${nonce}`;
    const signature = await signMessage(ownerPublicKey, message);

    return apiFetch<Server>(`/api/servers/${serverId}/channels/${channelId}`, {
        method: 'DELETE',
        body: JSON.stringify({ ownerPublicKey, nonce, signature }),
    });
}

/**
 * GET /api/servers/:id/members — resolves member public keys into user profiles.
 * @param serverId - Server UUID.
 */
export async function listServerMembers(serverId: string): Promise<UserSummary[]> {
    return apiFetch<UserSummary[]>(`/api/servers/${serverId}/members`);
}

/**
 * GET /api/servers/:id/channels/:channelId/messages — fetches cached chat history.
 * @param serverId - Server UUID.
 * @param channelId - Channel UUID.
 */
export async function fetchChannelMessages(
    serverId: string,
    channelId: string,
): Promise<ChatMessage[]> {
    return apiFetch<ChatMessage[]>(`/api/servers/${serverId}/channels/${channelId}/messages`);
}

