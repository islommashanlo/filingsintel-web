import { Link } from "react-router-dom";
import type { Cluster } from "@/api/types";
import { date, initials } from "@/lib/format";
import { Avatar, Money, SourceLink } from "./ui";

/** A rolling 14-day window in which 3+ insiders of one company reported open-market trades. */
export function ClusterCard({ cluster: c }: { cluster: Cluster }) {
  const purchase = c.direction === "purchase";
  const noun = purchase ? "purchases" : "sales";
  return (
    <article className="card clip" style={{ display: "flex", flexDirection: "column", borderRadius: 14 }}>
      <div style={{ padding: "16px 18px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="row">
          {c.issuer.ticker ? (
            <Link to={`/companies/${encodeURIComponent(c.issuer.ticker)}`} className="tick" style={{ fontSize: 15, padding: "3px 9px", borderRadius: 7 }}>
              {c.issuer.ticker}
            </Link>
          ) : (
            <span className="tick">CIK {c.issuer.cik}</span>
          )}
          <span className="muted truncate grow" style={{ fontSize: 12.5 }}>
            {c.issuer.name}
          </span>
          <span className={`badge pill ${purchase ? "up" : "dn"}`}>{purchase ? "Purchases" : "Sales"}</span>
        </div>
        <div className="disp" style={{ fontSize: 20, lineHeight: 1.2, textWrap: "pretty" }}>
          {c.insider_count} insiders reported open-market {noun} within {c.window_days} days
        </div>
      </div>
      <div style={{ padding: "0 18px 14px", display: "flex", flexDirection: "column" }}>
        {c.insiders.map((m) => (
          <Link key={m.cik} to={`/insiders/${m.cik}`} className="row" style={{ padding: "7px 0", borderTop: "1px solid var(--lineSoft)", color: "var(--ink)" }}>
            <Avatar text={initials(m.name)} size={24} />
            <span className="truncate grow" style={{ fontSize: 12.5, fontWeight: 600 }}>
              {m.name ?? `CIK ${m.cik}`}
            </span>
          </Link>
        ))}
      </div>
      <div className="quad" style={{ marginTop: "auto" }}>
        <div>
          <div className="mlabel">Insiders</div>
          <div className="mval">{c.insider_count}</div>
        </div>
        <div>
          <div className="mlabel">Transactions</div>
          <div className="mval">{c.transaction_count}</div>
        </div>
        <div>
          <div className="mlabel">{c.total_value === null ? "Known value" : "Total value"}</div>
          <div className={`mval ${purchase ? "up" : "dn"}`} title={c.total_value === null ? `${c.transactions_without_usable_price} transaction(s) have no usable price, so the total is incomplete` : undefined}>
            <Money value={c.total_value ?? c.known_value_subtotal} />
            {c.total_value === null && c.known_value_subtotal !== null ? "+" : ""}
          </div>
        </div>
        <div>
          <div className="mlabel">Window end</div>
          <div className="mval">{date(c.window_end).replace(/, \d{4}$/, "")}</div>
        </div>
      </div>
      <div className="act-foot" style={{ padding: "9px 18px", borderTop: "1px solid var(--lineSoft)" }}>
        <span>
          {date(c.window_start)} – {date(c.window_end)}
        </span>
        <span className="grow" />
        <SourceLink href={c.sec_url}>Latest filing</SourceLink>
      </div>
    </article>
  );
}
