import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerOperatorPage } from "@/features/checkin/scanner-operator-page";
import { apiClient, ApiError } from "@/services/api-client";
import type { ScannerLookupResult } from "@/types/api";

vi.mock("@/features/checkin/camera-scanner", () => ({
  CameraScanner: () => <div data-testid="camera-scanner" />,
}));

class MockBroadcastChannel {
  static posted: unknown[] = [];

  postMessage(value: unknown) {
    MockBroadcastChannel.posted.push(value);
  }

  close() {}
}

const participant: ScannerLookupResult = {
  ticket: { id: 1, uuid: "ticket-uuid", nomor_ticket: "T-001", status: "issued" },
  participant: {
    id: 2,
    id_anggota: "001234",
    name: "Ahmad Fulan",
    foto: null,
    niqobah: "Malang",
  },
  event: { id_event: 1, event_name: "Multaqo" },
  payment: {
    choice: "pay_at_venue",
    status: "pending",
    amount: "25000",
    source: null,
    paid_at: null,
  },
  attendance: { status: "not_present", scanned_at: null, scanned_by: null, gate: null },
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ScannerOperatorPage />
    </QueryClientProvider>,
  );
}

async function selectEventAndDay() {
  const user = userEvent.setup();
  await user.click((await screen.findAllByRole("combobox")).at(0)!);
  await user.click(await screen.findByRole("option", { name: "Multaqo" }));
  await user.click(screen.getAllByRole("combobox").at(1)!);
  await user.click(await screen.findByRole("option", { name: /2026-09-25/ }));
  return user;
}

function mockEventQueries() {
  return vi.spyOn(apiClient, "get").mockImplementation(async (url) => {
    if (url === "/events") {
      return {
        data: {
          success: true,
          data: [
            {
              id: 1,
              judul_event: "Multaqo",
              slug: "multaqo",
              lokasi: "Malang",
              harga: 25000,
              deskripsi: "",
              banner: null,
              tanggal_mulai: "2026-09-25",
              tanggal_selesai: "2026-09-25",
              is_active: 1,
            },
          ],
        },
      } as never;
    }
    if (url === "/events/1/tanggal") {
      return {
        data: {
          success: true,
          data: [
            {
              id: 10,
              id_event: 1,
              tanggal: "2026-09-25",
              jam_mulai: "08:00",
              jam_selesai: "12:00",
              set_jam: "dijam",
            },
          ],
        },
      } as never;
    }
    throw new Error(`Unexpected request: ${String(url)}`);
  });
}

describe("ScannerOperatorPage", () => {
  beforeEach(() => {
    MockBroadcastChannel.posted = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    window.localStorage.clear();
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: () => undefined,
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: () => undefined,
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: () => undefined,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("preserves member-card zeroes, submits the server amount, and publishes only after success", async () => {
    mockEventQueries();
    const post = vi.spyOn(apiClient, "post").mockImplementation(async (url) => {
      if (url === "/checkin/lookup") {
        return { data: { success: true, data: participant } } as never;
      }
      if (url === "/checkin/onsite") {
        return {
          data: {
            success: true,
            data: {
              ...participant,
              payment: { ...participant.payment, status: "paid" },
              attendance: { ...participant.attendance, status: "present" },
            },
          },
        } as never;
      }
      throw new Error(`Unexpected request: ${String(url)}`);
    });
    renderPage();
    const user = await selectEventAndDay();

    await user.click(screen.getByRole("combobox", { name: "Jenis identifier" }));
    await user.click(await screen.findByRole("option", { name: "Kartu Anggota" }));
    await user.type(screen.getByLabelText("Kode"), " 001234 ");
    await user.click(screen.getByRole("button", { name: "Cari Peserta" }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/checkin/lookup",
        { identifier: "001234", identifier_type: "member_card", id_event: 1, id_tanggal: 10 },
        {},
      ),
    );
    expect(await screen.findByDisplayValue("25000")).toHaveAttribute("readonly");
    expect(MockBroadcastChannel.posted).not.toContainEqual(
      expect.objectContaining({ type: "success" }),
    );

    await user.click(screen.getByRole("button", { name: "Bayar di Tempat dan Check-in" }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/checkin/onsite",
        { ticket_uuid: "ticket-uuid", id_tanggal: 10, gate: null, amount: 25000 },
        {},
      ),
    );
    await waitFor(() =>
      expect(MockBroadcastChannel.posted).toContainEqual(
        expect.objectContaining({ type: "success", status: "Check-in Berhasil" }),
      ),
    );
  });

  it("does not publish display success for a failed duplicate check-in", async () => {
    mockEventQueries();
    const paidParticipant: ScannerLookupResult = {
      ...participant,
      payment: { ...participant.payment, choice: "pay_now", status: "paid", amount: 0 },
    };
    const post = vi.spyOn(apiClient, "post").mockImplementation(async (url) => {
      if (url === "/checkin/lookup") {
        return { data: { success: true, data: paidParticipant } } as never;
      }
      if (url === "/checkin") {
        throw new ApiError("Sudah hadir", 409, undefined, {
          first_scanned_at: "2026-09-25T10:00:00Z",
          first_scanned_by: 9,
        });
      }
      throw new Error(`Unexpected request: ${String(url)}`);
    });
    renderPage();
    const user = await selectEventAndDay();

    await user.type(screen.getByLabelText("Kode"), "ticket-code");
    await user.click(screen.getByRole("button", { name: "Cari Peserta" }));
    await user.click(await screen.findByRole("button", { name: "Konfirmasi Hadir" }));

    await waitFor(() => expect(post).toHaveBeenCalledWith("/checkin", expect.anything(), {}));
    expect(MockBroadcastChannel.posted).not.toContainEqual(
      expect.objectContaining({ type: "success" }),
    );
  });

  it("does not mark the participant present for a non-duplicate 409", async () => {
    mockEventQueries();
    const paidParticipant: ScannerLookupResult = {
      ...participant,
      payment: { ...participant.payment, choice: "pay_now", status: "paid", amount: 0 },
    };
    vi.spyOn(apiClient, "post").mockImplementation(async (url) => {
      if (url === "/checkin/lookup") {
        return { data: { success: true, data: paidParticipant } } as never;
      }
      if (url === "/checkin") {
        throw new ApiError("Pembayaran belum lunas", 409);
      }
      throw new Error(`Unexpected request: ${String(url)}`);
    });
    renderPage();
    const user = await selectEventAndDay();

    await user.type(screen.getByLabelText("Kode"), "ticket-code");
    await user.click(screen.getByRole("button", { name: "Cari Peserta" }));
    await user.click(await screen.findByRole("button", { name: "Konfirmasi Hadir" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Konfirmasi Hadir" })).toBeEnabled(),
    );
    expect(screen.queryByText(/Peserta sudah hadir/)).not.toBeInTheDocument();
    expect(MockBroadcastChannel.posted).not.toContainEqual(
      expect.objectContaining({ type: "success" }),
    );
  });

  it.each(["expired", "cancelled", "failed"] as const)(
    "does not treat a %s pay-now order as paid",
    async (status) => {
      mockEventQueries();
      const terminalParticipant: ScannerLookupResult = {
        ...participant,
        payment: { ...participant.payment, choice: "pay_now", status, amount: 25000 },
      };
      const post = vi.spyOn(apiClient, "post").mockImplementation(async (url) => {
        if (url === "/checkin/lookup") {
          return { data: { success: true, data: terminalParticipant } } as never;
        }
        throw new Error(`Unexpected request: ${String(url)}`);
      });
      renderPage();
      const user = await selectEventAndDay();

      await user.type(screen.getByLabelText("Kode"), "ticket-code");
      await user.click(screen.getByRole("button", { name: "Cari Peserta" }));

      expect(
        await screen.findByText("Pembayaran bayar sekarang belum lunas. Check-in diblokir."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Konfirmasi Hadir" })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Bayar di Tempat dan Check-in" }),
      ).not.toBeInTheDocument();
      expect(post).not.toHaveBeenCalledWith("/checkin", expect.anything(), {});
      expect(MockBroadcastChannel.posted).not.toContainEqual(
        expect.objectContaining({ type: "success" }),
      );
    },
  );
});
