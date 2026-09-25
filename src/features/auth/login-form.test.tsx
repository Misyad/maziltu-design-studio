import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/features/auth/login-form";
import { LoginPage } from "@/routes/login";
import { login } from "@/services/mzt-api";

const navigate = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();

  return {
    ...actual,
    Link: ({ children, to, ...props }: React.ComponentProps<"a"> & { to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useRouter: () => ({ navigate }),
  };
});

vi.mock("@/services/mzt-api", () => ({
  login: vi.fn(),
}));

function renderWithQueryClient(component: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(<QueryClientProvider client={client}>{component}</QueryClientProvider>);
}

describe("member login", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_MEMBER_ACCOUNT_ACTIVATION_ENABLED", "true");
    vi.stubEnv("VITE_MEMBER_APPLICATIONS_ENABLED", "true");
    vi.mocked(login).mockResolvedValue({
      success: true,
      user: {
        id: 1,
        id_anggota: "0000000001",
        name: "Anggota",
        email: "anggota@example.test",
        roles: ["anggota"],
        foto: null,
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("shows the requested member login hierarchy without an applicant login link", () => {
    renderWithQueryClient(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Masuk ke Maziltu Tholiban" })).toBeVisible();
    expect(screen.getByText("Gunakan email atau nomor anggota Anda.")).toBeVisible();
    expect(screen.getByLabelText("Email atau Nomor Anggota")).toHaveAttribute(
      "placeholder",
      "email@contoh.com atau MZT000001",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("link", { name: "Lupa password?" })).toHaveAttribute(
      "href",
      "/lupa-password",
    );
    expect(screen.getByText("Belum punya akun?")).toBeVisible();
    expect(screen.getByRole("link", { name: "Daftar sebagai anggota" })).toHaveAttribute(
      "href",
      "/daftar-anggota",
    );
    expect(screen.getByRole("link", { name: "Cari nomor anggota" })).toHaveAttribute(
      "href",
      "/cek-kta",
    );
    expect(screen.getByRole("link", { name: "Aktivasi akun" })).toHaveAttribute(
      "href",
      "/aktivasi-akun",
    );
    expect(screen.queryByText("Masuk sebagai pendaftar")).not.toBeInTheDocument();
  });

  it("submits a trimmed identifier without changing leading zeroes", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<LoginForm />);

    await user.type(screen.getByLabelText("Email atau Nomor Anggota"), "  0000000001  ");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Masuk" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ identifier: "0000000001", password: "secret" });
    });
    expect(navigate).toHaveBeenCalled();
  });
});
