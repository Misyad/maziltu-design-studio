import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeMenu } from "@/components/shared/theme-toggle";

const { setTheme } = vi.hoisted(() => ({ setTheme: vi.fn() }));

vi.mock("@/providers/theme-provider", () => ({
  useTheme: () => ({
    theme: "system",
    resolvedTheme: "light",
    setTheme,
  }),
}));

describe("ThemeMenu", () => {
  beforeEach(() => {
    setTheme.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("menampilkan pilihan terang, gelap, dan sistem", async () => {
    const user = userEvent.setup();
    render(<ThemeMenu />);

    await user.click(screen.getByRole("button", { name: "Pilih tema" }));

    expect(screen.getByRole("menuitemradio", { name: "Terang" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Gelap" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Ikuti sistem" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("meneruskan pilihan tema ke provider", async () => {
    const user = userEvent.setup();
    render(<ThemeMenu />);

    await user.click(screen.getByRole("button", { name: "Pilih tema" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Gelap" }));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});
