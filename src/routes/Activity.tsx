import { usePaged } from "@/api/hooks";
import type { ActivityEvent } from "@/api/types";
import { ActivityRow } from "@/components/ActivityRow";
import { Empty, ErrorState, LoadMore, PageHead, SkeletonRows } from "@/components/ui";
import { useMe } from "@/features/session";
import { count } from "@/lib/format";
import { useParams2 } from "@/lib/params";

const KINDS: { id: string; label: string; params: Record<string, string> }[] = [
  { id: "all", label: "All", params: {} },
  { id: "insider", label: "Insider", params: { source: "insider" } },
  { id: "purchase", label: "Insider Purchase", params: { source: "insider", direction: "purchase" } },
  { id: "sale", label: "Insider Sale", params: { source: "insider", direction: "sale" } },
  { id: "institutional", label: "Institutional", params: { source: "institutional" } },
  { id: "increase", label: "Increased", params: { source: "institutional", direction: "increase" } },
  { id: "decrease", label: "Reduced", params: { source: "institutional", direction: "decrease" } },
];

export default function Activity() {
  const me = useMe().data;
  const { get, set } = useParams2();
  const kind = KINDS.find((k) => k.id === get("kind")) ?? KINDS[0]!;
  const minValue = get("min_value");
  const sort = get("sort", "-occurred_at");
  const openOnly = get("type") === "open_market";
  const watchOnly = get("watchlist_only") === "true" && !!me;

  const q = usePaged<ActivityEvent, { scoring_available: boolean }>(["activity"], "/activity", {
    ...kind.params,
    min_value: minValue,
    sort,
    type: openOnly ? "open_market" : undefined,
    watchlist_only: watchOnly ? true : undefined,
    limit: 25,
  });
  const filtered = kind.id !== "all" || !!minValue || openOnly || watchOnly;

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHead title="Activity" sub="Reported insider transactions and 13F position changes, by when they were filed" />
      <section className="card" aria-label="Activity">
        <div className="chips noscroll" style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
          {KINDS.map((k) => (
            <button key={k.id} type="button" className="chip" aria-pressed={k.id === kind.id} onClick={() => set({ kind: k.id === "all" ? null : k.id })}>
              {k.label}
            </button>
          ))}
        </div>
        <div className="filterbar">
          <label className="filter">
            Min. value
            <select className="select sm" value={minValue} onChange={(e) => set({ min_value: e.target.value })}>
              <option value="">Any</option>
              <option value="100000">$100K+</option>
              <option value="1000000">$1M+</option>
              <option value="10000000">$10M+</option>
              <option value="100000000">$100M+</option>
            </select>
          </label>
          <label className="filter">
            Sort
            <select className="select sm" value={sort} onChange={(e) => set({ sort: e.target.value === "-occurred_at" ? null : e.target.value })}>
              <option value="-occurred_at">Newest filed</option>
              <option value="occurred_at">Oldest filed</option>
              <option value="-value">Largest value</option>
            </select>
          </label>
          <button type="button" className="chip" aria-pressed={openOnly} onClick={() => set({ type: openOnly ? null : "open_market" })}>
            Open-market only
          </button>
          {me && (
            <button type="button" className="chip" aria-pressed={watchOnly} onClick={() => set({ watchlist_only: watchOnly ? null : "true" })}>
              My watchlist
            </button>
          )}
          {filtered && (
            <button type="button" className="btn ghost sm" onClick={() => set({ kind: null, min_value: null, type: null, watchlist_only: null })}>
              Clear
            </button>
          )}
          <span className="faint" style={{ marginLeft: "auto", fontSize: 11 }}>{q.total !== undefined ? `${count(q.total)} events` : ""}</span>
        </div>
        {q.meta && !q.meta.scoring_available && (
          <div className="faint" style={{ padding: "8px 16px", fontSize: 11, borderBottom: "1px solid var(--lineSoft)" }}>
            Activity Scores are not active yet. Events are listed as reported, without a significance ranking.
          </div>
        )}
        {q.isPending && <SkeletonRows />}
        {q.error && <ErrorState error={q.error} retry={() => q.refetch()} />}
        {q.isSuccess && q.rows.length === 0 && (
          <Empty title="No activity matches these filters." sub="Try a lower value threshold or remove a filter.">
            <button type="button" className="btn" onClick={() => set({ kind: null, min_value: null, type: null, watchlist_only: null })}>Clear filters</button>
          </Empty>
        )}
        {q.rows.map((e) => (
          <ActivityRow key={e.id} event={e} />
        ))}
        <LoadMore query={q} />
      </section>
    </div>
  );
}
