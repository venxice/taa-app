import { ApiError } from '../../utils/ApiError';

export function assertActiveAccount(status: string) {
  if (status !== 'verified') throw ApiError.forbidden('Account is not active');
}

export function assertCurrentSession(tokenVersion: number | undefined, currentVersion: number) {
  if (tokenVersion !== currentVersion) {
    throw ApiError.unauthorized('Session expired. Please sign in again.');
  }
}
