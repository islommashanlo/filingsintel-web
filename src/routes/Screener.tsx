import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, api, errorMessage } from "@/api/client";
import type { Page, SavedScreen, ScreenDefinition, ScreenerCondition, ScreenerResult } from "@/api/types";
import { DataTable, type Column } from "@/components/DataTable";
import { Empty, ErrorState, Money, PageHead, Pro, Seg, SkeletonRows, SourceLink } from "@/components/ui";
import { useIsPro, useMe } from "@/features/session";
import { toast, useUi } from "@/features/ui-store";
import { count, date, quarter } from "@/lib/format";

type Entity = ScreenDefinition["entity"];
type Field = { id: ScreenerCondition["field"]; label: string; kind: "count" | "money" | "text" };

const FIELDS: Record<Entity, Field[]> = {
  companies: [
    { id: "purchase_count", label: "Purchases (count)", kind: "count" },
    { id: "purchase_value", label: "Purchase value", kind: "money" },
    { id: "sale_count", label: "Sales (count)", kind: "count" },
    { id: "sale_value", label: "Sale value", kind: "money" },
    { id: "insider_count", label: "Insiders trading", kind: "count" },
    { id: "name", label: "Company name", kind: "text" },
  ],
  insiders: [
    { id: "purchase_count", label: "Purchases (count)", kind: "count" },
    { id: "purchase_value", label: "Purchase value", kind: "money" },
    { id: "sale_count", label: "Sales (count)", kind: "count" },
    { id: "sale_value", label: "Sale value", kind: "money" },
    { id: "issuer_count", label: "Companies", kind: "count" },
    { id: "name", label: "Insider name", kind: "text" },
  ],
  funds: [
    { id: "portfolio_value_usd", label: "Reported portfolio value", kind: "money" },
    { id: "position_count", label: "Positions", kind: "count" },
    { id: "holding_row_count", label: "Holding rows", kind: "count" },
    { id: "name", label: "Fund name", kind: "text" },
  ],
};

const SORTS: Record<Entity, [string, string][]> = {
  companies: [["-purchase_value", "Largest purchase value"], ["-sale_value", "Largest sale value"], ["-insider_count", "Most insiders"], ["-last_filed_at", "Latest filing"], ["name", "Name"]],
  insiders: [["-purchase_value", "Largest purchase value"], ["-sale_value", "Largest sale value"], ["-last_filed_at", "Latest filing"], ["name", "Name"]],
  funds: [["-portfolio_value_usd", "Largest reported value"], ["-position_count", "Most positions"], ["-last_filed_at", "Latest filing"], ["name", "Name"]],
};

type Row = { field: string; op: string; value: string };
type Meta = { truncated: boolean; preview_limit: number | null };

function toConditions(entity: Entity, rows: Row[]): ScreenerCondition[] {
  return rows
    .filter((r) => r.value.trim() !== "")
    .map((r) => {
      const f = FIELDS[entity].find((x) => x.id === r.field)!;
      const raw = r.value.trim();
      return { field: f.id, operator: (f.kind === "text" ? "contains" : r.op) as ScreenerCondition["operator"], value: f.kind === "count" ? Number(raw) : raw };
    });
}

function fromDefinition(def: ScreenDefinition): Row[] {
  return def.filters.map((c) => ({ field: c.field, op: c.operator === "lte" ? "lte" : "gte", value: String(c.value ?? "") }));
}

function profileLink(r: ScreenerResult) {
  if (r.entity === "companies") return r.ticker ? `/companies/${encodeURIComponent(r.ticker)}` : null;
  return r.entity === "funds" ? `/funds/${r.cik}` : `/insiders/${r.cik}`;
}

function columnsFor(entity: Entity): Column<ScreenerResult>[] {
  const name: Column<ScreenerResult> = {
    key: "name",
    label: entity === "companies" ? "Company" : entity === "funds" ? "Fund" : "Insider",
    render: (r) => {
      const to = profileLink(r);
      return (
        <span className="row" style={{ gap: 8 }}>
          {r.ticker && <span className="tick">{r.ticker}</span>}
          {to ? <Link to={to}>{r.name}</Link> : <b>{r.name}</b>}
        </span>
      );
    },
  };
  const m = (r: ScreenerResult) => r.metrics as Record<string, string | number | boolean | null>;
  const tail: Column<ScreenerResult>[] = [
    { key: "latest", label: "Latest filing", num: true, render: (r) => date(r.last_filed_at) },
    { key: "src", label: "Source", render: (r) => <SourceLink href={r.sec_url}>{r.form_type}</SourceLink> },
  ];
  if (entity === "funds") {
    return [
      name,
      { key: "period", label: "Period", num: true, render: (r) => quarter(r.period_of_report) },
      { key: "value", label: "Reported value", num: true, render: (r) => <Money value={m(r).portfolio_value_usd as string | null} /> },
      { key: "pos", label: "Positions", num: true, render: (r) => count(m(r).position_count as number | null) },
      { key: "rows", label: "Rows", num: true, render: (r) => count(m(r).holding_row_count as number | null) },
      ...tail,
    ];
  }
  return [
    name,
    { key: "pc", label: "Purchases", num: true, render: (r) => count(m(r).purchase_count as number) },
    { key: "pv", label: "Purchase value", num: true, render: (r) => <span className="up"><Money value={m(r).purchase_value as string | null} /></span> },
    { key: "sc", label: "Sales", num: true, render: (r) => count(m(r).sale_count as number) },
    { key: "sv", label: "Sale value", num: true, render: (r) => <span className="dn"><Money value={m(r).sale_value as string | null} /></span> },
    { key: "net", label: "Net reported", num: true, render: (r) => <Money value={m(r).net_open_market_value as string | null} signed colored /> },
    entity === "companies"
      ? { key: "n", label: "Insiders", num: true, render: (r) => count(m(r).insider_count as number) }
      : { key: "n", label: "Companies", num: true, render: (r) => count(m(r).issuer_count as number) },
    ...tail,
  ];
}

export default function Screener() {
  const me = useMe().data;
  const isPro = useIsPro();
  const qc = useQueryClient();
  const openUpgrade = useUi((s) => s.openUpgrade);
  const [entity, setEntity] = useState<Entity>("companies");
  const [windowDays, setWindowDays] = useState<30 | 90 | 365>(90);
  const [sort, setSort] = useState("-purchase_value");
  const [rows, setRows] = useState<Row[]>([{ field: "purchase_count", op: "gte", value: "1" }]);
  const [applied, setApplied] = useState<ScreenDefinition>({ entity: "companies", window_days: 90, sort: "-purchase_value", filters: toConditions("companies", [{ field: "purchase_count", op: "gte", value: "1" }]) });

  const definition = (): ScreenDefinition => ({ entity, filters: toConditions(entity, rows), sort, ...(entity === "funds" ? {} : { window_days: windowDays }) });

  const results = useQuery({
    queryKey: ["screener", applied, me?.plan ?? "anon"],
    queryFn: () => api.post<Page<ScreenerResult, Meta>>("/screener/run", { ...applied, page: { limit: 50 } }),
  });

  const saved = useQuery({
    queryKey: ["saved-screens"],
    enabled: isPro,
    queryFn: async () => (await api.get<Page<SavedScreen>>("/saved-screens", { limit: 50 })).data,
  });

  const save = useMutation({
    mutationFn: (name: string) => api.post("/saved-screens", { name, definition: definition() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-screens"] });
      toast("Screen saved");
    },
    onError: (e) => (e instanceof ApiError && e.proRequired ? openUpgrade("saved_screens") : toast(errorMessage(e))),
  });

  const changeEntity = (e: Entity) => {
    setEntity(e);
    const first = FIELDS[e][0]!;
    setRows([{ field: first.id, op: "gte", value: "" }]);
    setSort(SORTS[e][0]![0]);
  };
  const load = (s: SavedScreen) => {
    const def = s.definition as ScreenDefinition;
    setEntity(def.entity);
    setRows(fromDefinition(def));
    setSort(def.sort);
    if (def.window_days) setWindowDays(def.window_days);
    setApplied(def);
  };
  const onSave = () => {
    if (!isPro) return openUpgrade("saved_screens");
    const name = window.prompt("Name this screen");
    if (name?.trim()) save.mutate(name.trim());
  };
  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const meta = results.data?.meta;

  return (
    <div>
      <PageHead title="Screener" sub="Find companies, insiders and funds by reported filing activity.">
        <button type="button" className="btn" onClick={() => changeEntity(entity)}>Reset</button>
        <button type="button" className="btn" onClick={onSave} disabled={save.isPending}>Save Screen {!isPro && <Pro />}</button>
      </PageHead>
      {saved.data && saved.data.length > 0 && (
        <div className="row wrap" style={{ marginBottom: 14 }}>
          <span className="eyebrow">Saved screens</span>
          {saved.data.map((s) => (
            <button key={s.id} type="button" className="chip" onClick={() => load(s)}>{s.name}</button>
          ))}
        </div>
      )}
      <div className="cols" style={{ gridTemplateColumns: "300px minmax(0,1fr)" }}>
        <form className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }} onSubmit={(e) => { e.preventDefault(); setApplied(definition()); }}>
          <div>
            <span className="field-label">Screen for</span>
            <Seg label="Entity" value={entity} onChange={changeEntity} options={[{ value: "companies", label: "Companies" }, { value: "insiders", label: "Insiders" }, { value: "funds", label: "Funds" }]} />
          </div>
          {entity !== "funds" ? (
            <label>
              <span className="field-label">Filing window</span>
              <select className="select" value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value) as 30 | 90 | 365)}>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last 365 days</option>
              </select>
            </label>
          ) : (
            <p className="faint" style={{ fontSize: 11.5 }}>Fund screens use each fund’s latest reported period.</p>
          )}
          <div>
            <span className="field-label">Conditions (all must match)</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((r, i) => {
                const f = FIELDS[entity].find((x) => x.id === r.field) ?? FIELDS[entity][0]!;
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
                    <select className="select sm" style={{ width: "100%", gridColumn: "1 / -1" }} aria-label="Field" value={f.id} onChange={(e) => update(i, { field: e.target.value, value: "" })}>
                      {FIELDS[entity].map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </select>
                    <div className="row" style={{ gap: 6 }}>
                      {f.kind !== "text" && (
                        <select className="select sm" aria-label="Operator" value={r.op} onChange={(e) => update(i, { op: e.target.value })}>
                          <option value="gte">at least</option>
                          <option value="lte">at most</option>
                        </select>
                      )}
                      <input className="input sm grow" style={{ width: "100%" }} aria-label="Value" inputMode={f.kind === "text" ? "text" : "decimal"} placeholder={f.kind === "money" ? "USD, e.g. 100000" : f.kind === "count" ? "e.g. 2" : "contains…"} value={r.value} onChange={(e) => update(i, { value: f.kind === "text" ? e.target.value : e.target.value.replace(/[^0-9.]/g, "") })} />
                    </div>
                    <button type="button" className="x" aria-label="Remove condition" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>×</button>
                  </div>
                );
              })}
              <button type="button" className="btn sm" onClick={() => setRows((rs) => [...rs, { field: FIELDS[entity][0]!.id, op: "gte", value: "" }])}>+ Add condition</button>
            </div>
          </div>
          <label>
            <span className="field-label">Sort by</span>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS[entity].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <button type="submit" className="btn primary block">Run screen</button>
        </form>

        <section className="card clip" aria-label="Screener results">
          <div className="card-head">
            <div className="grow">
              <h2 className="card-title">{meta ? `${count(meta.total_count)} match${meta.total_count === 1 ? "" : "es"}` : "Results"}</h2>
              <div className="card-sub">Counts and values come from stored filings in the selected window. They are not complete EDGAR coverage.</div>
            </div>
          </div>
          {results.isPending && <SkeletonRows />}
          {results.error && <ErrorState error={results.error} retry={() => results.refetch()} />}
          {results.data && results.data.data.length === 0 && (
            <Empty title="No results match these conditions." sub="Loosen a threshold or choose a longer window." />
          )}
          {results.data && results.data.data.length > 0 && <DataTable caption="Screener results" columns={columnsFor(applied.entity)} rows={results.data.data} rowKey={(r) => `${r.entity}-${r.cik}`} minWidth={900} />}
          {meta?.truncated && (
            <div className="notice" style={{ margin: 14 }}>
              <span className="grow">Showing the first {meta.preview_limit} of {count(meta.total_count)} matches. Pro shows every result.</span>
              <button type="button" className="btn primary sm" onClick={() => openUpgrade("screener_results")}>Upgrade to Pro</button>
            </div>
          )}
        </section>
      </div>
      <p className="faint" style={{ fontSize: 11, marginTop: 12 }}>Sector, market-cap and Activity Score filters are not available yet.</p>
    </div>
  );
}
