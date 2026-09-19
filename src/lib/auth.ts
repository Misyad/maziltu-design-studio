import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { currentUserQuery } from "@/services/queries";
import { ApiError } from "@/services/api-client";
import type { AuthUser } from "@/types/api";

/**
 * R3 — route-level authentication guards.
 *
 * Guards run in `beforeLoad` and probe the session by resolving the
 * `currentUser` query. The probe is `authCheck`-flagged, so a 401 reaches the
 * guard as an `ApiError` instead of triggering the global hard redirect:
 *  - 401 -> soft redirect to /login
 *  - 403 -> /forbidden
 *
 * On the server there is no session cookie, so protected routes always redirect
 * to /login during SSR (same behaviour as the old token-check).
 */

export type GuardRoles = readonly string[];

export const DASHBOARD_ROLES: GuardRoles = ["dashboard"];
export const EVENT_ROLES: GuardRoles = ["event"];
export const FINANCE_ROLES: GuardRoles = ["finance", "ketua", "admin"];
export const KTA_CARD_ROLES: GuardRoles = ["id_card", "ketua", "admin"];
export const KTA_QUEUE_ROLES: GuardRoles = ["id_card", "finance", "ketua", "admin"];
export const CHECKIN_ROLES: GuardRoles = ["prisensi", "event", "finance", "ketua", "admin"];
export const PRISENSI_ROLES: GuardRoles = ["prisensi"];
export const OPERATIONS_ROLES: GuardRoles = [
  "dashboard",
  "event",
  "prisensi",
  "finance",
  "ketua",
  "admin",
];

function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function guardRedirect(to: string, from?: string): ReturnType<typeof redirect> {
  const options = { to, replace: true } as Parameters<typeof redirect>[0];
  if (from) (options as { from?: string }).from = from;
  return redirect(options);
}

/** Resolve the authenticated user or soft-redirect (401 -> /login, 403 -> /forbidden). */
export async function requireUser(queryClient: QueryClient, from?: string): Promise<AuthUser> {
  if (typeof window === "undefined") {
    throw guardRedirect("/login", from);
  }
  try {
    return await queryClient.ensureQueryData(currentUserQuery());
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      throw guardRedirect("/login", from);
    }
    if (isApiError(error) && error.status === 403) {
      throw guardRedirect("/forbidden", from);
    }
    throw error;
  }
}

/** Require an authenticated user holding at least one of `roles`. */
export async function requireRoles(
  queryClient: QueryClient,
  roles: GuardRoles,
  from?: string,
): Promise<AuthUser> {
  const user = await requireUser(queryClient, from);
  const userRoles = (user.roles ?? []) as readonly string[];
  if (!roles.some((role) => userRoles.includes(role))) {
    throw guardRedirect("/forbidden", from);
  }
  return user;
}
