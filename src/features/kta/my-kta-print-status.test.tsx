import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MyKtaPrintStatus } from "@/features/kta/my-kta-print-status";
import { apiClient } from "@/services/api-client";
import type { KtaPrintStatus, MyKtaPrintRequest } from "@/types/api";

function request(overrides: Partial<MyKtaPrintRequest> = {}): MyKtaPrintRequest {
  return {
    reference: "KTA-PORTAL-42",
    status: "menunggu_pembayaran",
    delivery_method: "pickup",
    payment_status: "pending",
    payment_amount: "25375.00",
    pay_url: "https://paymenku.com/pay/PORTAL-42",
    submitted_at: "2026-09-16T00:00:00Z",
    paid_at: null,
    printed_at: null,
    ready_at: null,
    shipped_at: null,
    completed_at: null,
    rejected_at: null,
    updated_at: "2026-09-16T01:00:00Z",
    rejection_reason: null,
    ...overrides,
  };
}

function renderStatus() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MyKtaPrintStatus />
    </QueryClientProvider>,
  );
}

function respondWith(value: MyKtaPrintRequest | null) {
  return { data: { success: true, data: { request: value } } } as never;
}

describe("MyKtaPrintStatus", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it("shows a loading state", () => {
    vi.spyOn(apiClient, "get").mockReturnValue(new Promise(() => undefined));

    renderStatus();

    expect(screen.getByRole("status")).toHaveTextContent("Memuat status KTA fisik");
  });

  it("shows an error and retries the request", async () => {
    const user = userEvent.setup();
    const get = vi
      .spyOn(apiClient, "get")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(respondWith(null));

    renderStatus();

    expect(await screen.findByRole("alert")).toHaveTextContent("gagal dimuat");
    await user.click(screen.getByRole("button", { name: "Coba Lagi" }));

    expect(await screen.findByText("Belum ada pengajuan KTA fisik")).toBeInTheDocument();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it("links members without a request to the public verification flow", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(respondWith(null));

    renderStatus();

    expect(await screen.findByRole("link", { name: "Ajukan KTA Fisik" })).toHaveAttribute(
      "href",
      "/cek-kta",
    );
    expect(apiClient.get).toHaveBeenCalledWith("/me/kta/print-request", undefined);
  });

  it.each<[KtaPrintStatus, string]>([
    ["menunggu_pembayaran", "Menunggu Pembayaran"],
    ["menunggu_cetak", "Menunggu Cetak"],
    ["sudah_dicetak", "Sudah Dicetak"],
    ["siap_diambil", "Siap Diambil"],
    ["dikirim", "Sedang Dikirim"],
    ["selesai", "Selesai"],
    ["ditolak", "Ditolak"],
    ["pembayaran_expired", "Pembayaran Kedaluwarsa"],
  ])("localizes %s as %s", async (status, label) => {
    vi.spyOn(apiClient, "get").mockResolvedValue(respondWith(request({ status })));

    renderStatus();

    expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);
  });

  it("shows pending payment amount and action", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(respondWith(request()));

    renderStatus();

    expect(await screen.findByText(/Rp\s*25\.375/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bayar Sekarang" })).toHaveAttribute(
      "href",
      "https://paymenku.com/pay/PORTAL-42",
    );
  });

  it("shows the rejection reason and lifecycle", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(
      respondWith(
        request({
          status: "ditolak",
          payment_status: "rejected",
          pay_url: null,
          rejected_at: "2026-09-17T00:00:00Z",
          rejection_reason: "Foto kartu tidak memenuhi ketentuan.",
        }),
      ),
    );

    renderStatus();

    expect(await screen.findByText("Alasan penolakan")).toBeInTheDocument();
    expect(screen.getByText("Foto kartu tidak memenuhi ketentuan.")).toBeInTheDocument();
    expect(screen.getByTestId("my-kta-print-timeline")).toHaveTextContent("Ditolak");
  });

  it("warns when payment arrives after expiry", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(
      respondWith(
        request({
          status: "pembayaran_expired",
          payment_status: "paid",
          pay_url: null,
          paid_at: "2026-09-18T00:00:00Z",
        }),
      ),
    );

    renderStatus();

    expect(await screen.findByTestId("kta-late-payment-warning")).toHaveTextContent(
      /pembayaran diterima setelah pengajuan kedaluwarsa/i,
    );
  });

  it("does not render PII or internal fields returned accidentally", async () => {
    const unsafeRequest = {
      ...request(),
      id: 42,
      id_users: 7,
      recipient_name: "Nama Sangat Rahasia",
      recipient_phone: "081299999999",
      shipping_address: "Alamat Sangat Rahasia",
      notes: "Catatan internal rahasia",
    };
    vi.spyOn(apiClient, "get").mockResolvedValue(respondWith(unsafeRequest));

    renderStatus();

    expect(await screen.findByText("KTA-PORTAL-42")).toBeInTheDocument();
    expect(screen.queryByText("Nama Sangat Rahasia")).not.toBeInTheDocument();
    expect(screen.queryByText("081299999999")).not.toBeInTheDocument();
    expect(screen.queryByText("Alamat Sangat Rahasia")).not.toBeInTheDocument();
    expect(screen.queryByText("Catatan internal rahasia")).not.toBeInTheDocument();
  });
});
