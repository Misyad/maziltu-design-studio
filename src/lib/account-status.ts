import type { Member } from "@/types/api";

/**
 * Phase 1 UX — account status helper for the member registry.
 *
 * Derived from fields the members endpoint already surfaces (users.is_active,
 * users.login_count) plus `has_account` / `id_anggota`. Purely presentational;
 * the precedence below guarantees exactly one label per row:
 *
 * - no account            -> "Belum Punya Akun"
 * - account inactive      -> "Nonaktif"
 * - account, logged in    -> "Pernah Login"
 * - account, never logged -> "Sudah Punya Akun" (the "belum pernah login" state)
 */
export type AccountStatusKey = "none" | "inactive" | "logged_in" | "ready";

export interface AccountStatus {
  key: AccountStatusKey;
  label: string;
  variant: "outline" | "destructive" | "default" | "secondary";
}

export function memberHasAccount(member: Member): boolean {
  return member.has_account === true || Boolean(member.id_anggota);
}

export function accountStatus(member: Member): AccountStatus {
  const hasAccount = memberHasAccount(member);
  const active =
    member.account_is_active === undefined ||
    member.account_is_active === true ||
    member.account_is_active === 1;

  if (!hasAccount) return { key: "none", label: "Belum Punya Akun", variant: "outline" };
  if (!active) return { key: "inactive", label: "Nonaktif", variant: "destructive" };
  if ((member.login_count ?? 0) > 0)
    return { key: "logged_in", label: "Pernah Login", variant: "default" };
  return { key: "ready", label: "Sudah Punya Akun", variant: "secondary" };
}
