/**
 * Unified Supabase Query Hook
 * Standardized pattern for data fetching with loading/error states
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { handleQueryError, logQueryError } from "@/core/api/helpers";
import type { PostgrestError } from "@supabase/supabase-js";

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseSupabaseQueryOptions {
  /** Skip the initial fetch */
  skip?: boolean;
  /** Refetch when these deps change */
  deps?: unknown[];
  /** Called on successful fetch */
  onSuccess?: (data: unknown) => void;
  /** Called on error */
  onError?: (error: string) => void;
}

/**
 * Generic hook for Supabase queries with standardized state management
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options: UseSupabaseQueryOptions = {}
) {
  const { skip = false, deps = [], onSuccess, onError } = options;
  
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: !skip,
    error: null,
  });

  // Track if component is mounted
  const isMounted = useRef(true);
  
  // Track if we've fetched
  const hasFetched = useRef(false);

  const fetchData = useCallback(async () => {
    if (skip) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await queryFn();
      
      if (!isMounted.current) return;
      
      if (error) {
        const errorMessage = handleQueryError(error);
        logQueryError(error);
        setState({ data: null, loading: false, error: errorMessage });
        onError?.(errorMessage);
      } else {
        setState({ data, loading: false, error: null });
        onSuccess?.(data);
      }
    } catch (err) {
      if (!isMounted.current) return;
      
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setState({ data: null, loading: false, error: errorMessage });
      onError?.(errorMessage);
    }
    
    hasFetched.current = true;
  }, [queryFn, skip, onSuccess, onError]);

  // Initial fetch and refetch on deps change
  useEffect(() => {
    isMounted.current = true;
    fetchData();
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchData, ...deps]);

  // Manual refetch function
  const refetch = useCallback(() => {
    hasFetched.current = false;
    return fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch,
    isInitialLoading: state.loading && !hasFetched.current,
    isRefetching: state.loading && hasFetched.current,
  };
}

/**
 * Hook for mutations (insert, update, delete)
 */
export function useSupabaseMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<{ data: TOutput | null; error: PostgrestError | null }>
) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
  }>({
    loading: false,
    error: null,
  });

  const mutate = useCallback(async (input: TInput): Promise<{
    data: TOutput | null;
    error: string | null;
  }> => {
    setState({ loading: true, error: null });
    
    try {
      const { data, error } = await mutationFn(input);
      
      if (error) {
        const errorMessage = handleQueryError(error);
        logQueryError(error);
        setState({ loading: false, error: errorMessage });
        return { data: null, error: errorMessage };
      }
      
      setState({ loading: false, error: null });
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setState({ loading: false, error: errorMessage });
      return { data: null, error: errorMessage };
    }
  }, [mutationFn]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null });
  }, []);

  return {
    mutate,
    loading: state.loading,
    error: state.error,
    reset,
  };
}

export default useSupabaseQuery;
