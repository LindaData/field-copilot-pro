import { useCallback, useEffect, useState } from "react";
import { DEFAULT_FILTERS, type JobFilters } from "./filters";

/**
 * Session-persisted filter state, keyed per route/scope. Empty arrays = "all".
 * All owner pages should consume the same hook so that switching tabs
 * preserves what the user just chose.
 */
export function useJobFilters(scope = "owner", initial: Partial<JobFilters> = {}) {
  const key = `filters:${scope}`;
  const [filters, setFilters] = useState<JobFilters>(() => {
    if (typeof window === "undefined") return { ...DEFAULT_FILTERS, ...initial };
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) return { ...DEFAULT_FILTERS, ...initial, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...DEFAULT_FILTERS, ...initial };
  });

  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(filters)); } catch { /* ignore */ }
  }, [key, filters]);

  const reset = useCallback(() => setFilters({ ...DEFAULT_FILTERS, ...initial }), [initial]);
  const patch = useCallback((p: Partial<JobFilters>) => setFilters((f) => ({ ...f, ...p })), []);

  return { filters, setFilters, patch, reset };
}
