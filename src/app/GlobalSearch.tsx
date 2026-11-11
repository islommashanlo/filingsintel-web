import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import type { SearchResponse, SearchResult } from "@/api/types";
import { Avatar } from "@/components/ui";
import { profilePath } from "@/features/watchlist";
import { initials } from "@/lib/format";

const GROUPS = [
  ["companies", "Companies"],
  ["funds", "Funds"],
  ["insiders", "Insiders"],
] as const;

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Grouped search over stored companies, funds and insiders. `/` or ⌘K focuses it. */
export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const term = useDebounced(q.trim(), 200);

  const res = useQuery({
    queryKey: ["search", term],
    enabled: term.length > 0,
    staleTime: 30_000,
    queryFn: () => api.get<SearchResponse>("/search", { q: term, limit: 5 }),
  });

  const groups = GROUPS.map(([key, label]) => ({ label, items: res.data?.data[key] ?? [] })).filter((g) => g.items.length > 0);
  const flat = groups.flatMap((g) => g.items);

  useEffect(() => setActive(0), [term]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (r: SearchResult) => {
    setOpen(false);
    setQ("");
    input.current?.blur();
    navigate(profilePath(r.entity_type, r.entity_key));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && flat[active]) {
      go(flat[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      input.current?.blur();
    }
  };

  const show = open && term.length > 0;
  let index = -1;
  return (
    <div className="search" role="search">
      <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <line x1="9.4" y1="9.4" x2="13" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        ref={input}
        value={q}
        role="combobox"
        aria-expanded={show}
        aria-controls="search-results"
        aria-label="Search tickers, companies, funds and insiders"
        placeholder="Search tickers, companies, funds, insiders"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        maxLength={100}
      />
      <span className="kbd hide-sm">/</span>
      {show && (
        <div className="pop" id="search-results" role="listbox">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="pop-label">{g.label}</div>
              {g.items.map((r) => {
                index += 1;
                const i = index;
                return (
                  <button key={`${r.entity_type}-${r.entity_key}`} type="button" role="option" className="pop-item" aria-selected={i === active} onMouseDown={(e) => e.preventDefault()} onClick={() => go(r)} onMouseEnter={() => setActive(i)}>
                    <Avatar text={r.ticker ?? initials(r.name)} size={26} round={r.entity_type === "person"} />
                    <span className="grow">
                      <span className="truncate" style={{ display: "block", fontSize: 12.5, fontWeight: 600 }}>
                        {r.name ?? r.entity_key}
                      </span>
                      <span className="truncate faint" style={{ display: "block", fontSize: 11 }}>
                        {r.ticker ? `${r.ticker} · ` : ""}
                        {r.cik ? `CIK ${r.cik}` : "No filing on record"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          {res.isSuccess && flat.length === 0 && (
            <div className="faint" style={{ padding: 12, fontSize: 12 }}>
              No matches. Try a ticker, a fund name or an insider’s name.
            </div>
          )}
          {res.isPending && (
            <div className="faint" style={{ padding: 12, fontSize: 12 }}>
              Searching…
            </div>
          )}
          {res.isError && (
            <div className="faint" style={{ padding: 12, fontSize: 12 }}>
              Search is unavailable right now.
            </div>
          )}
          <div className="pop-foot">
            <span>↑↓ navigate</span>
            <span>Enter open</span>
            <span>Esc close</span>
          </div>
        </div>
      )}
    </div>
  );
}
