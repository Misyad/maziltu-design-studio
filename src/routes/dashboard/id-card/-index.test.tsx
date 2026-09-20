import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdCardPage } from "@/routes/dashboard/id-card";
import { apiClient } from "@/services/api-client";

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

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <IdCardPage />
    </QueryClientProvider>,
  );
}

describe("IdCardPage", () => {
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

  it("loads the minimal KTA directory and prints the selected card", async () => {
    const get = vi.spyOn(apiClient, "get").mockImplementation(async (url) => {
      if (url === "/kta/cards") {
        return {
          data: {
            success: true,
            data: [{ id_users: 9, id_anggota: "0174011119", nama: "Achmad Hasanudin" }],
          },
        } as never;
      }
      if (url === "/kta/cards/9") {
        return { data: { success: true, data: card } } as never;
      }
      throw new Error(`Unexpected request: ${String(url)}`);
    });
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: /Achmad Hasanudin/ }));

    const preview = await screen.findByTestId("physical-kta-card");
    expect(within(preview).getByText("Achmad Hasanudin")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/kta/cards");
    expect(get).toHaveBeenCalledWith("/kta/cards/9");

    await user.click(screen.getByRole("button", { name: "Cetak KTA" }));
    expect(print).toHaveBeenCalledOnce();
  });
});
