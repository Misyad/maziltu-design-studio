import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isRedirect } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NAV_LINKS } from "@/constants/content";
import { requireApplicantPortalEnabled } from "@/lib/auth";
import { ApplicationSubmitted, MemberApplicationPage } from "@/routes/daftar-anggota";
import { GalleryPage } from "@/routes/gallery";
import { ApplicantPortalPage } from "@/routes/pendaftar";
import { queryKeys } from "@/services/queries";
import type { MemberApplication } from "@/types/api";

const application: MemberApplication = {
  uuid: "application-1",
  application_number: "APP-1234567890ABCDEF1234567890ABCDEF",
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

describe("public feature availability", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("blocks direct member registration access when applications are disabled", () => {
    vi.stubEnv("VITE_MEMBER_APPLICATIONS_ENABLED", "false");

    render(<MemberApplicationPage />);

    expect(
      screen.getByRole("heading", { name: "Pendaftaran anggota belum tersedia" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Hubungi pengurus" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.queryByText("Formulir pendaftaran")).not.toBeInTheDocument();
  });

  it("redirects every applicant portal route when applications are not exactly enabled", () => {
    for (const value of ["false", "TRUE", "1"]) {
      vi.stubEnv("VITE_MEMBER_APPLICATIONS_ENABLED", value);
      for (const pathname of ["/pendaftar", "/pendaftar/login"]) {
        try {
          requireApplicantPortalEnabled();
          expect.unreachable(`expected ${pathname} redirect`);
        } catch (error) {
          expect(isRedirect(error)).toBe(true);
          expect((error as Response & { options: { to: string } }).options.to).toBe(
            "/daftar-anggota",
          );
        }
      }
    }
  });

  it("allows applicant login only when applications are exactly enabled", () => {
    vi.stubEnv("VITE_MEMBER_APPLICATIONS_ENABLED", "true");

    expect(requireApplicantPortalEnabled()).toBeUndefined();
  });

  it("shows the application number after submission and in the applicant portal", async () => {
    render(<ApplicationSubmitted application={application} />);

    expect(screen.getByText(application.application_number!)).toHaveClass(
      "break-all",
      "select-all",
    );
    cleanup();

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(queryKeys.applicantMe, application);
    render(
      <QueryClientProvider client={client}>
        <ApplicantPortalPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(application.application_number!)).toHaveClass(
      "break-all",
      "select-all",
    );
    expect(screen.getByText(/Simpan nomor ini untuk masuk kembali/)).toBeVisible();
  });

  it("removes Gallery entry points and shows an honest direct-route state", () => {
    const footerSource = readFileSync("src/components/layout/site-footer.tsx", "utf8");

    render(<GalleryPage />);

    expect(NAV_LINKS.map((link) => String(link.to))).not.toContain("/gallery");
    expect(footerSource).not.toContain('to: "/gallery"');
    expect(screen.getByRole("heading", { name: "Galeri belum tersedia" })).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
