/**
 * Application configuration.
 * Always targets the live Oracle VM via cert-pinned TLS.
 * Env vars can override (set in .env.development / .env.production).
 */

const PROD_WS = 'wss://89.168.59.45:3001/ws';
const PROD_API = 'https://89.168.59.45:3001';

export const config = {
  /** WebSocket signaling server URL */
  wsUrl: import.meta.env.VITE_SIGNALING_URL || PROD_WS,

  /** HTTP API base URL */
  apiUrl: import.meta.env.VITE_API_URL || PROD_API,

  /** Current environment */
  env: import.meta.env.DEV ? 'development' : 'production',
} as const;

