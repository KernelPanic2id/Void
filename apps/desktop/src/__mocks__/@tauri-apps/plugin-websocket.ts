/**
 * Mock for @tauri-apps/plugin-websocket.
 */
import { vi } from 'vitest';

const mockSocket = {
    send: vi.fn(),
    addListener: vi.fn(),
    disconnect: vi.fn(),
};

class WebSocket {
    static connect = vi.fn(async () => mockSocket);
}

export default WebSocket;

