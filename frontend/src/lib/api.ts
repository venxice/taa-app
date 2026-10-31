// ============================================================
// API Client (Axios instance + typed helpers)
// ============================================================
import axios, { type AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@shared/types';

export type { ApiResponse };

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Auth is carried only in HttpOnly cookies; page JavaScript never reads tokens.
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(undefined);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url: string = originalRequest?.url || '';

    // Never try to refresh on the auth endpoints themselves — a 401 there
    // (e.g. wrong password) is a real error we want to surface as-is.
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout');

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        );
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        const publicPaths = ['/', '/login', '/register'];
        if (typeof window !== 'undefined' && !publicPaths.includes(window.location.pathname)) {
          window.location.assign('/login');
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ---------- Typed helpers ----------

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  const res = await api.get<ApiResponse<T>>(url, config);
  return res.data;
}

export async function post<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const res = await api.post<ApiResponse<T>>(url, body, config);
  return res.data;
}

export async function put<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const res = await api.put<ApiResponse<T>>(url, body, config);
  return res.data;
}

export async function patch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const res = await api.patch<ApiResponse<T>>(url, body, config);
  return res.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  const res = await api.delete<ApiResponse<T>>(url, config);
  return res.data;
}

// ---------- File upload (multipart via fetch; axios instance defaults to JSON) ----------

export async function uploadFile<T>(
  url: string,
  file: File | Blob,
  fieldName = 'file'
): Promise<ApiResponse<T>> {
  const body = new FormData();
  body.append(fieldName, file);
  const res = await fetch(`/api${url}`, {
    method: 'POST',
    body,
    credentials: 'include',
  });
  return (await res.json()) as ApiResponse<T>;
}
