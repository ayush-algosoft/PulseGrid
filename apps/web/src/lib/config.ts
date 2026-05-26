/** Public runtime config for the web client. */
export const GATEWAY_WS_URL =
  process.env.NEXT_PUBLIC_GATEWAY_WS_URL ?? 'ws://localhost:4001/stream';
