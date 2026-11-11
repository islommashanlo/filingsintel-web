/**
 * Fictional sample data for mock mode. Company, fund and insider names are
 * made up; CIKs and accession numbers do not refer to real filers.
 */
import type { ActivityEvent, AlertEvent, AlertRule, Cluster, Fund, Holding, InsiderCompany, PositionChange, Report, ScreenerResult, Transaction, WatchlistItem } from "@/api/types";

const NOW = Date.now();
const ago = (hours: number) => new Date(NOW - hours * 3600_000).toISOString();
const day = (hours: number) => ago(hours).slice(0, 10);
const acc = (n: number) => `0009990000-26-${String(n).padStart(6, "0")}`;
const secUrl = (a: string) => `https://www.sec.gov/Archives/edgar/data/999/${a.replace(/-/g, "")}/${a}-index.htm`;
const prov = (n: number, form: string, hours: number) => ({ accession: acc(n), form_type: form, sec_url: secUrl(acc(n)), filed_at: ago(hours), accepted_at: ago(hours), ingested_at: ago(hours - 0.1), data_age_days: Math.floor(hours / 24) });

export const companies = [
  { cik: "0009000001", ticker: "ACME", name: "Acme Robotics Corp" },
  { cik: "0009000002", ticker: "NRTH", name: "Northwind Energy Inc" },
  { cik: "0009000003", ticker: "LUMA", name: "Lumen Devices Ltd" },
  { cik: "0009000004", ticker: "HLTH", name: "Harbor Health Systems" },
  { cik: "0009000005", ticker: "QNTA", name: "Quanta Freight Holdings" },
];
export const funds: Fund[] = [
  { cik: "0009100001", name: "Harborview Capital Management" },
  { cik: "0009100002", name: "Northgate Partners LP" },
  { cik: "0009100003", name: "Elmstone Advisors" },
  { cik: "0009100004", name: "Bluewater Global Investors" },
  { cik: "0009100005", name: "Ridgeline Asset Management" },
  { cik: "0009100006", name: "Summit Row Capital" },
];
export const people = [
  { cik: "0009200001", name: "Dana Whitfield", title: "Chief Financial Officer", officer: true, director: false },
  { cik: "0009200002", name: "Tom Okafor", title: null, officer: false, director: true },
  { cik: "0009200003", name: "Priya Raman", title: "Chief Executive Officer", officer: true, director: true },
  { cik: "0009200004", name: "Marcus Lindqvist", title: null, officer: false, director: true },
  { cik: "0009200005", name: "Elena Sato", title: "General Counsel", officer: true, director: false },
  { cik: "0009200006", name: "Victor Hale", title: null, officer: false, director: false },
];

const role = (p: (typeof people)[number]) => ({ is_director: p.director, is_officer: p.officer, is_ten_percent_owner: !p.officer && !p.director, is_other: false, officer_title: p.title });

let txId = 0;
function tx(co: number, who: number, code: string, shares: number, price: number | null, hours: number, own: number, extra: Partial<Transaction> = {}): Transaction {
  const c = companies[co]!;
  const p = people[who]!;
  txId += 1;
  const direction = code === "P" ? "purchase" : code === "S" ? "sale" : "other";
  return {
    id: txId,
    ...prov(1000 + txId, "4", hours),
    form_type: "4",
    insider_cik: p.cik,
    insider_name: p.name,
    issuer: { cik: c.cik, name: c.name, ticker: c.ticker },
    role: role(p),
    owner_sequence: 1,
    security_table: "non_derivative",
    transaction_sequence: 1,
    security_title: "Common Stock",
    transaction_date: day(hours + 30),
    transaction_code: code,
    activity_type: direction === "other" ? "administrative" : "open_market",
    direction,
    shares: String(shares),
    price: price === null ? null : price.toFixed(2),
    price_suspect: false,
    price_suspect_reason: null,
    value: price === null ? null : (shares * price).toFixed(2),
    shares_owned_following: String(own),
    acquired_disposed: direction === "sale" || code === "F" ? "D" : "A",
    direct_or_indirect: "D",
    period_of_report: day(hours + 30),
    ...extra,
  };
}

export const transactions: Transaction[] = [
  tx(0, 0, "P", 25000, 48.1, 3, 140500),
  tx(0, 2, "P", 40000, 47.85, 9, 912000),
  tx(0, 3, "P", 12000, 48.4, 28, 61000),
  tx(0, 4, "P", 5000, 49.02, 51, 23500),
  tx(2, 1, "S", 70000, 50.02, 6, 412000),
  tx(2, 4, "F", 3120, 50.4, 30, 88200),
  tx(3, 5, "P", 150000, 22.75, 20, 9150000),
  tx(3, 2, "P", 80000, 22.6, 44, 380000),
  tx(3, 3, "P", 160000, 22.9, 70, 510000),
  tx(1, 0, "A", 18000, null, 75, 96000),
  tx(4, 1, "S", 22000, 131.4, 96, 144000, { form_type: "4/A" }),
  tx(4, 5, "M", 60000, 12.5, 120, 2060000, { security_table: "derivative", security_title: "Stock Option (right to buy)" }),
  tx(1, 2, "S", 9000, 77.3, 150, 40200, { price_suspect: true, price_suspect_reason: "price_outside_day_range", value: null }),
];

function change(fund: number, co: number, type: PositionChange["change_type"], before: number, after: number, pxK: number, hours: number): PositionChange & { fund: Fund; ticker: string } {
  const c = companies[co]!;
  const p = prov(2000 + fund, "13F-HR", hours);
  return {
    ...p,
    fund: funds[fund]!,
    ticker: c.ticker,
    period_of_report: "2026-09-30",
    prior_period_of_report: "2026-06-30",
    cusip: `99${String(co).padStart(3, "0")}A10${co}`,
    put_call: null,
    share_type: "SH",
    issuer_name: c.name.toUpperCase(),
    title_of_class: "COM",
    change_type: type,
    current_suspect: false,
    prior_suspect: false,
    shares_before: String(before),
    shares_after: String(after),
    shares_delta: String(after - before),
    value_usd_before: String(before * pxK),
    value_usd_after: String(after * pxK),
    value_usd_delta: String((after - before) * pxK),
    current_sources: [p],
    prior_sources: [prov(1900 + fund, "13F-HR", hours + 2200)],
  };
}

export const changes = [
  change(0, 1, "new", 0, 5200000, 77, 5),
  change(0, 0, "added", 1200000, 1900000, 48, 5),
  change(0, 2, "reduced", 3000000, 2100000, 50, 5),
  change(0, 4, "exited", 800000, 0, 131, 5),
  change(1, 0, "new", 0, 640000, 48, 26),
  change(1, 3, "added", 2000000, 2600000, 23, 26),
  change(2, 2, "exited", 450000, 0, 50, 60),
  change(2, 1, "reduced", 900000, 500000, 77, 60),
  change(3, 3, "new", 0, 1500000, 23, 90),
];

export const activity: ActivityEvent[] = [
  ...transactions.map((t): ActivityEvent => ({
    accession: t.accession, form_type: t.form_type, sec_url: t.sec_url, filed_at: t.filed_at, accepted_at: t.accepted_at, ingested_at: t.ingested_at, data_age_days: t.data_age_days,
    id: `insider_${t.id}`, source: "insider", occurred_at: t.filed_at!, period_of_report: t.period_of_report, direction: t.direction, activity_type: t.activity_type, value: t.value,
    score: null, level: null, sector: null, reasons: [], score_breakdown: [], transaction: t,
    reporting_owners: [{ insider_cik: t.insider_cik, insider_name: t.insider_name, role: t.role }], fund: null, issuer: t.issuer, position_change: null,
  })),
  ...changes.map((c, i): ActivityEvent => ({
    accession: c.accession, form_type: c.form_type, sec_url: c.sec_url, filed_at: c.filed_at, accepted_at: c.accepted_at, ingested_at: c.ingested_at, data_age_days: c.data_age_days,
    id: `institutional_${i}`, source: "institutional", occurred_at: c.filed_at!, period_of_report: c.period_of_report, direction: c.change_type === "new" || c.change_type === "added" ? "increase" : "decrease", activity_type: "position_change",
    value: String(Math.abs(Number(c.value_usd_delta))), score: null, level: null, sector: null, reasons: [], score_breakdown: [], transaction: null, reporting_owners: [], fund: c.fund,
    issuer: { cik: null, name: c.issuer_name, ticker: c.ticker }, position_change: { ...c, comparison_sources: [...c.current_sources, ...c.prior_sources] },
  })),
].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

function cluster(co: number, direction: "purchase" | "sale", ids: number[]): Cluster {
  const rows = ids.map((i) => transactions[i]!);
  const c = companies[co]!;
  const latest = rows[0]!;
  const total = rows.reduce((s, r) => s + Number(r.value ?? 0), 0);
  return {
    accession: latest.accession, form_type: "4", sec_url: latest.sec_url, filed_at: latest.filed_at, accepted_at: latest.accepted_at, ingested_at: latest.ingested_at, data_age_days: latest.data_age_days,
    id: `cluster_${c.ticker}_${direction}`, issuer: { cik: c.cik, name: c.name, ticker: c.ticker }, direction,
    window_start: new Date(new Date(latest.filed_at!).getTime() - 14 * 86400_000).toISOString(), window_end: latest.filed_at!, window_days: 14,
    insider_count: rows.length, transaction_count: rows.length, total_value: total.toFixed(2), known_value_subtotal: total.toFixed(2), transactions_without_usable_price: 0,
    transaction_ids: rows.map((r) => r.id), activity_ids: rows.map((r) => `insider_${r.id}`), insiders: rows.map((r) => ({ cik: r.insider_cik, name: r.insider_name })),
    sources: rows.map((r) => ({ accession: r.accession, form_type: r.form_type, sec_url: r.sec_url, filed_at: r.filed_at, accepted_at: r.accepted_at, ingested_at: r.ingested_at, data_age_days: r.data_age_days })),
  };
}
export const clusters: Cluster[] = [cluster(0, "purchase", [0, 1, 2, 3]), cluster(3, "purchase", [6, 7, 8])];

export function holdingsFor(fundIdx: number): Holding[] {
  const f = funds[fundIdx]!;
  const p = prov(2000 + fundIdx, "13F-HR", 5 + fundIdx * 20);
  return companies.map((c, i) => {
    const sh = (5 - i) * 700000 + fundIdx * 150000;
    const px = [48, 77, 50, 23, 131][i]!;
    return {
      ...p, id: fundIdx * 100 + i, fund: f, period_of_report: "2026-09-30", row_sequence: i + 1, cusip: `99${String(i).padStart(3, "0")}A10${i}`, figi: null,
      issuer_name: c.name.toUpperCase(), title_of_class: "COM", value_reported: String(sh * px), value_unit: "dollars", value_usd: String(sh * px), shares: String(sh), share_type: "SH", put_call: null,
      investment_discretion: "SOLE", other_manager: null, voting_authority: { sole: String(sh), shared: "0", none: "0" }, suspect: false, suspect_reason: null,
    };
  });
}

export function reportsFor(fundIdx: number): Report[] {
  return ["2026-09-30", "2026-06-30", "2026-03-31", "2025-12-31"].map((period, i) => ({
    ...prov(2000 + fundIdx - i * 100, "13F-HR", 5 + fundIdx * 20 + i * 2190), id: fundIdx * 10 + i, period_of_report: period, report_type: "13F HOLDINGS REPORT", amendment_type: null, amendment_number: null,
    other_manager_count: 0, table_entry_total: 5 + (3 - i) * 12, table_value_total: String(940000000 - i * 61000000 + fundIdx * 120000000), value_unit: "dollars", suspect: false, suspect_reason: null,
  }));
}

export function insiderCompanies(cik: string): InsiderCompany[] {
  const seen = new Map<string, InsiderCompany>();
  for (const t of transactions.filter((x) => x.insider_cik === cik)) {
    if (!seen.has(t.issuer.cik)) seen.set(t.issuer.cik, { accession: t.accession, form_type: t.form_type, sec_url: t.sec_url, filed_at: t.filed_at, accepted_at: t.accepted_at, ingested_at: t.ingested_at, data_age_days: t.data_age_days, cik: t.issuer.cik, name: t.issuer.name, ticker: t.issuer.ticker, role: t.role });
  }
  return [...seen.values()];
}

export function summarize(rows: Transaction[]) {
  const p = rows.filter((r) => r.direction === "purchase");
  const s = rows.filter((r) => r.direction === "sale");
  const sum = (xs: Transaction[]) => (xs.length ? xs.reduce((a, r) => a + Number(r.value ?? 0), 0).toFixed(2) : null);
  return { purchase_count: p.length, sale_count: s.length, purchase_value: sum(p), sale_value: sum(s) };
}

export function screenerRows(entity: "companies" | "funds" | "insiders"): ScreenerResult[] {
  if (entity === "funds") {
    return funds.map((f, i) => {
      const hs = holdingsFor(i);
      return { ...prov(2000 + i, "13F-HR", 5 + i * 20), entity, cik: f.cik, name: f.name, ticker: null, last_filed_at: ago(5 + i * 20), last_filed_on: day(5 + i * 20), period_of_report: "2026-09-30", window_days: null, source_filing_count: 1, latest_role: null, metrics: { holding_row_count: hs.length, position_count: hs.length, portfolio_value_usd: String(hs.reduce((a, h) => a + Number(h.value_usd), 0)), suspect: false } };
    });
  }
  const groups = entity === "companies" ? companies.map((c) => ({ cik: c.cik, name: c.name, ticker: c.ticker as string | null, rows: transactions.filter((t) => t.issuer.cik === c.cik) })) : people.map((p) => ({ cik: p.cik, name: p.name, ticker: null, rows: transactions.filter((t) => t.insider_cik === p.cik) }));
  return groups.filter((g) => g.rows.length > 0).map((g) => {
    const s = summarize(g.rows);
    const latest = g.rows[0]!;
    const base = { ...s, open_market_count: s.purchase_count + s.sale_count, net_open_market_value: (Number(s.purchase_value ?? 0) - Number(s.sale_value ?? 0)).toFixed(2), transactions_without_usable_value: 0 };
    return {
      accession: latest.accession, form_type: latest.form_type, sec_url: latest.sec_url, filed_at: latest.filed_at, accepted_at: latest.accepted_at, ingested_at: latest.ingested_at, data_age_days: latest.data_age_days,
      entity, cik: g.cik, name: g.name, ticker: g.ticker, last_filed_at: latest.filed_at!, last_filed_on: latest.filed_at!.slice(0, 10), period_of_report: null, window_days: 90, source_filing_count: g.rows.length, latest_role: null,
      metrics: entity === "companies" ? { ...base, insider_count: new Set(g.rows.map((r) => r.insider_cik)).size } : { ...base, issuer_count: new Set(g.rows.map((r) => r.issuer.cik)).size, latest_is_director: latest.role.is_director, latest_is_officer: latest.role.is_officer, latest_is_ten_percent_owner: latest.role.is_ten_percent_owner, latest_is_other: false },
    };
  });
}

export const seedWatchlist: WatchlistItem[] = [
  { id: 1, entity_type: "issuer", entity_key: "ACME", name: "Acme Robotics Corp", created_at: ago(400) },
  { id: 2, entity_type: "fund", entity_key: funds[0]!.cik, name: funds[0]!.name, created_at: ago(380) },
  { id: 3, entity_type: "person", entity_key: people[1]!.cik, name: people[1]!.name, created_at: ago(200) },
  { id: 4, entity_type: "issuer", entity_key: "HLTH", name: "Harbor Health Systems", created_at: ago(100) },
];
export const seedRules: AlertRule[] = [
  { id: 1, follow_id: 1, trigger: "new_filing", entity: { type: "issuer", key: "ACME" }, conditions: {}, channels: ["email"], frequency: "daily_digest", active: true, created_at: ago(300), updated_at: ago(300) },
  { id: 2, follow_id: 2, trigger: "new_filing", entity: { type: "fund", key: funds[0]!.cik }, conditions: {}, channels: ["email"], frequency: "daily_digest", active: false, created_at: ago(250), updated_at: ago(250) },
];
export const seedEvents: AlertEvent[] = [
  { ...prov(1001, "4", 3), id: 1, rule_id: 1, trigger: "new_filing", entity: { type: "issuer", key: "ACME" }, channel: "email", frequency: "daily_digest", status: "pending", error_code: null, delivered_at: null, created_at: ago(3), updated_at: ago(3), period_of_report: day(33), read_at: null },
  { ...prov(1002, "4", 9), id: 2, rule_id: 1, trigger: "new_filing", entity: { type: "issuer", key: "ACME" }, channel: "email", frequency: "daily_digest", status: "pending", error_code: null, delivered_at: null, created_at: ago(9), updated_at: ago(9), period_of_report: day(39), read_at: null },
  { ...prov(1003, "4", 28), id: 3, rule_id: 1, trigger: "new_filing", entity: { type: "issuer", key: "ACME" }, channel: "email", frequency: "daily_digest", status: "sent", error_code: null, delivered_at: ago(20), created_at: ago(28), updated_at: ago(20), period_of_report: day(58), read_at: ago(19) },
];
