import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CekKtaForm } from "@/features/kta/cek-kta-form";
import { apiClient } from "@/services/api-client";
import type { KtaVerifiedResult } from "@/types/api";

/**
 * Public "Cek Status KTA" UI.
 *
 * Two invariants are as important as the happy path:
 *  1. the lookup step never reveals single/ambiguous/not_found — it always
 *     advances to verification;
 *  2. no raw PII is ever rendered (only the masked fields the API returns).
 */
function wrapper(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderForm() {
  return render(wrapper(<CekKtaForm />));
}

/** apiPostRaw unwraps `response.data`, so mock at the axios layer. */
function mockPost(payload: unknown) {
  return vi.spyOn(apiClient, "post").mockResolvedValue({ data: payload } as never);
}

const VERIFIED: KtaVerifiedResult = {
  verified: true,
  nama_masked: "A*** H***",
  id_anggota_masked: "MZT***119",
  status: "active",
  qr_payload: "0174011119",
  kta: { type: "digital", fisik: "not_tracked" },
};

describe("CekKtaForm — public KTA status page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders both lookup modes and defaults to name + dob", () => {
    renderForm();

    expect(screen.getByTestId("kta-lookup")).toBeInTheDocument();
    expect(screen.getByTestId("kta-mode-name")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("kta-mode-member")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Nama lengkap")).toBeInTheDocument();
    expect(screen.getByLabelText("Tanggal lahir")).toHaveAttribute("placeholder", "DD/MM/YYYY");
    expect(screen.getByText("Format: DD/MM/YYYY")).toBeInTheDocument();
  });

  it("switches to member-number mode", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByTestId("kta-mode-member"));

    expect(screen.getByTestId("kta-mode-member")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Nomor anggota")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nama lengkap")).not.toBeInTheDocument();
  });

  it("submits name + dob to /public/kta/check and moves to verification", async () => {
    const user = userEvent.setup();
    const spy = mockPost({ success: true, data: { stage: "challenge", challenge_token: "tok-1" } });
    renderForm();

    await user.type(screen.getByLabelText("Nama lengkap"), "Achmad Hasanudin");
    await user.type(screen.getByLabelText("Tanggal lahir"), "13/07/2001");
    await user.click(screen.getByRole("button", { name: /cek status/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0]?.[0]).toBe("/public/kta/check");
    expect(spy.mock.calls[0]?.[1]).toEqual({
      mode: "name_dob",
      name: "Achmad Hasanudin",
      tanggal_lahir: "2001-07-13",
    });

    expect(await screen.findByTestId("kta-verification-choice")).toBeInTheDocument();
  });

  it("rejects an invalid calendar date", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(apiClient, "post");
    renderForm();

    await user.type(screen.getByLabelText("Nama lengkap"), "Achmad Hasanudin");
    await user.type(screen.getByLabelText("Tanggal lahir"), "31/02/2001");
    await user.click(screen.getByRole("button", { name: /cek status/i }));

    expect(spy).not.toHaveBeenCalled();
    expect(
      screen.getByText("Tanggal lahir tidak valid. Gunakan format DD/MM/YYYY."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Tanggal lahir")).toHaveAttribute("aria-invalid", "true");
  });

  it.each(["01/01/0001", "31/12/1899", "01/01/2999"])(
    "rejects sentinel or out-of-range date %s",
    async (date) => {
      const user = userEvent.setup();
      const spy = vi.spyOn(apiClient, "post");
      renderForm();

      await user.type(screen.getByLabelText("Nama lengkap"), "Achmad Hasanudin");
      await user.type(screen.getByLabelText("Tanggal lahir"), date);
      await user.click(screen.getByRole("button", { name: /cek status/i }));

      expect(spy).not.toHaveBeenCalled();
      expect(
        screen.getByText("Tanggal lahir tidak valid. Gunakan format DD/MM/YYYY."),
      ).toBeInTheDocument();
    },
  );

  it("submits member id to /public/kta/check (still requires verification)", async () => {
    const user = userEvent.setup();
    const spy = mockPost({ success: true, data: { stage: "challenge", challenge_token: "tok-2" } });
    renderForm();

    await user.click(screen.getByTestId("kta-mode-member"));
    await user.type(screen.getByLabelText("Nomor anggota"), "0174011119");
    await user.click(screen.getByRole("button", { name: /cek status/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0]?.[1]).toEqual({ mode: "member_id", id_anggota: "0174011119" });

    // Valid member id alone never yields the result.
    expect(await screen.findByTestId("kta-verification-choice")).toBeInTheDocument();
    expect(screen.queryByTestId("kta-result")).not.toBeInTheDocument();
  });

  it("completes HP last-4 verification and renders masked result", async () => {
    const user = userEvent.setup();
    const spy = vi
      .spyOn(apiClient, "post")
      .mockResolvedValueOnce({
        data: { success: true, data: { stage: "challenge", challenge_token: "tok-3" } },
      } as never)
      .mockResolvedValueOnce({ data: { success: true, data: VERIFIED } } as never);

    renderForm();

    await user.type(screen.getByLabelText("Nama lengkap"), "Achmad Hasanudin");
    await user.type(screen.getByLabelText("Tanggal lahir"), "13/07/2001");
    await user.click(screen.getByRole("button", { name: /cek status/i }));
    await user.click(await screen.findByRole("button", { name: /saya punya nomor hp/i }));

    const hp = await screen.findByLabelText("4 digit terakhir nomor HP");
    await user.type(hp, "2559");
    await user.click(screen.getByRole("button", { name: /^verifikasi$/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy.mock.calls[1]?.[0]).toBe("/public/kta/verify");
    expect(spy.mock.calls[1]?.[1]).toEqual({
      challenge_token: "tok-3",
      method: "hp_last4",
      value: "2559",
    });

    const result = await screen.findByTestId("kta-result");
    expect(result).toHaveTextContent("A*** H***");
    expect(result).toHaveTextContent("MZT***119");
    expect(result).toHaveTextContent(/terdaftar \(aktif\)/i);
    expect(result).toHaveTextContent(/status pengajuan tersedia setelah anda mengajukan/i);
  });

  it("falls back to tahun_masuk + tempat_lahir when the member has no phone", async () => {
    const user = userEvent.setup();
    const spy = vi
      .spyOn(apiClient, "post")
      .mockResolvedValueOnce({
        data: { success: true, data: { stage: "challenge", challenge_token: "tok-4" } },
      } as never)
      .mockResolvedValueOnce({ data: { success: true, data: VERIFIED } } as never);

    renderForm();

    await user.type(screen.getByLabelText("Nama lengkap"), "Achmad Hasanudin");
    await user.type(screen.getByLabelText("Tanggal lahir"), "13/07/2001");
    await user.click(screen.getByRole("button", { name: /cek status/i }));

    await user.click(await screen.findByRole("button", { name: /saya tidak punya nomor hp/i }));

    const fallback = await screen.findByTestId("kta-verify-fallback");
    expect(fallback).toBeInTheDocument();

    await user.type(screen.getByLabelText("Tahun masuk"), "2011");
    await user.type(screen.getByLabelText("Tempat lahir"), "Malang");
    await user.click(screen.getByRole("button", { name: /^verifikasi$/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy.mock.calls[1]?.[1]).toEqual({
      challenge_token: "tok-4",
      method: "no_hp_fallback",
      value: { tahun_masuk: "2011", tempat_lahir: "Malang" },
    });

    expect(await screen.findByTestId("kta-result")).toBeInTheDocument();
  });

  it("keeps no-phone verification on fallback after a failed attempt", async () => {
    const user = userEvent.setup();
    const spy = vi
      .spyOn(apiClient, "post")
      .mockResolvedValueOnce({
        data: { success: true, data: { stage: "challenge", challenge_token: "tok-4a" } },
      } as never)
      .mockResolvedValueOnce({
        data: {
          success: false,
          data: { stage: "challenge", challenge_token: "tok-4b", attempts_left: 4 },
        },
      } as never)
      .mockResolvedValueOnce({ data: { success: true, data: VERIFIED } } as never);

    renderForm();

    await user.type(screen.getByLabelText("Nama lengkap"), "Achmad Tanpa HP");
    await user.type(screen.getByLabelText("Tanggal lahir"), "13/07/2001");
    await user.click(screen.getByRole("button", { name: /cek status/i }));
    await user.click(await screen.findByRole("button", { name: /saya tidak punya nomor hp/i }));

    await user.type(screen.getByLabelText("Tahun masuk"), "2011");
    await user.type(screen.getByLabelText("Tempat lahir"), "Surabaya");
    await user.click(screen.getByRole("button", { name: /^verifikasi$/i }));

    const fallback = await screen.findByTestId("kta-verify-fallback");
    expect(fallback).toHaveTextContent("Sisa percobaan: 4");
    expect(screen.queryByTestId("kta-verify-hp")).not.toBeInTheDocument();
    expect(screen.queryByTestId("kta-disambiguate")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Tempat lahir"));
    await user.type(screen.getByLabelText("Tempat lahir"), "Malang");
    await user.click(screen.getByRole("button", { name: /^verifikasi$/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(3));
    expect(spy.mock.calls[2]?.[1]).toEqual({
      challenge_token: "tok-4b",
      method: "no_hp_fallback",
      value: { tahun_masuk: "2011", tempat_lahir: "Malang" },
    });
    expect(await screen.findByTestId("kta-result")).toBeInTheDocument();
  });

  it("shows neutral manual-review state", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "post")
      .mockResolvedValueOnce({
        data: { success: true, data: { stage: "challenge", challenge_token: "tok-5" } },
      } as never)
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            stage: "manual_review",
            message: "Data belum dapat diverifikasi otomatis.",
          },
        },
      } as never);

    renderForm();

    await user.type(screen.getByLabelText("Nama lengkap"), "Identik Total");
    await user.type(screen.getByLabelText("Tanggal lahir"), "03/03/1992");
    await user.click(screen.getByRole("button", { name: /cek status/i }));
    await user.click(await screen.findByRole("button", { name: /saya punya nomor hp/i }));

    const hp = await screen.findByLabelText("4 digit terakhir nomor HP");
    await user.type(hp, "0000");
    await user.click(screen.getByRole("button", { name: /^verifikasi$/i }));

    const mr = await screen.findByTestId("kta-manual-review");
    expect(mr).toHaveTextContent(/verifikasi manual/i);
    expect(screen.queryByTestId("kta-result")).not.toBeInTheDocument();
  });

  it("locks the flow when the backend reports 403", async () => {
    const user = userEvent.setup();
    const axios = await import("axios");
    vi.spyOn(apiClient, "post")
      .mockResolvedValueOnce({
        data: { success: true, data: { stage: "challenge", challenge_token: "tok-6" } },
      } as never)
      .mockRejectedValueOnce(
        new axios.AxiosError("Forbidden", "ERR_BAD_REQUEST", { headers: {} } as never, undefined, {
          status: 403,
          statusText: "Forbidden",
          data: { success: false, message: "Terlalu banyak percobaan." },
          headers: {},
          config: { headers: {} } as never,
        } as never),
      );

    renderForm();

    await user.type(screen.getByLabelText("Nama lengkap"), "Achmad Hasanudin");
    await user.type(screen.getByLabelText("Tanggal lahir"), "13/07/2001");
    await user.click(screen.getByRole("button", { name: /cek status/i }));
    await user.click(await screen.findByRole("button", { name: /saya punya nomor hp/i }));

    const hp = await screen.findByLabelText("4 digit terakhir nomor HP");
    await user.type(hp, "0000");
    await user.click(screen.getByRole("button", { name: /^verifikasi$/i }));

    expect(await screen.findByTestId("kta-locked")).toBeInTheDocument();
  });

  it("advances through disambiguation one field at a time", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "post")
      .mockResolvedValueOnce({
        data: { success: true, data: { stage: "challenge", challenge_token: "tok-7" } },
      } as never)
      // First attempt is rejected and the backend asks to disambiguate.
      .mockResolvedValueOnce({
        data: {
          success: false,
          data: { stage: "challenge", challenge_token: "tok-8", attempts_left: 4 },
        },
      } as never)
      // Disambiguation answer narrows to a single candidate.
      .mockResolvedValueOnce({ data: { success: true, data: VERIFIED } } as never);

    renderForm();

    await user.type(screen.getByLabelText("Nama lengkap"), "Kembar Sama");
    await user.type(screen.getByLabelText("Tanggal lahir"), "01/01/1990");
    await user.click(screen.getByRole("button", { name: /cek status/i }));

    // First verification step is the phone challenge.
    await user.click(await screen.findByRole("button", { name: /saya punya nomor hp/i }));
    const hp = await screen.findByLabelText("4 digit terakhir nomor HP");
    await user.type(hp, "0000");
    await user.click(screen.getByRole("button", { name: /^verifikasi$/i }));

    // Backend narrowed to "ask for tahun_masuk".
    const first = await screen.findByTestId("kta-disambiguate");
    expect(first).toHaveTextContent("Tahun masuk");
    await user.type(screen.getByLabelText("Tahun masuk"), "2010");
    await user.click(screen.getByRole("button", { name: /lanjutkan/i }));

    // Narrowed to a single candidate → result (no second field needed).
    expect(await screen.findByTestId("kta-result")).toBeInTheDocument();
  });

  it("never renders raw PII fields in the result", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "post")
      .mockResolvedValueOnce({
        data: { success: true, data: { stage: "challenge", challenge_token: "tok-9" } },
      } as never)
      .mockResolvedValueOnce({ data: { success: true, data: VERIFIED } } as never);

    renderForm();

    await user.type(screen.getByLabelText("Nama lengkap"), "Achmad Hasanudin");
    await user.type(screen.getByLabelText("Tanggal lahir"), "13/07/2001");
    await user.click(screen.getByRole("button", { name: /cek status/i }));
    await user.click(await screen.findByRole("button", { name: /saya punya nomor hp/i }));

    const hp = await screen.findByLabelText("4 digit terakhir nomor HP");
    await user.type(hp, "2559");
    await user.click(screen.getByRole("button", { name: /^verifikasi$/i }));

    const result = await screen.findByTestId("kta-result");
    const text = result.textContent ?? "";

    // Full member number must not leak — only the masked form.
    expect(text).not.toContain("0174011119");
    // No raw PII labels at all.
    for (const forbidden of ["email", "no_hp", "alamat", "tanggal_lahir", "foto", "barcode"]) {
      expect(text.toLowerCase()).not.toContain(forbidden);
    }
  });
});
