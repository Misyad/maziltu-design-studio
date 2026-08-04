import axios, { AxiosError, type AxiosInstance } from "axios";
import type { ApiEnvelope } from "@/types/api";

export const API_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:8000/api";

/** Origin of the Laravel app, used to build `{ORIGIN}/storage/{path}` media URLs. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const TOKEN_STORAGE_KEY = "mzt.token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** Resolves a backend media path to an absolute URL. */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}/storage/${path.replace(/^\/+/, "")}`;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json" },
  timeout: 20000,
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export class ApiError extends Error {
  status?: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status?: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiEnvelope<unknown>>;
    const status = axiosError.response?.status;
    const payload = axiosError.response?.data;
    return new ApiError(
      payload?.message ?? axiosError.message ?? "Request failed",
      status,
      payload?.errors,
    );
  }
  return new ApiError(error instanceof Error ? error.message : "Unknown error");
}

/** GET returning the `data` field of the `{ success, message, data }` envelope. */
export async function apiGet<T>(url: string): Promise<T> {
  try {
    const response = await apiClient.get<ApiEnvelope<T>>(url);
    return (response.data?.data ?? (response.data as unknown)) as T;
  } catch (error) {
    throw toApiError(error);
  }
}

/** POST returning the raw envelope (some endpoints put fields at the top level). */
export async function apiPostRaw<T>(url: string, body?: unknown): Promise<T> {
  try {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const response = await apiClient.post<T>(url, body, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const payload = await apiPostRaw<ApiEnvelope<T>>(url, body);
  return (payload?.data ?? (payload as unknown)) as T;
}

export async function apiDelete<T>(url: string): Promise<T> {
  try {
    const response = await apiClient.delete<ApiEnvelope<T>>(url);
    return (response.data?.data ?? (response.data as unknown)) as T;
  } catch (error) {
    throw toApiError(error);
  }
}
