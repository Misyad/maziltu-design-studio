import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KtaQueuePage } from "@/routes/dashboard/kta";
import { apiClient } from "@/services/api-client";

const authUser = {
  id: 7,
  id_anggota: "STAFF-7",
  name: "Petugas",
  email: null,
  roles: ["finance"],
  foto: null,
};

const card = {
  id_users: 9,
  id_anggota: "0174011119",
  nama: "Achmad Hasanudin",
  alamat: "Jl. Contoh",
  niqobah: "Pakis",
  tahun_masuk: "2011",
  tahun_keluar: "2019",
  foto: null,
  barcode_value: "0174011119",
  barcode_data_uri: "data:image/svg+xml;base64,PHN2Zy8+",
  background_url: "https://example.test/kta.jpg",
};

const row = {
  id: 42,
  reference: "KTA-42",
  nama_masked: "A*** H***",
  id_anggota_masked: "MZT***119",
  status: "menunggu_cetak",
  delivery_method: "delivery",
  payment_status: "paid",
  payment_amount: "25375.00",
  recipient_name: "Ahmad Hasan",
  recipient_phone: "081234567890",
  shipping_address: "Jl. Mawar No. 10\nMalang",
  submitted_at: "2026-09-16T00:00:00Z",
  updated_at: "2026-09-16T01:00:00Z",
} as const;

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <KtaQueuePage />
    </QueryClientProvider>,
  );
}

describe("KtaQueuePage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => cleanup());

  it("keeps delivery PII out of the queue and loads it in the detail dialog", async () => {
    const get = vi.spyOn(apiClient, "get").mockImplementation(async (url) => {
      if (url === "/user") {
        return { data: { success: true, user: authUser } } as never;
      }
      if (url === "/kta/print-requests/42/card") {
        return { data: { success: true, data: card } } as never;
      }
      if (url === "/kta/print-requests/42") {
        return {
          data: {
            success: true,
            data: {
              request: {
                ...row,
                recipient_name: "Ahmad Hasan",
                recipient_phone: "081234567890",
                shipping_address: "Jl. Mawar No. 10\nMalang",
                notes: "Hubungi sebelum dikirim",
                logs: [
                  {
                    old_status: "menunggu_pembayaran",
                    new_status: "menunggu_cetak",
                    reason: "Pembayaran terverifikasi (Paymenku)",
                    source: "paymenku_webhook",
                    actor_id: null,
                    at: "2026-09-16T01:00:00Z",
                  },
                ],
              },
            },
          },
        } as never;
      }

      return {
        data: {
          success: true,
          data: {
            data: [row],
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: 1,
          },
        },
      } as never;
    });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("A*** H***")).toBeInTheDocument();
    expect(screen.queryByText("Ahmad Hasan")).not.toBeInTheDocument();
    expect(screen.queryByText("081234567890")).not.toBeInTheDocument();
    expect(screen.queryByText(/Jl\. Mawar/)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Detail" }));

    const dialog = await screen.findByRole("dialog", { name: "Detail Pengajuan KTA" });
    expect(within(dialog).getByText("Ahmad Hasan")).toBeInTheDocument();
    expect(within(dialog).getByText("081234567890")).toBeInTheDocument();
    expect(within(dialog).getByText(/Jl\. Mawar No\. 10/)).toBeInTheDocument();
    expect(within(dialog).getByText("Dikirim")).toBeInTheDocument();
    expect(within(dialog).getByText("paid")).toBeInTheDocument();
    expect(within(dialog).getByText(/Rp\s*25\.375/)).toBeInTheDocument();
    expect(within(dialog).getByText("Menunggu Cetak")).toBeInTheDocument();
    expect(within(dialog).getByText(/Menunggu Pembayaran → Menunggu Cetak/)).toBeInTheDocument();
    expect(within(dialog).getByText("Hubungi sebelum dikirim")).toBeInTheDocument();
    expect(within(dialog).getByText("paymenku_webhook", { exact: false })).toBeInTheDocument();
    await waitFor(() => expect(get).toHaveBeenCalledWith("/kta/print-requests/42"));
  });

  it("lets an id-card operator preview a paid card without delivery detail or status actions", async () => {
    const get = vi.spyOn(apiClient, "get").mockImplementation(async (url) => {
      if (url === "/user") {
        return {
          data: { success: true, user: { ...authUser, roles: ["id_card"] } },
        } as never;
      }
      if (url === "/kta/print-requests/42/card") {
        return { data: { success: true, data: card } } as never;
      }
      return {
        data: {
          success: true,
          data: {
            data: [row],
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: 1,
          },
        },
      } as never;
    });

    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const operator = userEvent.setup();
    renderPage();

    await operator.click(await screen.findByRole("button", { name: /cetak/i }));
    const dialog = await screen.findByRole("dialog", { name: "Preview KTA" });

    expect(within(dialog).getByText("Achmad Hasanudin")).toBeInTheDocument();
    await operator.click(within(dialog).getByRole("button", { name: "Cetak KTA" }));
    expect(print).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Detail" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tandai Sudah Dicetak" })).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/kta/print-requests/42/card");
    expect(get).not.toHaveBeenCalledWith("/kta/print-requests/42");
  });

  it("does not request detail before the operator opens it", async () => {
    const get = vi.spyOn(apiClient, "get").mockImplementation(async (url) => {
      if (url === "/user") {
        return { data: { success: true, user: authUser } } as never;
      }
      return {
        data: {
          success: true,
          data: {
            data: [row],
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: 1,
          },
        },
      } as never;
    });

    renderPage();

    expect(await screen.findByText("A*** H***")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith("/user", expect.objectContaining({ authCheck: true }));
    expect(get).not.toHaveBeenCalledWith("/kta/print-requests/42");
  });
});
