import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/** Filters and sort live in the URL so every view is shareable. Empty values are removed. */
export function useParams2() {
  const [sp, setSp] = useSearchParams();
  const get = useCallback((key: string, fallback = "") => sp.get(key) ?? fallback, [sp]);
  const set = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === undefined || v === "") next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSp],
  );
  return { get, set, sp };
}
