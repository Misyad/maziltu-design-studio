import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { ApiEnvelope } from "@/types/api";

export const API_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:8000/api";

/**
 * Internal base URL used for API calls made during server-side rendering. In a
 * containerised deployment the browser cannot resolve the private network, so
 * the SSR runtime reaches the backend through `host.docker.internal` which the
 * host routes back to the public entrypoint. Defaults to the public base.
 */
export const SSR_API_BASE_URL =
  (import.meta.env["SSR_API_BASE_URL"] as string | undefined) ?? API_BASE_URL;

export function memberAccountActivationEnabled(): boolean {
  return import.meta.env["VITE_MEMBER_ACCOUNT_ACTIVATION_ENABLED"] !== "false";
}

export function memberApplicationsEnabled(): boolean {
  return import.meta.env["VITE_MEMBER_APPLICATIONS_ENABLED"] === "true";
}

/**
 * True when this module is evaluated inside a server (Node/Nitro) runtime.
 * `typeof window` diverges between the browser and the server bundle, so this
 * is computed once at module load.
 */
export const IS_SERVER = typeof window === "undefined";

/** Origin of the Laravel app, used to build `{ORIGIN}/storage/{path}` media URLs. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

/**
 * R3 — browser auth is session/cookie based. The old `mzt.token` personal
 * access token is no longer written; the key is only swept defensively here in
 * case a stale value survives from a pre-R3 build.
 */
const LEGACY_TOKEN_KEY = "mzt.token";

/** Axios request config carrying the R3 `authCheck` probe flag. */
export interface AuthCheckConfig extends AxiosRequestConfig {
  /** When true, a 401 response is left to the caller (no /login redirect). */
  authCheck?: boolean;
}

function requestPath(error: AxiosError): string {
  const url = error.config?.url ?? "";
  try {
    return new URL(url, API_ORIGIN).pathname.replace(/^\/api(?=\/)/, "");
  } catch {
    return url;
  }
}

function responseCode(error: AxiosError): string | undefined {
  const payload = error.response?.data;
  if (!payload || typeof payload !== "object") return undefined;
  const code = (payload as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export function assetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}/${path.replace(/^\/+/, "")}`;
}

/** Resolves a backend media path to an absolute URL. */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}/storage/${path.replace(/^\/+/, "")}`;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: IS_SERVER ? SSR_API_BASE_URL : API_BASE_URL,
  headers: { Accept: "application/json" },
  timeout: 20000,
  // Browser requests must send the HttpOnly session cookie (first-party SPA).
  withCredentials: !IS_SERVER,
  // Axios only auto-attaches X-XSRF-TOKEN for same-origin requests unless this
  // flag is set. The dev topology (SPA :8080 -> API :8000) is cross-origin,
  // so the flag must be explicit or every stateful write gets a 419.
  // Production is same-origin, where the flag is simply redundant-but-safe.
  withXSRFToken: true,
});

// Expired / revoked credentials come back as 401. Sweep any legacy token and
// send the user to the login screen so the next request is authenticated.
// Auth probes (`authCheck`) are exempt: route guards and public-page login
// hints handle the 401 themselves.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (typeof window !== "undefined") {
      const isProbe = (error.config as AuthCheckConfig | undefined)?.authCheck;
      const path = requestPath(error);
      const isApplicantRequest = path.startsWith("/applicant/");
      const isApplicantPage = window.location.pathname.startsWith("/pendaftar");
      if (error.response?.status === 401) {
        if (!isApplicantRequest) window.localStorage.removeItem(LEGACY_TOKEN_KEY);
        if (!isProbe && isApplicantRequest && window.location.pathname !== "/pendaftar/login") {
          window.location.assign("/pendaftar/login");
        } else if (
          !isProbe &&
          !isApplicantRequest &&
          !isApplicantPage &&
          !window.location.pathname.startsWith("/login")
        ) {
          window.location.assign("/login");
        }
      }
      if (
        error.response?.status === 428 &&
        responseCode(error) === "ACCOUNT_SETUP_REQUIRED" &&
        !isProbe &&
        !isApplicantRequest &&
        window.location.pathname.replace(/\/+$/, "") !== "/account/setup"
      ) {
        window.location.assign("/account/setup");
      } else if (
        error.response?.status === 428 &&
        responseCode(error) === "PASSWORD_CHANGE_REQUIRED" &&
        !isProbe &&
        !isApplicantRequest &&
        window.location.pathname.replace(/\/+$/, "") !== "/portal/ubah-password"
      ) {
        window.location.assign("/portal/ubah-password");
      }
    }
    return Promise.reject(error);
  },
);

let csrfPromise: Promise<void> | null = null;

/**
 * Bootstrap the Laravel session cookies (session + XSRF-TOKEN) that Sanctum
 * needs for stateful API calls. The browser must GET /sanctum/csrf-cookie
 * before any state-changing request (login, logout, writes). Memoised per page
 * load; a no-op on the server, where there is no cookie jar.
 */
export function ensureCsrfToken(): Promise<void> {
  if (IS_SERVER) return Promise.resolve();
  if (!csrfPromise) {
    csrfPromise = axios
      .get(`${API_ORIGIN}/sanctum/csrf-cookie`, {
        withCredentials: true,
        headers: { Accept: "application/json" },
      })
      .then(() => undefined)
      .catch((error) => {
        csrfPromise = null; // allow a retry on the next call
        throw error;
      });
  }
  return csrfPromise;
}

export class ApiError extends Error {
  status: number | undefined;
  code: string | undefined;
  errors: Record<string, string[]> | undefined;
  data: unknown;

  constructor(
    message: string,
    status?: number,
    errors?: Record<string, string[]>,
    data?: unknown,
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.data = data;
  }
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiEnvelope<unknown>>;
    const status = axiosError.response?.status;
    const payload = axiosError.response?.data;
    return new ApiError(
      payload?.message ?? axiosError.message ?? "Request failed",
      status,
      payload?.errors,
      payload?.data,
      payload?.code,
    );
  }
  return new ApiError(error instanceof Error ? error.message : "Unknown error");
}

/** GET returning the raw envelope, without requiring a `data` field. */
export async function apiGetRaw<T>(url: string, config?: AuthCheckConfig): Promise<T> {
  try {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

function assertEnvelope<T>(payload: ApiEnvelope<T> | undefined): payload is ApiEnvelope<T> {
  return !!payload && typeof payload === "object";
}

/** GET returning the `data` field of the `{ success, message, data }` envelope. */
export async function apiGet<T>(url: string): Promise<T> {
  try {
    const response = await apiClient.get<ApiEnvelope<T>>(url);
    const payload = response.data;
    if (!assertEnvelope(payload) || payload.success === false) {
      throw new ApiError(payload?.message ?? "Request failed", undefined, payload?.errors);
    }
    if (payload.data === undefined) {
      throw new ApiError("API response is missing the `data` field", undefined);
    }
    return payload.data as T;
  } catch (error) {
    throw toApiError(error);
  }
}

/** POST returning the raw envelope (some endpoints put fields at the top level). */
export async function apiPostRaw<T>(url: string, body?: unknown): Promise<T> {
  try {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const response = await apiClient.post<T>(
      url,
      body,
      isFormData ? { headers: { "Content-Type": "multipart/form-data" } } : {},
    );
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const payload = await apiPostRaw<ApiEnvelope<T>>(url, body);
  if (!assertEnvelope(payload) || payload.success === false) {
    throw new ApiError(payload?.message ?? "Request failed", undefined, payload?.errors);
  }
  return (payload?.data ?? (payload as unknown)) as T;
}

/** PUT returning the raw envelope (some Phase 1 endpoints use PUT). */
export async function apiPutRaw<T>(url: string, body?: unknown): Promise<T> {
  try {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const response = isFormData
      ? await apiClient.put<T>(url, body, { headers: { "Content-Type": "multipart/form-data" } })
      : await apiClient.put<T>(url, body);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

/** PUT returning the `data` field of the `{ success, message, data }` envelope. */
export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const payload = await apiPutRaw<ApiEnvelope<T>>(url, body);
  if (!assertEnvelope(payload) || payload.success === false) {
    throw new ApiError(payload?.message ?? "Request failed", undefined, payload?.errors);
  }
  return (payload?.data ?? (payload as unknown)) as T;
}

export async function apiDelete<T>(url: string): Promise<T> {
  try {
    const response = await apiClient.delete<ApiEnvelope<T>>(url);
    const payload = response.data;
    if (!assertEnvelope(payload) || payload.success === false) {
      throw new ApiError(payload?.message ?? "Request failed", undefined, payload?.errors);
    }
    return (payload?.data ?? (payload as unknown)) as T;
  } catch (error) {
    throw toApiError(error);
  }
}
