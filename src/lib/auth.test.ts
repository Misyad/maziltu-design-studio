import { readFileSync } from "node:fs";
import { isRedirect, redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/services/api-client";
import {
  ATTENDANCE_READ_ROLES,
  ATTENDANCE_ROUTE_ROLES,
  ATTENDANCE_WRITE_ROLES,
  CHECKIN_ROLES,
  DASHBOARD_ROLES,
  EVENT_ROLES,
  FINANCE_ROLES,
  KTA_CARD_ROLES,
  KTA_QUEUE_ROLES,
  MEMBER_ADMIN_ROLES,
  STAFF_ROLES,
  requireApplicant,
  requireRoles,
  requireUser,
} from "@/lib/auth";
import { homePathFor } from "@/lib/roles";

function apiError(status: number) {
  return new ApiError("Request failed", status);
}

function makeQueryClient(resolveWith: unknown) {
  return {
    ensureQueryData: vi.fn().mockResolvedValue(resolveWith),
  } as unknown as QueryClient;
}

function makeRejectingQueryClient(error: unknown) {
  return {
    ensureQueryData: vi.fn().mockRejectedValue(error),
  } as unknown as QueryClient;
}

describe("R3 route guards — requireUser", () => {
  it("runs cookie-dependent member guards only in the browser", () => {
    for (const route of ["src/routes/portal/route.tsx", "src/routes/dashboard/route.tsx"]) {
      expect(readFileSync(route, "utf8")).toContain("ssr: false");
    }
  });

  it("resolves the user when the session is valid", async () => {
    const user = { id: 1, roles: ["anggota"] };
    await expect(requireUser(makeQueryClient(user))).resolves.toEqual(user);
  });

  it("redirects to /login on a 401 (expired session)", async () => {
    await expect(requireUser(makeRejectingQueryClient(apiError(401)))).rejects.toSatisfy((error) =>
      isRedirect(error),
    );
  });

  it("redirects to /forbidden on a 403", async () => {
    await expect(requireUser(makeRejectingQueryClient(apiError(403)))).rejects.toSatisfy((error) =>
      isRedirect(error),
    );
  });

  it("rethrows non-auth errors instead of redirecting", async () => {
    const boom = new Error("network down");
    await expect(requireUser(makeRejectingQueryClient(boom))).rejects.toBe(boom);
  });

  it("redirects a forced user away from other portal and dashboard routes", async () => {
    for (const from of ["/portal", "/dashboard/members"]) {
      try {
        await requireUser(
          makeQueryClient({ id: 1, roles: ["admin"], must_change_password: true }),
          from,
        );
        throw new Error("expected redirect");
      } catch (error) {
        expect(isRedirect(error)).toBe(true);
        expect((error as Response & { options: { to: string } }).options.to).toBe(
          "/portal/ubah-password",
        );
      }
    }
  });

  it("allows a forced user to render the password-change route", async () => {
    const user = { id: 1, roles: ["admin"], must_change_password: true };
    await expect(
      requireUser(makeQueryClient(user), "/portal/ubah-password/?required=1"),
    ).resolves.toEqual(user);
  });

  it("prioritizes account setup over the forced password-change route", async () => {
    const user = {
      id: 1,
      roles: ["admin"],
      account_setup_required: true,
      must_change_password: true,
    };

    try {
      await requireUser(makeQueryClient(user), "/portal/ubah-password");
      throw new Error("expected redirect");
    } catch (error) {
      expect((error as Response & { options: { to: string } }).options.to).toBe("/account/setup");
    }
  });

  it("allows account setup only on its dedicated route", async () => {
    const user = { id: 1, roles: ["anggota"], account_setup_required: true };
    await expect(requireUser(makeQueryClient(user), "/account/setup/?required=1")).resolves.toEqual(
      user,
    );
  });
});

describe("applicant route guard", () => {
  it("runs the cookie-dependent applicant guard only in the browser", () => {
    const source = readFileSync("src/routes/pendaftar/route.tsx", "utf8");

    expect(source).toContain("ssr: false");
  });

  it("resolves an authenticated applicant application", async () => {
    const application = { uuid: "application-1", status: "submitted" };
    await expect(requireApplicant(makeQueryClient(application), "/pendaftar")).resolves.toBe(
      application,
    );
  });

  it("redirects an expired applicant session to its own login", async () => {
    try {
      await requireApplicant(makeRejectingQueryClient(apiError(401)), "/pendaftar");
      throw new Error("expected redirect");
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as Response & { options: { to: string } }).options.to).toBe("/pendaftar/login");
    }
  });
});

describe("R3 route guards — requireRoles", () => {
  it("allows a user holding an allowed role", async () => {
    const user = { id: 1, roles: ["event"] };
    await expect(requireRoles(makeQueryClient(user), EVENT_ROLES)).resolves.toEqual(user);
  });

  it("redirects to /forbidden when the user lacks every allowed role", async () => {
    const user = { id: 1, roles: ["anggota"] };
    await expect(requireRoles(makeQueryClient(user), EVENT_ROLES)).rejects.toSatisfy((error) =>
      isRedirect(error),
    );
  });

  it("blocks non-finance roles from finance pages", async () => {
    const user = { id: 1, roles: ["event"] };
    await expect(requireRoles(makeQueryClient(user), FINANCE_ROLES)).rejects.toSatisfy((error) =>
      isRedirect(error),
    );
  });

  it("restricts member-backed profile updates to member admins", async () => {
    await expect(
      requireRoles(makeQueryClient({ id: 1, roles: ["finance"] }), MEMBER_ADMIN_ROLES),
    ).rejects.toSatisfy((error) => isRedirect(error));
    await expect(
      requireRoles(makeQueryClient({ id: 1, roles: ["admin"] }), MEMBER_ADMIN_ROLES),
    ).resolves.toMatchObject({ roles: ["admin"] });
  });

  it("allows finance staff on finance pages", async () => {
    const user = { id: 1, roles: ["finance"] };
    await expect(requireRoles(makeQueryClient(user), FINANCE_ROLES)).resolves.toEqual(user);
  });

  it("allows the checkin role set", async () => {
    for (const role of ["prisensi", "event", "finance", "ketua", "admin"]) {
      const user = { id: 1, roles: [role] };
      await expect(requireRoles(makeQueryClient(user), CHECKIN_ROLES)).resolves.toEqual(user);
    }
  });

  it("matches backend role sets", () => {
    expect(STAFF_ROLES).toEqual(["dashboard", "event", "finance", "ketua", "admin"]);
    expect(FINANCE_ROLES).toEqual(["finance", "ketua", "admin"]);
    expect(MEMBER_ADMIN_ROLES).toEqual(["ketua", "admin"]);
    expect(CHECKIN_ROLES).toEqual(["prisensi", "event", "finance", "ketua", "admin"]);
    expect(ATTENDANCE_READ_ROLES).toEqual(STAFF_ROLES);
    expect(ATTENDANCE_WRITE_ROLES).toEqual(CHECKIN_ROLES);
    expect(ATTENDANCE_ROUTE_ROLES).toEqual([
      "dashboard",
      "event",
      "finance",
      "ketua",
      "admin",
      "prisensi",
    ]);
    expect(KTA_CARD_ROLES).toEqual(["id_card", "ketua", "admin"]);
    expect(KTA_QUEUE_ROLES).toEqual(["dashboard", "event", "finance", "ketua", "admin", "id_card"]);
    expect(DASHBOARD_ROLES).toEqual([
      "dashboard",
      "event",
      "finance",
      "ketua",
      "admin",
      "id_card",
      "prisensi",
    ]);
  });

  it("enforces password completion before checking roles", async () => {
    try {
      await requireRoles(
        makeQueryClient({ id: 1, roles: ["anggota"], must_change_password: true }),
        FINANCE_ROLES,
        "/dashboard/finance",
      );
      throw new Error("expected redirect");
    } catch (error) {
      expect((error as Response & { options: { to: string } }).options.to).toBe(
        "/portal/ubah-password",
      );
    }
  });

  it("produces redirects targeting /forbidden", async () => {
    const user = { id: 1, roles: ["anggota"] };
    try {
      await requireRoles(makeQueryClient(user), EVENT_ROLES);
      throw new Error("expected redirect");
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as Response & { options: { to: string } }).options.to).toBe("/forbidden");
    }
  });

  it("requireUser redirects target /login", async () => {
    try {
      await requireUser(makeRejectingQueryClient(apiError(401)));
      throw new Error("expected redirect");
    } catch (error) {
      expect(isRedirect(error)).toBe(true);
      expect((error as Response & { options: { to: string } }).options.to).toBe("/login");
    }
  });
});

describe("post-login landing", () => {
  it("routes all staff roles to the dashboard", () => {
    for (const role of ["dashboard", "event", "finance", "ketua", "admin"]) {
      expect(homePathFor({ roles: [role] })).toBe("/dashboard");
    }
  });

  it("routes dedicated operators and portal users", () => {
    expect(homePathFor({ roles: ["id_card"] })).toBe("/dashboard/id-card");
    expect(homePathFor({ roles: ["prisensi"] })).toBe("/dashboard/scanner");
    expect(homePathFor({ roles: ["anggota"] })).toBe("/portal");
  });

  it("does not grant dashboard landing to legacy roles", () => {
    for (const role of ["berita", "tampilan", "aktivitas_user"]) {
      expect(homePathFor({ roles: [role] })).toBe("/portal");
    }
  });

  it("keeps account setup ahead of forced password changes", () => {
    expect(
      homePathFor({
        roles: ["admin", "id_card"],
        account_setup_required: true,
        must_change_password: true,
      }),
    ).toBe("/account/setup");
    expect(homePathFor({ roles: ["admin", "id_card"], must_change_password: true })).toBe(
      "/portal/ubah-password",
    );
  });
});

describe("redirect helper sanity", () => {
  it("redirect() builds a router Response with options", () => {
    const response = redirect({
      to: "/forbidden" as never,
      replace: true,
    }) as unknown as Response & {
      options: { to: string; replace: boolean };
    };
    expect(isRedirect(response)).toBe(true);
    expect(response.options).toMatchObject({ to: "/forbidden", replace: true });
  });
});
