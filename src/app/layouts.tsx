import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import type { AlertEvent, Page } from "@/api/types";
import { ExplainDrawer, Toast, UpgradeModal } from "@/components/Overlays";
import { usePortal } from "@/features/billing";
import { useLogout, useMe, useSyncThemeFromAccount, useUpdatePreferences } from "@/features/session";
import { resolveTheme, useTheme } from "@/features/theme";
import { useUi } from "@/features/ui-store";
import { GlobalSearch } from "./GlobalSearch";

export const DISCLAIMER = "Data from public SEC filings. Not investment advice.";

const NAV = [
  ["Dashboard", "/dashboard"],
  ["Activity", "/activity"],
  ["Funds", "/funds"],
  ["Insiders", "/insiders"],
  ["Screener", "/screener"],
  ["Watchlist", "/watchlist"],
  ["Alerts", "/alerts"],
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const me = useMe().data;
  const save = useUpdatePreferences();
  const dark = resolveTheme(theme) === "dark";
  const toggle = () => {
    const next = dark ? "light" : "dark";
    setTheme(next);
    if (me) save.mutate({ theme: next });
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title="Toggle theme">
      <span aria-hidden="true">{dark ? "☀" : "☾"}</span>
    </button>
  );
}

function useUnreadAlerts(enabled: boolean) {
  return useQuery({
    queryKey: ["alert-events", "unread-count"],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => (await api.get<Page<AlertEvent>>("/alert-events", { unread: true, limit: 1 })).meta.total_count,
  });
}

function AvatarMenu() {
  const me = useMe().data!;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const logout = useLogout();
  const portal = usePortal();
  const openUpgrade = useUi((s) => s.openUpgrade);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = (label: string, fn: () => void, hint?: string) => (
    <button
      type="button"
      role="menuitem"
      className="menu-item"
      onClick={() => {
        setOpen(false);
        fn();
      }}
    >
      <span>{label}</span>
      {hint && <span className="faint" style={{ fontSize: 11 }}>{hint}</span>}
    </button>
  );

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button type="button" className="avatar round" style={{ width: 30, height: 30, border: "none", cursor: "pointer", background: "var(--accSoft)", color: "var(--accInk)", fontFamily: "var(--font-ui)", fontSize: 11 }} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen((o) => !o)}>
        {me.email.slice(0, 2).toUpperCase()}
      </button>
      {open && (
        <div className="pop menu" role="menu">
          <div className="menu-head">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{me.plan === "pro" ? "Pro plan" : "Free plan"}</div>
            <div className="truncate faint" style={{ fontSize: 11.5 }}>{me.email}</div>
          </div>
          {item("Settings", () => navigate("/settings"))}
          {item("Manage plan", () => (me.plan === "pro" ? portal.mutate() : openUpgrade()), me.plan === "pro" ? "Pro" : "Free")}
          {item("Alert rules", () => navigate("/alerts"))}
          {item("Sign out", () => logout.mutate(undefined, { onSettled: () => navigate("/login") }))}
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const me = useMe().data;
  useSyncThemeFromAccount();
  const unread = useUnreadAlerts(!!me).data ?? 0;
  const openUpgrade = useUi((s) => s.openUpgrade);

  const links = NAV.map(([label, to]) => (
    <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
      {label}
      {to === "/alerts" && unread > 0 && (
        <>
          <span className="nav-dot" aria-hidden="true" />
          <span className="sr-only">{unread} unread</span>
        </>
      )}
    </NavLink>
  ));

  return (
    <div className="shell">
      <a href="#main" className="sr-only">Skip to content</a>
      <header className="hdr">
        <div className="hdr-in">
          <Link to={me ? "/dashboard" : "/"} className="wordmark">
            <span className="hide-sm">InsideLedger</span>
            <span className="show-sm" aria-hidden="true">IL</span>
          </Link>
          <nav className="nav" aria-label="Primary">{links}</nav>
          <GlobalSearch />
          <div className="row" style={{ flex: "none", marginLeft: "auto" }}>
            <ThemeToggle />
            {me?.plan === "free" && (
              <div className="row hide-md" style={{ gap: 8, padding: "4px 4px 4px 10px", border: "1px solid var(--line)", borderRadius: 999, background: "var(--surf)" }}>
                <span className="muted" style={{ fontSize: 11, fontWeight: 600 }}>Free plan</span>
                <button type="button" className="btn primary sm pill-cta" style={{ borderRadius: 999, minHeight: 0 }} onClick={() => openUpgrade()}>
                  Upgrade
                </button>
              </div>
            )}
            {me?.plan === "pro" && <span className="badge acc pill">PRO</span>}
            {me ? (
              <AvatarMenu />
            ) : (
              <Link to="/login" className="btn sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
        <nav className="subnav noscroll" aria-label="Primary">{links}</nav>
      </header>
      <main className="main" id="main">
        <Outlet />
      </main>
      <footer className="foot">
        <div className="foot-in">
          <div>
            For informational purposes only. This platform aggregates, organizes, and analyzes publicly available regulatory filings. It does not provide investment advice, recommendations, or personalized financial guidance. Reported holdings may be delayed and may not reflect current positions.
          </div>
          <div className="row wrap" style={{ gap: 14 }}>
            <span>InsideLedger · {DISCLAIMER}</span>
            <Link to="/methodology">Methodology</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
      <UpgradeModal />
      <ExplainDrawer />
      <Toast />
      <ScrollRestoration />
    </div>
  );
}

export function MarketingLayout() {
  const me = useMe().data;
  const nav = ({ isActive }: { isActive: boolean }) => `navlink ${isActive ? "active" : ""}`;
  return (
    <div className="shell mkt">
      <a href="#main" className="sr-only">Skip to content</a>
      <header>
        <div className="mwrap dateline">
          <span><em>Form 4 and 13F filings,</em> set down as they are reported.</span>
          <ThemeToggle />
        </div>
        <div className="mwrap mast-title">
          <Link to="/" className="wordmark">InsideLedger</Link>
        </div>
        <div className="mast-rule" />
        <nav className="mwrap mast-nav" aria-label="Main">
          <NavLink to="/" end className={nav}>Product</NavLink>
          <NavLink to="/pricing" className={nav}>Pricing</NavLink>
          <NavLink to="/methodology" className={nav}>Methodology</NavLink>
          <span className="navsep" aria-hidden="true" />
          {me ? (
            <Link to="/dashboard" className="btn primary">Open dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="navlink strong">Sign in</Link>
              <Link to="/signup" className="btn primary">Get started</Link>
            </>
          )}
        </nav>
      </header>
      <main style={{ flex: 1 }} id="main">
        <Outlet />
      </main>
      <footer className="mfoot">
        <div className="mwrap" style={{ paddingBlock: "48px 28px", textAlign: "center" }}>
          <div className="wordmark" style={{ fontSize: 24 }}>InsideLedger</div>
          <div className="muted" style={{ fontSize: 14, margin: "10px auto 26px", maxWidth: 320 }}>Insider and institutional filings, set down in plain order.</div>
          <div className="orn" style={{ maxWidth: 320, margin: "0 auto 30px" }} aria-hidden="true" />
          <div className="foot-cols">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <div className="disp" style={{ fontSize: 22, marginBottom: 2 }}>Product</div>
              <Link to="/dashboard" className="footlink">Dashboard</Link>
              <Link to="/pricing" className="footlink">Pricing</Link>
              <Link to="/methodology" className="footlink">Methodology</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <div className="disp" style={{ fontSize: 22, marginBottom: 2 }}>Legal</div>
              <Link to="/terms" className="footlink">Terms of Service</Link>
              <Link to="/privacy" className="footlink">Privacy Policy</Link>
            </div>
          </div>
          <div className="faint" style={{ marginTop: 36, paddingTop: 18, borderTop: "1px solid var(--line)", fontSize: 13 }}>
            {DISCLAIMER} © 2026 InsideLedger
          </div>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  );
}

export function AuthLayout() {
  return (
    <div className="auth mkt">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 28px" }}>
        <Link to="/" className="wordmark" style={{ fontSize: 22 }}>InsideLedger</Link>
        <ThemeToggle />
      </div>
      <div className="auth-body">
        <Outlet />
      </div>
      <Toast />
    </div>
  );
}
