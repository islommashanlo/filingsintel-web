import { useState } from "react";
import { Link } from "react-router-dom";
import { FREE_FEATURES, PRO_FEATURES } from "@/features/billing";

const SOURCES = [
  { k: "Form 4", t: "Insider transactions", d: "Officers, directors and 10% owners report trades within two business days." },
  { k: "13F-HR", t: "Institutional holdings", d: "Managers with $100M+ in US equities report long positions quarterly, within 45 days of quarter end." },
  { k: "Source", t: "Straight from EDGAR", d: "Filings are parsed after the SEC accepts them. Every figure links back to its filing." },
];

/** Static illustration of the app with fictional sample data. */
function Preview() {
  const rows = [
    { t: "ACME", co: "Acme Robotics Corp", badge: "Insider Purchase", tone: "up", who: "Dana Whitfield", role: "Chief Financial Officer", m: [["Reported value", "$1.2M"], ["Shares", "25,000"], ["Price", "$48.10"], ["Owned after", "140,500"]] },
    { t: "NRTH", co: "Northwind Energy Inc", badge: "New Position", tone: "acc", who: "Harborview Capital Management", role: "13F · Q3 2026", m: [["Value change", "+$648M"], ["Shares change", "+5,200,000"], ["Shares after", "5,200,000"], ["Period", "Q3 2026"]] },
    { t: "LUMA", co: "Lumen Devices Ltd", badge: "Insider Sale", tone: "dn", who: "Tom Okafor", role: "Director", m: [["Reported value", "$3.5M"], ["Shares", "70,000"], ["Price", "$50.02"], ["Owned after", "412,000"]] },
  ];
  return (
    <div className="frame-body" aria-label="Product preview with sample data" role="img">
      <div style={{ padding: 18, textAlign: "left", fontSize: 13.5 }}>
        <div className="dashgrid">
          <div className="card" style={{ gridArea: "feed" }}>
            <div className="card-head"><div><div className="card-title">Activity feed</div><div className="card-sub">Institutional and insider filings, newest first</div></div></div>
            {rows.map((r) => (
              <div className="act" key={r.t}>
                <div className="act-top">
                  <span className="avatar" style={{ width: 38, height: 38 }}>{r.t}</span>
                  <div className="grow">
                    <div className="row wrap" style={{ gap: 7 }}><span className="act-tick">{r.t}</span><span className="muted" style={{ fontSize: 12.5 }}>{r.co}</span><span className={`badge ${r.tone}`}>{r.badge}</span></div>
                    <div style={{ fontSize: 12, marginTop: 3 }}><b>{r.who}</b> <span className="faint">{r.role}</span></div>
                  </div>
                </div>
                <div className="metrics">
                  {r.m.map(([l, v]) => <div key={l}><div className="mlabel">{l}</div><div className="mval">{v}</div></div>)}
                </div>
              </div>
            ))}
          </div>
          <div className="card card-pad" style={{ gridArea: "deadline" }}>
            <div className="eyebrow">Upcoming</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 6 }}>Q3 13F filings due <span style={{ color: "var(--acc)" }}>Nov 16</span></div>
            <div className="progress"><i style={{ width: "88%" }} /></div>
            <div className="muted" style={{ fontSize: 11.5 }}>Period ending Sep 30, 2026</div>
          </div>
          <div className="card clip" style={{ gridArea: "cluster" }}>
            <div className="card-head"><div><div className="card-title">Cluster activity</div><div className="card-sub">3+ insiders reported open-market trades within 14 days</div></div></div>
            {[["ACME", "4 insiders", "$3.9M"], ["HLTH", "3 insiders", "$8.9M"]].map(([t, n, v]) => (
              <div className="list-row" key={t}><span className="tick">{t}</span><span className="muted grow" style={{ fontSize: 12 }}>{n} · 14d</span><span className="badge pill up">Purchases</span><span className="mono" style={{ fontWeight: 600, fontSize: 12 }}>{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const LEDGER = [
  { form: "Form 4", who: "Tom Okafor", sub: "Director, Lumen Devices Ltd", what: "Sale", tag: null, val: "−$3.5M", tone: "dn", filed: "Nov 10" },
  { form: "Form 4", who: "Acme Robotics insiders", sub: "4 insiders in 14 days", what: "Purchase", tag: "Cluster", val: "+$3.9M", tone: "up", filed: "Nov 9" },
  { form: "13F-HR", who: "Northgate Partners LP", sub: "Quarter ended Sep 30", what: "Position increased", tag: null, val: "+$13.8M", tone: "up", filed: "Nov 10" },
  { form: "13F-HR", who: "Harborview Capital Management", sub: "Quarter ended Sep 30", what: "New position", tag: null, val: "+$648M", tone: "up", filed: "Nov 11" },
];

function Corners() {
  return (
    <>
      <i className="c tl" aria-hidden="true" />
      <i className="c tr" aria-hidden="true" />
      <i className="c bl" aria-hidden="true" />
      <i className="c br" aria-hidden="true" />
    </>
  );
}

function Frieze() {
  return (
    <div className="mwrap" style={{ paddingTop: 72 }} aria-hidden="true">
      <div className="frieze"><div className="orn" /></div>
    </div>
  );
}

function Dots({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="dots">
      <span>{label}</span>
      <i />
      <b className={tone}>{value}</b>
    </div>
  );
}

export function Landing() {
  return (
    <div>
      <section className="mwrap temple-w">
        <div className="temple">
          <div className="ped">
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
              <path className="p1" d="M0 23 L50 1 L100 23" />
              <path className="p2" d="M5 23 L50 4 L95 23" />
            </svg>
            <div className="ped-seal">
              <div className="seal" role="img" aria-label="Public record"><span>Public</span><i /><span>Record</span></div>
            </div>
          </div>
          <div className="ent" />
          <div className="tbody">
            <span className="pil" aria-hidden="true" />
            <div className="tin">
              <h1 className="title-h">Track what was reported. Understand what changed.</h1>
              <p className="lede">Insider transactions and institutional holdings filed with the SEC, set down in plain order and linked to their source.</p>
              <div className="btns center">
                <Link to="/signup" className="btn primary lg">Get started free</Link>
                <Link to="/pricing" className="btn lg">See pricing</Link>
              </div>
              <div className="fine">Free plan. No card required.</div>
            </div>
            <span className="pil" aria-hidden="true" />
          </div>
          <div className="steps" aria-hidden="true"><i /><i /><i /></div>
        </div>
      </section>

      <section className="mwrap" style={{ paddingBlock: "40px 40px" }}>
        <div className="fr">
          <Corners />
          <div className="ledger-wrap">
            <table className="ledger">
              <caption>Plate I. Recent filings, sample data</caption>
              <thead>
                <tr><th scope="col">Form</th><th scope="col">Filer</th><th scope="col">Reported</th><th scope="col" className="r">Value</th><th scope="col">Filed</th></tr>
              </thead>
              <tbody>
                {LEDGER.map((r) => (
                  <tr key={r.who}>
                    <td className="mono">{r.form}</td>
                    <td><div className="who">{r.who}</div><div className="acc">{r.sub}</div></td>
                    <td>{r.what}{r.tag && <span className="tag" style={{ color: "var(--acc)" }}>{r.tag}</span>}</td>
                    <td className={`r mono ${r.tone}`}>{r.val}</td>
                    <td className="mono">{r.filed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="note">In the product, each figure links to its accession number and SEC filing, with the filing date and data age. Names and amounts here are fictional samples.</p>
      </section>

      <section className="mwrap fig">
        <div className="frame">
          <div className="frame-bar"><span className="mono">app.insideledger.com</span><span className="hide-sm">Sample data</span></div>
          <Preview />
        </div>
        <div className="figcap">Figure 1. The InsideLedger dashboard with sample data.</div>
      </section>

      <Frieze />

      <section className="mwrap msec" style={{ paddingTop: 56 }}>
        <div className="sechead"><h2>Understand public filings without reading them line by line.</h2></div>
        <div className="colonnade">
          <article className="column">
            <h3>Follow investors, not headlines</h3>
            <p>Follow 13F institutions and corporate insiders. Every new position, exit, purchase and sale lands in one chronological feed.</p>
            <Dots label="Harborview Capital, new position" value="+$648M" tone="up" />
            <Dots label="Tom Okafor, sale" value={"−$3.5M"} tone="dn" />
          </article>
          <article className="column">
            <h3>Activity with context</h3>
            <p>Cluster activity shows when several insiders of one company report trades within 14 days. Amendments and flagged prices stay visible.</p>
            <Dots label="ACME, 4 insiders in 14 days" value="+$3.9M" tone="up" />
            <Dots label="HLTH, 3 insiders in 14 days" value="+$8.9M" tone="up" />
          </article>
          <article className="column">
            <h3>Alerts on new filings</h3>
            <p>Turn on email for any fund, company or insider you follow, as a daily digest or instantly on Pro.</p>
            <Dots label="New filing from Acme Robotics" value="On" />
            <Dots label="New 13F from Harborview Capital" value="On" />
          </article>
        </div>
      </section>

      <section className="mwrap msec">
        <div className="sechead"><h2>Straight from SEC EDGAR. Every number links back to its filing.</h2></div>
        <div className="msplit">
          <div>
            <p className="muted" style={{ fontSize: 16, lineHeight: 1.7 }}>We read two kinds of public filing and show them as filed. Nothing is estimated or adjusted.</p>
            <Link to="/methodology" className="textlink">Read the methodology</Link>
          </div>
          <div className="srcs">
            {SOURCES.map((s) => (
              <div className="src" key={s.k}>
                <div className="mono k">{s.k}</div>
                <div><div className="t">{s.t}</div><div className="d">{s.d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Frieze />

      <section className="band">
        <div className="mwrap band-in">
          <div>
            <h2 className="band-h">Start free. Upgrade when you need deeper research tools.</h2>
            <p style={{ fontSize: 15, margin: "10px 0 0" }}>Free covers a 15-item watchlist and 3 alert rules. Pro is $19.99/month.</p>
          </div>
          <div className="btns center">
            <Link to="/signup" className="btn lg inv">Create free account</Link>
            <Link to="/pricing" className="btn lg inv-o">Compare plans</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const COMPARE = [
  ["Watchlist items", "15", "Unlimited"],
  ["Alert rules", "3, daily digest", "Unlimited, instant"],
  ["Form 4 and 13F data", "Yes", "Yes"],
  ["Cluster activity", "Yes", "Yes"],
  ["Screener", "First 3 results", "All results"],
  ["Saved screens", "—", "Yes"],
  ["Unusual Activity", "First result", "Yes"],
  ["Fund Comparison", "2 funds", "More funds"],
  ["Filing history", "4 quarters", "12 quarters"],
];
const FAQS = [
  ["Where does the data come from?", "Everything comes from public SEC EDGAR filings: Form 4 for insider transactions and Form 13F for institutional holdings. See the Methodology page for details."],
  ["How current is it?", "Filings are processed after the SEC accepts them. The filings themselves are delayed: up to two business days for Form 4 and up to 45 days after quarter end for 13F."],
  ["Is this investment advice?", "No. InsideLedger organizes public disclosures. It does not recommend securities, and past filing activity does not predict future returns."],
  ["Can I cancel Pro anytime?", "Yes. Cancel from Settings, Plan & billing. You keep Pro until the end of the billing period, then move to Free."],
];

export function Pricing() {
  const [open, setOpen] = useState(0);
  return (
    <div className="mwrap mpage">
      <div style={{ textAlign: "center" }}>
        <h1 className="page-h">Simple pricing</h1>
        <p className="mpage-sub" style={{ marginInline: "auto" }}>Same SEC data on both plans. Pro adds unlimited tracking and research tools.</p>
      </div>
      <div className="plans">
        <div className="plan">
          <Corners />
          <div className="plan-n">Free</div>
          <div className="plan-p">$0</div>
          <div className="plan-per">Forever</div>
          <div className="plan-f">{FREE_FEATURES.map((f) => <div key={f}>{f}</div>)}</div>
          <Link to="/signup" className="btn lg">Get started</Link>
        </div>
        <div className="plan">
          <Corners />
          <div className="plan-n">Pro <span className="tag" style={{ color: "var(--acc)" }}>Most popular</span></div>
          <div className="plan-p">$19.99</div>
          <div className="plan-per">per month, cancel anytime</div>
          <div className="plan-f">{PRO_FEATURES.map((f) => <div key={f}>{f}</div>)}</div>
          <Link to="/signup" className="btn primary lg">Start with Pro</Link>
        </div>
      </div>
      <div className="cmp" role="table" aria-label="Plan comparison">
        <div className="cmp-h" role="row"><span role="columnheader">Compare</span><span role="columnheader">Free</span><span role="columnheader">Pro</span></div>
        {COMPARE.map(([k, f, p]) => (
          <div className="cmp-r" role="row" key={k}>
            <span role="cell">{k}</span>
            <span role="cell" className={`mono ${f === "—" ? "faint" : "muted"}`} style={{ fontSize: 13 }}>{f}</span>
            <span role="cell" className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{p}</span>
          </div>
        ))}
      </div>
      <div className="faq-w">
        <h2>Questions</h2>
        {FAQS.map(([q, a], i) => (
          <div className="faq" key={q}>
            <button type="button" className="faq-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
              {q}<span className="mono faint" aria-hidden="true">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <div className="faq-a">{a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

const DEFS = [
  ["Cluster activity", "Three or more different insiders of the same company report open-market purchases (code P), or separately sales (code S), within a rolling 14-day window. Administrative and derivative rows do not count."],
  ["Activity Score", "A planned 0–100 measure of how significant or unusual a reported filing is relative to the filer’s and company’s history. It is not active yet and it does not measure expected investment performance."],
  ["Activity labels", "New Position, Increased, Reduced and Exited describe changes between two reported 13F portfolios; they do not assert that a trade occurred on a given date. Insider Purchase and Insider Sale describe Form 4 open-market transactions."],
  ["Amendments", "An amended filing supersedes the one it corrects. Superseded filings are kept and remain readable; nothing is deleted."],
];
const CODES = [["P", "Purchase", "Open-market or private purchase", "up"], ["S", "Sale", "Open-market or private sale", "dn"], ["A", "Award", "Grant or award from the company", "am"], ["M", "Option exercise", "Exercise or conversion of a derivative", ""], ["F", "Tax withholding", "Shares withheld to cover taxes", "muted"], ["G", "Gift", "Bona fide gift", "muted"]];
const LIMITS = ["13F filings show long US equity positions only. Short positions and most non-US holdings are not reported.", "13F data can be up to 45 days old when it is filed, so a fund may have already changed a position.", "Values are as reported at quarter end, not current market value.", "Insider purchases and sales happen for many reasons, including taxes, diversification and personal liquidity.", "Coverage reflects the filings stored so far; an empty result is not proof that nothing was filed."];
const SECS = [["sources", "Data sources"], ["processing", "Processing"], ["signals", "Definitions"], ["codes", "Transaction codes"], ["limits", "Limitations"]];

export function Methodology() {
  return (
    <div className="mwrap mpage">
      <h1 className="page-h">Methodology</h1>
      <p className="mpage-sub">InsideLedger is built entirely on public SEC filings. This page explains what we collect, how we process it, and where the data falls short.</p>
      <div className="meth">
        <nav className="toc" aria-label="On this page">
          {SECS.map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}
        </nav>
        <div className="prose">
          <div>
            <h2 id="sources">Data sources</h2>
            <p style={{ marginBottom: 12 }}>We ingest two filing types from SEC EDGAR.</p>
            <div className="ruled-top">
              {SOURCES.map((s) => (
                <div className="rowline" key={s.k}><div className="mono k">{s.k}</div><div><div className="t">{s.t}</div><div className="d">{s.d}</div></div></div>
              ))}
            </div>
          </div>
          <div>
            <h2 id="processing">Processing</h2>
            <p className="dropcap" style={{ marginBottom: 12 }}>Each filing is parsed after EDGAR accepts it, and the raw filing is archived. Values are shown as reported by the filer; we do not adjust them for later price moves. A reported price that looks implausible is flagged rather than corrected, and a transaction without a usable price has no calculated value.</p>
            <p>Quarter-over-quarter changes compare a filer’s effective 13F holdings for two adjacent quarters. Point-in-time views use the SEC acceptance time of each filing.</p>
          </div>
          <div>
            <h2 id="signals">Definitions</h2>
            <div className="ruled-top">
              {DEFS.map(([t, d]) => (
                <div key={t} style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}><div style={{ fontWeight: 700, fontSize: 15 }}>{t}</div><div className="muted" style={{ fontSize: 14.5, marginTop: 3 }}>{d}</div></div>
              ))}
            </div>
          </div>
          <div>
            <h2 id="codes">Form 4 transaction codes</h2>
            <div className="ruled-top">
              {CODES.map(([c, l, d, tone]) => <div className="code" key={c}><b className={tone}>{c}</b><span className="l">{l}</span><span className="d">{d}</span></div>)}
            </div>
          </div>
          <div>
            <h2 id="limits">Limitations</h2>
            <div className="ruled-top">
              {LIMITS.map((l) => (
                <div key={l} className="muted" style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--line)", fontSize: 15 }}><b style={{ color: "var(--am)" }}>Note</b><span>{l}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TERMS = [["Acceptance", "By creating an account or using InsideLedger, you agree to these terms. If you do not agree, do not use the service."], ["The service", "InsideLedger presents information derived from public SEC filings. We work to keep it accurate and current but do not guarantee completeness, accuracy or timeliness."], ["Not investment advice", "Nothing on InsideLedger is a recommendation about any security. You are responsible for your own investment decisions."], ["Accounts", "You are responsible for keeping your login credentials secure and for activity on your account."], ["Subscriptions", "Pro is billed in advance. You can cancel anytime; access continues until the end of the current billing period. Fees are non-refundable except where required by law."], ["Acceptable use", "Do not scrape, resell or redistribute InsideLedger data in bulk, or interfere with the service’s operation."], ["Changes", "We may update these terms. We will notify you by email before material changes take effect."]];
const PRIVACY = [["What we collect", "Your email, password hash, followed filers, alert rules, notification preferences and, for Pro, billing details handled by our payment processor."], ["How we use it", "To run your account, deliver alerts, process payments and improve the product. We do not sell your personal information."], ["Cookies", "We use essential cookies to keep you signed in."], ["Sharing", "We share data only with service providers that help us operate (hosting, email delivery, payments), under contracts that protect it."], ["Retention", "We keep your data while your account is active. Deleting your account removes your follows, alert rules and settings."], ["Your rights", "You can change or delete your account from Settings, or by emailing us."]];

export function Legal({ doc }: { doc: "terms" | "privacy" }) {
  const secs = doc === "terms" ? TERMS : PRIVACY;
  return (
    <div className="mwrap mpage" style={{ maxWidth: 820 }}>
      <nav className="mtabs" aria-label="Legal documents">
        <Link to="/terms" className="mtab" aria-current={doc === "terms" ? "page" : undefined}>Terms of Service</Link>
        <Link to="/privacy" className="mtab" aria-current={doc === "privacy" ? "page" : undefined}>Privacy Policy</Link>
      </nav>
      <h1 className="page-h">{doc === "terms" ? "Terms of Service" : "Privacy Policy"}</h1>
      <p className="muted" style={{ fontSize: 18, margin: "14px 0 36px" }}>Draft text, pending legal review.</p>
      <div className="legal">
        {secs.map(([t, d], i) => (
          <section key={t}>
            <h3>{i + 1}. {t}</h3>
            <p>{d}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="mwrap nf">
      <div className="nf-n">ERROR 404</div>
      <h1>Page not found</h1>
      <p className="mpage-sub" style={{ margin: "14px auto 0", fontSize: 21 }}>This page does not exist or has moved. Search for a fund, insider or ticker from the dashboard.</p>
      <div className="btns center" style={{ marginTop: 30 }}>
        <Link to="/" className="btn lg">Back to home</Link>
        <Link to="/dashboard" className="btn primary lg">Go to dashboard</Link>
      </div>
    </div>
  );
}
