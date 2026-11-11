import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useData, usePaged } from "@/api/hooks";
import type { InsiderCompany, InsiderProfile as Profile, Transaction } from "@/api/types";
import { TransactionsTable } from "@/components/TransactionsTable";
import { Avatar, Empty, ErrorState, Freshness, LoadMore, Money, ProfileSkeleton, Seg, SkeletonRows, filedItems } from "@/components/ui";
import { FollowButton } from "@/features/watchlist";
import { date, initials, roleLabel } from "@/lib/format";
import { useParams2 } from "@/lib/params";

export default function InsiderProfile() {
  const { cik = "" } = useParams();
  const { get, set } = useParams2();
  const [win, setWin] = useState("90");
  const profile = useData<Profile>(["insider", cik], `/insiders/${cik}`);
  const sort = get("sort", "-filed_at");
  const tx = usePaged<Transaction>(["insider", cik, "transactions"], `/insiders/${cik}/transactions`, { sort, type: get("type"), limit: 50 });
  const companies = usePaged<InsiderCompany>(["insider", cik, "companies"], `/insiders/${cik}/companies`, { limit: 25 });

  if (profile.isPending) return <ProfileSkeleton />;
  if (profile.error) return <div className="card"><ErrorState error={profile.error} retry={() => profile.refetch()} /></div>;
  const p = profile.data;
  const name = p.name ?? `CIK ${p.cik}`;
  const s = p.summaries.find((x) => String(x.window_days) === win);
  const latest = companies.rows[0];
  const openOnly = get("type") === "open_market";

  return (
    <div>
      <Link to="/insiders" className="back">← Insiders</Link>
      <div className="profile-head">
        <Avatar text={initials(name)} size={52} round />
        <div className="grow" style={{ minWidth: 200 }}>
          <h1 className="profile-name">{name}</h1>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            {latest ? (
              <>
                {roleLabel(latest.role)},{" "}
                {latest.ticker ? <Link to={`/companies/${encodeURIComponent(latest.ticker)}`}>{latest.name ?? latest.ticker}</Link> : latest.name}
                {" · "}
              </>
            ) : null}
            Section 16 filer · <span className="mono">CIK {p.cik}</span>
          </div>
        </div>
        <FollowButton type="person" entityKey={p.cik} name={name} />
      </div>
      <Freshness items={filedItems({ ...p.latest_filing })} source={p.latest_filing.sec_url} />

      <div className="row wrap" style={{ marginBottom: 10 }}>
        <span className="eyebrow">Reported open-market activity</span>
        <Seg label="Summary window" value={win} onChange={setWin} options={[{ value: "30", label: "30d" }, { value: "90", label: "90d" }, { value: "365", label: "1y" }]} />
      </div>
      {s && (
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
            <div className="stat-label">Net reported</div>
            <div className="stat-val"><Money value={s.net_open_market_value} signed colored /></div>
            <div className="stat-sub">{s.transactions_without_usable_price > 0 ? `${s.transactions_without_usable_price} without a usable price` : "Purchases minus sales"}</div>
          </div>
          <div className="card stat">
            <div className="stat-label">Companies</div>
            <div className="stat-val">{s.issuer_count}</div>
            <div className="stat-sub">{Object.entries(s.counts_by_code).map(([c, n]) => `${c}×${n}`).join(" · ") || "No transactions"}</div>
          </div>
        </div>
      )}

      <div className="cols" style={{ gridTemplateColumns: "minmax(0,2.2fr) minmax(0,1fr)" }}>
        <section className="card clip" aria-label="Transaction history">
          <div className="card-head">
            <h2 className="card-title grow">Transaction history <span className="faint" style={{ fontWeight: 500 }}>· Form 4</span></h2>
            <button type="button" className="chip" aria-pressed={openOnly} onClick={() => set({ type: openOnly ? null : "open_market" })}>Open-market only</button>
          </div>
          {tx.isPending && <SkeletonRows />}
          {tx.error && <ErrorState error={tx.error} retry={() => tx.refetch()} />}
          {tx.isSuccess && tx.rows.length === 0 && <Empty title="No transaction lines on record." sub="This person appears on filings without reported transactions." />}
          {tx.rows.length > 0 && <TransactionsTable rows={tx.rows} hide={["insider"]} sort={sort} onSort={(v) => set({ sort: v === "-filed_at" ? null : v })} />}
          <LoadMore query={tx} />
        </section>
        <section className="card clip" aria-label="Companies">
          <div className="card-head">
            <div>
              <h2 className="card-title">Companies</h2>
              <div className="card-sub">Role as last reported; not a statement of current employment</div>
            </div>
          </div>
          {companies.rows.map((c) => (
            <Link key={c.cik} to={c.ticker ? `/companies/${encodeURIComponent(c.ticker)}` : "#"} className="list-row">
              <span className="tick">{c.ticker ?? "—"}</span>
              <span className="grow">
                <span className="truncate" style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>{c.name ?? `CIK ${c.cik}`}</span>
                <span className="faint" style={{ fontSize: 11 }}>{roleLabel(c.role)} · filed {date(c.filed_at)}</span>
              </span>
            </Link>
          ))}
          {companies.isPending && <SkeletonRows rows={2} />}
          <LoadMore query={companies} />
        </section>
      </div>
      <p className="faint" style={{ fontSize: 11, marginTop: 14 }}>Describes reported Form 4 activity only. Not investment advice.</p>
    </div>
  );
}
