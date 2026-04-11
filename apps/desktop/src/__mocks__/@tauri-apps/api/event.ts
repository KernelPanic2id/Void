/**
 * Mock for @tauri-apps/api/event.
 */
import { vi } from 'vitest';

export const listen = vi.fn(async () => vi.fn());
export const emit = vi.fn(async () => {});

