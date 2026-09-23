import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MembersPage } from "@/routes/dashboard/members";
import { apiClient } from "@/services/api-client";
import type { Member } from "@/types/api";

const member: Member = {
  id: 1,
  id_users: 7,
  id_anggota: "MZT000007",
  nama: "Anggota Uji",
  email: "anggota@example.test",
  no_hp: "08123456789",
  alamat: "Malang",
  niqobah: "Malang",
  pekerjaan: "Guru",
  foto: null,
  tahun_masuk: "2015-01-01",
  tahun_keluar: "2019-01-01",
  tempat_lahir: "Malang",
  tanggal_lahir: "2000-01-01",
  has_account: true,
  account_is_active: 1,
  login_count: 1,
  last_login: "2026-09-20T08:00:00Z",
};

const secondMember: Member = {
  ...member,
  id: 2,
  id_users: 8,
  id_anggota: "MZT000008",
  nama: "Anggota Kedua",
};

function renderPage(role = "admin", members: Member[] = [member], roleTargets: Member[] = members) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const get = vi.spyOn(apiClient, "get").mockImplementation(async (url) => {
    if (url === "/user") {
      return {
        data: {
          success: true,
          user: {
            id: 1,
            id_anggota: "ADMIN-1",
            name: "Admin",
            email: null,
            roles: [role],
            foto: null,
          },
        },
      } as never;
    }
    if (url === "/members") {
      return { data: { success: true, data: members } } as never;
    }
    if (url === "/members/role-targets") {
      return { data: { success: true, data: roleTargets } } as never;
    }
    if (url === "/members/7/roles") {
      return {
        data: {
          success: true,
          data: {
            required_roles: ["anggota", "profil"],
            assigned_roles: ["anggota", "profil", "event"],
            optional_roles: ["dashboard", "event", "finance"],
          },
        },
      } as never;
    }
    if (url === "/members/8/roles") {
      return {
        data: {
          success: true,
          data: {
            required_roles: ["anggota", "profil"],
            assigned_roles: ["anggota", "profil", "finance"],
            optional_roles: ["dashboard", "event", "finance"],
          },
        },
      } as never;
    }
    if (url === "/members/account-reset-audit") {
      return {
        data: {
          success: true,
          data: {
            audited_at: "2026-09-20T08:00:00Z",
            total_accounts: 1,
            eligible_count: 1,
            ineligible_count: 0,
            reason_counts: {},
            items: [
              {
                id_users: 7,
                id_anggota: "MZT000007",
                nama: "Anggota Uji",
                eligible: true,
                reason_code: "ELIGIBLE",
                reason: "Memenuhi syarat reset akun.",
              },
            ],
          },
        },
      } as never;
    }
    throw new Error(`Unexpected request: ${String(url)}`);
  });

  render(
    <QueryClientProvider client={client}>
      <MembersPage />
    </QueryClientProvider>,
  );

  return { get, client };
}

describe("MembersPage account operations", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it("shows only status and eligible reset actions for account administrators", async () => {
    renderPage();

    expect(await screen.findByText("Anggota Uji")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Nonaktifkan akun Anggota Uji" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset password Anggota Uji" })).toBeInTheDocument();
    expect(screen.queryByText("New member")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Edit Anggota Uji/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Delete Anggota Uji/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Print ID card for Anggota Uji/)).not.toBeInTheDocument();
  });

  it("requires confirmation and sends the explicit inactive status", async () => {
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({
      data: { success: true, message: "Akun dinonaktifkan." },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Nonaktifkan akun Anggota Uji" }));
    expect(screen.getByRole("heading", { name: "Nonaktifkan akun anggota?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Nonaktifkan akun" }));

    await waitFor(() => expect(put).toHaveBeenCalledWith("/members/7/status", { is_active: "0" }));
  });

  it("keeps members with optional roles selectable after they leave the account list", async () => {
    const user = userEvent.setup();
    renderPage("admin", [member], [member, secondMember]);

    expect(await screen.findByText("Anggota Kedua")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nonaktifkan akun Anggota Kedua" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kelola hak akses Anggota Kedua" }));
    expect(await screen.findByRole("checkbox", { name: "finance" })).toBeChecked();
  });

  it("loads actual assignments and locks required roles", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Kelola hak akses Anggota Uji" }));

    expect(await screen.findByRole("heading", { name: "Hak Akses" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "anggota" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "anggota" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "profil" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "profil" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "event" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "dashboard" })).not.toBeChecked();
  });

  it("keeps save disabled until roles finish loading", async () => {
    let resolveRoles!: (value: never) => void;
    const pendingRoles = new Promise<never>((resolve) => {
      resolveRoles = resolve;
    });
    const user = userEvent.setup();
    const { get } = renderPage();
    const defaultImplementation = get.getMockImplementation();
    get.mockImplementation((url, ...args) => {
      if (url === "/members/7/roles") return pendingRoles;
      if (!defaultImplementation) throw new Error("Missing GET mock");
      return defaultImplementation(url, ...args);
    });

    await user.click(await screen.findByRole("button", { name: "Kelola hak akses Anggota Uji" }));

    expect(screen.getByRole("button", { name: "Simpan hak akses" })).toBeDisabled();

    await act(async () => {
      resolveRoles({
        data: {
          success: true,
          data: {
            required_roles: ["anggota", "profil"],
            assigned_roles: ["anggota", "profil", "event"],
            optional_roles: ["event"],
          },
        },
      } as never);
    });
  });

  it("sends an explicit empty optional role selection", async () => {
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({
      data: {
        success: true,
        data: {
          required_roles: ["anggota", "profil"],
          assigned_roles: ["anggota", "profil"],
          optional_roles: ["dashboard", "event", "finance"],
        },
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Kelola hak akses Anggota Uji" }));
    await user.click(await screen.findByRole("checkbox", { name: "event" }));
    await user.click(screen.getByRole("button", { name: "Simpan hak akses" }));

    await waitFor(() => expect(put).toHaveBeenCalledWith("/members/7/roles", { roles: [] }));
  });

  it("resets selected roles when opening a different member", async () => {
    const user = userEvent.setup();
    renderPage("admin", [member, secondMember]);

    await user.click(await screen.findByRole("button", { name: "Kelola hak akses Anggota Uji" }));
    expect(await screen.findByRole("checkbox", { name: "event" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Batal" }));

    await user.click(screen.getByRole("button", { name: "Kelola hak akses Anggota Kedua" }));
    expect(await screen.findByRole("checkbox", { name: "finance" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "event" })).not.toBeChecked();
  });

  it("keeps account and role actions hidden from read-only staff", async () => {
    const { get } = renderPage("dashboard");

    expect(await screen.findByText("Anggota Uji")).toBeInTheDocument();
    expect(screen.queryByText("Aksi akun")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /akun Anggota Uji/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Kelola hak akses Anggota Uji" }),
    ).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalledWith("/members/account-reset-audit");
    expect(get).not.toHaveBeenCalledWith("/members/7/roles");
  });
});
