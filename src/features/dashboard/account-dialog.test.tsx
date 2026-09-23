import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { AccountDialog } from "@/features/dashboard/account-dialog";
import { apiClient } from "@/services/api-client";
import type { AccountResetAuditItem, Member } from "@/types/api";

const member: Member = {
  id: 1,
  id_users: 7,
  id_anggota: "MZT000007",
  nama: "Anggota Uji",
  email: null,
  no_hp: "",
  alamat: "",
  niqobah: "",
  pekerjaan: "",
  foto: null,
  tahun_masuk: "",
  tahun_keluar: "",
  tempat_lahir: null,
  tanggal_lahir: "",
};

const auditItem: AccountResetAuditItem = {
  id_users: 7,
  id_anggota: "MZT000007",
  nama: "Anggota Uji",
  eligible: true,
  reason_code: "eligible",
  reason: "Akun memenuhi syarat reset.",
};

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Buka reset
      </button>
      <AccountDialog
        member={open ? member : null}
        auditItem={open ? auditItem : null}
        onOpenChange={setOpen}
      />
    </>
  );
}

function renderDialog() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  );
}

describe("AccountDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => cleanup());

  it("requires an exact member ID and submits the reset once", async () => {
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({
      data: {
        success: true,
        message: "Password reset.",
        data: { must_change_password: true },
      },
    });
    const user = userEvent.setup();
    renderDialog();

    const reset = screen.getByRole("button", { name: "Reset password" });
    expect(reset).toBeDisabled();
    expect(screen.queryByText(/Generate Akun|Bulk generate/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Ketik ID anggota/), "mzt000007");
    expect(reset).toBeDisabled();
    await user.clear(screen.getByLabelText(/Ketik ID anggota/));
    await user.type(screen.getByLabelText(/Ketik ID anggota/), "MZT000007");
    expect(reset).toBeEnabled();
    await user.click(reset);

    expect(await screen.findByText("Reset akun berhasil")).toBeInTheDocument();
    expect(screen.queryByText("mzt1234")).not.toBeInTheDocument();
    expect(put).toHaveBeenCalledOnce();
    expect(put).toHaveBeenCalledWith("/members/7/account", {
      confirm: true,
      confirmation_id_anggota: "MZT000007",
    });
  });

  it("disables controls while pending and prevents duplicate resets", async () => {
    let resolveRequest!: (value: unknown) => void;
    const put = vi.spyOn(apiClient, "put").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }) as never,
    );
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/Ketik ID anggota/), "MZT000007");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    const pending = screen.getByRole("button", { name: "Mereset…" });
    expect(pending).toBeDisabled();
    expect(screen.getByRole("button", { name: "Batal" })).toBeDisabled();
    expect(put).toHaveBeenCalledOnce();

    resolveRequest({
      data: {
        success: true,
        data: { must_change_password: true },
      },
    });
    expect(await screen.findByText("Reset akun berhasil")).toBeInTheDocument();
    expect(put).toHaveBeenCalledOnce();
  });

  it("clears the success state when the dialog closes", async () => {
    vi.spyOn(apiClient, "put").mockResolvedValue({
      data: {
        success: true,
        data: { must_change_password: true },
      },
    });
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/Ketik ID anggota/), "MZT000007");
    await user.click(screen.getByRole("button", { name: "Reset password" }));
    expect(await screen.findByText("Reset akun berhasil")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Selesai" }));
    await waitFor(() => expect(screen.queryByText("Reset akun berhasil")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Buka reset" }));

    expect(screen.queryByText("Reset akun berhasil")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset password" })).toBeDisabled();
  });
});
