import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NAV_LINKS } from "@/constants/content";

describe("portal KTA status placement and public navigation", () => {
  it("places the physical KTA status after the greeting and before digital card content", () => {
    const source = readFileSync("src/routes/portal/index.tsx", "utf8");
    const greeting = source.indexOf("Selamat datang di");
    const physicalStatus = source.indexOf("<MyKtaPrintStatus />");
    const digitalCard = source.indexOf("ID Card Digital");

    expect(greeting).toBeGreaterThan(-1);
    expect(physicalStatus).toBeGreaterThan(greeting);
    expect(digitalCard).toBeGreaterThan(physicalStatus);
  });

  it("removes the public KTA status item while preserving the route", () => {
    const routeSource = readFileSync("src/routes/cek-kta.tsx", "utf8");

    expect(NAV_LINKS).not.toContainEqual({ label: "Cek Status KTA", to: "/cek-kta" });
    expect(NAV_LINKS.map((link) => String(link.to))).not.toContain("/cek-kta");
    expect(routeSource).toContain('createFileRoute("/cek-kta")');
  });
});
