import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import type { AlertEvent, Page } from "@/api/types";
import { ExplainDrawer, Toast, UpgradeModal } from "@/components/Overlays";
import { Logo } from "@/components/ui";
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
          <Link to={me ? "/dashboard" : "/"} className="brand">
            <Logo />
            <span className="hide-sm">FilingsIntel</span>
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
            <span>FilingsIntel · {DISCLAIMER}</span>
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
  return (
    <div className="shell mkt">
      <header className="hdr">
        <div className="hdr-in" style={{ maxWidth: 1200 }}>
          <Link to="/" className="brand">
            <Logo />
            FilingsIntel
          </Link>
          <nav className="nav" aria-label="Site" style={{ marginLeft: 12 }}>
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>Product</NavLink>
            <NavLink to="/pricing" className={({ isActive }) => (isActive ? "active" : "")}>Pricing</NavLink>
            <NavLink to="/methodology" className={({ isActive }) => (isActive ? "active" : "")}>Methodology</NavLink>
          </nav>
          <div className="row" style={{ marginLeft: "auto" }}>
            <ThemeToggle />
            {me ? (
              <Link to="/dashboard" className="btn primary">Open dashboard →</Link>
            ) : (
              <>
                <Link to="/login" className="btn hide-sm">Sign in</Link>
                <Link to="/signup" className="btn primary">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main style={{ flex: 1 }} id="main">
        <Outlet />
      </main>
      <footer className="foot">
        <div className="mkt-in" style={{ padding: 0 }}>
          <div className="cols" style={{ gridTemplateColumns: "1.4fr 1fr 1fr", padding: "14px 0 20px" }}>
            <div>
              <div className="brand"><Logo />FilingsIntel</div>
              <div style={{ marginTop: 8, fontSize: 12.5 }}>Insider and institutional filings, organized.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
              <span className="eyebrow">Product</span>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/methodology">Methodology</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
              <span className="eyebrow">Legal</span>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/privacy">Privacy Policy</Link>
            </div>
          </div>
          <div className="row wrap" style={{ justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <span>{DISCLAIMER}</span>
            <span>© 2026 FilingsIntel</span>
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
      <div className="hdr-in" style={{ width: "100%", maxWidth: 1200 }}>
        <Link to="/" className="brand">
          <Logo />
          FilingsIntel
        </Link>
        <span style={{ marginLeft: "auto" }}>
          <ThemeToggle />
        </span>
      </div>
      <div className="auth-body">
        <Outlet />
      </div>
      <Toast />
    </div>
  );
}
