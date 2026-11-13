import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { NavLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError, api, errorMessage } from "@/api/client";
import type { NotificationPreferences, Preferences, Subscription } from "@/api/types";
import { PageHead, Pro, Seg, Toggle } from "@/components/ui";
import { PRO_FEATURES, useCheckout, usePortal } from "@/features/billing";
import { useMe, usePreferences, useUpdateAccount, useUpdatePreferences } from "@/features/session";
import { useTheme, type Theme } from "@/features/theme";
import { toast } from "@/features/ui-store";
import { date } from "@/lib/format";

const TABS = [["account", "Account"], ["notifications", "Notifications"], ["billing", "Plan & billing"], ["appearance", "Appearance"]] as const;
const ZONES = [["America/New_York", "Eastern (New York)"], ["America/Chicago", "Central (Chicago)"], ["America/Denver", "Mountain (Denver)"], ["America/Los_Angeles", "Pacific (Los Angeles)"], ["Europe/London", "London"], ["Europe/Berlin", "Central Europe (Berlin)"], ["Asia/Singapore", "Singapore"], ["Asia/Tokyo", "Tokyo"]];

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 className="card-title">{title}</h2>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
      {children}
    </section>
  );
}

function Account() {
  const me = useMe().data!;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const update = useUpdateAccount();
  const [email, setEmail] = useState(me.email);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [del, setDel] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, string> = { current_password: current };
    if (email.trim().toLowerCase() !== me.email) body.email = email.trim();
    if (next) body.password = next;
    update.mutate(body, {
      onSuccess: () => {
        setCurrent("");
        setNext("");
        toast("Account updated. Other devices were signed out.");
      },
    });
  };
  const remove = useMutation({
    mutationFn: () => api.delete("/me", { current_password: del }),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(["me"], null);
      navigate("/");
    },
  });
  const changed = email.trim().toLowerCase() !== me.email || next.length > 0;
  const delMsg = remove.error instanceof ApiError && remove.error.code === "BILLING_CANCELLATION_REQUIRED" ? "Cancel your subscription from Plan & billing before deleting your account." : remove.error ? errorMessage(remove.error) : null;

  return (
    <>
      <Section title="Email and password" sub="Changes need your current password and sign out your other devices.">
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="cols" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label><span className="field-label">Email</span><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label><span className="field-label">New password</span><input className="input" type="password" autoComplete="new-password" minLength={8} placeholder="Leave blank to keep it" value={next} onChange={(e) => setNext(e.target.value)} /></label>
            <label><span className="field-label">Current password</span><input className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
          </div>
          {update.error && <div className="err" role="alert">{update.error instanceof ApiError && update.error.code === "REAUTHENTICATION_REQUIRED" ? "Current password is incorrect." : errorMessage(update.error)}</div>}
          <div><button type="submit" className="btn primary" disabled={!changed || !current || update.isPending}>{update.isPending ? "Saving…" : "Save changes"}</button></div>
        </form>
      </Section>
      <Section title="Delete account" sub="Removes your follows, alert rules and settings. This can’t be undone. Public filing data is not affected.">
        <form className="row wrap" onSubmit={(e) => { e.preventDefault(); if (window.confirm("Delete your account permanently?")) remove.mutate(); }}>
          <input className="input" style={{ maxWidth: 260 }} type="password" autoComplete="current-password" placeholder="Current password" aria-label="Current password to confirm deletion" value={del} onChange={(e) => setDel(e.target.value)} />
          <button type="submit" className="btn danger" disabled={!del || remove.isPending}>Delete account</button>
        </form>
        {delMsg && <div className="err" role="alert">{delMsg}</div>}
      </Section>
    </>
  );
}

function Notifications() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notification-preferences"], queryFn: async () => (await api.get<{ data: NotificationPreferences }>("/me/notification-preferences")).data });
  const save = useMutation({
    mutationFn: async (patch: { time_zone?: string; email_enabled?: boolean }) => (await api.patch<{ data: NotificationPreferences }>("/me/notification-preferences", patch)).data,
    onSuccess: (data) => qc.setQueryData(["notification-preferences"], data),
    onError: (e) => toast(errorMessage(e)),
  });
  const p = q.data;
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones = ZONES.some(([z]) => z === browserZone) ? ZONES : [[browserZone, `${browserZone} (this device)`], ...ZONES];
  return (
    <>
      <Section title="Email" sub="Email is off until you turn it on. Alert rules stay paused without it.">
        <label>
          <span className="field-label">Time zone</span>
          <select className="select" style={{ maxWidth: 320 }} value={p?.time_zone ?? ""} disabled={!p} onChange={(e) => save.mutate({ time_zone: e.target.value })}>
            <option value="" disabled>Choose a time zone</option>
            {zones.map(([z, l]) => <option key={z} value={z}>{l}</option>)}
          </select>
        </label>
        <div className="row">
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Email notifications</div>
            <div className="faint" style={{ fontSize: 11.5 }}>{p?.time_zone ? `Daily digests arrive at ${p.digest_local_time === "07:00" ? "7:00 AM" : p.digest_local_time} in your time zone.` : "Choose a time zone first."}</div>
          </div>
          <Toggle label="Email notifications" checked={!!p?.email_enabled} disabled={!p?.time_zone || save.isPending} onChange={(v) => save.mutate({ email_enabled: v })} />
        </div>
      </Section>
      <Section title="What to notify me about">
        <div className="row">
          <span className="grow muted">Alerts are set per company, fund or insider on your watchlist.</span>
          <NavLink to="/alerts" className="btn">Manage alert rules →</NavLink>
        </div>
      </Section>
    </>
  );
}

const SUB_STATUS: Record<string, string> = { active: "Active", trialing: "Trial", past_due: "Past due", canceled: "Canceled", unpaid: "Unpaid", paused: "Paused", incomplete: "Incomplete", incomplete_expired: "Expired" };

function Billing() {
  const me = useMe().data!;
  const qc = useQueryClient();
  const [sp] = useSearchParams();
  const checkout = useCheckout();
  const portal = usePortal();
  const q = useQuery({ queryKey: ["subscription"], queryFn: async () => (await api.get<{ data: { plan: "free" | "pro"; subscription: Subscription } }>("/billing/subscription")).data });
  const sub = q.data?.subscription;
  // Returning from checkout: access follows the verified subscription, so re-read both.
  const returned = sp.get("checkout");
  useEffect(() => {
    if (returned) qc.invalidateQueries({ queryKey: ["me"] });
  }, [returned, qc]);
  const isPro = me.plan === "pro";
  return (
    <>
      {returned === "success" && !isPro && <div className="notice">Thanks — your payment is being confirmed. Pro turns on as soon as the subscription is verified, usually within a minute.</div>}
      <Section title="Current plan">
        <div className="row wrap">
          <span style={{ fontSize: 18, fontWeight: 700 }}>{isPro ? "Pro" : "Free"}</span>
          {sub && <span className={`badge ${sub.status === "active" || sub.status === "trialing" ? "up" : "am"}`}>{SUB_STATUS[sub.status] ?? sub.status}</span>}
          <span className="grow" />
          {(isPro || sub) && <button type="button" className="btn" disabled={portal.isPending} onClick={() => portal.mutate()}>Manage plan</button>}
        </div>
        <div className="muted" style={{ fontSize: 12.5 }}>
          {sub?.cancel_at_period_end || sub?.cancel_at
            ? `Scheduled to end on ${date(sub.cancel_at ?? sub.current_period_end)}. You keep Pro until then.`
            : sub?.status === "trialing" && sub.trial_end
              ? `Trial ends ${date(sub.trial_end)}.`
              : sub?.status === "past_due"
                ? "The last payment didn’t go through. Update your payment method to restore Pro."
                : sub?.current_period_end && isPro
                  ? `Renews ${date(sub.current_period_end)}.`
                  : "15 watchlist items, 3 alert rules with daily digests, and a 3-result screener preview."}
        </div>
      </Section>
      {!isPro && (
        <section className="card card-pad" style={{ borderColor: "var(--acc)" }}>
          <div className="row" style={{ gap: 8 }}><span style={{ fontWeight: 700 }}>InsideLedger Pro</span><Pro /></div>
          <div className="price" style={{ fontSize: 28, margin: "6px 0" }}>$19.99<span className="faint" style={{ fontSize: 12, fontWeight: 500 }}>/month</span></div>
          <div className="cols" style={{ gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 12 }}>
            {PRO_FEATURES.map((f) => <div className="feat" key={f}>{f}</div>)}
          </div>
          <button type="button" className="btn primary" disabled={checkout.isPending} onClick={() => checkout.mutate("month")}>{checkout.isPending ? "Opening checkout…" : "Upgrade to Pro"}</button>
          <p className="faint" style={{ fontSize: 11, marginTop: 8 }}>Payment is handled by Stripe. Invoices and payment methods are managed there.</p>
        </section>
      )}
    </>
  );
}

function Appearance() {
  const prefs = usePreferences().data;
  const save = useUpdatePreferences();
  const { theme, setTheme } = useTheme();
  const set = (patch: Partial<Preferences>) => {
    if (patch.theme) setTheme(patch.theme);
    save.mutate(patch, { onError: (e) => toast(errorMessage(e)) });
  };
  return (
    <>
      <Section title="Theme" sub="System follows your device setting.">
        <Seg<Theme> label="Theme" value={prefs?.theme ?? theme} onChange={(v) => set({ theme: v })} options={[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
      </Section>
      <Section title="Dashboard layout" sub="The same modules in three arrangements.">
        <Seg label="Dashboard layout" value={prefs?.dashboard_layout ?? "split"} onChange={(v) => set({ dashboard_layout: v })} options={[{ value: "split", label: "Split · feed first" }, { value: "focus", label: "Focus · signals first" }, { value: "columns", label: "Columns" }]} />
      </Section>
    </>
  );
}

export default function Settings() {
  const { tab = "account" } = useParams();
  return (
    <div style={{ maxWidth: 900 }}>
      <PageHead title="Settings" sub="Manage your account, notifications and plan." />
      <div className="cols" style={{ gridTemplateColumns: "190px minmax(0,1fr)" }}>
        <nav aria-label="Settings sections" style={{ display: "flex", flexDirection: "column", gap: 2 }} className="nav-col">
          {TABS.map(([id, label]) => (
            <NavLink key={id} to={`/settings/${id}`} className="menu-item" style={tab === id ? { background: "var(--elev)", fontWeight: 600 } : undefined} aria-current={tab === id ? "page" : undefined}>{label}</NavLink>
          ))}
        </nav>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {tab === "notifications" ? <Notifications /> : tab === "billing" ? <Billing /> : tab === "appearance" ? <Appearance /> : <Account />}
        </div>
      </div>
    </div>
  );
}
