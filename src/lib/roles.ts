import type { AppRole } from "@/types/api";

const STAFF_ROLES: readonly string[] = ["dashboard", "event", "finance", "ketua", "admin"];
const VERIFIER_ROLES: readonly string[] = ["finance", "ketua", "admin"];
const KTA_CARD_ROLES: readonly string[] = ["id_card", "ketua", "admin"];

export function hasAdminRole(roles: readonly (AppRole | string)[] | undefined): boolean {
  return roles?.some((role) => STAFF_ROLES.includes(role)) ?? false;
}

export type HomePath =
  "/dashboard" | "/dashboard/id-card" | "/dashboard/checkin" | "/portal" | "/portal/ubah-password";

export function homePathFor(user: {
  roles?: readonly (AppRole | string)[];
  must_change_password?: boolean;
}): HomePath {
  if (user.must_change_password) return "/portal/ubah-password";
  if (hasAdminRole(user.roles)) return "/dashboard";
  if (user.roles?.includes("id_card")) return "/dashboard/id-card";
  if (user.roles?.includes("prisensi")) return "/dashboard/checkin";
  return "/portal";
}

export function isVerifier(roles: readonly (AppRole | string)[] | undefined): boolean {
  return roles?.some((role) => VERIFIER_ROLES.includes(role)) ?? false;
}

export function canViewKtaCards(roles: readonly (AppRole | string)[] | undefined): boolean {
  return roles?.some((role) => KTA_CARD_ROLES.includes(role)) ?? false;
}
