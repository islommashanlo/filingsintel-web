import { Link } from "react-router-dom";
import type { ActivityEvent } from "@/api/types";
import { useUi } from "@/features/ui-store";
import { CHANGE_LABEL, CHANGE_TONE, codeLabel, dataAge, date, dateTimeET, initials, price, quarter, relative, roleLabel, shares } from "@/lib/format";
import { Avatar, Money, SourceLink } from "./ui";

const LEVEL_TONE = { normal: "", elevated: "acc", high: "am", unusual: "dn" } as const;

function typeBadge(e: ActivityEvent): { label: string; tone: string } {
  if (e.position_change) {
    const t = e.position_change.change_type;
    return { label: CHANGE_LABEL[t], tone: CHANGE_TONE[t] };
  }
  if (e.direction === "purchase") return { label: "Insider Purchase", tone: "up" };
  if (e.direction === "sale") return { label: "Insider Sale", tone: "dn" };
  return { label: codeLabel(e.transaction?.transaction_code), tone: "" };
}

/** One reported event: an insider transaction line or a 13F position change. */
export function ActivityRow({ event: e }: { event: ActivityEvent }) {
  const openExplain = useUi((s) => s.openExplain);
  const ticker = e.issuer.ticker;
  const company = e.issuer.name ?? e.position_change?.issuer_name ?? "Unnamed issuer";
  const badge = typeBadge(e);
  const tx = e.transaction;
  const pc = e.position_change;
  const companyHref = ticker ? `/companies/${encodeURIComponent(ticker)}` : null;
  const owner = e.reporting_owners[0];
  const others = e.reporting_owners.length - 1;

  const metrics: { label: string; val: React.ReactNode; sub?: string; tone?: string }[] = tx
    ? [
        { label: "Reported value", val: <Money value={tx.value} />, sub: tx.price_suspect ? "Price flagged as suspect" : undefined, tone: e.direction === "purchase" ? "up" : e.direction === "sale" ? "dn" : "" },
        { label: "Shares", val: shares(tx.shares), sub: tx.security_table === "derivative" ? "Derivative" : (tx.security_title ?? undefined) },
        { label: "Price", val: price(tx.price), sub: tx.transaction_date ? `Traded ${date(tx.transaction_date)}` : undefined },
        { label: "Owned after", val: shares(tx.shares_owned_following), sub: tx.direct_or_indirect === "I" ? "Indirect" : tx.direct_or_indirect === "D" ? "Direct" : undefined },
      ]
    : pc
      ? [
          { label: "Value change", val: <Money value={pc.value_usd_delta} signed />, sub: "As reported, not a trade", tone: e.direction === "increase" ? "up" : "dn" },
          { label: "Shares change", val: shares(pc.shares_delta, { signed: true }), sub: pc.put_call ?? pc.share_type },
          { label: "Shares after", val: shares(pc.shares_after), sub: `Prior ${shares(pc.shares_before)}` },
          { label: "Period", val: quarter(pc.period_of_report), sub: pc.prior_period_of_report ? `vs. ${quarter(pc.prior_period_of_report)}` : undefined },
        ]
      : [];

  return (
    <article className="act">
      <div className="act-top">
        <Avatar text={ticker ?? initials(company, 3)} />
        <div className="grow">
          <div className="row wrap" style={{ gap: 7 }}>
            {companyHref ? (
              <Link to={companyHref} className="act-tick">
                {ticker}
              </Link>
            ) : (
              <span className="act-tick faint" title="No ticker mapping is stored for this security">
                {pc?.cusip ?? DASHLESS}
              </span>
            )}
            <span className="muted" style={{ fontSize: 12.5 }}>
              {company}
            </span>
            <span className={`badge ${badge.tone}`}>{badge.label}</span>
            {e.form_type.endsWith("/A") && <span className="badge am">Amendment</span>}
          </div>
          <div className="row wrap" style={{ gap: 6, marginTop: 3, fontSize: 12 }}>
            {e.fund ? (
              <Link to={`/funds/${e.fund.cik}`} className="act-who">
                {e.fund.name}
              </Link>
            ) : owner ? (
              <>
                <Link to={`/insiders/${owner.insider_cik}`} className="act-who">
                  {owner.insider_name ?? `CIK ${owner.insider_cik}`}
                </Link>
                <span className="faint">
                  {roleLabel(owner.role)}
                  {others > 0 ? ` · +${others} reporting owner${others > 1 ? "s" : ""}` : ""}
                </span>
              </>
            ) : null}
          </div>
        </div>
        {e.score !== null && (
          <div style={{ flex: "none", textAlign: "right" }} title="Activity Score measures the relative significance and unusualness of reported activity. It does not measure expected investment performance.">
            <div className="mlabel">Activity Score</div>
            <div className="row" style={{ gap: 7, justifyContent: "flex-end", marginTop: 3 }}>
              {e.level && <span className={`badge pill ${LEVEL_TONE[e.level]}`}>{e.level[0]!.toUpperCase() + e.level.slice(1)}</span>}
              <span className="mono" style={{ fontWeight: 600, fontSize: 16 }}>
                {e.score}
              </span>
              <span className="mono faint" style={{ fontSize: 10.5, marginLeft: -4 }}>
                /100
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="metrics">
        {metrics.map((m) => (
          <div key={m.label} style={{ minWidth: 0 }}>
            <div className="mlabel">{m.label}</div>
            <div className={`mval ${m.tone ?? ""}`}>{m.val}</div>
            {m.sub && <div className="msub">{m.sub}</div>}
          </div>
        ))}
      </div>
      {e.reasons.length > 0 && (
        <ul style={{ margin: "0 0 0 50px", padding: "11px 13px 11px 28px", background: "var(--elev)", borderRadius: 9, fontSize: 12, color: "var(--ink2)" }}>
          {e.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <div className="act-foot">
        <span className="formchip">{e.form_type === "4" || e.form_type === "4/A" ? `Form ${e.form_type}` : e.form_type}</span>
        <span title={dateTimeET(e.filed_at ?? e.occurred_at)}>
          Filed <b>{relative(e.filed_at ?? e.occurred_at)}</b>
        </span>
        <span>
          Data age <b>{dataAge(e.data_age_days)}</b>
        </span>
        <SourceLink href={e.sec_url} />
        <span className="grow" />
        <button type="button" className="btn soft sm" onClick={() => openExplain(e.accession, `${ticker ?? company} · ${badge.label}`)}>
          Explain filing
        </button>
      </div>
    </article>
  );
}

const DASHLESS = "—";
