import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, api, errorMessage } from "@/api/client";
import type { AlertRule, Explanation, NotificationPreferences } from "@/api/types";
import { FEATURE_TITLE, FREE_FEATURES, PRO_FEATURES, useCheckout } from "@/features/billing";
import { useIsPro, useMe } from "@/features/session";
import { toast, useUi } from "@/features/ui-store";
import { ENTITY_LABEL, useWatchlist } from "@/features/watchlist";
import { dateTimeET } from "@/lib/format";
import { Modal, Pro, SourceLink } from "./ui";

export function Toast() {
  const message = useUi((s) => s.toast);
  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

export function UpgradeModal() {
  const upgrade = useUi((s) => s.upgrade);
  const close = useUi((s) => s.closeUpgrade);
  const me = useMe().data;
  const navigate = useNavigate();
  const checkout = useCheckout();
  if (!upgrade) return null;
  const title = (upgrade.feature && FEATURE_TITLE[upgrade.feature]) || "Upgrade to InsideLedger Pro";
  const go = () => {
    if (!me) {
      close();
      navigate("/signup");
    } else checkout.mutate("month");
  };
  return (
    <Modal
      wide
      onClose={close}
      title={
        <span className="row">
          {title} <Pro />
        </span>
      }
      footer={
        <>
          <span className="faint grow" style={{ fontSize: 11.5 }}>
            Cancel anytime from Plan &amp; billing.
          </span>
          <button type="button" className="btn" onClick={close}>
            Not now
          </button>
          <button type="button" className="btn primary" disabled={checkout.isPending} onClick={go}>
            {checkout.isPending ? "Opening checkout…" : "Upgrade to Pro"}
          </button>
        </>
      }
    >
      <p className="muted" style={{ fontSize: 12.5 }}>
        Same SEC data on both plans. Pro removes the limits and adds research tools.
      </p>
      <div className="cols" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="card card-pad">
          <div className="eyebrow">Free</div>
          <div className="price" style={{ fontSize: 26 }}>
            $0
          </div>
          {FREE_FEATURES.map((f) => (
            <div className="feat" key={f}>
              {f}
            </div>
          ))}
        </div>
        <div className="card card-pad" style={{ borderColor: "var(--acc)" }}>
          <div className="eyebrow">Pro</div>
          <div className="price" style={{ fontSize: 26 }}>
            $19.99<span className="faint" style={{ fontSize: 12, fontWeight: 500 }}>/month</span>
          </div>
          {PRO_FEATURES.map((f) => (
            <div className="feat" key={f}>
              {f}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/** Factual, cached summary of one filing. The body is plain text from the API. */
export function ExplainDrawer() {
  const target = useUi((s) => s.explain);
  const close = useUi((s) => s.closeExplain);
  const q = useQuery({
    queryKey: ["explanation", target?.accession],
    enabled: !!target,
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: async () => (await api.post<{ data: Explanation }>(`/filings/${target!.accession}/explanation`, {})).data,
  });
  if (!target) return null;
  const ex = q.data;
  const unsupported = q.error instanceof ApiError && (q.error.code === "EXPLANATION_UNSUPPORTED" || q.error.code === "FILING_NOT_READY");
  return (
    <Modal
      drawer
      onClose={close}
      title={
        <div>
          <div className="row">
            Explain filing <span className="badge acc">SUMMARY</span>
          </div>
          {target.title && (
            <div className="muted" style={{ fontSize: 12.5, fontWeight: 500, marginTop: 2 }}>
              {target.title}
            </div>
          )}
        </div>
      }
    >
      {q.isPending && (
        <div aria-busy="true">
          {[92, 100, 84, 96, 60].map((w, i) => (
            <span key={i} className="sk" style={{ width: `${w}%`, marginBottom: 10 }} />
          ))}
        </div>
      )}
      {q.error && (
        <div className="notice" role="alert">
          {unsupported ? (q.error as ApiError).code === "FILING_NOT_READY" ? "This filing hasn’t finished processing yet." : "A summary isn’t available for this form type." : errorMessage(q.error)}
        </div>
      )}
      {ex && (
        <>
          <section>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              Summary
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-line" }}>{ex.body}</p>
          </section>
          <section>
            <div className="eyebrow" style={{ marginBottom: 2 }}>
              Filing details
            </div>
            <div className="kv">
              <span>Form</span>
              <span className="mono">{ex.form_type}</span>
            </div>
            <div className="kv">
              <span>Accession</span>
              <span className="mono">{ex.accession}</span>
            </div>
            <div className="kv">
              <span>Filed</span>
              <span>{dateTimeET(ex.filed_at)}</span>
            </div>
            <div className="kv">
              <span>Period of report</span>
              <span>{ex.period_of_report ?? "—"}</span>
            </div>
            <div className="kv">
              <span>Generated by</span>
              <span>{ex.generation_method === "template" ? "Rule-based template" : ex.model}</span>
            </div>
          </section>
          <SourceLink href={ex.source_url || ex.sec_url}>View original filing on EDGAR</SourceLink>
          <p className="faint" style={{ fontSize: 11 }}>
            Summaries are generated from stored public filing data and may be incomplete. Review the original filing for complete details. {ex.disclaimer}
          </p>
        </>
      )}
    </Modal>
  );
}

/**
 * Alert builder. The API currently supports one trigger (a new filing from a
 * followed entity) and one channel (email); other triggers stay visibly pending.
 */
export function AlertBuilder({ onClose, presetFollowId }: { onClose: () => void; presetFollowId?: number }) {
  const qc = useQueryClient();
  const isPro = useIsPro();
  const openUpgrade = useUi((s) => s.openUpgrade);
  const follows = useWatchlist().data ?? [];
  const prefs = useQuery({ queryKey: ["notification-preferences"], queryFn: async () => (await api.get<{ data: NotificationPreferences }>("/me/notification-preferences")).data });
  const [followId, setFollowId] = useState<number | "">(presetFollowId ?? "");
  const [frequency, setFrequency] = useState<"daily_digest" | "instant">("daily_digest");
  const emailReady = !!prefs.data?.email_enabled && !!prefs.data.time_zone;
  const follow = follows.find((f) => f.id === followId);

  const create = useMutation({
    mutationFn: () => api.post<{ data: AlertRule }>("/alert-rules", { follow_id: followId, trigger: "new_filing", channels: ["email"], conditions: {}, frequency, active: emailReady }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alert-rules"] });
      toast(emailReady ? "Alert created" : "Alert saved as paused. Turn on email in Settings to activate it.");
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.proRequired) {
        onClose();
        openUpgrade(e.feature);
      }
    },
  });

  return (
    <Modal
      title="Create alert"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={followId === "" || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Creating…" : "Create alert"}
          </button>
        </>
      }
    >
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          1 · Trigger
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button type="button" className="radio" role="radio" aria-checked="true">
            <span className="radio-dot" />
            <span className="grow">New filing</span>
            <span className="formchip">Form 4 · 13F</span>
          </button>
          {["Insider purchase above a threshold", "New 13F position", "Cluster activity"].map((t) => (
            <button key={t} type="button" className="radio" role="radio" aria-checked="false" disabled>
              <span className="radio-dot" />
              <span className="grow">{t}</span>
              <span className="badge">Not yet available</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="eyebrow" htmlFor="ab-entity" style={{ display: "block", marginBottom: 8 }}>
          2 · From your watchlist
        </label>
        {follows.length === 0 ? (
          <div className="notice">
            Alerts are tied to something you follow. <Link to="/watchlist" onClick={onClose}>Add to your watchlist first</Link>
          </div>
        ) : (
          <select id="ab-entity" className="select" value={followId} onChange={(e) => setFollowId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Choose a company, fund or insider</option>
            {follows.filter((f) => f.id > 0).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({ENTITY_LABEL[f.entity_type]})
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          3 · Email delivery
        </div>
        <div className="row wrap">
          <button type="button" className="chip" aria-pressed={frequency === "daily_digest"} onClick={() => setFrequency("daily_digest")}>
            Daily digest · 7:00 AM
          </button>
          <button type="button" className="chip" aria-pressed={frequency === "instant"} onClick={() => (isPro ? setFrequency("instant") : openUpgrade("instant_alerts"))}>
            Instant {!isPro && <Pro />}
          </button>
        </div>
      </div>
      {follow && (
        <p style={{ fontSize: 12.5 }}>
          <span className="muted">You’ll be notified when </span>
          <b>{follow.name}</b> appears in a new SEC filing, {frequency === "instant" ? "as soon as it is processed" : "in your next daily digest"}.
        </p>
      )}
      {prefs.data && !emailReady && (
        <div className="notice">
          Email notifications are off, so this rule will be saved as paused.
          <Link to="/settings/notifications" onClick={onClose}>
            Notification settings →
          </Link>
        </div>
      )}
      {create.error && !(create.error instanceof ApiError && create.error.proRequired) && (
        <div className="err" role="alert">
          {errorMessage(create.error)}
        </div>
      )}
    </Modal>
  );
}
