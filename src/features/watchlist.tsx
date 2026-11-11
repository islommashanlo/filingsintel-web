import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ApiError, api, errorMessage } from "@/api/client";
import type { EntityType, Page, WatchlistItem } from "@/api/types";
import { useMe } from "./session";
import { toast, useUi } from "./ui-store";

const KEY = ["watchlist"];

/** Every follow for the account. Free accounts hold at most 15, so paging to the end is cheap. */
export function useWatchlist() {
  const me = useMe().data;
  return useQuery({
    queryKey: KEY,
    enabled: !!me,
    queryFn: async () => {
      const items: WatchlistItem[] = [];
      let cursor: string | undefined;
      for (let i = 0; i < 20; i++) {
        const page = await api.get<Page<WatchlistItem>>("/watchlist", { limit: 100, cursor });
        items.push(...page.data);
        if (!page.meta.has_more || !page.meta.next_cursor) break;
        cursor = page.meta.next_cursor;
      }
      return items;
    },
  });
}

export function profilePath(type: EntityType, key: string) {
  if (type === "issuer") return `/companies/${encodeURIComponent(key)}`;
  if (type === "fund") return `/funds/${key}`;
  return `/insiders/${key}`;
}

export const ENTITY_LABEL: Record<EntityType, string> = { issuer: "Company", fund: "Fund", person: "Insider" };

export function useFollow() {
  const qc = useQueryClient();
  const openUpgrade = useUi((s) => s.openUpgrade);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["activity"] });
    qc.invalidateQueries({ queryKey: ["alert-rules"] });
  };

  const add = useMutation({
    mutationFn: async (v: { type: EntityType; key: string; name?: string | null }) =>
      (await api.post<{ data: WatchlistItem }>("/watchlist", { entity_type: v.type, entity_key: v.key })).data,
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<WatchlistItem[]>(KEY);
      const optimistic: WatchlistItem = { id: -Date.now(), entity_type: v.type, entity_key: v.key, name: v.name ?? v.key, created_at: new Date().toISOString() };
      qc.setQueryData<WatchlistItem[]>(KEY, [optimistic, ...(prev ?? [])]);
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(KEY, ctx?.prev);
      if (e instanceof ApiError && e.proRequired) openUpgrade(e.feature);
      else toast(errorMessage(e));
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (item: WatchlistItem) => api.delete(`/watchlist/${item.id}`),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<WatchlistItem[]>(KEY);
      qc.setQueryData<WatchlistItem[]>(KEY, (prev ?? []).filter((i) => i.id !== item.id));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(KEY, ctx?.prev);
      toast(errorMessage(e));
    },
    onSettled: invalidate,
  });

  return { add, remove };
}

/** Optimistic follow toggle with rollback. Signed-out visitors are sent to sign in. */
export function FollowButton(props: { type: EntityType; entityKey: string; name?: string | null; size?: "sm"; label?: string }) {
  const me = useMe().data;
  const navigate = useNavigate();
  const list = useWatchlist().data;
  const { add, remove } = useFollow();
  const key = props.type === "issuer" ? props.entityKey.toUpperCase() : props.entityKey;
  const item = list?.find((i) => i.entity_type === props.type && i.entity_key === key);
  const pending = !!item && item.id < 0;
  const noun = props.label ?? "Follow";

  const onClick = () => {
    if (!me) {
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    if (item) remove.mutate(item);
    else add.mutate({ type: props.type, key, name: props.name });
  };

  return (
    <button
      type="button"
      className={`btn ${props.size ?? ""} ${item ? "following" : ""}`}
      aria-pressed={!!item}
      disabled={pending}
      onClick={onClick}
      style={{ minWidth: props.size ? 84 : 96 }}
    >
      {item ? "✓ Following" : `+ ${noun}`}
    </button>
  );
}
