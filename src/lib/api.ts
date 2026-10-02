import { toast } from "sonner";

/**
 * The ONLY place the frontend talks to the backend.
 * - Calls /api/v1 on this origin (Next.js forwards it to the API — see next.config.ts)
 * - Auth lives in httpOnly cookies the browser sends automatically; no tokens in JS
 * - Expired access token → one silent /auth/refresh, then the request is retried
 * - Session really over → redirect to /login with a friendly reason
 * - getErrorMessage() decides what staff read when something fails
 */

export const API_BASE = "/api/v1";
// Socket.IO connects to the backend directly (rewrites do not carry websockets)
export const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "INVALID_ID"
  | "INVALID_JSON"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DUPLICATE_KEY"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_DISABLED"
  | "PASSWORD_CHANGE_REQUIRED"
  | "SESSION_EXPIRED"
  | "SESSION_REVOKED"
  | "CSRF_REJECTED"
  | "VISIT_OPEN"
  | "VISIT_CLOSED"
  | "ALLERGY_CONFLICT"
  | "FOUR_EYES_REQUIRED";

export type FieldError = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: ApiErrorCode,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get fieldErrors(): FieldError[] {
    return Array.isArray(this.details) ? (this.details as FieldError[]) : [];
  }
}

export type Paginated<T> = { items: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

// Never try to refresh for these (they ARE the auth flow)
const NO_REFRESH = ["/auth/login", "/auth/refresh", "/auth/logout", "/portal/auth/"];
// Access cookie missing/expired → worth one refresh. Revoked/disabled → session is over.
const REFRESHABLE: ApiErrorCode[] = ["SESSION_EXPIRED", "UNAUTHORIZED"];

async function send(path: string, options: RequestOptions) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined && { "Content-Type": "application/json" }),
      },
      credentials: "same-origin",
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError("Cannot reach the server.", 0, "NETWORK_ERROR");
  }
  const json = await res.json().catch(() => null);
  return { res, json };
}

function toApiError(res: Response, json: unknown): ApiError {
  const body = json as { error?: { code?: ApiErrorCode; message?: string; details?: unknown } } | null;
  const code = body?.error?.code ?? (res.status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST");
  return new ApiError(body?.error?.message ?? `Request failed (${res.status})`, res.status, code, body?.error?.details);
}

async function request(path: string, options: RequestOptions, allowRefresh = true): Promise<{ res: Response; json: unknown }> {
  const { res, json } = await send(path, options);
  if (res.ok) return { res, json };

  const error = toApiError(res, json);
  const isAuthFlow = NO_REFRESH.some((p) => path.startsWith(p));

  if (res.status === 401 && !isAuthFlow) {
    if (allowRefresh && REFRESHABLE.includes(error.code) && (await refreshSession())) {
      return request(path, options, false);
    }
    onSessionLost(error.code === "ACCOUNT_DISABLED" ? "disabled" : error.code === "SESSION_REVOKED" ? "revoked" : "expired");
  }
  if (res.status === 403 && error.code === "PASSWORD_CHANGE_REQUIRED" && typeof window !== "undefined") {
    // Full reload on purpose: clears every bit of in-memory patient data from the old session
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (window.location.pathname !== "/change-password") window.location.assign("/change-password");
  }
  throw error;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json } = await request(path, options);
  return (json as { data: T }).data;
}

/** For list endpoints that return { data, pagination } */
export async function apiFetchPage<T>(path: string, options: RequestOptions = {}): Promise<Paginated<T>> {
  const { json } = await request(path, options);
  const body = json as { data: T[]; pagination: Paginated<T>["pagination"] };
  return { items: body.data, pagination: body.pagination };
}

// Kept for the pages written before Phase 2
export const api = apiFetch;

// ---- Silent refresh (one at a time, even across browser tabs) ----

let refreshing: Promise<boolean> | null = null;
const LAST_REFRESH_KEY = "tl_last_refresh";

async function doRefresh(): Promise<boolean> {
  // Another tab refreshed a moment ago: the new cookies are already ours
  try {
    const last = Number(localStorage.getItem(LAST_REFRESH_KEY) ?? 0);
    if (Date.now() - last < 5_000) return true;
  } catch {}
  const { res } = await send("/auth/refresh", { method: "POST" }).catch(() => ({ res: null }));
  if (res?.ok) {
    try {
      localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
    } catch {}
    return true;
  }
  return false;
}

export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      // Web Locks: if two tabs expire together, only one rotates the refresh token
      if (typeof navigator !== "undefined" && navigator.locks) {
        return await navigator.locks.request("tl-refresh", doRefresh);
      }
      return await doRefresh();
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

// ---- Session over: go to login once, with a reason the login page explains ----

let redirecting = false;
export type SessionEndReason = "expired" | "revoked" | "disabled" | "idle" | "signed_out";

export function onSessionLost(reason: SessionEndReason) {
  if (typeof window === "undefined" || redirecting) return;
  const protectedArea = /^\/(admin|management|reception|doctor|nurse|lab|pharmacy|accounts|patient|change-password)(\/|$)/;
  if (!protectedArea.test(window.location.pathname)) return;
  redirecting = true;
  const next = window.location.pathname + window.location.search;
  // Full reload on purpose: clears every bit of in-memory patient data from the old session
  const loginPage = window.location.pathname.startsWith("/patient") ? "/login/patient" : "/login";
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${loginPage}?reason=${reason}&next=${encodeURIComponent(next)}`);
}

// ---- Health ----

export type HealthReport = {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  environment: string;
  timestamp: string;
  database: { state: string; latencyMs: number | null };
};

/** Health answers 503 with a report when the DB is down, so read the body either way. */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthReport> {
  const { res, json } = await send("/health", { signal });
  const data = (json as { data?: HealthReport } | null)?.data;
  if (data) return data;
  throw toApiError(res, json);
}

// ---- User-facing messages ----

const FRIENDLY: Partial<Record<ApiErrorCode, string>> = {
  NETWORK_ERROR: "সার্ভারের সাথে সংযোগ হচ্ছে না · Cannot reach the server. Check the connection and try again.",
  UNAUTHORIZED: "আবার লগইন করুন · Please sign in again.",
  SESSION_EXPIRED: "আবার লগইন করুন · Your session has ended. Please sign in again.",
  FORBIDDEN: "অনুমতি নেই · You don't have permission to do this.",
  RATE_LIMITED: "একটু অপেক্ষা করুন · Too many requests. Please wait a moment.",
  PAYLOAD_TOO_LARGE: "তথ্য অনেক বড় · The data you sent is too large.",
  CSRF_REJECTED: "নিরাপত্তার কারণে অনুরোধটি আটকানো হয়েছে · Request blocked for security reasons. Reload the page.",
  INTERNAL_ERROR: "কিছু একটা সমস্যা হয়েছে · Something went wrong on our side. Please try again.",
};

/** What staff should read when a request fails. 4xx messages from our API are written for humans, so show them. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "VALIDATION_ERROR" && err.fieldErrors.length) {
      const first = err.fieldErrors[0];
      const field = first.path.split(".").pop();
      return `Please check "${field}": ${first.message}`;
    }
    return FRIENDLY[err.code] ?? err.message;
  }
  return FRIENDLY.INTERNAL_ERROR!;
}

export function notifyError(err: unknown) {
  if ((err as Error)?.name === "AbortError") return;
  // Auth failures redirect to /login themselves; a toast on top would be noise
  if (err instanceof ApiError && err.status === 401) return;
  toast.error(getErrorMessage(err));
}
