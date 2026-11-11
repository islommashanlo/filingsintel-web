import { Link } from "react-router-dom";
import { usePaged } from "@/api/hooks";
import type { Cluster, Transaction } from "@/api/types";
import { ClusterCard } from "@/components/ClusterCard";
import { TransactionsTable } from "@/components/TransactionsTable";
import { Empty, ErrorState, LoadMore, PageHead, Seg, SkeletonRows } from "@/components/ui";
import { count } from "@/lib/format";
import { useParams2 } from "@/lib/params";

const ROLES = [
  ["", "All roles"],
  ["officer", "Officers"],
  ["director", "Directors"],
  ["ten_percent_owner", "10% owners"],
] as const;

export function txParams(get: (k: string, f?: string) => string) {
  return {
    type: get("type"),
    direction: get("direction"),
    role: get("role"),
    min_value: get("min_value"),
    ticker: get("ticker"),
    sort: get("sort", "-filed_at"),
    limit: 50,
  };
}

function Transactions() {
  const { get, set } = useParams2();
  const q = usePaged<Transaction>(["transactions"], "/insiders/transactions", txParams(get));
  const openOnly = get("type") === "open_market";
  return (
    <>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <input
          className="input sm"
          style={{ width: 150 }}
          placeholder="Ticker, e.g. ACME"
          aria-label="Filter by exact ticker"
          defaultValue={get("ticker")}
          onKeyDown={(e) => e.key === "Enter" && set({ ticker: e.currentTarget.value.trim().toUpperCase() })}
          onBlur={(e) => set({ ticker: e.currentTarget.value.trim().toUpperCase() })}
        />
        <div className="chips noscroll">
          {ROLES.map(([v, l]) => (
            <button key={v} type="button" className="chip" aria-pressed={get("role") === v} onClick={() => set({ role: v })}>
              {l}
            </button>
          ))}
        </div>
        <label className="filter">
          Direction
          <select className="select sm" value={get("direction")} onChange={(e) => set({ direction: e.target.value })}>
            <option value="">Any</option>
            <option value="purchase">Purchase</option>
            <option value="sale">Sale</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="filter">
          Min. value
          <select className="select sm" value={get("min_value")} onChange={(e) => set({ min_value: e.target.value })}>
            <option value="">Any</option>
            <option value="100000">$100K+</option>
            <option value="1000000">$1M+</option>
            <option value="10000000">$10M+</option>
          </select>
        </label>
        <button type="button" className="chip" aria-pressed={openOnly} onClick={() => set({ type: openOnly ? null : "open_market" })}>
          Open-market only
        </button>
        <span className="faint" style={{ marginLeft: "auto", fontSize: 11 }}>{q.total !== undefined ? `${count(q.total)} transaction lines` : ""}</span>
      </div>
      <section className="card clip" aria-label="Insider transactions">
        {q.isPending && <SkeletonRows />}
        {q.error && <ErrorState error={q.error} retry={() => q.refetch()} />}
        {q.isSuccess && q.rows.length === 0 && <Empty title="No transactions match these filters." />}
        {q.rows.length > 0 && <TransactionsTable rows={q.rows} sort={get("sort", "-filed_at")} onSort={(s) => set({ sort: s === "-filed_at" ? null : s })} />}
        <LoadMore query={q} />
      </section>
      <div className="row wrap faint" style={{ fontSize: 11, marginTop: 10, gap: 18 }}>
        <span><b className="muted">Open Market</b> · Discretionary purchases and sales (codes P and S)</span>
        <span><b className="muted">Administrative</b> · Option exercises, stock awards, tax withholding and other compensation-related entries</span>
      </div>
    </>
  );
}

function Clusters() {
  const { get, set } = useParams2();
  const direction = get("direction", "all");
  const q = usePaged<Cluster>(["clusters"], "/insiders/clusters", { direction, sort: get("sort", "-window_end"), limit: 12 });
  return (
    <>
      <div className="row wrap" style={{ marginBottom: 14 }}>
        <Seg label="Direction" value={direction} onChange={(v) => set({ direction: v === "all" ? null : v })} options={[{ value: "all", label: "All" }, { value: "purchase", label: "Purchases" }, { value: "sale", label: "Sales" }]} />
        <label className="filter">
          Sort
          <select className="select sm" value={get("sort", "-window_end")} onChange={(e) => set({ sort: e.target.value === "-window_end" ? null : e.target.value })}>
            <option value="-window_end">Most recent</option>
            <option value="-insider_count">Most insiders</option>
            <option value="-total_value">Largest total value</option>
          </select>
        </label>
      </div>
      <p className="muted" style={{ fontSize: 12, maxWidth: 760, marginBottom: 14 }}>
        A cluster is three or more insiders of the same company reporting open-market purchases, or separately sales, within 14 days. Windows are rolling, so one company can appear more than once.
      </p>
      {q.isPending && <div className="card clip"><SkeletonRows rows={5} /></div>}
      {q.error && <div className="card"><ErrorState error={q.error} retry={() => q.refetch()} /></div>}
      {q.isSuccess && q.rows.length === 0 && <div className="card"><Empty title="No cluster windows in the last 90 days." /></div>}
      <div className="cardgrid">
        {q.rows.map((c) => (
          <ClusterCard key={c.id} cluster={c} />
        ))}
      </div>
      {q.hasNextPage && <div className="card" style={{ marginTop: 16 }}><LoadMore query={q} /></div>}
      <p className="faint" style={{ fontSize: 11, marginTop: 16 }}>Cluster activity describes reported filings only. It is not a recommendation about any security.</p>
    </>
  );
}

export default function Insiders() {
  const { get } = useParams2();
  const tab = get("tab", "transactions");
  return (
    <div>
      <PageHead title="Insiders" sub="Form 4 transactions reported by officers, directors and 10% owners">
        <div className="seg" role="group" aria-label="View">
          <Link to="/insiders" aria-current={tab === "transactions" ? "page" : undefined}>Transactions</Link>
          <Link to="/insiders?tab=clusters" aria-current={tab === "clusters" ? "page" : undefined}>Clusters</Link>
        </div>
      </PageHead>
      {tab === "clusters" ? <Clusters /> : <Transactions />}
    </div>
  );
}
