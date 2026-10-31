import axios from 'axios';

interface BackendError {
  message?: string;
  error?: string;
}

/** Extract a human-readable message from an API/axios error. */
export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as BackendError | undefined;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (err.code === 'ERR_NETWORK') return 'Cannot reach the server. Please check your connection.';
    return fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
