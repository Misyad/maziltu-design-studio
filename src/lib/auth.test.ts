import { isRedirect, redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/services/api-client";
import {
  CHECKIN_ROLES,
  EVENT_ROLES,
  FINANCE_ROLES,
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
  it("resolves the user when the session is valid", async () => {
    const user = { id: 1, roles: ["anggota"] };
    await expect(requireUser(makeQueryClient(user))).resolves.toEqual(user);
  });

  it("redirects to /login on a 401 (expired session)", async () => {
    await expect(requireUser(makeRejectingQueryClient(apiError(401)))).rejects.toSatisfy(
      (error) => isRedirect(error),
    );
  });

  it("redirects to /forbidden on a 403", async () => {
    await expect(requireUser(makeRejectingQueryClient(apiError(403)))).rejects.toSatisfy(
      (error) => isRedirect(error),
    );
  });

  it("rethrows non-auth errors instead of redirecting", async () => {
    const boom = new Error("network down");
    await expect(requireUser(makeRejectingQueryClient(boom))).rejects.toBe(boom);
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
  it("sends a dedicated KTA operator to the KTA card picker", () => {
    expect(homePathFor({ roles: ["id_card"] })).toBe("/dashboard/id-card");
  });

  it("keeps dashboard and password-change priorities", () => {
    expect(homePathFor({ roles: ["dashboard", "id_card"] })).toBe("/dashboard");
    expect(homePathFor({ roles: ["id_card"], must_change_password: true })).toBe(
      "/portal/ubah-password",
    );
  });
});

describe("redirect helper sanity", () => {
  it("redirect() builds a router Response with options", () => {
    const response = redirect({ to: "/forbidden" as never, replace: true }) as unknown as Response & {
      options: { to: string; replace: boolean };
    };
    expect(isRedirect(response)).toBe(true);
    expect(response.options).toMatchObject({ to: "/forbidden", replace: true });
  });
});