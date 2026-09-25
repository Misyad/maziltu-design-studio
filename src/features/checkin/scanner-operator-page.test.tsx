import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerOperatorPage } from "@/features/checkin/scanner-operator-page";
import { apiClient, ApiError } from "@/services/api-client";
import type { ScannerLookupResult } from "@/types/api";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/features/checkin/camera-scanner", () => ({
  CameraScanner: ({ rearmKey }: { rearmKey?: number }) => (
    <div data-testid="camera-scanner" data-rearm-key={rearmKey} />
  ),
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
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.success).mockClear();
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

  it.each([
    ["MEMBER_NOT_FOUND", "ID Anggota tidak ditemukan"],
    ["MEMBER_NOT_REGISTERED_FOR_EVENT", "Anggota belum terdaftar pada event"],
    ["INVALID_MEMBER_ID_FORMAT", "Kode/format ID tidak valid"],
  ])("renders the %s business outcome without a toast", async (code, title) => {
    mockEventQueries();
    vi.spyOn(apiClient, "post").mockRejectedValue(
      new ApiError(
        "Backend message",
        code === "INVALID_MEMBER_ID_FORMAT" ? 422 : 404,
        undefined,
        undefined,
        code,
      ),
    );
    renderPage();
    const user = await selectEventAndDay();

    await user.click(screen.getByRole("combobox", { name: "Jenis identifier" }));
    await user.click(await screen.findByRole("option", { name: "Kartu Anggota" }));
    await user.type(screen.getByLabelText("Kode"), "001234");
    await user.click(screen.getByRole("button", { name: "Cari Peserta" }));

    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    const result = screen.getByRole("alert");
    expect(result).toHaveTextContent("001234");
    expect(result).toHaveTextContent("Kartu Anggota");
    expect(screen.getByRole("button", { name: "Coba Scan Lagi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cari Manual" })).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("keeps an unknown ticket distinct from member-card outcomes", async () => {
    mockEventQueries();
    vi.spyOn(apiClient, "post").mockRejectedValue(new ApiError("Tiket tidak ditemukan", 404));
    renderPage();
    const user = await selectEventAndDay();

    await user.type(screen.getByLabelText("Kode"), "ticket-missing");
    await user.click(screen.getByRole("button", { name: "Cari Peserta" }));

    expect(
      await screen.findByRole("heading", { name: "Pencarian peserta gagal" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Tiket tidak ditemukan");
    expect(screen.getByRole("alert")).toHaveTextContent("Tiket");
    expect(screen.queryByText("ID Anggota tidak ditemukan")).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Tiket tidak ditemukan");
  });

  it("re-arms the camera and focuses manual lookup after an expected failure", async () => {
    mockEventQueries();
    vi.spyOn(apiClient, "post").mockRejectedValue(
      new ApiError("Anggota tidak ditemukan", 404, undefined, undefined, "MEMBER_NOT_FOUND"),
    );
    renderPage();
    const user = await selectEventAndDay();

    await user.click(screen.getByRole("combobox", { name: "Jenis identifier" }));
    await user.click(await screen.findByRole("option", { name: "Kartu Anggota" }));
    await user.type(screen.getByLabelText("Kode"), "001234");
    await user.click(screen.getByRole("button", { name: "Cari Peserta" }));
    await screen.findByRole("heading", { name: "ID Anggota tidak ditemukan" });

    expect(screen.getByTestId("camera-scanner")).toHaveAttribute("data-rearm-key", "0");
    await user.click(screen.getByRole("button", { name: "Coba Scan Lagi" }));
    expect(screen.getByTestId("camera-scanner")).toHaveAttribute("data-rearm-key", "1");
    expect(
      screen.queryByRole("heading", { name: "ID Anggota tidak ditemukan" }),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Kode"), "001234");
    await user.click(screen.getByRole("button", { name: "Cari Peserta" }));
    await screen.findByRole("heading", { name: "ID Anggota tidak ditemukan" });
    await user.click(screen.getByRole("button", { name: "Cari Manual" }));

    expect(screen.getByLabelText("Kode")).toHaveValue("001234");
    expect(screen.getByLabelText("Kode")).toHaveFocus();
  });

  it("renders scanned identifiers as text and toasts unexpected server failures", async () => {
    mockEventQueries();
    vi.spyOn(apiClient, "post").mockRejectedValue(new ApiError("Internal error", 503));
    renderPage();
    const user = await selectEventAndDay();
    const unsafeIdentifier = "<img src=x onerror=alert(1)>";

    await user.type(screen.getByLabelText("Kode"), unsafeIdentifier);
    await user.click(screen.getByRole("button", { name: "Cari Peserta" }));

    expect(
      await screen.findByRole("heading", { name: "Server sedang bermasalah" }),
    ).toBeInTheDocument();
    expect(screen.getByText(unsafeIdentifier)).toBeInTheDocument();
    expect(document.querySelector("img[src='x']")).toBeNull();
    expect(toast.error).toHaveBeenCalledWith("Coba lagi beberapa saat.");
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
