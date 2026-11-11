import { useInfiniteQuery, useQuery, type QueryKey } from "@tanstack/react-query";
import { api, type Query } from "./client";
import type { Page } from "./types";

/** Cursor-paginated list. Filters and sort are repeated with each cursor, as the API requires. */
export function usePaged<T, M = unknown>(key: QueryKey, path: string, params: Query = {}, opts: { enabled?: boolean } = {}) {
  const query = useInfiniteQuery({
    queryKey: [...key, params],
    queryFn: ({ pageParam }) => api.get<Page<T, M>>(path, { ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.meta.has_more ? (last.meta.next_cursor ?? undefined) : undefined),
    enabled: opts.enabled,
  });
  const rows = query.data?.pages.flatMap((p) => p.data) ?? [];
  const meta = query.data?.pages[0]?.meta;
  return { ...query, rows, meta, total: meta?.total_count };
}

export function useData<T>(key: QueryKey, path: string, params?: Query, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: params ? [...key, params] : key,
    queryFn: async () => (await api.get<{ data: T }>(path, params)).data,
    enabled: opts.enabled,
  });
}
