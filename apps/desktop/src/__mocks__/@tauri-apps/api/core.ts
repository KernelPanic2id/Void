/**
 * Mock for @tauri-apps/api/core — stubs the `invoke` IPC bridge.
 */
import { vi } from 'vitest';

export const invoke = vi.fn(async (cmd: string, _args?: Record<string, unknown>) => {
    switch (cmd) {
        case 'sign_message':
            return 'mock-signature-base64';
        case 'create_identity':
            return { timestamp: Date.now(), public_key: 'AAAA1234BBBB5678', pseudo: _args?.pseudo ?? 'test' };
        case 'recover_identity':
            return { timestamp: Date.now(), public_key: 'AAAA1234BBBB5678', pseudo: _args?.pseudo ?? 'test' };
        case 'find_identity_by_pubkey':
            return { timestamp: Date.now(), public_key: _args?.publicKey ?? 'pk', pseudo: 'found' };
        case 'update_identity_pseudo':
            return { timestamp: Date.now(), public_key: _args?.publicKey ?? 'pk', pseudo: _args?.newPseudo ?? 'updated' };
        case 'update_identity_avatar':
            return { timestamp: Date.now(), public_key: _args?.publicKey ?? 'pk', pseudo: 'test', avatar: _args?.avatarData ?? null };
        default:
            return null;
    }
});

