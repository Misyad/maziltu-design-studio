import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NAV_LINKS } from "@/constants/content";
import { MemberApplicationPage } from "@/routes/daftar-anggota";
import { GalleryPage } from "@/routes/gallery";

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

  it("removes Gallery entry points and shows an honest direct-route state", () => {
    const footerSource = readFileSync("src/components/layout/site-footer.tsx", "utf8");

    render(<GalleryPage />);

    expect(NAV_LINKS.map((link) => String(link.to))).not.toContain("/gallery");
    expect(footerSource).not.toContain('to: "/gallery"');
    expect(screen.getByRole("heading", { name: "Galeri belum tersedia" })).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
