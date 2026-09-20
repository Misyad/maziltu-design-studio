import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

function renderPage(role = "admin") {
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
      return { data: { success: true, data: [member] } } as never;
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

  it("keeps account actions hidden from read-only staff", async () => {
    const { get } = renderPage("dashboard");

    expect(await screen.findByText("Anggota Uji")).toBeInTheDocument();
    expect(screen.queryByText("Aksi akun")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /akun Anggota Uji/ })).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalledWith("/members/account-reset-audit");
  });
});
