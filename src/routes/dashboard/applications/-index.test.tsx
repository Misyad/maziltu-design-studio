import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationsPage } from "@/routes/dashboard/applications";
import { apiClient } from "@/services/api-client";
import type { MemberApplication } from "@/types/api";

const application: MemberApplication = {
  uuid: "application-1",
  name: "Anggota Baru",
  email: "anggota@example.test",
  no_hp: "081234567890",
  alamat: "Jalan Merdeka 1",
  pekerjaan: "Guru",
  niqobah: "Malang",
  tempat_lahir: "Malang",
  tanggal_lahir: "2000-01-02",
  tahun_masuk: "2015",
  tahun_keluar: "2020",
  foto: null,
  status: "under_review",
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <ApplicationsPage />
    </QueryClientProvider>,
  );
}

describe("ApplicationsPage", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => cleanup());

  it("shows possible duplicate identity fields before review actions", async () => {
    const duplicate = {
      id_users: 123,
      id_anggota: "MZT000123",
      name: "Kandidat Lama",
      tanggal_lahir: "1990-03-04",
      no_hp: "081298765432",
    };
    const get = vi.spyOn(apiClient, "get").mockImplementation(async (url) => {
      if (url === "/member-applications") {
        return {
          data: { success: true, data: { applications: [application] } },
        } as never;
      }
      if (url === "/member-applications/application-1") {
        return {
          data: {
            success: true,
            data: { application: { ...application, possible_duplicates: [duplicate] } },
          },
        } as never;
      }
      throw new Error(`Unexpected request: ${String(url)}`);
    });
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("button", { name: /Anggota Baru/ }));

    expect(await screen.findByText("Kemungkinan data anggota ganda")).toBeInTheDocument();
    expect(screen.getByText(duplicate.name)).toBeInTheDocument();
    expect(screen.getByText(duplicate.tanggal_lahir)).toBeInTheDocument();
    expect(screen.getByText(duplicate.id_anggota)).toBeInTheDocument();
    expect(screen.getByText(duplicate.no_hp)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Setujui pendaftaran" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tolak pendaftaran" })).toBeInTheDocument();
    await waitFor(() => expect(get).toHaveBeenCalledWith("/member-applications/application-1"));
  });
});
