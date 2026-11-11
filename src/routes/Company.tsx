import { Link, useParams } from "react-router-dom";
import { useData, usePaged } from "@/api/hooks";
import type { Cluster, Company as CompanyData, FilingSummary, Holding, Transaction } from "@/api/types";
import { ClusterCard } from "@/components/ClusterCard";
import { DataTable, type Column } from "@/components/DataTable";
import { TransactionsTable } from "@/components/TransactionsTable";
import { Avatar, Empty, ErrorState, Freshness, LoadMore, Money, ProfileSkeleton, SkeletonRows, SourceLink, filedItems } from "@/components/ui";
import { useUi } from "@/features/ui-store";
import { FollowButton } from "@/features/watchlist";
import { count, date, quarter, shares } from "@/lib/format";
import { useParams2 } from "@/lib/params";

function InsidersTab({ ticker, limit }: { ticker: string; limit?: number }) {
  const { get, set } = useParams2();
  const sort = get("sort", "-filed_at");
  const openOnly = get("type") === "open_market";
  const q = usePaged<Transaction>(["company", ticker, "insiders"], `/companies/${encodeURIComponent(ticker)}/insiders`, { sort, type: openOnly ? "open_market" : undefined, limit: limit ?? 50 });
  return (
    <section className="card clip" aria-label="Insider transactions">
      <div className="card-head">
        <div className="grow">
          <h2 className="card-title">Insider transactions <span className="faint" style={{ fontWeight: 500 }}>· Form 4</span></h2>
          <div className="card-sub">One row per reporting owner per transaction line{q.total !== undefined ? ` · ${count(q.total)} rows` : ""}</div>
        </div>
        {!limit && <button type="button" className="chip" aria-pressed={openOnly} onClick={() => set({ type: openOnly ? null : "open_market" })}>Open-market only</button>}
        {limit && <Link to={`/companies/${encodeURIComponent(ticker)}/insiders`} style={{ fontSize: 12, fontWeight: 600 }}>View all →</Link>}
      </div>
      {q.isPending && <SkeletonRows rows={limit ?? 8} />}
      {q.error && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {q.isSuccess && q.rows.length === 0 && <Empty title="No insider transactions on record." />}
      {q.rows.length > 0 && <TransactionsTable rows={limit ? q.rows.slice(0, limit) : q.rows} hide={["company"]} sort={limit ? undefined : sort} onSort={limit ? undefined : (s) => set({ sort: s === "-filed_at" ? null : s })} />}
      {!limit && <LoadMore query={q} />}
    </section>
  );
}

const holderCols: Column<Holding>[] = [
  { key: "fund", label: "Fund", render: (h) => <Link to={`/funds/${h.fund.cik}`}>{h.fund.name}</Link> },
  { key: "class", label: "Class", render: (h) => <span className="muted">{h.title_of_class}{h.put_call ? ` · ${h.put_call}` : ""}</span> },
  { key: "shares", label: "Shares", sort: "shares", num: true, render: (h) => shares(h.shares) },
  { key: "value", label: "Reported value", sort: "value_usd", num: true, render: (h) => <Money value={h.value_usd} /> },
  { key: "period", label: "Period", num: true, render: (h) => quarter(h.period_of_report) },
  { key: "filed", label: "Filed", num: true, render: (h) => date(h.filed_at) },
  { key: "src", label: "Source", render: (h) => <SourceLink href={h.sec_url}>{h.form_type}</SourceLink> },
];

function InstitutionalTab({ ticker }: { ticker: string }) {
  const { get, set } = useParams2();
  const sort = get("sort", "-value_usd");
  const q = usePaged<Holding>(["company", ticker, "institutional"], `/companies/${encodeURIComponent(ticker)}/institutional`, { sort, limit: 50 });
  return (
    <section className="card clip" aria-label="Institutional holders">
      <div className="card-head">
        <div>
          <h2 className="card-title">Reported institutional holdings</h2>
          <div className="card-sub">Each fund’s latest reported period, so rows can cover different quarters. Options and share classes are separate rows.</div>
        </div>
      </div>
      {q.isPending && <SkeletonRows />}
      {q.error && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {q.isSuccess && q.rows.length === 0 && <Empty title="No 13F holdings are mapped to this ticker." sub="Only securities with a confirmed CUSIP-to-ticker mapping appear here." />}
      {q.rows.length > 0 && <DataTable caption="Institutional holders" columns={holderCols} rows={q.rows} rowKey={(h) => h.id} sort={sort} onSort={(s) => set({ sort: s === "-value_usd" ? null : s })} minWidth={820} />}
      <LoadMore query={q} />
    </section>
  );
}

function FilingsTab({ ticker }: { ticker: string }) {
  const openExplain = useUi((s) => s.openExplain);
  const q = usePaged<FilingSummary>(["company", ticker, "filings"], `/companies/${encodeURIComponent(ticker)}/filings`, { limit: 50 });
  const cols: Column<FilingSummary>[] = [
    { key: "form", label: "Form", render: (f) => <span className="row" style={{ gap: 6 }}><span className="formchip">Form {f.form_type}</span>{f.is_amendment && <span className="badge am">Amendment</span>}{f.superseded_by && <span className="badge" title={`Superseded by ${f.superseded_by}`}>Superseded</span>}</span> },
    { key: "filed", label: "Filed", num: true, render: (f) => date(f.filed_at) },
    { key: "period", label: "Period", num: true, render: (f) => date(f.period_of_report) },
    { key: "acc", label: "Accession", num: true, render: (f) => f.accession },
    { key: "act", label: "", render: (f) => <span className="row" style={{ justifyContent: "flex-end" }}><button type="button" className="btn soft sm" onClick={() => openExplain(f.accession, `${ticker} · Form ${f.form_type}`)}>Explain</button><SourceLink href={f.sec_url}>SEC</SourceLink></span> },
  ];
  return (
    <section className="card clip" aria-label="Filings">
      <div className="card-head"><h2 className="card-title">Filings</h2></div>
      {q.isPending && <SkeletonRows />}
      {q.error && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {q.isSuccess && q.rows.length === 0 && <Empty title="No filings on record." />}
      {q.rows.length > 0 && <DataTable caption="Filings" columns={cols} rows={q.rows} rowKey={(f) => f.accession} minWidth={720} />}
      <LoadMore query={q} />
    </section>
  );
}

function Overview({ ticker, c }: { ticker: string; c: CompanyData }) {
  const s = c.insider_summary;
  const clusters = usePaged<Cluster>(["company", ticker, "clusters"], "/insiders/clusters", { ticker, limit: 3 });
  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Reported insider activity · last {s.window_days} days · open market</div>
      <div className="stats">
        <div className="card stat">
          <div className="stat-label">Purchases</div>
          <div className="stat-val up"><Money value={s.purchase_value} /></div>
          <div className="stat-sub">{s.purchase_count} transaction{s.purchase_count === 1 ? "" : "s"}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Sales</div>
          <div className="stat-val dn"><Money value={s.sale_value} /></div>
          <div className="stat-sub">{s.sale_count} transaction{s.sale_count === 1 ? "" : "s"}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Insiders</div>
          <div className="stat-val">{s.insider_count}</div>
          <div className="stat-sub">Distinct first-listed owners</div>
        </div>
      </div>
      {clusters.rows.length > 0 && (
        <>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Cluster activity</div>
          <div className="cardgrid" style={{ marginBottom: 18 }}>
            {clusters.rows.map((x) => <ClusterCard key={x.id} cluster={x} />)}
          </div>
        </>
      )}
      <InsidersTab ticker={ticker} limit={8} />
    </>
  );
}

export default function Company() {
  const { ticker = "", tab = "overview" } = useParams();
  const company = useData<CompanyData>(["company", ticker], `/companies/${encodeURIComponent(ticker)}`);
  if (company.isPending) return <ProfileSkeleton />;
  if (company.error) return <div className="card"><ErrorState error={company.error} retry={() => company.refetch()} /></div>;
  const c = company.data;
  const base = `/companies/${encodeURIComponent(c.ticker)}`;
  const tabs = [["overview", "Overview"], ["insiders", "Insiders"], ["institutional", "Institutional"], ["filings", "Filings"]] as const;
  return (
    <div>
      <div className="profile-head">
        <Avatar text={c.ticker} size={52} />
        <div className="grow" style={{ minWidth: 200 }}>
          <h1 className="profile-name">{c.name ?? c.ticker}</h1>
          <div className="row wrap muted" style={{ fontSize: 12.5, marginTop: 2, gap: 8 }}>
            <span className="tick">{c.ticker}</span>
            {c.cik && <span className="mono">CIK {c.cik}</span>}
          </div>
        </div>
        <FollowButton type="issuer" entityKey={c.ticker} name={c.name} label="Watch" />
      </div>
      {c.latest_filing ? <Freshness items={[["Latest filing", `Form ${c.latest_filing.form_type}`], ...filedItems(c.latest_filing)]} source={c.latest_filing.sec_url} /> : <div className="notice" style={{ marginBottom: 16 }}>No Form 4 filing is on record for this company. It is known from a 13F security mapping.</div>}
      <nav className="tabs noscroll" aria-label="Company sections">
        {tabs.map(([id, label]) => (
          <Link key={id} to={id === "overview" ? base : `${base}/${id}`} aria-current={tab === id ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {tab === "insiders" ? <InsidersTab ticker={c.ticker} /> : tab === "institutional" ? <InstitutionalTab ticker={c.ticker} /> : tab === "filings" ? <FilingsTab ticker={c.ticker} /> : <Overview ticker={c.ticker} c={c} />}
    </div>
  );
}
