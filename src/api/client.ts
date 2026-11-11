/**
 * Thin client for the Rails JSON API (docs/api-v1.md in the backend repo).
 * Cookie session + CSRF: every mutation sends X-CSRF-Token, and the token is
 * replaced whenever the server rotates it (login, signup, account change, reset).
 */

const BASE = `${(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")}/api/v1`;

export class ApiError extends Error {
  status: number;
  code: string;
  feature?: string;
  limit?: number | null;
  retryAfter?: number;
  details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, extra: Partial<ApiError> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    Object.assign(this, extra);
  }

  get proRequired() {
    return this.status === 402;
  }
  get unauthorized() {
    return this.status === 401;
  }
}

let csrf: string | null = null;
let csrfInflight: Promise<string> | null = null;

export function setCsrfToken(token: string | null) {
  csrf = token;
}

async function csrfToken(): Promise<string> {
  if (csrf) return csrf;
  csrfInflight ??= fetch(`${BASE}/auth/csrf`, { credentials: "include", headers: { Accept: "application/json" } })
    .then(async (res) => {
      if (!res.ok) throw await toError(res);
      const body = (await res.json()) as { data: { csrf_token: string } };
      csrf = body.data.csrf_token;
      return csrf;
    })
    .finally(() => {
      csrfInflight = null;
    });
  return csrfInflight;
}

async function toError(res: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  const retry = Number(res.headers.get("Retry-After"));
  const retryAfter = Number.isFinite(retry) && retry > 0 ? retry : undefined;
  const b = (body ?? {}) as { error?: { code?: string; message?: string; details?: Record<string, string[]> }; code?: string; feature?: string; limit?: number | null };
  // 402 uses a flat { code, feature, limit } body; everything else nests under `error`.
  if (b.code === "PRO_REQUIRED") {
    return new ApiError(res.status, b.code, "This feature requires Pro.", { feature: b.feature, limit: b.limit });
  }
  const code = b.error?.code ?? `HTTP_${res.status}`;
  const fallback =
    res.status === 429
      ? "Too many requests. Try again shortly."
      : res.status >= 500
        ? "The service is temporarily unavailable."
        : "The request could not be completed.";
  return new ApiError(res.status, code, b.error?.message ?? fallback, { retryAfter, details: b.error?.details });
}

export type Query = Record<string, string | number | boolean | null | undefined>;

function url(path: string, query?: Query) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== null && v !== undefined && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return `${BASE}${path}${s ? `?${s}` : ""}`;
}

async function request<T>(method: string, path: string, opts: { query?: Query; body?: unknown } = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const mutation = method !== "GET";
  if (mutation) {
    headers["X-CSRF-Token"] = await csrfToken();
    headers["Content-Type"] = "application/json";
  }
  let res: Response;
  try {
    res = await fetch(url(path, opts.query), {
      method,
      headers,
      credentials: "include",
      body: mutation ? JSON.stringify(opts.body ?? {}) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection.");
  }
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const err = await toError(res);
    // A stale token (e.g. the session rotated in another tab) is fetched again once.
    if (mutation && !retried && err.code === "INVALID_CSRF_TOKEN") {
      csrf = null;
      return request<T>(method, path, opts, true);
    }
    throw err;
  }
  const body = (await res.json()) as T;
  const rotated = (body as { data?: { csrf_token?: unknown } } | null)?.data?.csrf_token;
  if (typeof rotated === "string") csrf = rotated;
  return body;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  delete: <T = void>(path: string, body?: unknown) => request<T>("DELETE", path, { body }),
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const detail = e.details ? Object.values(e.details).flat()[0] : undefined;
    return detail ?? e.message;
  }
  return "Something went wrong.";
}
