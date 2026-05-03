/**
 * Application configuration.
 * Always targets the live Oracle VM via cert-pinned TLS.
 * Env vars can override (set in .env.development / .env.production).
 */

const PROD_WS = 'wss://api.voidsfu.com/ws';
const PROD_API = 'https://api.voidsfu.com';

export const config = {
  /** WebSocket signaling server URL */
  wsUrl: import.meta.env.VITE_SIGNALING_URL || PROD_WS,

  /** HTTP API base URL */
  apiUrl: import.meta.env.VITE_API_URL || PROD_API,

  /** Current environment */
  env: import.meta.env.DEV ? 'development' : 'production',
} as const;

