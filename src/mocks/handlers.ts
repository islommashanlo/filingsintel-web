/** In-browser mock of the JSON API for local development and demos (VITE_API_MOCK=true). */
import { http, HttpResponse } from "msw";
import type { Account, AlertRule, EntityType, NotificationPreferences, PlanLimits, Preferences, WatchlistItem } from "@/api/types";
import * as fx from "./fixtures";

const BASE = `${(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")}/api/v1`;
const u = (path: string) => `${BASE}${path}`;

const FREE: PlanLimits = { watchlist_items: 15, alert_rules: 3, unusual_activity_results: 1, screener_results: 3, fund_compare: 2, history_quarters: 4, instant_alerts: false, saved_screens: false, csv_export: false };
const SESSION = "fi-mock-session";

const state = {
  email: sessionStorage.getItem(SESSION),
  watchlist: [...fx.seedWatchlist] as WatchlistItem[],
  rules: [...fx.seedRules] as AlertRule[],
  events: [...fx.seedEvents],
  prefs: { theme: "system", dashboard_layout: "split" } as Preferences,
  notif: { time_zone: null, email_enabled: false, digest_local_time: "07:00", configured: false } as NotificationPreferences,
  nextId: 100,
};

const account = (): Account => ({ id: 1, email: state.email!, created_at: "2026-10-02T12:00:00Z", plan: "free", limits: FREE });
const err = (status: number, code: string, message: string) => HttpResponse.json({ error: { code, message } }, { status });
const unauthorized = () => err(401, "UNAUTHORIZED", "Sign in to continue.");
const notFound = () => err(404, "NOT_FOUND", "Not found");
const pro = (feature: string, limit: number) => HttpResponse.json({ code: "PRO_REQUIRED", feature, limit }, { status: 402 });

function page<T>(request: Request, rows: T[], extra: Record<string, unknown> = {}) {
  const q = new URL(request.url).searchParams;
  const limit = Math.min(100, Number(q.get("limit") ?? 50));
  const start = Number(q.get("cursor") ?? 0);
  const data = rows.slice(start, start + limit);
  const more = start + limit < rows.length;
  return HttpResponse.json({ data, meta: { total_count: rows.length, has_more: more, next_cursor: more ? String(start + limit) : null, limit, sort: q.get("sort") ?? "", as_of: new Date().toISOString(), ...extra } });
}

function sorted<T>(rows: T[], sort: string | null, get: Record<string, (r: T) => number | string | null>) {
  if (!sort) return rows;
  const desc = sort.startsWith("-");
  const f = get[sort.replace(/^-/, "")];
  if (!f) return rows;
  return [...rows].sort((a, b) => {
    const x = f(a);
    const y = f(b);
    if (x === null) return 1;
    if (y === null) return -1;
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
    return desc ? -c : c;
  });
}

function txFilter(request: Request, rows = fx.transactions) {
  const q = new URL(request.url).searchParams;
  const role = q.get("role");
  const out = rows.filter(
    (t) =>
      (!q.get("type") || q.get("type") === "all" || t.activity_type === q.get("type")) &&
      (!q.get("direction") || t.direction === q.get("direction")) &&
      (!q.get("ticker") || t.issuer.ticker === q.get("ticker")!.toUpperCase()) &&
      (!q.get("min_value") || (t.value !== null && Number(t.value) >= Number(q.get("min_value")))) &&
      (!role || (role === "director" && t.role.is_director) || (role === "officer" && t.role.is_officer) || (role === "ten_percent_owner" && t.role.is_ten_percent_owner)),
  );
  return sorted(out, q.get("sort") ?? "-filed_at", { filed_at: (t) => t.filed_at, transaction_date: (t) => t.transaction_date, value: (t) => (t.value === null ? null : Number(t.value)) });
}

const followed = (type: EntityType, key: string | null | undefined) => !!key && state.watchlist.some((w) => w.entity_type === type && w.entity_key === key);
const watchedEvents = () => fx.activity.filter((e) => followed("issuer", e.issuer.ticker) || (e.fund && followed("fund", e.fund.cik)) || e.reporting_owners.some((o) => followed("person", o.insider_cik)));

function nameFor(type: EntityType, key: string) {
  if (type === "issuer") return fx.companies.find((c) => c.ticker === key)?.name;
  if (type === "fund") return fx.funds.find((f) => f.cik === key)?.name;
  return fx.people.find((p) => p.cik === key)?.name;
}

const session = (status = 200) => HttpResponse.json({ data: { user: account(), csrf_token: "mock-csrf" } }, { status });

export const handlers = [
  http.get(u("/auth/csrf"), () => HttpResponse.json({ data: { csrf_token: "mock-csrf" } })),
  http.post(u("/auth/signup"), async ({ request }) => {
    const b = (await request.json()) as { email: string; password: string };
    if ((b.password ?? "").length < 8) return err(422, "VALIDATION_FAILED", "Password is too short (minimum is 8 characters)");
    state.email = b.email.trim().toLowerCase();
    state.watchlist = [];
    state.rules = [];
    state.events = [];
    sessionStorage.setItem(SESSION, state.email);
    return session(201);
  }),
  http.post(u("/auth/login"), async ({ request }) => {
    const b = (await request.json()) as { email: string; password: string };
    if ((b.password ?? "").length < 8) return err(401, "INVALID_CREDENTIALS", "Invalid email or password");
    state.email = b.email.trim().toLowerCase();
    sessionStorage.setItem(SESSION, state.email);
    return session();
  }),
  http.delete(u("/auth/logout"), () => {
    state.email = null;
    sessionStorage.removeItem(SESSION);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post(u("/auth/password/forgot"), () => HttpResponse.json({ data: { message: "If the account exists, a reset link was sent." } }, { status: 202 })),
  http.post(u("/auth/password/reset"), () => HttpResponse.json({ data: { message: "Password updated.", csrf_token: "mock-csrf" } })),
  http.get(u("/me"), () => (state.email ? HttpResponse.json({ data: account() }) : unauthorized())),
  http.patch(u("/me"), async ({ request }) => {
    const b = (await request.json()) as { email?: string };
    if (b.email) state.email = b.email.toLowerCase();
    return session();
  }),
  http.delete(u("/me"), () => {
    state.email = null;
    sessionStorage.removeItem(SESSION);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(u("/me/preferences"), () => HttpResponse.json({ data: state.prefs })),
  http.patch(u("/me/preferences"), async ({ request }) => {
    state.prefs = { ...state.prefs, ...((await request.json()) as Partial<Preferences>) };
    return HttpResponse.json({ data: state.prefs });
  }),
  http.get(u("/me/notification-preferences"), () => HttpResponse.json({ data: state.notif })),
  http.patch(u("/me/notification-preferences"), async ({ request }) => {
    const b = (await request.json()) as Partial<NotificationPreferences>;
    if (b.email_enabled && !(b.time_zone ?? state.notif.time_zone)) return err(422, "VALIDATION_FAILED", "Set a time zone before enabling email");
    state.notif = { ...state.notif, ...b, configured: true };
    return HttpResponse.json({ data: state.notif });
  }),
  http.get(u("/billing/subscription"), () => HttpResponse.json({ data: { plan: "free", subscription: null } })),
  http.post(u("/billing/checkout"), () => HttpResponse.json({ error: { code: "BILLING_UNAVAILABLE", message: "Billing is not configured" } }, { status: 503, headers: { "Retry-After": "60" } })),
  http.post(u("/billing/portal"), () => err(409, "BILLING_CUSTOMER_REQUIRED", "No billing customer")),

  http.get(u("/search"), ({ request }) => {
    const q = (new URL(request.url).searchParams.get("q") ?? "").toLowerCase();
    const hit = (s: string | null) => !!s && s.toLowerCase().includes(q);
    const base = { match_type: "substring", accession: null, sec_url: null, form_type: null, filed_at: null, accepted_at: null, ingested_at: null, data_age_days: null };
    const data = {
      companies: fx.companies.filter((c) => hit(c.name) || hit(c.ticker)).map((c) => ({ ...base, entity_type: "issuer", entity_key: c.ticker, name: c.name, ticker: c.ticker, cik: c.cik, profile_path: `/api/v1/companies/${c.ticker}` })),
      funds: fx.funds.filter((f) => hit(f.name)).map((f) => ({ ...base, entity_type: "fund", entity_key: f.cik, name: f.name, ticker: null, cik: f.cik, profile_path: `/api/v1/funds/${f.cik}` })),
      insiders: fx.people.filter((p) => hit(p.name)).map((p) => ({ ...base, entity_type: "person", entity_key: p.cik, name: p.name, ticker: null, cik: p.cik, profile_path: `/api/v1/insiders/${p.cik}` })),
    };
    return HttpResponse.json({ data, meta: { q, groups: {}, disclaimer: "Data from public SEC filings. Not investment advice." } });
  }),

  http.get(u("/dashboard"), ({ request }) => {
    if (!state.email) return unauthorized();
    const days = Number(new URL(request.url).searchParams.get("days") ?? 30) as 7 | 30 | 90;
    const mine = watchedEvents();
    const now = new Date();
    const due = new Date(Date.UTC(2026, 10, 16));
    const meta = { has_more: false, next_cursor: null, limit: 10, as_of: now.toISOString(), filters: {} };
    return HttpResponse.json({
      data: {
        summary: { form4_filings: 1284, insider_transactions: 3172, institutional_reports: 412, watchlist_items: state.watchlist.length, watchlist_activity_events: mine.length, cluster_windows: fx.clusters.length },
        upcoming_deadlines: [{ form_type: "13F-HR", period_of_report: "2026-09-30", due_date: "2026-11-16", days_remaining: Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 86400_000)), timezone: "America/New_York", source_url: "https://www.sec.gov/rules-regulations/staff-guidance/frequently-asked-questions-about-form-13f" }],
        top_clusters: { data: fx.clusters, meta: { ...meta, total_count: fx.clusters.length, sort: "-insider_count", window_days: 14, minimum_insiders: 3, definition_minimum_insiders: 3 } },
        watchlist_activity: { data: mine.slice(0, 10), meta: { ...meta, total_count: mine.length, sort: "-occurred_at", available_sources: ["insider", "institutional"], scoring_available: false, sector_available: false } },
        top_unusual: { data: [], meta: { available: false, unavailable_reason: "scoring_not_active", total_count: null, truncated: false, feature: "unusual_activity_results", limit: 1 } },
      },
      meta: { as_of: now.toISOString(), window: { days, date_from: "", date_to: "", timezone: "UTC" }, latest_filed_at: fx.activity[0]?.filed_at ?? null, available_sources: ["insider", "institutional"], scoring_available: false, market_movers_available: false, disclaimer: "Data from public SEC filings. Not investment advice." },
    });
  }),

  http.get(u("/activity"), ({ request }) => {
    const q = new URL(request.url).searchParams;
    if (q.get("watchlist_only") === "true" && !state.email) return unauthorized();
    let rows = q.get("watchlist_only") === "true" ? watchedEvents() : fx.activity;
    rows = rows.filter(
      (e) =>
        (!q.get("source") || e.source === q.get("source")) &&
        (!q.get("direction") || e.direction === q.get("direction")) &&
        (!q.get("type") || q.get("type") === "all" || e.activity_type === q.get("type")) &&
        (!q.get("min_value") || (e.value !== null && Number(e.value) >= Number(q.get("min_value")))),
    );
    rows = sorted(rows, q.get("sort") ?? "-occurred_at", { occurred_at: (e) => e.occurred_at, value: (e) => (e.value === null ? null : Number(e.value)) });
    return page(request, rows, { available_sources: ["insider", "institutional"], scoring_available: false, sector_available: false });
  }),

  http.get(u("/insiders/transactions"), ({ request }) => page(request, txFilter(request))),
  http.get(u("/insiders/clusters"), ({ request }) => {
    const q = new URL(request.url).searchParams;
    const dir = q.get("direction");
    const rows = fx.clusters.filter((c) => (!dir || dir === "all" || c.direction === dir) && (!q.get("ticker") || c.issuer.ticker === q.get("ticker")!.toUpperCase()));
    return page(request, rows, { window_days: 14, minimum_insiders: 3, definition_minimum_insiders: 3 });
  }),
  http.get(u("/insiders/:cik"), ({ params }) => {
    const p = fx.people.find((x) => x.cik === params.cik);
    const rows = fx.transactions.filter((t) => t.insider_cik === params.cik);
    if (!p || rows.length === 0) return notFound();
    const l = rows[0]!;
    const s = fx.summarize(rows.filter((r) => r.security_table === "non_derivative"));
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.transaction_code ?? "unknown"] = (counts[r.transaction_code ?? "unknown"] ?? 0) + 1;
    const net = s.purchase_value || s.sale_value ? (Number(s.purchase_value ?? 0) - Number(s.sale_value ?? 0)).toFixed(2) : null;
    return HttpResponse.json({
      data: {
        cik: p.cik, name: p.name,
        latest_filing: { accession: l.accession, form_type: l.form_type, sec_url: l.sec_url, filed_at: l.filed_at, accepted_at: l.accepted_at, ingested_at: l.ingested_at, data_age_days: l.data_age_days },
        summaries: [30, 90, 365].map((w) => ({ window_days: w, ...s, issuer_count: new Set(rows.map((r) => r.issuer.cik)).size, transactions_without_usable_price: rows.filter((r) => r.value === null && r.activity_type === "open_market").length, counts_by_code: counts, net_open_market_value: net })),
      },
    });
  }),
  http.get(u("/insiders/:cik/transactions"), ({ request, params }) => page(request, txFilter(request, fx.transactions.filter((t) => t.insider_cik === params.cik)))),
  http.get(u("/insiders/:cik/companies"), ({ request, params }) => page(request, fx.insiderCompanies(String(params.cik)))),

  http.get(u("/funds"), ({ request }) => {
    const q = new URL(request.url).searchParams;
    const term = (q.get("q") ?? "").toLowerCase();
    const rows = fx.funds.filter((f) => !term || f.name.toLowerCase().includes(term) || f.cik === term);
    return page(request, sorted(rows, q.get("sort") ?? "name", { name: (f) => f.name.toLowerCase(), cik: (f) => f.cik }));
  }),
  http.get(u("/funds/:cik"), ({ params }) => {
    const i = fx.funds.findIndex((f) => f.cik === params.cik);
    if (i < 0) return notFound();
    return HttpResponse.json({ data: { ...fx.funds[i], latest_report: fx.reportsFor(i)[0] } });
  }),
  http.get(u("/funds/:cik/holdings"), ({ request, params }) => {
    const i = fx.funds.findIndex((f) => f.cik === params.cik);
    if (i < 0) return notFound();
    return page(request, sorted(fx.holdingsFor(i), new URL(request.url).searchParams.get("sort") ?? "-value_usd", { value_usd: (h) => Number(h.value_usd), shares: (h) => Number(h.shares), cusip: (h) => h.cusip }));
  }),
  http.get(u("/funds/:cik/changes"), ({ request, params }) => {
    const q = new URL(request.url).searchParams;
    const rows = fx.changes.filter((c) => c.fund.cik === params.cik && (!q.get("change_type") || c.change_type === q.get("change_type")));
    return page(request, sorted(rows, q.get("sort") ?? "-value_change", { value_change: (c) => Math.abs(Number(c.value_usd_delta)), shares_change: (c) => Math.abs(Number(c.shares_delta)), cusip: (c) => c.cusip }));
  }),
  http.get(u("/funds/:cik/history"), ({ request, params }) => {
    const i = fx.funds.findIndex((f) => f.cik === params.cik);
    return i < 0 ? notFound() : page(request, fx.reportsFor(i));
  }),

  http.get(u("/companies/:ticker"), ({ params }) => {
    const c = fx.companies.find((x) => x.ticker === String(params.ticker).toUpperCase());
    if (!c) return notFound();
    const rows = fx.transactions.filter((t) => t.issuer.cik === c.cik);
    const l = rows[0];
    const s = fx.summarize(rows.filter((r) => r.security_table === "non_derivative"));
    return HttpResponse.json({
      data: {
        ...c,
        latest_filing: l ? { accession: l.accession, form_type: l.form_type, sec_url: l.sec_url, filed_at: l.filed_at, accepted_at: l.accepted_at, ingested_at: l.ingested_at, data_age_days: l.data_age_days } : null,
        insider_summary: { window_days: 90, ...s, insider_count: new Set(rows.filter((r) => r.activity_type === "open_market").map((r) => r.insider_cik)).size },
      },
    });
  }),
  http.get(u("/companies/:ticker/insiders"), ({ request, params }) => page(request, txFilter(request, fx.transactions.filter((t) => t.issuer.ticker === String(params.ticker).toUpperCase())))),
  http.get(u("/companies/:ticker/filings"), ({ request, params }) =>
    page(request, fx.transactions.filter((t) => t.issuer.ticker === String(params.ticker).toUpperCase()).map((t) => ({ accession: t.accession, form_type: t.form_type, sec_url: t.sec_url, filed_at: t.filed_at, accepted_at: t.accepted_at, ingested_at: t.ingested_at, data_age_days: t.data_age_days, period_of_report: t.period_of_report, issuer_cik: t.issuer.cik, issuer_name: t.issuer.name, issuer_ticker: t.issuer.ticker, is_amendment: t.form_type === "4/A", amends_accession: null, superseded_by: null }))),
  ),
  http.get(u("/companies/:ticker/institutional"), ({ request, params }) => {
    const i = fx.companies.findIndex((c) => c.ticker === String(params.ticker).toUpperCase());
    if (i < 0) return notFound();
    const rows = fx.funds.map((_, f) => fx.holdingsFor(f)[i]!);
    return page(request, sorted(rows, new URL(request.url).searchParams.get("sort") ?? "-value_usd", { value_usd: (h) => Number(h.value_usd), shares: (h) => Number(h.shares) }));
  }),

  http.post(u("/filings/:accession/explanation"), ({ params }) => {
    const a = String(params.accession);
    const t = fx.transactions.find((x) => x.accession === a);
    const body = t
      ? `${t.insider_name} (${t.role.officer_title ?? (t.role.is_director ? "Director" : "10% owner")}) reported one transaction in ${t.issuer.name} (${t.issuer.ticker}) on Form ${t.form_type}.\n\nTransaction code ${t.transaction_code}: ${Number(t.shares).toLocaleString("en-US")} shares of ${t.security_title}${t.price ? ` at a reported price of $${t.price}` : ", with no reported price"}. Shares owned following the transaction: ${Number(t.shares_owned_following).toLocaleString("en-US")}.\n\nThis summary covers 1 of 1 transaction lines and 1 of 1 reporting owners.`
      : "This 13F-HR report lists the manager’s reported long positions as of the period end. Values are as reported by the filer and are shown in the units the filing uses.\n\nThis summary covers the first 5 of 5 stored information-table rows.";
    const p = t ?? { accession: a, form_type: "13F-HR", sec_url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany`, filed_at: new Date().toISOString(), accepted_at: null, ingested_at: null, data_age_days: 0, period_of_report: "2026-09-30" };
    return HttpResponse.json({ data: { accession: p.accession, form_type: p.form_type, sec_url: p.sec_url, filed_at: p.filed_at, accepted_at: p.accepted_at, ingested_at: p.ingested_at, data_age_days: p.data_age_days, period_of_report: p.period_of_report, body, model: "template-v1", prompt_version: "1", source_digest: "mock", generation_method: "template", generated_at: new Date().toISOString(), coverage: {}, source_url: p.sec_url, disclaimer: "Data from public SEC filings. Not investment advice." }, meta: { cached: true } });
  }),

  http.post(u("/screener/run"), async ({ request }) => {
    const b = (await request.json()) as { entity: "companies" | "funds" | "insiders"; filters: { field: string; operator: string; value: string | number }[]; sort?: string };
    let rows = fx.screenerRows(b.entity).filter((r) =>
      (b.filters ?? []).every((f) => {
        const v = f.field === "name" ? r.name : (r.metrics as Record<string, unknown>)[f.field];
        if (f.operator === "contains") return String(v ?? "").toLowerCase().includes(String(f.value).toLowerCase());
        if (v === null || v === undefined) return false;
        return f.operator === "lte" ? Number(v) <= Number(f.value) : Number(v) >= Number(f.value);
      }),
    );
    const key = (b.sort ?? "name").replace(/^-/, "");
    rows = sorted(rows, b.sort ?? "name", { [key]: (r) => (key === "name" ? r.name : key === "last_filed_at" ? r.last_filed_at : Number((r.metrics as Record<string, unknown>)[key] ?? 0)) });
    const total = rows.length;
    return HttpResponse.json({ data: rows.slice(0, 3), meta: { total_count: total, has_more: false, next_cursor: null, limit: 50, sort: b.sort ?? "name", as_of: new Date().toISOString(), entity: b.entity, window_days: b.entity === "funds" ? null : 90, truncated: total > 3, feature: "screener_results", preview_limit: 3, scoring_available: false, sector_available: false } });
  }),
  http.all(u("/saved-screens"), () => pro("saved_screens", 0)),

  http.get(u("/watchlist"), ({ request }) => (state.email ? page(request, state.watchlist) : unauthorized())),
  http.post(u("/watchlist"), async ({ request }) => {
    if (!state.email) return unauthorized();
    const b = (await request.json()) as { entity_type: EntityType; entity_key: string };
    const existing = state.watchlist.find((w) => w.entity_type === b.entity_type && w.entity_key === b.entity_key);
    if (existing) return HttpResponse.json({ data: existing });
    const name = nameFor(b.entity_type, b.entity_key);
    if (!name) return notFound();
    if (state.watchlist.length >= 15) return pro("watchlist_items", 15);
    const item: WatchlistItem = { id: state.nextId++, entity_type: b.entity_type, entity_key: b.entity_key, name, created_at: new Date().toISOString() };
    state.watchlist = [item, ...state.watchlist];
    return HttpResponse.json({ data: item }, { status: 201 });
  }),
  http.delete(u("/watchlist/:id"), ({ params }) => {
    state.watchlist = state.watchlist.filter((w) => w.id !== Number(params.id));
    state.rules = state.rules.filter((r) => r.follow_id !== Number(params.id));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(u("/alert-rules"), ({ request }) =>
    state.email ? page(request, state.rules, { limits: { alert_rules: 3 }, capabilities: { instant_alerts: false }, supported_triggers: ["new_filing"], supported_channels: ["email"], supported_frequencies: ["daily_digest"] }) : unauthorized(),
  ),
  http.post(u("/alert-rules"), async ({ request }) => {
    const b = (await request.json()) as { follow_id: number; frequency?: "daily_digest" | "instant"; active?: boolean };
    if (b.frequency === "instant") return pro("instant_alerts", 0);
    const existing = state.rules.find((r) => r.follow_id === b.follow_id);
    if (existing) return HttpResponse.json({ data: existing });
    if (state.rules.length >= 3) return pro("alert_rules", 3);
    const follow = state.watchlist.find((w) => w.id === b.follow_id);
    if (!follow) return notFound();
    const now = new Date().toISOString();
    const rule: AlertRule = { id: state.nextId++, follow_id: follow.id, trigger: "new_filing", entity: { type: follow.entity_type, key: follow.entity_key }, conditions: {}, channels: ["email"], frequency: "daily_digest", active: !!b.active && state.notif.email_enabled, created_at: now, updated_at: now };
    state.rules = [rule, ...state.rules];
    return HttpResponse.json({ data: rule }, { status: 201 });
  }),
  http.patch(u("/alert-rules/:id"), async ({ request, params }) => {
    const b = (await request.json()) as { active?: boolean };
    const rule = state.rules.find((r) => r.id === Number(params.id));
    if (!rule) return notFound();
    if (b.active && !state.notif.email_enabled) return err(422, "ALERT_CONFIGURATION_REQUIRED", "Enable email notifications first");
    if (b.active !== undefined) rule.active = b.active;
    return HttpResponse.json({ data: rule });
  }),
  http.delete(u("/alert-rules/:id"), ({ params }) => {
    state.rules = state.rules.filter((r) => r.id !== Number(params.id));
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(u("/alert-events"), ({ request }) => {
    if (!state.email) return unauthorized();
    const unread = new URL(request.url).searchParams.get("unread") === "true";
    return page(request, unread ? state.events.filter((e) => !e.read_at) : state.events);
  }),
  http.post(u("/alert-events/read-all"), () => {
    const now = new Date().toISOString();
    let n = 0;
    for (const e of state.events) if (!e.read_at) { e.read_at = now; n++; }
    return HttpResponse.json({ data: { updated_count: n, through_id: state.events[0]?.id ?? 0, as_of: now } });
  }),
  http.post(u("/alert-events/:id/read"), ({ params }) => {
    const e = state.events.find((x) => x.id === Number(params.id));
    if (!e) return notFound();
    e.read_at ??= new Date().toISOString();
    return HttpResponse.json({ data: { id: e.id, read_at: e.read_at } });
  }),
];
