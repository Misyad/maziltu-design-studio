import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KtaPrintRequestBlock } from "@/features/kta/kta-print-request";
import { apiClient } from "@/services/api-client";
import type { KtaPrintRequest } from "@/types/api";

function wrapper(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderBlock(ui: React.ReactNode) {
  return render(wrapper(ui));
}

const TOKEN = "print-token-abc";

function pendingRequest(overrides: Partial<KtaPrintRequest> = {}): KtaPrintRequest {
  return {
    id: 482,
    reference: "KTA-482",
    status: "menunggu_pembayaran",
    delivery_method: "pickup",
    payment_status: "pending",
    payment_amount: "25375.00",
    pay_url: "https://paymenku.com/pay/IDP-1",
    submitted_at: "2026-09-16T00:00:00Z",
    paid_at: null,
    printed_at: null,
    ready_at: null,
    shipped_at: null,
    completed_at: null,
    rejection_reason: null,
    ...overrides,
  };
}

describe("KtaPrintRequestBlock", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it("shows the request CTA when no active request exists", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { success: true, data: { request: null } },
    } as never);

    renderBlock(<KtaPrintRequestBlock printToken={TOKEN} status="active" />);

    expect(await screen.findByTestId("kta-print-open")).toBeInTheDocument();
  });

  it("blocks inactive members entirely", async () => {
    renderBlock(<KtaPrintRequestBlock printToken={TOKEN} status="non_active" />);

    expect(screen.getByTestId("kta-print-inactive")).toBeInTheDocument();
    expect(screen.queryByTestId("kta-print-open")).not.toBeInTheDocument();
  });

  it("submits only the print token", async () => {
    const user = userEvent.setup();
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { success: true, data: { request: null } },
    } as never);
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { success: true, data: { request: pendingRequest() } },
    } as never);

    renderBlock(<KtaPrintRequestBlock printToken={TOKEN} status="active" />);

    await user.click(await screen.findByTestId("kta-print-open"));
    const form = await screen.findByTestId("kta-print-form");
    expect(form).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^ajukan$/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0]?.[0]).toBe("/public/kta/print-request");
    expect(post.mock.calls[0]?.[1]).toEqual({ print_token: TOKEN });
  });

  it("shows an existing request status with a payment link instead of the form", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { success: true, data: { request: pendingRequest() } },
    } as never);

    renderBlock(<KtaPrintRequestBlock printToken={TOKEN} status="active" />);

    const status = await screen.findByTestId("kta-print-status");
    expect(status).toHaveTextContent("KTA-482");
    expect(status).toHaveTextContent(/menunggu pembayaran/i);
    expect(screen.getByRole("link", { name: /bayar sekarang/i })).toHaveAttribute(
      "href",
      "https://paymenku.com/pay/IDP-1",
    );
    // No second-request form for an active request.
    expect(screen.queryByTestId("kta-print-form")).not.toBeInTheDocument();
  });

  it("shows the KTA price, gateway fee, and Paymenku customer total", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { success: true, data: { request: pendingRequest() } },
    } as never);

    renderBlock(<KtaPrintRequestBlock printToken={TOKEN} status="active" baseAmount={25000} />);

    const breakdown = await screen.findByTestId("kta-payment-breakdown");
    expect(breakdown).toHaveTextContent("Harga KTA");
    expect(breakdown).toHaveTextContent("Rp25.000");
    expect(breakdown).toHaveTextContent("Biaya gateway");
    expect(breakdown).toHaveTextContent("Rp375");
    expect(breakdown).toHaveTextContent("Total pembayaran");
    expect(breakdown).toHaveTextContent("Rp25.375");
    expect(breakdown).toHaveTextContent(/mengikuti nominal dari Paymenku/i);
  });

  it("reflects payment success without a pay button", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: {
        success: true,
        data: {
          request: pendingRequest({
            status: "menunggu_cetak",
            payment_status: "paid",
            paid_at: "2026-09-16T01:00:00Z",
            pay_url: null,
          }),
        },
      },
    } as never);

    renderBlock(<KtaPrintRequestBlock printToken={TOKEN} status="active" />);

    const status = await screen.findByTestId("kta-print-status");
    expect(status).toHaveTextContent(/menunggu cetak/i);
    expect(screen.queryByRole("link", { name: /bayar sekarang/i })).not.toBeInTheDocument();
  });

  it("renders the lifecycle timeline", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: {
        success: true,
        data: {
          request: pendingRequest({
            status: "selesai",
            payment_status: "paid",
            paid_at: "2026-09-16T01:00:00Z",
            printed_at: "2026-09-17T02:00:00Z",
            completed_at: "2026-09-17T03:00:00Z",
          }),
        },
      },
    } as never);

    renderBlock(<KtaPrintRequestBlock printToken={TOKEN} status="active" />);

    const timeline = await screen.findByTestId("kta-print-timeline");
    expect(timeline).toHaveTextContent("Diajukan");
    expect(timeline).toHaveTextContent("Dibayar");
    expect(timeline).toHaveTextContent("Dicetak");
    expect(timeline).toHaveTextContent("Selesai");
  });
});
