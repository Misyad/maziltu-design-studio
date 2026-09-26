import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { currentUserQuery } from "@/services/queries";
import { ApiError, memberApplicationsEnabled } from "@/services/api-client";
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
 */

export type GuardRoles = readonly string[];

export const STAFF_ROLES: GuardRoles = ["dashboard", "event", "finance", "ketua", "admin"];
export const DASHBOARD_ROLES: GuardRoles = [...STAFF_ROLES, "id_card", "prisensi"];
export const EVENT_ROLES: GuardRoles = STAFF_ROLES;
export const FINANCE_ROLES: GuardRoles = ["finance", "ketua", "admin"];
export const MEMBER_ADMIN_ROLES: GuardRoles = ["ketua", "admin"];
export const KTA_CARD_ROLES: GuardRoles = ["id_card", "ketua", "admin"];
export const KTA_QUEUE_ROLES: GuardRoles = [
  "dashboard",
  "event",
  "finance",
  "ketua",
  "admin",
  "id_card",
];
export const CHECKIN_ROLES: GuardRoles = ["prisensi", "event", "finance", "ketua", "admin"];
export const ATTENDANCE_READ_ROLES: GuardRoles = STAFF_ROLES;
export const ATTENDANCE_WRITE_ROLES: GuardRoles = CHECKIN_ROLES;
export const ATTENDANCE_ROUTE_ROLES: GuardRoles = [...STAFF_ROLES, "prisensi"];
export const OPERATIONS_ROLES: GuardRoles = STAFF_ROLES;

function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function guardRedirect(to: string, from?: string): ReturnType<typeof redirect> {
  const options = { to, replace: true } as Parameters<typeof redirect>[0];
  if (from) (options as { from?: string }).from = from;
  return redirect(options);
}

function isPath(from: string | undefined, expected: string): boolean {
  if (!from) return false;
  try {
    return new URL(from, "http://localhost").pathname.replace(/\/+$/, "") === expected;
  } catch {
    return from.split(/[?#]/, 1)[0] === expected;
  }
}

/** Resolve the authenticated user or soft-redirect (401 -> /login, 403 -> /forbidden). */
export async function requireUser(queryClient: QueryClient, from?: string): Promise<AuthUser> {
  if (typeof window === "undefined") {
    throw guardRedirect("/login", from);
  }
  try {
    const user = await queryClient.ensureQueryData(currentUserQuery());
    if (user.account_setup_required && !isPath(from, "/account/setup")) {
      throw guardRedirect("/account/setup", from);
    }
    if (
      user.must_change_password &&
      !user.account_setup_required &&
      !isPath(from, "/portal/ubah-password")
    ) {
      throw guardRedirect("/portal/ubah-password", from);
    }
    return user;
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

export function requireApplicantPortalEnabled(): void {
  if (!memberApplicationsEnabled()) throw guardRedirect("/daftar-anggota");
}

export async function requireApplicant(
  queryClient: QueryClient,
  from?: string,
): Promise<import("@/types/api").MemberApplication> {
  if (typeof window === "undefined") throw guardRedirect("/pendaftar/login", from);
  const { applicantMeQuery } = await import("@/services/queries");
  try {
    return await queryClient.ensureQueryData(applicantMeQuery());
  } catch (error) {
    if (isApiError(error) && error.status === 401) {
      throw guardRedirect("/pendaftar/login", from);
    }
    if (isApiError(error) && error.status === 403) {
      throw guardRedirect("/forbidden", from);
    }
    throw error;
  }
}
