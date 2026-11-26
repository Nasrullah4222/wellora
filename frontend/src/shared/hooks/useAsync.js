/*
 * @feature: Data Loading Hook
 * @description: Runs an async loader on mount (and whenever `deps` change) and
 *               exposes { data, loading, error, reload }. Ignores results from
 *               stale requests so fast filter changes never show old data.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/shared/lib/api";
export function useAsync(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);
  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await run();
      if (id === requestId.current) setData(result);
    } catch (e) {
      if (id === requestId.current) setError(getErrorMessage(e));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [run]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, loading, error, reload, setData };
}
