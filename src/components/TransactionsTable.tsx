import { Link } from "react-router-dom";
import type { Transaction } from "@/api/types";
import { codeLabel, date, price, roleLabel, shares } from "@/lib/format";
import { DataTable, type Column } from "./DataTable";
import { Money, SourceLink } from "./ui";

export function TxBadge({ tx }: { tx: Transaction }) {
  const tone = tx.direction === "purchase" ? "up" : tx.direction === "sale" ? "dn" : "";
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className="formchip" title={`SEC transaction code ${tx.transaction_code ?? "not reported"}`}>
        {tx.transaction_code ?? "?"}
      </span>
      <span className={`badge ${tone}`}>{codeLabel(tx.transaction_code)}</span>
      {tx.security_table === "derivative" && <span className="badge">Derivative</span>}
      {tx.form_type === "4/A" && <span className="badge am">4/A</span>}
    </span>
  );
}

type Hide = "company" | "insider";

/** Form 4 transaction lines. One row per reporting owner per line, as filed. */
export function TransactionsTable({ rows, sort, onSort, hide = [] }: { rows: Transaction[]; sort?: string; onSort?: (s: string) => void; hide?: Hide[] }) {
  const columns: Column<Transaction>[] = [];
  if (!hide.includes("company")) {
    columns.push({
      key: "company",
      label: "Company",
      render: (t) => (
        <span className="row" style={{ gap: 8 }}>
          {t.issuer.ticker ? (
            <Link to={`/companies/${encodeURIComponent(t.issuer.ticker)}`} className="tick">
              {t.issuer.ticker}
            </Link>
          ) : null}
          <span className="muted truncate" style={{ maxWidth: 220 }}>
            {t.issuer.name ?? `CIK ${t.issuer.cik}`}
          </span>
        </span>
      ),
    });
  }
  if (!hide.includes("insider")) {
    columns.push(
      { key: "insider", label: "Insider", render: (t) => <Link to={`/insiders/${t.insider_cik}`}>{t.insider_name ?? `CIK ${t.insider_cik}`}</Link> },
      { key: "role", label: "Role", render: (t) => <span className="muted">{roleLabel(t.role)}</span> },
    );
  }
  columns.push(
    { key: "type", label: "Transaction", render: (t) => <TxBadge tx={t} /> },
    { key: "shares", label: "Shares", num: true, render: (t) => shares(t.shares) },
    {
      key: "price",
      label: "Price",
      num: true,
      render: (t) => (
        <span title={t.price_suspect ? `Reported price flagged: ${t.price_suspect_reason ?? "suspect"}` : undefined} className={t.price_suspect ? "badge am" : undefined}>
          {price(t.price)}
        </span>
      ),
    },
    { key: "value", label: "Value", sort: "value", num: true, render: (t) => <Money value={t.value} /> },
    { key: "own", label: "Owned after", num: true, render: (t) => shares(t.shares_owned_following) },
    { key: "traded", label: "Traded", sort: "transaction_date", num: true, render: (t) => date(t.transaction_date) },
    { key: "filed", label: "Filed", sort: "filed_at", num: true, render: (t) => date(t.filed_at) },
    { key: "src", label: "Source", render: (t) => <SourceLink href={t.sec_url}>Form {t.form_type}</SourceLink> },
  );
  return <DataTable caption="Insider transactions" columns={columns} rows={rows} rowKey={(t) => t.id} sort={sort} onSort={onSort} minWidth={hide.length ? 860 : 1180} />;
}
