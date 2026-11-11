/** Formatting rules from the design brief. Decimals arrive from the API as strings. */

const MINUS = "−";
export const DASH = "—";

export function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function compact(abs: number): string {
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const scaled = abs / size;
      const digits = scaled >= 100 ? 0 : 1;
      return `${scaled.toFixed(digits).replace(/\.0$/, "")}${suffix}`;
    }
  }
  return abs.toFixed(abs % 1 === 0 ? 0 : 2);
}

/** `$1.2M`, `$845K`. Null renders as an em dash, never as zero. */
export function money(v: string | number | null | undefined, opts: { signed?: boolean } = {}): string {
  const n = num(v);
  if (n === null) return DASH;
  const sign = n < 0 ? MINUS : opts.signed && n > 0 ? "+" : "";
  return `${sign}$${compact(Math.abs(n))}`;
}

/** Exact dollars for tooltips: `$1,234,567.89`. */
export function moneyFull(v: string | number | null | undefined): string {
  const n = num(v);
  if (n === null) return DASH;
  const body = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${n < 0 ? MINUS : ""}$${body}`;
}

/** Per-share price, always two decimals (more when the filing reports them). */
export function price(v: string | number | null | undefined): string {
  const n = num(v);
  if (n === null) return DASH;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

/** Share counts with thousands separators; fractional shares are kept. */
export function shares(v: string | number | null | undefined, opts: { signed?: boolean } = {}): string {
  const n = num(v);
  if (n === null) return DASH;
  const body = Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 4 });
  const sign = n < 0 ? MINUS : opts.signed && n > 0 ? "+" : "";
  return `${sign}${body}`;
}

export function count(v: number | null | undefined): string {
  return v === null || v === undefined ? DASH : v.toLocaleString("en-US");
}

/** Signed percent to one decimal with a true minus sign: `+12.4%`, `−3.1%`. */
export function percentDelta(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return DASH;
  const sign = v < 0 ? MINUS : v > 0 ? "+" : "";
  return `${sign}${Math.abs(v).toFixed(1)}%`;
}

export function tone(v: string | number | null | undefined): "up" | "dn" | "" {
  const n = num(v);
  if (n === null || n === 0) return "";
  return n > 0 ? "up" : "dn";
}

const ET = "America/New_York";

function parse(v: string | null | undefined): Date | null {
  if (!v) return null;
  // Date-only values are calendar dates, not instants: keep them in place.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00Z`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `Oct 2, 2026`. Timestamps are shown in US Eastern time, as EDGAR reports them. */
export function date(v: string | null | undefined): string {
  const d = parse(v);
  if (!d) return DASH;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(v ?? "");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: dateOnly ? "UTC" : ET,
  });
}

export function dateTimeET(v: string | null | undefined): string {
  const d = parse(v);
  if (!d) return DASH;
  return `${d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: ET,
  })} ET`;
}

/** Relative time for feeds: `2h ago`. Falls back to the date after a week. */
export function relative(v: string | null | undefined, now: Date = new Date()): string {
  const d = parse(v);
  if (!d) return DASH;
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date(v);
}

/** Quarter label for a 13F period-end date: `Q3 2026`. */
export function quarter(v: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})/.exec(v ?? "");
  if (!m) return DASH;
  return `Q${Math.ceil(Number(m[2]) / 3)} ${m[1]}`;
}

export function dataAge(days: number | null | undefined): string {
  if (days === null || days === undefined) return DASH;
  if (days === 0) return "today";
  return `${days}d`;
}

export function initials(name: string | null | undefined, max = 2): string {
  if (!name) return "?";
  const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  return words.slice(0, max).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

type Role = {
  is_director: boolean | null;
  is_officer: boolean | null;
  is_ten_percent_owner: boolean | null;
  is_other: boolean | null;
  officer_title: string | null;
};

/** Reported relationship, as filed. It does not assert current employment. */
export function roleLabel(role: Role | null | undefined): string {
  if (!role) return DASH;
  const parts: string[] = [];
  if (role.is_officer) parts.push(role.officer_title || "Officer");
  if (role.is_director) parts.push("Director");
  if (role.is_ten_percent_owner) parts.push("10% owner");
  if (role.is_other && parts.length === 0) parts.push(role.officer_title || "Other");
  return parts.join(", ") || DASH;
}

const CODES: Record<string, string> = {
  P: "Purchase",
  S: "Sale",
  A: "Award",
  M: "Option exercise",
  F: "Tax withholding",
  G: "Gift",
  D: "Disposition to issuer",
  C: "Conversion",
  X: "Option exercise",
  J: "Other",
};

export function codeLabel(code: string | null | undefined): string {
  if (!code) return "Unspecified";
  return CODES[code] ?? `Code ${code}`;
}

export const CHANGE_LABEL = {
  new: "New Position",
  added: "Increased",
  reduced: "Reduced",
  exited: "Exited",
} as const;

export const CHANGE_TONE = { new: "acc", added: "up", reduced: "dn", exited: "am" } as const;
