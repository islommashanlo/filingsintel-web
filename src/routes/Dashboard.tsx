import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { usePaged } from "@/api/hooks";
import type { ActivityEvent, Dashboard as DashboardData } from "@/api/types";
import { ActivityRow } from "@/components/ActivityRow";
import { AlertBuilder } from "@/components/Overlays";
import { Avatar, Empty, ErrorState, Money, PageHead, Pro, Seg, SkeletonRows } from "@/components/ui";
import { useMe, usePreferences } from "@/features/session";
import { useUi } from "@/features/ui-store";
import { ENTITY_LABEL, profilePath, useWatchlist } from "@/features/watchlist";
import { count, date, initials, quarter, relative } from "@/lib/format";
import { useParams2 } from "@/lib/params";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const me = useMe().data!;
  const { get, set } = useParams2();
  const days = get("days", "30");
  const scope = get("scope", "watchlist");
  const layout = usePreferences().data?.dashboard_layout ?? "split";
  const [builder, setBuilder] = useState(false);
  const openUpgrade = useUi((s) => s.openUpgrade);
  const watchlist = useWatchlist().data ?? [];

  const dash = useQuery({
    queryKey: ["dashboard", days],
    queryFn: () => api.get<DashboardData>("/dashboard", { days, limit: 10 }),
  });
  const all = usePaged<ActivityEvent>(["activity", "dashboard-all"], "/activity", { limit: 10 }, { enabled: scope === "all" });

  const d = dash.data?.data;
  const deadline = d?.upcoming_deadlines[0];
  const feed = scope === "all" ? all.rows : (d?.watchlist_activity.data ?? []);
  const feedLoading = scope === "all" ? all.isPending : dash.isPending;
  const feedError = scope === "all" ? all.error : dash.error;

  return (
    <div>
      <PageHead
        title={greeting()}
        sub={
          d
            ? `${count(d.summary.form4_filings)} Form 4 filings and ${count(d.summary.institutional_reports)} 13F reports in the last ${days} days · ${count(d.summary.watchlist_activity_events)} on your watchlist`
            : "Reported activity from the companies, funds and insiders you follow"
        }
      >
        <Seg label="Window" value={days} onChange={(v) => set({ days: v === "30" ? null : v })} options={[{ value: "7", label: "7d" }, { value: "30", label: "30d" }, { value: "90", label: "90d" }]} />
        <button type="button" className="btn primary" onClick={() => setBuilder(true)}>
          + New alert
        </button>
      </PageHead>

      <div className="dashgrid" data-layout={layout}>
        <div style={{ gridArea: "feed", minWidth: 0 }}>
          <section className="card" aria-label="Activity feed">
            <div className="card-head">
              <div className="grow" style={{ minWidth: 160 }}>
                <h2 className="card-title">Activity feed</h2>
                <div className="card-sub">Institutional and insider filings, newest first</div>
              </div>
              <Seg label="Feed scope" value={scope} onChange={(v) => set({ scope: v === "watchlist" ? null : v })} options={[{ value: "watchlist", label: "Watchlist" }, { value: "all", label: "All filings" }]} />
            </div>
            {feedLoading && <SkeletonRows rows={6} />}
            {feedError && <ErrorState error={feedError} retry={() => (scope === "all" ? all.refetch() : dash.refetch())} />}
            {!feedLoading && !feedError && feed.length === 0 && (
              <Empty title={watchlist.length === 0 ? "Your watchlist is empty." : "No reported activity in this window."} sub={watchlist.length === 0 ? "Follow companies, funds or insiders to build your feed." : "Try a longer window or view all filings."}>
                {watchlist.length === 0 ? (
                  <Link to="/onboarding" className="btn primary">Choose who to follow</Link>
                ) : (
                  <button type="button" className="btn" onClick={() => set({ scope: "all" })}>View all filings</button>
                )}
              </Empty>
            )}
            {feed.map((e) => (
              <ActivityRow key={e.id} event={e} />
            ))}
            {feed.length > 0 && (
              <Link to={scope === "all" ? "/activity" : "/activity?watchlist_only=true"} className="tbl-foot">
                View all activity →
              </Link>
            )}
          </section>
        </div>

        <section className="card card-pad" style={{ gridArea: "deadline" }} aria-label="Upcoming deadline">
          <div className="eyebrow">Upcoming</div>
          {deadline ? (
            <>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 6 }}>
                {quarter(deadline.period_of_report).split(" ")[0]} 13F filings due <span style={{ color: "var(--acc)" }}>{date(deadline.due_date).replace(/, \d{4}$/, "")}</span>
              </div>
              <div className="progress" role="img" aria-label={`${deadline.days_remaining} days remaining`}>
                <i style={{ width: `${Math.max(4, Math.min(100, ((45 - deadline.days_remaining) / 45) * 100))}%` }} />
              </div>
              <div className="row muted" style={{ justifyContent: "space-between", fontSize: 11.5 }}>
                <span>Period ending {date(deadline.period_of_report)}</span>
                <span>{deadline.days_remaining === 0 ? "Due today" : `${deadline.days_remaining} days left`}</span>
              </div>
              <div className="faint" style={{ fontSize: 11, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--lineSoft)" }}>
                Regular quarterly deadline, Eastern time. Funds that have not filed yet show their prior quarter. <a href={deadline.source_url} target="_blank" rel="noopener noreferrer">SEC guidance ↗</a>
              </div>
            </>
          ) : (
            <div className="muted" style={{ marginTop: 6, fontSize: 12.5 }}>{dash.isPending ? "Loading…" : "No deadline available."}</div>
          )}
        </section>

        <section className="card clip" style={{ gridArea: "cluster" }} aria-label="Cluster activity">
          <div className="card-head" style={{ alignItems: "flex-start", paddingBottom: 10 }}>
            <div className="grow">
              <h2 className="card-title">Cluster activity</h2>
              <div className="card-sub">3+ insiders reported open-market trades within 14 days</div>
            </div>
            <Link to="/insiders?tab=clusters" style={{ fontSize: 12, fontWeight: 600 }}>View all →</Link>
          </div>
          {d?.top_clusters.data.map((c) => (
            <Link key={c.id} to={c.issuer.ticker ? `/companies/${encodeURIComponent(c.issuer.ticker)}` : "/insiders?tab=clusters"} className="list-row">
              <span className="tick">{c.issuer.ticker ?? "—"}</span>
              <span className="muted truncate grow" style={{ fontSize: 12 }}>
                {c.insider_count} insiders · {relative(c.window_end)}
              </span>
              <span className={`badge pill ${c.direction === "purchase" ? "up" : "dn"}`}>{c.direction === "purchase" ? "Purchases" : "Sales"}</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 600, width: 56, textAlign: "right" }}>
                <Money value={c.total_value ?? c.known_value_subtotal} />
              </span>
            </Link>
          ))}
          {d && d.top_clusters.data.length === 0 && <div className="faint" style={{ padding: "18px 16px", fontSize: 12, textAlign: "center" }}>No cluster windows in the last {days} days.</div>}
          {dash.isPending && <SkeletonRows rows={3} />}
        </section>

        <section className="card clip" style={{ gridArea: "whale" }} aria-label="Unusual institutional activity">
          <div className="card-head" style={{ alignItems: "flex-start", paddingBottom: 10 }}>
            <div className="grow">
              <h2 className="card-title row" style={{ gap: 7 }}>
                Unusual institutional activity {me.plan === "free" && <Pro />}
              </h2>
              <div className="card-sub">Reported changes that stand out against each company’s own history</div>
            </div>
          </div>
          {d?.top_unusual.data.length ? (
            d.top_unusual.data.map((e) => <ActivityRow key={e.id} event={e} />)
          ) : (
            <div className="faint" style={{ padding: "18px 16px", fontSize: 12 }}>
              Activity Scores are not active yet, so there is nothing to rank here. Scoring needs market data that is not connected. See the <Link to="/methodology">methodology</Link>.
            </div>
          )}
          {me.plan === "free" && (
            <div className="row" style={{ padding: "10px 16px", background: "var(--lineSoft)" }}>
              <span className="muted grow" style={{ fontSize: 11.5 }}>Free shows the first result once scoring is active.</span>
              <button type="button" className="btn sm" onClick={() => openUpgrade("unusual_activity_results")}>Unlock with Pro</button>
            </div>
          )}
        </section>

        <section className="card clip" style={{ gridArea: "watch" }} aria-label="Your watchlist">
          <div className="card-head" style={{ justifyContent: "space-between" }}>
            <div>
              <h2 className="card-title">Your watchlist</h2>
              <div className="card-sub">
                {watchlist.length}
                {me.limits.watchlist_items !== null ? ` of ${me.limits.watchlist_items}` : ""} followed
              </div>
            </div>
            <Link to="/watchlist" style={{ fontSize: 12, fontWeight: 600 }}>Open →</Link>
          </div>
          {watchlist.slice(0, 6).map((w) => (
            <Link key={w.id} to={profilePath(w.entity_type, w.entity_key)} className="list-row" style={{ padding: "9px 16px" }}>
              <Avatar text={w.entity_type === "issuer" ? w.entity_key : initials(w.name)} size={24} round={w.entity_type === "person"} />
              <span className="truncate grow" style={{ fontSize: 12, fontWeight: 600 }}>{w.name}</span>
              <span className="faint" style={{ fontSize: 10.5 }}>{ENTITY_LABEL[w.entity_type]}</span>
            </Link>
          ))}
          {watchlist.length === 0 && <div className="faint" style={{ padding: "20px 16px", fontSize: 12, textAlign: "center" }}>No companies, funds, or insiders in your watchlist yet.</div>}
        </section>

        {me.plan === "free" && (
          <section className="card card-pad" style={{ gridArea: "pro" }} aria-label="Screener">
            <div className="row" style={{ gap: 8 }}>
              <h2 className="card-title">Screener</h2>
              <Pro />
            </div>
            <p className="muted" style={{ fontSize: 12, margin: "4px 0 10px" }}>
              Filter companies, insiders and funds by reported filing activity. Free previews the first 3 results; Pro shows all results and saves screens.
            </p>
            <Link to="/screener" className="btn sm">Preview screener</Link>
          </section>
        )}
      </div>
      {builder && <AlertBuilder onClose={() => setBuilder(false)} />}
    </div>
  );
}
