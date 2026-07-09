import { useState, useEffect, useCallback } from 'react';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook customizado para facilitar a integração com chamadas assíncronas do Supabase ou Fallback.
 * @param fetchFn Função assíncrona que retorna os dados desejados.
 * @param deps Dependências do useEffect para recarregar a busca.
 */
export function useApi<T>(
  fetchFn: () => Promise<T>,
  deps: any[] = []
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const executeFetch = useCallback(async (isMounted: boolean = true) => {
    if (isMounted) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetchFn();
      if (isMounted) {
        setData(result);
      }
    } catch (err: any) {
      if (isMounted) {
        setError(err.message || 'Houve um erro indesejado ao consultar os dados.');
        console.error('API Error:', err);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [fetchFn]);

  useEffect(() => {
    let isMounted = true;
    executeFetch(isMounted);
    return () => {
      isMounted = false;
    };
  }, deps);

  const refetch = useCallback(async () => {
    await executeFetch(true);
  }, [executeFetch]);

  const isEmpty = !loading && (!data || (Array.isArray(data) && data.length === 0));

  return {
    data,
    loading,
    error,
    isEmpty,
    refetch,
  };
}
