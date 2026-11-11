import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
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
    <div className="browser" aria-label="Product preview with sample data" role="img">
      <div className="browser-bar">
        <span><i /><i /><i /></span>
        <span className="mono faint" style={{ flex: 1, maxWidth: 340, margin: "0 auto", height: 22, borderRadius: 6, background: "var(--surf)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>app.filingsintel.com</span>
        <span className="hide-sm" style={{ fontSize: 11, fontWeight: 600, color: "var(--acc)" }}>Sample data</span>
      </div>
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

export function Landing() {
  return (
    <div>
      <section className="mkt-in" style={{ padding: "76px 24px 44px", textAlign: "center" }}>
        <div className="row" style={{ display: "inline-flex", gap: 8, padding: "4px 12px 4px 5px", border: "1px solid var(--line)", borderRadius: 99, background: "var(--surf)", fontSize: 12, color: "var(--ink2)", marginBottom: 22 }}>
          <span className="badge acc pill">Form 4 · 13F</span>Insider and institutional filings in one place
        </div>
        <h1 className="hero">Track what was reported. Understand what changed.</h1>
        <p className="lede" style={{ margin: "20px auto 0" }}>Follow insider transactions and institutional holdings from the investors you care about. One feed, clear context, and alerts when a new SEC filing arrives.</p>
        <div className="row wrap" style={{ justifyContent: "center", marginTop: 30 }}>
          <Link to="/signup" className="btn primary lg">Get started free</Link>
          <Link to="/pricing" className="btn lg">See pricing</Link>
        </div>
        <p className="faint" style={{ fontSize: 12, marginTop: 12 }}>Free plan · No card required</p>
      </section>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 20px" }}><Preview /></div>

      <section className="mkt-in" style={{ padding: "90px 24px 20px" }}>
        <div className="eyebrow">What you get</div>
        <h2 className="h2" style={{ maxWidth: 620, margin: "8px 0 28px" }}>Understand public filings without reading them line by line.</h2>
        <div className="cols" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
          {[
            ["Follow investors, not headlines", "Follow 13F institutions and corporate insiders. Every new position, exit, purchase and sale lands in one chronological feed."],
            ["Activity with context", "Cluster activity shows when several insiders of one company report trades within 14 days. Amendments and flagged prices stay visible."],
            ["Alerts on new filings", "Turn on email for any fund, company or insider you follow, as a daily digest or instantly on Pro."],
          ].map(([t, d]) => (
            <div className="card card-pad" key={t} style={{ padding: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>{t}</div>
              <p className="muted" style={{ marginTop: 6 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mkt-in" style={{ padding: "70px 24px" }}>
        <div className="cols" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)", alignItems: "center" }}>
          <div>
            <div className="eyebrow">Data you can check</div>
            <h2 className="h2" style={{ margin: "8px 0 14px" }}>Straight from SEC EDGAR. Every number links back to its filing.</h2>
            <Link to="/methodology" style={{ fontWeight: 600 }}>Read the methodology →</Link>
          </div>
          <div className="card clip">
            {SOURCES.map((s) => (
              <div className="list-row" key={s.k} style={{ padding: "14px 18px", alignItems: "flex-start" }}>
                <span className="formchip" style={{ marginTop: 2 }}>{s.k}</span>
                <div><div style={{ fontWeight: 600 }}>{s.t}</div><div className="muted" style={{ fontSize: 13 }}>{s.d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mkt-in" style={{ padding: "20px 24px 90px", textAlign: "center" }}>
        <h2 className="h2" style={{ maxWidth: 640, margin: "0 auto" }}>Start free. Upgrade when you need deeper research tools.</h2>
        <p className="muted" style={{ margin: "10px 0 22px" }}>Free covers a 15-item watchlist and 3 alert rules. Pro is $19.99/month.</p>
        <div className="row wrap" style={{ justifyContent: "center" }}>
          <Link to="/signup" className="btn primary lg">Create free account</Link>
          <Link to="/pricing" className="btn lg">Compare plans</Link>
        </div>
      </section>
    </div>
  );
}

const COMPARE = [
  ["Watchlist items", "15", "Unlimited"],
  ["Alert rules", "3, daily digest", "Unlimited, instant email"],
  ["Form 4 and 13F data", "✓", "✓"],
  ["Cluster activity", "✓", "✓"],
  ["Screener", "First 3 results", "All results"],
  ["Saved screens", "—", "✓"],
  ["Unusual Activity", "First result", "✓"],
  ["Fund Comparison", "2 funds", "More funds"],
  ["Filing history", "4 quarters", "12 quarters"],
];
const FAQS = [
  ["Where does the data come from?", "Everything comes from public SEC EDGAR filings: Form 4 for insider transactions and Form 13F for institutional holdings. See the Methodology page for details."],
  ["How current is it?", "Filings are processed after the SEC accepts them. The filings themselves are delayed: up to two business days for Form 4 and up to 45 days after quarter end for 13F."],
  ["Is this investment advice?", "No. FilingsIntel organizes public disclosures. It doesn’t recommend securities, and past filing activity doesn’t predict future returns."],
  ["Can I cancel Pro anytime?", "Yes. Cancel from Settings → Plan & billing. You keep Pro until the end of the billing period, then move to Free."],
];

export function Pricing() {
  const [open, setOpen] = useState(0);
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "68px 24px 90px" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <h1 className="h2" style={{ fontSize: 40 }}>Simple pricing</h1>
        <p className="muted" style={{ marginTop: 8, fontSize: 16 }}>Same SEC data on both plans. Pro adds unlimited tracking and research tools.</p>
      </div>
      <div className="cols" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="card price-card">
          <div style={{ fontWeight: 700 }}>Free</div>
          <div className="price">$0</div>
          <div className="faint" style={{ marginBottom: 14 }}>Forever</div>
          {FREE_FEATURES.map((f) => <div className="feat" key={f} style={{ fontSize: 13.5 }}>{f}</div>)}
          <Link to="/signup" className="btn lg block" style={{ marginTop: 18 }}>Get started</Link>
        </div>
        <div className="card price-card" style={{ borderColor: "var(--acc)" }}>
          <div className="row" style={{ fontWeight: 700 }}>Pro <span className="badge acc pill">MOST POPULAR</span></div>
          <div className="price">$19.99</div>
          <div className="faint" style={{ marginBottom: 14 }}>per month · cancel anytime</div>
          {PRO_FEATURES.map((f) => <div className="feat" key={f} style={{ fontSize: 13.5 }}>{f}</div>)}
          <Link to="/signup" className="btn primary lg block" style={{ marginTop: 18 }}>Start with Pro</Link>
        </div>
      </div>
      <div className="card clip" style={{ marginTop: 28 }}>
        <table className="tbl" style={{ fontSize: 13.5 }}>
          <thead><tr><th scope="col">Compare</th><th scope="col">Free</th><th scope="col">Pro</th></tr></thead>
          <tbody>
            {COMPARE.map(([k, f, p]) => <tr key={k}><td style={{ whiteSpace: "normal" }}>{k}</td><td className="muted" style={{ whiteSpace: "normal" }}>{f}</td><td style={{ fontWeight: 600, whiteSpace: "normal" }}>{p}</td></tr>)}
          </tbody>
        </table>
      </div>
      <h2 className="h2" style={{ fontSize: 24, margin: "44px 0 12px" }}>Questions</h2>
      <div className="card clip">
        {FAQS.map(([q, a], i) => (
          <div key={q} style={{ borderBottom: i < FAQS.length - 1 ? "1px solid var(--lineSoft)" : undefined }}>
            <button type="button" className="list-row" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)} style={{ padding: "14px 18px", fontWeight: 600, fontSize: 14, justifyContent: "space-between", borderBottom: "none" }}>
              {q}<span aria-hidden="true" className="faint">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <p className="muted" style={{ padding: "0 18px 16px" }}>{a}</p>}
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
const CODES = [["P", "Purchase", "Open-market or private purchase", "up"], ["S", "Sale", "Open-market or private sale", "dn"], ["A", "Award", "Grant or award from the company", "am"], ["M", "Option exercise", "Exercise or conversion of a derivative", "acc"], ["F", "Tax withholding", "Shares withheld to cover taxes", ""], ["G", "Gift", "Bona fide gift", ""]];
const LIMITS = ["13F filings show long US equity positions only. Short positions and most non-US holdings aren’t reported.", "13F data can be up to 45 days old when it’s filed, so a fund may have already changed a position.", "Values are as reported at quarter end, not current market value.", "Insider purchases and sales happen for many reasons, including taxes, diversification and personal liquidity.", "Coverage reflects the filings stored so far; an empty result is not proof that nothing was filed."];

export function Methodology() {
  const secs = [["sources", "Data sources"], ["processing", "Processing"], ["signals", "Definitions"], ["codes", "Transaction codes"], ["limits", "Limitations"]];
  const H = ({ id, children }: { id: string; children: string }) => <h2 id={id} style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", margin: "36px 0 10px", scrollMarginTop: 80 }}>{children}</h2>;
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 90px" }}>
      <div className="eyebrow">About the data</div>
      <h1 className="h2" style={{ fontSize: 40, margin: "6px 0 10px" }}>Methodology</h1>
      <p className="lede">FilingsIntel is built entirely on public SEC filings. This page explains what we collect, how we process it, and where the data falls short.</p>
      <div className="cols" style={{ gridTemplateColumns: "200px minmax(0,1fr)", marginTop: 20 }}>
        <nav className="hide-md" aria-label="On this page" style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 8, paddingTop: 36 }}>
          {secs.map(([id, t]) => <a key={id} href={`#${id}`} className="muted" style={{ fontWeight: 600, fontSize: 13 }}>{t}</a>)}
        </nav>
        <div>
          <H id="sources">Data sources</H>
          <div className="card clip">
            {SOURCES.map((s) => <div className="list-row" key={s.k} style={{ padding: "14px 18px", alignItems: "flex-start" }}><span className="formchip" style={{ marginTop: 2 }}>{s.k}</span><div><div style={{ fontWeight: 600 }}>{s.t}</div><div className="muted">{s.d}</div></div></div>)}
          </div>
          <H id="processing">Processing</H>
          <p className="muted">Each filing is parsed after EDGAR accepts it, and the raw filing is archived. Values are shown as reported by the filer; we don’t adjust them for later price moves. A reported price that looks implausible is flagged rather than corrected, and a transaction without a usable price has no calculated value.</p>
          <p className="muted" style={{ marginTop: 10 }}>Quarter-over-quarter changes compare a filer’s effective 13F holdings for two adjacent quarters. Point-in-time views use the SEC acceptance time of each filing.</p>
          <H id="signals">Definitions</H>
          <div className="card clip">
            {DEFS.map(([t, d]) => <div key={t} style={{ padding: "14px 18px", borderBottom: "1px solid var(--lineSoft)" }}><div style={{ fontWeight: 600 }}>{t}</div><div className="muted">{d}</div></div>)}
          </div>
          <H id="codes">Form 4 transaction codes</H>
          <div className="card clip">
            {CODES.map(([c, l, d, tone]) => <div className="list-row" key={c}><span className={`badge ${tone}`} style={{ fontFamily: "var(--font-mono)", minWidth: 22, textAlign: "center" }}>{c}</span><b style={{ width: 130, flex: "none" }}>{l}</b><span className="muted">{d}</span></div>)}
          </div>
          <H id="limits">Limitations</H>
          <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {LIMITS.map((l) => <div className="row" key={l} style={{ alignItems: "flex-start" }}><span className="badge am">!</span><span className="muted">{l}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

const TERMS = [["Acceptance", "By creating an account or using FilingsIntel, you agree to these terms. If you don’t agree, don’t use the service."], ["The service", "FilingsIntel presents information derived from public SEC filings. We work to keep it accurate and current but don’t guarantee completeness, accuracy or timeliness."], ["Not investment advice", "Nothing on FilingsIntel is a recommendation about any security. You are responsible for your own investment decisions."], ["Accounts", "You’re responsible for keeping your login credentials secure and for activity on your account."], ["Subscriptions", "Pro is billed in advance. You can cancel anytime; access continues until the end of the current billing period. Fees are non-refundable except where required by law."], ["Acceptable use", "Don’t scrape, resell or redistribute FilingsIntel data in bulk, or interfere with the service’s operation."], ["Changes", "We may update these terms. We’ll notify you by email before material changes take effect."]];
const PRIVACY = [["What we collect", "Your email, password hash, followed filers, alert rules, notification preferences and, for Pro, billing details handled by our payment processor."], ["How we use it", "To run your account, deliver alerts, process payments and improve the product. We don’t sell your personal information."], ["Cookies", "We use essential cookies to keep you signed in."], ["Sharing", "We share data only with service providers that help us operate (hosting, email delivery, payments), under contracts that protect it."], ["Retention", "We keep your data while your account is active. Deleting your account removes your follows, alert rules and settings."], ["Your rights", "You can change or delete your account from Settings, or by emailing us."]];

export function Legal({ doc }: { doc: "terms" | "privacy" }) {
  const secs = doc === "terms" ? TERMS : PRIVACY;
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 90px" }}>
      <div className="seg" role="group" aria-label="Legal documents" style={{ marginBottom: 22 }}>
        <NavLink to="/terms" aria-current={doc === "terms" ? "page" : undefined}>Terms of Service</NavLink>
        <NavLink to="/privacy" aria-current={doc === "privacy" ? "page" : undefined}>Privacy Policy</NavLink>
      </div>
      <h1 className="h2">{doc === "terms" ? "Terms of Service" : "Privacy Policy"}</h1>
      <div className="notice" style={{ margin: "14px 0 6px" }}>Draft text pending legal review.</div>
      {secs.map(([t, d], i) => (
        <section key={t} style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{i + 1}. {t}</h2>
          <p className="muted" style={{ marginTop: 4 }}>{d}</p>
        </section>
      ))}
    </div>
  );
}

export function NotFound() {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "120px 24px 140px", textAlign: "center" }}>
      <div className="eyebrow mono">ERROR 404</div>
      <h1 className="h2" style={{ margin: "8px 0" }}>Page not found</h1>
      <p className="muted" style={{ marginBottom: 22 }}>This page doesn’t exist or has moved. Try searching for a fund, insider or ticker from the dashboard.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link to="/" className="btn lg">Back to home</Link>
        <Link to="/dashboard" className="btn primary lg">Go to dashboard</Link>
      </div>
    </div>
  );
}
