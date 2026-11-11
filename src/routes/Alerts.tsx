import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage } from "@/api/client";
import { usePaged } from "@/api/hooks";
import type { AlertEvent } from "@/api/types";
import { AlertBuilder } from "@/components/Overlays";
import { Empty, ErrorState, LoadMore, PageHead, SkeletonRows, SourceLink, Toggle } from "@/components/ui";
import { toast, useUi } from "@/features/ui-store";
import { ENTITY_LABEL, profilePath, useWatchlist } from "@/features/watchlist";
import { relative } from "@/lib/format";
import { useAlertRules, useRuleToggle } from "./Watchlist";

const STATUS = { pending: ["Queued", ""], sent: ["Sent", "up"], failed: ["Delivery failed", "dn"] } as const;

export default function Alerts() {
  const qc = useQueryClient();
  const [builder, setBuilder] = useState(false);
  const rulesQ = useAlertRules();
  const rules = rulesQ.data?.data ?? [];
  const limit = rulesQ.data?.meta.limits.alert_rules ?? null;
  const follows = useWatchlist().data ?? [];
  const toggle = useRuleToggle();
  const openExplain = useUi((s) => s.openExplain);
  const events = usePaged<AlertEvent>(["alert-events", "list"], "/alert-events", { limit: 25 });
  const nameOf = (type: string, key: string) => follows.find((f) => f.entity_type === type && f.entity_key === key)?.name ?? key;
  const refresh = () => qc.invalidateQueries({ queryKey: ["alert-events"] });

  const archive = useMutation({
    mutationFn: (id: number) => api.delete(`/alert-rules/${id}`),
    onError: (e) => toast(errorMessage(e)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["alert-rules"] }),
  });
  const read = useMutation({ mutationFn: (id: number) => api.post(`/alert-events/${id}/read`), onSettled: refresh });
  const readAll = useMutation({ mutationFn: () => api.post("/alert-events/read-all"), onSettled: refresh });
  const unread = events.rows.some((e) => !e.read_at);

  return (
    <div style={{ maxWidth: 820 }}>
      <PageHead title="Alerts" sub={limit !== null ? `${rules.length} of ${limit} alert rules on the Free plan` : "Email alerts for new filings from your watchlist"}>
        <button type="button" className="btn primary" onClick={() => setBuilder(true)}>+ Create alert</button>
      </PageHead>

      <section className="card clip" aria-label="Alert rules" style={{ marginBottom: 18 }}>
        <div className="card-head"><h2 className="card-title">Rules</h2></div>
        {rulesQ.isPending && <SkeletonRows rows={3} />}
        {rulesQ.error && <ErrorState error={rulesQ.error} retry={() => rulesQ.refetch()} />}
        {rulesQ.isSuccess && rules.length === 0 && (
          <Empty title="You haven’t created any alerts." sub="Get an email when someone on your watchlist appears in a new filing.">
            <button type="button" className="btn primary" onClick={() => setBuilder(true)}>Create Alert</button>
          </Empty>
        )}
        {rules.map((r) => (
          <div className="list-row" key={r.id}>
            <Toggle checked={r.active} label={`${r.active ? "Pause" : "Activate"} alert for ${nameOf(r.entity.type, r.entity.key)}`} onChange={(v) => toggle.mutate({ id: r.id, active: v })} />
            <div className="grow">
              <div className="row" style={{ gap: 8 }}>
                <Link to={profilePath(r.entity.type, r.entity.key)} style={{ color: "var(--ink)", fontWeight: 600 }} className="truncate">New filing · {nameOf(r.entity.type, r.entity.key)}</Link>
                <span className="badge">{ENTITY_LABEL[r.entity.type]}</span>
              </div>
              <div className="faint" style={{ fontSize: 11.5 }}>Email · {r.frequency === "instant" ? "Instant" : "Daily digest at 7:00 AM"} · {r.active ? "Active" : "Paused"}</div>
            </div>
            <button type="button" className="icon-btn" aria-label="Delete rule" title="Delete rule" onClick={() => archive.mutate(r.id)}>×</button>
          </div>
        ))}
      </section>

      <section className="card clip" aria-label="Alert history">
        <div className="card-head">
          <h2 className="card-title grow">History</h2>
          {unread && <button type="button" className="btn sm" disabled={readAll.isPending} onClick={() => readAll.mutate()}>Mark all as read</button>}
        </div>
        {events.isPending && <SkeletonRows rows={4} />}
        {events.error && <ErrorState error={events.error} retry={() => events.refetch()} />}
        {events.isSuccess && events.rows.length === 0 && <div className="faint" style={{ padding: 22, textAlign: "center", fontSize: 12 }}>No alerts have matched yet.</div>}
        {events.rows.map((e) => (
          <div className="list-row" key={e.id}>
            <span className="nav-dot" style={{ visibility: e.read_at ? "hidden" : "visible", flex: "none" }} aria-label={e.read_at ? undefined : "Unread"} />
            <div className="grow">
              <div className="row wrap" style={{ gap: 8 }}>
                <Link to={profilePath(e.entity.type, e.entity.key)} style={{ color: "var(--ink)", fontWeight: e.read_at ? 500 : 700 }}>{nameOf(e.entity.type, e.entity.key)}</Link>
                <span className="formchip">{e.form_type}</span>
                <span className={`badge ${STATUS[e.status][1]}`}>{STATUS[e.status][0]}</span>
              </div>
              <div className="faint row wrap" style={{ fontSize: 11.5, gap: 10 }}>
                <span>Matched {relative(e.created_at)}</span>
                <SourceLink href={e.sec_url} />
              </div>
            </div>
            <button type="button" className="btn soft sm hide-sm" onClick={() => openExplain(e.accession)}>Explain</button>
            {!e.read_at && <button type="button" className="icon-btn" aria-label="Mark as read" title="Mark as read" onClick={() => read.mutate(e.id)}>✓</button>}
          </div>
        ))}
        <LoadMore query={events} />
      </section>
      <p className="faint" style={{ fontSize: 11, marginTop: 12 }}>Alerts fire on new filings only. Threshold, new-position and cluster triggers are not available yet.</p>
      {builder && <AlertBuilder onClose={() => setBuilder(false)} />}
    </div>
  );
}
