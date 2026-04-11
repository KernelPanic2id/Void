/**
 * Mock for the WASM core_wasm package (../pkg/core_wasm).
 * Stubs all encode/decode functions with identity-like transforms.
 */
import { vi } from 'vitest';

export default vi.fn(async () => {});

export const decode_auth_response = vi.fn((bytes: Uint8Array) => ({
    token: 'mock-jwt-token',
    user: { id: 'u1', username: 'test', displayName: 'Test', avatar: null, publicKey: 'pk1', createdAtMs: 0 },
}));

export const decode_user_profile = vi.fn((bytes: Uint8Array) => ({
    id: 'u1', username: 'test', displayName: 'Test', avatar: null, publicKey: 'pk1', createdAtMs: 0,
}));

export const decode_user_summary_list = vi.fn((bytes: Uint8Array) => []);

export const decode_pending_request_list = vi.fn((bytes: Uint8Array) => []);

export const decode_status_response = vi.fn((bytes: Uint8Array) => ({ status: 'ok' }));

export const decode_friend_request_result = vi.fn((bytes: Uint8Array) => ({ id: 'fr1', status: 'pending' }));

export const decode_removed_response = vi.fn((bytes: Uint8Array) => ({ removed: true }));

export const encode_register_body = vi.fn(() => new Uint8Array([1, 2, 3]));

export const encode_login_body = vi.fn(() => new Uint8Array([4, 5, 6]));

export const encode_update_profile = vi.fn(() => new Uint8Array([7, 8, 9]));

export const encode_friend_request_body = vi.fn(() => new Uint8Array([10, 11, 12]));

export const rms_volume = vi.fn(() => 0.0);

export const process_network_stats = vi.fn(() => ({
    jitter: 0, packetLoss: 0, rtt: 0, bitrate: 0,
}));


