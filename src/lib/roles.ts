import type { AppRole } from "@/types/api";

/**
 * Phase 1 routing helper — decide the landing page after login.
 *
 * A user is treated as admin/staff when they hold the `dashboard` role (the
 * admin console). Everyone else is an alumnus and lands on the Alumni Portal.
 * The forced password-change flow always goes to the portal change-password
 * page first, regardless of role.
 */

export function hasAdminRole(roles: readonly (AppRole | string)[] | undefined): boolean {
  return roles?.includes("dashboard") ?? false;
}

export type HomePath = "/dashboard" | "/dashboard/id-card" | "/portal" | "/portal/ubah-password";

export function homePathFor(user: {
  roles?: readonly (AppRole | string)[];
  must_change_password?: boolean;
}): HomePath {
  if (user.must_change_password) return "/portal/ubah-password";
  if (hasAdminRole(user.roles)) return "/dashboard";
  if (user.roles?.includes("id_card")) return "/dashboard/id-card";
  return "/portal";
}

/** Roles allowed to verify payments / see participant PII (backend VERIFIER_ROLES). */
const VERIFIER_ROLES: readonly string[] = ["finance", "ketua", "admin"];
const KTA_CARD_ROLES: readonly string[] = ["id_card", "ketua", "admin"];

/**
 * Whether the user may access verifier-only data (participant PII, financial
 * queue). UI hint ONLY — the backend is the security boundary.
 */
export function isVerifier(roles: readonly (AppRole | string)[] | undefined): boolean {
  return roles?.some((role) => VERIFIER_ROLES.includes(role)) ?? false;
}

export function canViewKtaCards(roles: readonly (AppRole | string)[] | undefined): boolean {
  return roles?.some((role) => KTA_CARD_ROLES.includes(role)) ?? false;
}
