import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePaged } from "@/api/hooks";
import type { Fund } from "@/api/types";
import { DataTable, type Column } from "@/components/DataTable";
import { Avatar, Empty, ErrorState, LoadMore, PageHead, Pro, SkeletonRows } from "@/components/ui";
import { FollowButton } from "@/features/watchlist";
import { count, initials } from "@/lib/format";
import { useParams2 } from "@/lib/params";

export function FundTabs({ current }: { current: "directory" | "compare" }) {
  return (
    <div className="seg" role="group" aria-label="Funds view">
      <Link to="/funds" aria-current={current === "directory" ? "page" : undefined}>Directory</Link>
      <Link to="/funds/compare" aria-current={current === "compare" ? "page" : undefined}>Compare <Pro /></Link>
    </div>
  );
}

const columns: Column<Fund>[] = [
  {
    key: "name",
    label: "Fund",
    sort: "name",
    render: (f) => (
      <Link to={`/funds/${f.cik}`} className="row">
        <Avatar text={initials(f.name)} size={30} />
        <span>{f.name}</span>
      </Link>
    ),
  },
  { key: "cik", label: "CIK", sort: "cik", num: true, render: (f) => f.cik },
  { key: "follow", label: "", render: (f) => <span style={{ display: "flex", justifyContent: "flex-end" }}><FollowButton type="fund" entityKey={f.cik} name={f.name} size="sm" /></span> },
];

export default function Funds() {
  const { get, set } = useParams2();
  const [text, setText] = useState(get("q"));
  useEffect(() => {
    const t = setTimeout(() => set({ q: text.trim() }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  const sort = get("sort", "name");
  const q = usePaged<Fund>(["funds"], "/funds", { q: get("q"), sort, limit: 50 });

  return (
    <div>
      <PageHead title="Funds" sub="Institutional managers that file 13F reports. Open a fund for its reported holdings and quarter-over-quarter changes.">
        <FundTabs current="directory" />
      </PageHead>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <input className="input sm" style={{ width: 240, maxWidth: "100%" }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Fund name or CIK" aria-label="Search funds by name or CIK" />
        <span className="faint" style={{ marginLeft: "auto", fontSize: 11 }}>{q.total !== undefined ? `${count(q.total)} funds` : ""}</span>
      </div>
      <section className="card clip" aria-label="Funds directory">
        {q.isPending && <SkeletonRows />}
        {q.error && <ErrorState error={q.error} retry={() => q.refetch()} />}
        {q.isSuccess && q.rows.length === 0 && <Empty title="No funds match this search." />}
        {q.rows.length > 0 && <DataTable caption="Funds" columns={columns} rows={q.rows} rowKey={(f) => f.cik} sort={sort} onSort={(s) => set({ sort: s === "name" ? null : s })} />}
        <LoadMore query={q} />
      </section>
      <p className="faint" style={{ fontSize: 11, marginTop: 10 }}>
        Names and CIKs come from each manager’s filings. Assets under management, manager names and sector focus are not reported on Form 13F and are not shown.
      </p>
    </div>
  );
}

export function FundCompare() {
  return (
    <div>
      <PageHead title="Fund comparison" sub="Compare funds side by side using their latest reported 13F portfolios.">
        <FundTabs current="compare" />
      </PageHead>
      <div className="card" style={{ borderStyle: "dashed" }}>
        <Empty title="Fund comparison isn’t available yet." sub="Shared holdings and portfolio overlap are still being built. Free will compare 2 funds; Pro will compare more.">
          <Link to="/funds" className="btn">Browse funds</Link>
        </Empty>
      </div>
    </div>
  );
}
