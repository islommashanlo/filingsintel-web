import { Link, useParams } from "react-router-dom";
import { useData, usePaged } from "@/api/hooks";
import type { FundProfile as Profile, Holding, PositionChange, Report } from "@/api/types";
import { DataTable, type Column } from "@/components/DataTable";
import { Avatar, Empty, ErrorState, Freshness, LoadMore, Money, ProfileSkeleton, SkeletonRows, SourceLink, filedItems } from "@/components/ui";
import { useUi } from "@/features/ui-store";
import { FollowButton } from "@/features/watchlist";
import { CHANGE_LABEL, CHANGE_TONE, count, date, initials, money, num, quarter, shares } from "@/lib/format";
import { useParams2 } from "@/lib/params";

const holdingCols: Column<Holding>[] = [
  { key: "issuer", label: "Issuer", render: (h) => <b>{h.issuer_name}</b> },
  { key: "class", label: "Class", render: (h) => <span className="muted">{h.title_of_class}{h.put_call ? ` · ${h.put_call}` : ""}</span> },
  { key: "cusip", label: "CUSIP", sort: "cusip", num: true, render: (h) => h.cusip ?? "—" },
  { key: "shares", label: "Shares", sort: "shares", num: true, render: (h) => `${shares(h.shares)}${h.share_type === "PRN" ? " PRN" : ""}` },
  { key: "value", label: "Reported value", sort: "value_usd", num: true, render: (h) => (h.suspect ? <span className="badge am" title={h.suspect_reason ?? "Flagged"}>{money(h.value_usd)}</span> : <Money value={h.value_usd} />) },
  { key: "src", label: "Source", render: (h) => <SourceLink href={h.sec_url}>{h.form_type}</SourceLink> },
];

const changeCols: Column<PositionChange>[] = [
  { key: "issuer", label: "Issuer", render: (c) => <b>{c.issuer_name ?? c.cusip}</b> },
  { key: "status", label: "Status", render: (c) => <span className={`badge ${CHANGE_TONE[c.change_type]}`}>{CHANGE_LABEL[c.change_type]}</span> },
  { key: "cusip", label: "CUSIP", sort: "cusip", num: true, render: (c) => `${c.cusip}${c.put_call ? ` ${c.put_call}` : ""}` },
  { key: "before", label: "Previous shares", num: true, render: (c) => shares(c.shares_before) },
  { key: "after", label: "Shares", num: true, render: (c) => shares(c.shares_after) },
  { key: "dsh", label: "Change", sort: "shares_change", num: true, render: (c) => <span className={num(c.shares_delta)! > 0 ? "up" : num(c.shares_delta)! < 0 ? "dn" : ""}>{shares(c.shares_delta, { signed: true })}</span> },
  { key: "dval", label: "Value change", sort: "value_change", num: true, render: (c) => <Money value={c.value_usd_delta} signed colored /> },
  { key: "src", label: "Source", render: (c) => <SourceLink href={c.sec_url}>{c.form_type}</SourceLink> },
];

function Portfolio({ cik }: { cik: string }) {
  const { get, set } = useParams2();
  const sort = get("sort", "-value_usd");
  const q = usePaged<Holding>(["fund", cik, "holdings"], `/funds/${cik}/holdings`, { sort, limit: 50 });
  return (
    <section className="card clip" aria-label="Holdings">
      <div className="card-head">
        <div className="grow">
          <h2 className="card-title">Holdings {q.rows[0] && <span className="faint" style={{ fontWeight: 500 }}>· {quarter(q.rows[0].period_of_report)}</span>}</h2>
          <div className="card-sub">Information-table rows as reported at quarter end, not current market value{q.total !== undefined ? ` · ${count(q.total)} rows` : ""}</div>
        </div>
      </div>
      {q.isPending && <SkeletonRows />}
      {q.error && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {q.isSuccess && q.rows.length === 0 && <Empty title="No holdings on record." sub="This fund has no parsed holdings report yet." />}
      {q.rows.length > 0 && <DataTable caption="Holdings" columns={holdingCols} rows={q.rows} rowKey={(h) => h.id} sort={sort} onSort={(s) => set({ sort: s === "-value_usd" ? null : s })} minWidth={820} />}
      <LoadMore query={q} />
    </section>
  );
}

function Changes({ cik }: { cik: string }) {
  const { get, set } = useParams2();
  const sort = get("sort", "-value_change");
  const type = get("change_type");
  const q = usePaged<PositionChange>(["fund", cik, "changes"], `/funds/${cik}/changes`, { sort, change_type: type, limit: 50 });
  const first = q.rows[0];
  return (
    <section className="card clip" aria-label="Position changes">
      <div className="card-head">
        <div className="grow">
          <h2 className="card-title">Changes between reported 13F portfolios</h2>
          <div className="card-sub">
            {first ? (first.prior_period_of_report ? `${quarter(first.prior_period_of_report)} → ${quarter(first.period_of_report)}` : `${quarter(first.period_of_report)} is the first period on record, so every position is new`) : "Compared with the preceding available quarter"}
          </div>
        </div>
        <div className="chips noscroll">
          {(["", "new", "added", "reduced", "exited"] as const).map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={type === t} onClick={() => set({ change_type: t })}>
              {t ? CHANGE_LABEL[t] : "All"}
            </button>
          ))}
        </div>
      </div>
      {q.isPending && <SkeletonRows />}
      {q.error && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {q.isSuccess && q.rows.length === 0 && <Empty title="No position changes match." />}
      {q.rows.length > 0 && <DataTable caption="Position changes" columns={changeCols} rows={q.rows} rowKey={(c) => `${c.cusip}-${c.put_call}-${c.share_type}`} sort={sort} onSort={(s) => set({ sort: s === "-value_change" ? null : s })} minWidth={920} />}
      <LoadMore query={q} />
    </section>
  );
}

function History({ cik }: { cik: string }) {
  const openExplain = useUi((s) => s.openExplain);
  const q = usePaged<Report>(["fund", cik, "history"], `/funds/${cik}/history`, { limit: 50 });
  const cols: Column<Report>[] = [
    { key: "period", label: "Period", render: (r) => <b>{quarter(r.period_of_report)}</b> },
    { key: "form", label: "Form", render: (r) => <span className="row" style={{ gap: 6 }}><span className="formchip">{r.form_type}</span>{r.amendment_type && <span className="badge am">{r.amendment_type}</span>}</span> },
    { key: "filed", label: "Filed", num: true, render: (r) => date(r.filed_at) },
    { key: "rows", label: "Rows", num: true, render: (r) => count(r.table_entry_total) },
    { key: "value", label: "Cover total", num: true, render: (r) => (r.table_value_total === null ? "—" : <span title={`As reported on the cover page${r.value_unit ? `, in ${r.value_unit}` : ""}`}>{shares(r.table_value_total)}{r.value_unit ? <span className="faint"> {r.value_unit}</span> : null}</span>) },
    { key: "flag", label: "Flags", render: (r) => (r.suspect ? <span className="badge am" title={r.suspect_reason ?? ""}>Check source</span> : <span className="faint">—</span>) },
    { key: "act", label: "", render: (r) => <span className="row" style={{ justifyContent: "flex-end" }}><button type="button" className="btn soft sm" onClick={() => openExplain(r.accession, `${r.form_type} · ${quarter(r.period_of_report)}`)}>Explain</button><SourceLink href={r.sec_url}>SEC</SourceLink></span> },
  ];
  return (
    <section className="card clip" aria-label="Report history">
      <div className="card-head">
        <div>
          <h2 className="card-title">Report history</h2>
          <div className="card-sub">Originals, notices and amendments, as filed. This is filing history, not portfolio performance.</div>
        </div>
      </div>
      {q.isPending && <SkeletonRows />}
      {q.error && <ErrorState error={q.error} retry={() => q.refetch()} />}
      {q.isSuccess && q.rows.length === 0 && <Empty title="No reports on record." />}
      {q.rows.length > 0 && <DataTable caption="Report history" columns={cols} rows={q.rows} rowKey={(r) => r.id} minWidth={860} />}
      <LoadMore query={q} />
    </section>
  );
}

export default function FundProfile() {
  const { cik = "", tab = "portfolio" } = useParams();
  const openExplain = useUi((s) => s.openExplain);
  const profile = useData<Profile>(["fund", cik], `/funds/${cik}`);
  if (profile.isPending) return <ProfileSkeleton />;
  if (profile.error) return <div className="card"><ErrorState error={profile.error} retry={() => profile.refetch()} /></div>;
  const f = profile.data;
  const r = f.latest_report;
  const tabs = [["portfolio", "Portfolio"], ["changes", "Changes"], ["history", "History"]] as const;
  return (
    <div>
      <Link to="/funds" className="back">← Funds</Link>
      <div className="profile-head">
        <Avatar text={initials(f.name)} size={52} />
        <div className="grow" style={{ minWidth: 200 }}>
          <h1 className="profile-name">{f.name}</h1>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>13F institutional manager · <span className="mono">CIK {f.cik}</span></div>
        </div>
        {r && <button type="button" className="btn soft" onClick={() => openExplain(r.accession, `${f.name} · ${quarter(r.period_of_report)}`)}>Explain latest filing</button>}
        <FollowButton type="fund" entityKey={f.cik} name={f.name} />
      </div>
      {r ? (
        <>
          <Freshness items={[["Latest period", quarter(r.period_of_report)], ...filedItems(r)]} source={r.sec_url} />
          <div className="stats">
            <div className="card stat">
              <div className="stat-label">Latest report</div>
              <div className="stat-val">{quarter(r.period_of_report)}</div>
              <div className="stat-sub">{r.form_type}{r.amendment_type ? ` · ${r.amendment_type}` : ""}</div>
            </div>
            <div className="card stat">
              <div className="stat-label">Reported rows</div>
              <div className="stat-val">{count(r.table_entry_total)}</div>
              <div className="stat-sub">Information-table entries</div>
            </div>
            <div className="card stat">
              <div className="stat-label">Cover total</div>
              <div className="stat-val">{r.table_value_total === null ? "—" : shares(r.table_value_total)}</div>
              <div className="stat-sub">{r.value_unit ? `As reported, in ${r.value_unit}` : "As reported"}</div>
            </div>
            <div className="card stat">
              <div className="stat-label">Other managers</div>
              <div className="stat-val">{count(r.other_manager_count)}</div>
              <div className="stat-sub">{r.suspect ? "Report flagged — check source" : r.report_type}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="notice" style={{ marginBottom: 18 }}>No parsed 13F report is on record for this fund yet.</div>
      )}
      <nav className="tabs noscroll" aria-label="Fund sections">
        {tabs.map(([id, label]) => (
          <Link key={id} to={`/funds/${cik}/${id}`} aria-current={tab === id ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {tab === "changes" ? <Changes cik={cik} /> : tab === "history" ? <History cik={cik} /> : <Portfolio cik={cik} />}
    </div>
  );
}
