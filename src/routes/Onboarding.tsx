import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { usePaged } from "@/api/hooks";
import type { Cluster, EntityType, Fund, SearchResponse } from "@/api/types";
import { Avatar, PageHead, SkeletonRows } from "@/components/ui";
import { useMe } from "@/features/session";
import { ENTITY_LABEL, useFollow, useWatchlist } from "@/features/watchlist";
import { initials } from "@/lib/format";

type Pick = { type: EntityType; key: string; name: string; desc: string };
const MIN = 3;

/** Pick who to follow. Suggestions come from stored filings; nothing is invented. */
export default function Onboarding() {
  const me = useMe().data!;
  const list = useWatchlist().data ?? [];
  const { add, remove } = useFollow();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const funds = usePaged<Fund>(["funds", "suggest"], "/funds", { limit: 6 });
  const clusters = usePaged<Cluster>(["clusters", "suggest"], "/insiders/clusters", { limit: 6 });
  const search = useQuery({ queryKey: ["search", "onboarding", term], enabled: term.length > 0, queryFn: () => api.get<SearchResponse>("/search", { q: term, limit: 6 }) });

  const suggestions: Pick[] = [];
  const seen = new Set<string>();
  const push = (p: Pick) => {
    const id = `${p.type}:${p.key}`;
    if (!seen.has(id)) {
      seen.add(id);
      suggestions.push(p);
    }
  };
  if (term) {
    const d = search.data?.data;
    for (const r of [...(d?.companies ?? []), ...(d?.funds ?? []), ...(d?.insiders ?? [])]) {
      push({ type: r.entity_type, key: r.entity_key, name: r.name ?? r.entity_key, desc: `${ENTITY_LABEL[r.entity_type]}${r.ticker ? ` · ${r.ticker}` : ""}` });
    }
  } else {
    for (const c of clusters.rows) if (c.issuer.ticker) push({ type: "issuer", key: c.issuer.ticker, name: c.issuer.name ?? c.issuer.ticker, desc: `Company · ${c.insider_count} insiders reported trades recently` });
    for (const f of funds.rows) push({ type: "fund", key: f.cik, name: f.name, desc: "Fund · 13F filer" });
  }
  const loading = term ? search.isPending : funds.isPending || clusters.isPending;
  const limit = me.limits.watchlist_items;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <PageHead title="Who do you want to follow?" sub={`Pick at least ${MIN} to build your feed. You can change this anytime.`} />
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies, funds and insiders" aria-label="Search companies, funds and insiders" maxLength={100} style={{ marginBottom: 14 }} />
      {loading && <div className="card clip"><SkeletonRows rows={4} /></div>}
      {!loading && suggestions.length === 0 && <div className="notice">{term ? "No matches in stored filings." : "No suggestions yet. Search for a ticker, fund or insider."}</div>}
      <div className="cols" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {suggestions.map((p) => {
          const item = list.find((i) => i.entity_type === p.type && i.entity_key === p.key);
          return (
            <button key={`${p.type}:${p.key}`} type="button" className="pick" aria-pressed={!!item} onClick={() => (item ? remove.mutate(item) : add.mutate({ type: p.type, key: p.key, name: p.name }))}>
              <Avatar text={p.type === "issuer" ? p.key : initials(p.name)} size={34} round={p.type === "person"} />
              <span className="grow">
                <span className="truncate" style={{ display: "block", fontWeight: 600 }}>{p.name}</span>
                <span className="truncate faint" style={{ display: "block", fontSize: 11.5 }}>{p.desc}</span>
              </span>
              <span aria-hidden="true" style={{ color: "var(--acc)", fontWeight: 700 }}>{item ? "✓" : "+"}</span>
            </button>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 20, justifyContent: "space-between" }}>
        <span className="muted" style={{ fontSize: 12.5 }}>
          {list.length} selected{limit !== null ? ` · Free plan follows up to ${limit}` : ""}
        </span>
        <span className="row">
          <Link to="/dashboard" className="btn">Skip for now</Link>
          {list.length >= MIN ? <Link to="/dashboard" className="btn primary">Continue</Link> : <button type="button" className="btn primary" disabled>Pick {MIN - list.length} more</button>}
        </span>
      </div>
    </div>
  );
}
