'use client';

// ============================================================
// useApi - tiny data-fetching hook with loading/error state
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import { get, type ApiResponse } from '@/lib/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: (updater: T | ((prev: T | null) => T | null)) => void;
}

export function useApi<T>(url: string | null, deps: unknown[] = []): UseApiState<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res: ApiResponse<T> = await get<T>(url);
      if (res.success && res.data !== undefined) {
        setDataState(res.data);
      } else {
        setError(res.message || 'Failed to load');
      }
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Network error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps provided by caller
  }, [refetch, ...deps]);

  const setData = useCallback(
    (updater: T | ((prev: T | null) => T | null)) => {
      setDataState((prev) =>
        typeof updater === 'function' ? (updater as (p: T | null) => T | null)(prev) : updater
      );
    },
    []
  );

  return { data, loading, error, refetch, setData };
}
