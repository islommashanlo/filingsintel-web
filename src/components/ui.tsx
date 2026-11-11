import { useEffect, useRef, type ReactNode } from "react";
import { ApiError, errorMessage } from "@/api/client";
import { dataAge, dateTimeET, money, moneyFull } from "@/lib/format";

export function Logo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span>
        <i style={{ height: 5, opacity: 0.65 }} />
        <i style={{ height: 10 }} />
        <i style={{ height: 7, opacity: 0.85 }} />
      </span>
    </span>
  );
}

export function Avatar({ text, size = 38, round }: { text: string; size?: number; round?: boolean }) {
  return (
    <span className={`avatar ${round ? "round" : ""}`} aria-hidden="true" style={{ width: size, height: size, fontSize: size >= 48 ? 15 : size >= 34 ? 10 : 9, borderRadius: round ? undefined : Math.round(size / 4.2) }}>
      {text.slice(0, 4)}
    </span>
  );
}

export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children && <div className="row wrap">{children}</div>}
    </div>
  );
}

export function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" className="toggle" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} />;
}

export function Pro() {
  return <span className="pro">PRO</span>;
}

export function Empty({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {children}
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const notFound = error instanceof ApiError && error.status === 404;
  return (
    <div className="empty" role="alert">
      <div className="empty-title">{notFound ? "Not found" : "Couldn’t load this data"}</div>
      <div className="empty-sub">{notFound ? "There is no stored filing data for this page." : errorMessage(error)}</div>
      {retry && !notFound && (
        <button type="button" className="btn" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div className="sk-row" key={i}>
          <span className="sk" style={{ width: `${45 + ((i * 17) % 40)}%` }} />
          <span className="sk" style={{ width: `${50 + ((i * 13) % 30)}%`, justifySelf: "end" }} />
          <span className="sk" style={{ width: `${40 + ((i * 11) % 40)}%`, justifySelf: "end" }} />
          <span className="sk" style={{ width: `${50 + ((i * 7) % 30)}%`, justifySelf: "end" }} />
          <span className="sk" style={{ width: `${40 + ((i * 5) % 40)}%`, justifySelf: "end" }} />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="profile-head" style={{ margin: "6px 0 22px" }}>
        <span className="sk" style={{ width: 52, height: 52, borderRadius: 12 }} />
        <div className="grow">
          <span className="sk" style={{ width: 220, height: 16 }} />
          <span className="sk" style={{ width: 320, maxWidth: "80%", marginTop: 8 }} />
        </div>
      </div>
      <div className="card clip">
        <SkeletonRows />
      </div>
    </div>
  );
}

/** Dollar amount, abbreviated, with the exact figure on hover. */
export function Money({ value, signed, colored }: { value: string | number | null | undefined; signed?: boolean; colored?: boolean }) {
  const n = value === null || value === undefined ? null : Number(value);
  const cls = colored && n ? (n > 0 ? "up" : "dn") : "";
  return (
    <span className={cls} title={n === null ? "Not reported or not usable" : moneyFull(value)}>
      {money(value, { signed })}
    </span>
  );
}

/** Every filing-derived figure links to its SEC source. */
export function SourceLink({ href, children = "SEC source" }: { href: string | null | undefined; children?: ReactNode }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children} ↗
    </a>
  );
}

export function Freshness({ items, source }: { items: [string, ReactNode][]; source?: string | null }) {
  return (
    <div className="fresh">
      {items.map(([k, v]) => (
        <span key={k}>
          {k} <b>{v}</b>
        </span>
      ))}
      <SourceLink href={source} />
    </div>
  );
}

export function filedItems(p: { filed_at: string | null; data_age_days: number | null; accession?: string | null }): [string, ReactNode][] {
  const items: [string, ReactNode][] = [
    ["Filed", dateTimeET(p.filed_at)],
    ["Data age", dataAge(p.data_age_days)],
  ];
  if (p.accession) items.push(["Accession", <span className="mono">{p.accession}</span>]);
  return items;
}

/** Dialog shell: closes on Escape and scrim click, traps Tab, restores focus. */
export function Modal({ title, onClose, children, footer, wide, drawer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; drawer?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const focusables = () => Array.from(el.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex="0"]'));
    (focusables()[1] ?? focusables()[0] ?? el).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={`scrim ${drawer ? "right" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={drawer ? "drawer" : `modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} tabIndex={-1}>
        <div className="modal-head">
          <div className="grow modal-title">{title}</div>
          <button type="button" className="x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function LoadMore({ query }: { query: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown } }) {
  if (!query.hasNextPage) return null;
  return (
    <button type="button" className="tbl-foot" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
      {query.isFetchingNextPage ? "Loading…" : "Load more"}
    </button>
  );
}
