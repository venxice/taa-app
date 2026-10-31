import axios from 'axios';

/** API middleware can return nested error objects (for example rate limits). */
function asDisplayMessage(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value;
  if (Array.isArray(value)) {
    const messages = value.map(asDisplayMessage).filter(Boolean);
    return messages.length ? messages.join(' ') : undefined;
  }
  if (!value || typeof value !== 'object') return undefined;

  const body = value as Record<string, unknown>;
  for (const key of ['message', 'error', 'detail', 'issues']) {
    const message = asDisplayMessage(body[key]);
    if (message) return message;
  }
  return undefined;
}

/** Extract a human-readable message from an API/axios error. */
export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (axios.isAxiosError(err)) {
    const message = asDisplayMessage(err.response?.data);
    if (message) return message;
    if (err.code === 'ERR_NETWORK') return 'Cannot reach the server. Please check your connection.';
    return fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
