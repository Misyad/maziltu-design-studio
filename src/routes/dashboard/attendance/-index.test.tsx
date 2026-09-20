import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttendancePage } from "@/routes/dashboard/attendance";
import { apiClient } from "@/services/api-client";

const event = {
  id: 1,
  judul_event: "Multaqo",
  slug: "multaqo",
  lokasi: "Malang",
  harga: 0,
  deskripsi: "",
  banner: null,
  tanggal_mulai: "2026-09-20",
  tanggal_selesai: "2026-09-20",
  is_active: 1,
};

const day = {
  id: 10,
  id_event: 1,
  tanggal: "2026-09-20",
  jam_mulai: "08:00",
  jam_selesai: "12:00",
  set_jam: "dijam",
};

function renderPage(role: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const get = vi.spyOn(apiClient, "get").mockImplementation(async (url) => {
    if (url === "/user") {
      return {
        data: {
          success: true,
          user: {
            id: 7,
            id_anggota: "STAFF-7",
            name: "Petugas",
            email: null,
            roles: [role],
            foto: null,
          },
        },
      } as never;
    }
    if (url === "/events") {
      return { data: { success: true, data: [event] } } as never;
    }
    if (url === "/events/1/tanggal") {
      return { data: { success: true, data: [day] } } as never;
    }
    if (url === "/attendance/1/10") {
      return { data: { success: true, data: [] } } as never;
    }
    throw new Error(`Unexpected request: ${String(url)}`);
  });

  render(
    <QueryClientProvider client={client}>
      <AttendancePage />
    </QueryClientProvider>,
  );

  return get;
}

async function selectEventAndDay() {
  const user = userEvent.setup();
  await user.click((await screen.findAllByRole("combobox")).at(0)!);
  await user.click(await screen.findByRole("option", { name: "Multaqo" }));
  await user.click(screen.getAllByRole("combobox").at(1)!);
  await user.click(await screen.findByRole("option", { name: /2026-09-20/ }));
}

describe("AttendancePage permissions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  afterEach(() => cleanup());

  it("lets staff read attendance without exposing the scan action", async () => {
    const get = renderPage("dashboard");

    await selectEventAndDay();

    await waitFor(() => expect(get).toHaveBeenCalledWith("/attendance/1/10"));
    expect(screen.queryByRole("button", { name: "Record" })).not.toBeInTheDocument();
  });

  it("lets a prisensi operator scan without calling the staff-only read endpoint", async () => {
    const get = renderPage("prisensi");

    await selectEventAndDay();

    expect(await screen.findByRole("button", { name: "Record" })).toBeInTheDocument();
    expect(
      screen.getByText("Attendance records are available to staff roles."),
    ).toBeInTheDocument();
    expect(get).not.toHaveBeenCalledWith("/attendance/1/10");
  });
});
