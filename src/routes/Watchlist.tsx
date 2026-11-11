import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api, errorMessage } from "@/api/client";
import type { AlertRule, EntityType, Page } from "@/api/types";
import { AlertBuilder } from "@/components/Overlays";
import { Avatar, Empty, ErrorState, PageHead, Seg, SkeletonRows } from "@/components/ui";
import { useMe } from "@/features/session";
import { toast, useUi } from "@/features/ui-store";
import { ENTITY_LABEL, profilePath, useFollow, useWatchlist } from "@/features/watchlist";
import { date, initials } from "@/lib/format";

export function useAlertRules() {
  return useQuery({
    queryKey: ["alert-rules"],
    queryFn: () => api.get<Page<AlertRule, { limits: { alert_rules: number | null }; capabilities: { instant_alerts: boolean } }>>("/alert-rules", { limit: 100 }),
  });
}

export function useRuleToggle() {
  const qc = useQueryClient();
  const openUpgrade = useUi((s) => s.openUpgrade);
  return useMutation({
    mutationFn: (v: { id: number; active: boolean }) => api.patch(`/alert-rules/${v.id}`, { active: v.active }),
    onError: (e) => {
      if (e instanceof ApiError && e.proRequired) openUpgrade(e.feature);
      else if (e instanceof ApiError && e.code === "ALERT_CONFIGURATION_REQUIRED") toast("Turn on email notifications in Settings before activating alerts.");
      else toast(errorMessage(e));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["alert-rules"] }),
  });
}

export default function Watchlist() {
  const me = useMe().data!;
  const list = useWatchlist();
  const rules = useAlertRules().data?.data ?? [];
  const { remove } = useFollow();
  const toggle = useRuleToggle();
  const [tab, setTab] = useState<"all" | EntityType>("all");
  const [builderFor, setBuilderFor] = useState<number | null>(null);
  const items = list.data ?? [];
  const shown = tab === "all" ? items : items.filter((i) => i.entity_type === tab);
  const limit = me.limits.watchlist_items;

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHead title="Watchlist" sub="Companies, funds and insiders you follow. Their filings appear in your dashboard feed.">
        <Link to="/settings/notifications" className="btn">Notification settings</Link>
        <Link to="/onboarding" className="btn primary">+ Add to Watchlist</Link>
      </PageHead>
      {list.isPending && <div className="card clip"><SkeletonRows rows={5} /></div>}
      {list.error && <div className="card"><ErrorState error={list.error} retry={() => list.refetch()} /></div>}
      {list.isSuccess && items.length === 0 && (
        <div className="card">
          <Empty title="No companies, funds, or insiders in your watchlist yet." sub="Add them from any company, fund or insider page, or browse recent filings.">
            <Link to="/activity" className="btn primary">Explore Activity</Link>
          </Empty>
        </div>
      )}
      {items.length > 0 && (
        <>
          <div className="row wrap" style={{ marginBottom: 12 }}>
            <Seg label="Group" value={tab} onChange={setTab} options={[{ value: "all", label: `All ${items.length}` }, { value: "issuer", label: "Companies" }, { value: "fund", label: "Funds" }, { value: "person", label: "Insiders" }]} />
            <span className="faint" style={{ marginLeft: "auto", fontSize: 11.5 }}>
              {limit !== null ? `${items.length} of ${limit} on the Free plan` : `${items.length} followed`}
            </span>
          </div>
          <section className="card clip" aria-label="Watchlist">
            {shown.map((w) => {
              const rule = rules.find((r) => r.follow_id === w.id);
              const on = !!rule?.active;
              return (
                <div className="list-row" key={w.id}>
                  <Avatar text={w.entity_type === "issuer" ? w.entity_key : initials(w.name)} size={34} round={w.entity_type === "person"} />
                  <Link to={profilePath(w.entity_type, w.entity_key)} className="grow" style={{ color: "var(--ink)" }}>
                    <span className="row" style={{ gap: 8 }}>
                      <b className="truncate">{w.name}</b>
                      <span className="badge">{ENTITY_LABEL[w.entity_type]}</span>
                    </span>
                    <span className="faint mono" style={{ fontSize: 11 }}>{w.entity_type === "issuer" ? w.entity_key : `CIK ${w.entity_key}`} · followed {date(w.created_at)}</span>
                  </Link>
                  <button
                    type="button"
                    className={`icon-btn ${on ? "on" : ""}`}
                    aria-pressed={on}
                    aria-label={on ? `Pause email alerts for ${w.name}` : `Email me about new filings from ${w.name}`}
                    title={on ? "Email alerts on" : "Email alerts off"}
                    onClick={() => (rule ? toggle.mutate({ id: rule.id, active: !rule.active }) : setBuilderFor(w.id))}
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.5a3.6 3.6 0 0 0-3.6 3.6c0 3-1.4 4-1.4 4h10s-1.4-1-1.4-4A3.6 3.6 0 0 0 7 1.5zM5.6 11.3a1.5 1.5 0 0 0 2.8 0" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Remove ${w.name} from watchlist`} title="Remove from watchlist" onClick={() => remove.mutate(w)}>×</button>
                </div>
              );
            })}
            {shown.length === 0 && <div className="faint" style={{ padding: 22, textAlign: "center", fontSize: 12 }}>Nothing in this group yet.</div>}
          </section>
        </>
      )}
      {builderFor !== null && <AlertBuilder presetFollowId={builderFor} onClose={() => setBuilderFor(null)} />}
    </div>
  );
}
