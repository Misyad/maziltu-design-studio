import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/features/auth/login-form";
import { LoginPage } from "@/routes/login";
import { PortalAccountSetup } from "@/routes/portal/aktivasi-akun";
import { ApiError } from "@/services/api-client";
import {
  completeAccountSetup,
  fetchCurrentUser,
  login,
  setupAccountEmail,
  verifyAccountEmail,
} from "@/services/mzt-api";

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

vi.mock("@/services/mzt-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/mzt-api")>();

  return {
    ...actual,
    completeAccountSetup: vi.fn(),
    fetchCurrentUser: vi.fn(),
    login: vi.fn(),
    setupAccountEmail: vi.fn(),
    verifyAccountEmail: vi.fn(),
  };
});

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

describe("legacy account setup", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("requires and submits the current password when setup is completed", async () => {
    const user = userEvent.setup();
    vi.mocked(setupAccountEmail).mockResolvedValue({ success: true });
    vi.mocked(verifyAccountEmail).mockResolvedValue({ success: true });
    vi.mocked(completeAccountSetup).mockResolvedValue({ success: true });
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: 1,
      id_anggota: "0000000001",
      name: "Anggota",
      email: "anggota@example.test",
      roles: ["anggota"],
      foto: null,
      account_setup_required: false,
    });
    renderWithQueryClient(<PortalAccountSetup />);

    await user.type(screen.getByLabelText("Email aktif"), "anggota@example.test");
    await user.click(screen.getByRole("button", { name: "Kirim kode verifikasi" }));
    expect(await screen.findByLabelText("Kode verifikasi")).toBeVisible();

    await user.type(screen.getByLabelText("Kode verifikasi"), "123456");
    await user.click(screen.getByRole("button", { name: "Verifikasi email" }));
    expect(await screen.findByLabelText("Password saat ini")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );

    await user.type(screen.getByLabelText("Password saat ini"), "CurrentPassword1!");
    await user.type(screen.getByLabelText("Password baru"), "NewStrongPassword2!");
    await user.type(screen.getByLabelText("Konfirmasi password baru"), "NewStrongPassword2!");
    await user.click(screen.getByRole("button", { name: "Selesaikan aktivasi" }));

    await waitFor(() =>
      expect(vi.mocked(completeAccountSetup).mock.calls[0]?.[0]).toEqual({
        current_password: "CurrentPassword1!",
        password: "NewStrongPassword2!",
        password_confirmation: "NewStrongPassword2!",
      }),
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/portal", replace: true }));
  });

  it("shows an incorrect current password error on its field", async () => {
    const user = userEvent.setup();
    vi.mocked(setupAccountEmail).mockResolvedValue({ success: true });
    vi.mocked(verifyAccountEmail).mockResolvedValue({ success: true });
    vi.mocked(completeAccountSetup).mockRejectedValue(
      new ApiError("Data tidak valid.", 422, {
        current_password: ["Password saat ini tidak sesuai."],
      }),
    );
    renderWithQueryClient(<PortalAccountSetup />);

    await user.type(screen.getByLabelText("Email aktif"), "anggota@example.test");
    await user.click(screen.getByRole("button", { name: "Kirim kode verifikasi" }));
    await user.type(await screen.findByLabelText("Kode verifikasi"), "123456");
    await user.click(screen.getByRole("button", { name: "Verifikasi email" }));
    await user.type(await screen.findByLabelText("Password saat ini"), "WrongPassword1!");
    await user.type(screen.getByLabelText("Password baru"), "NewStrongPassword2!");
    await user.type(screen.getByLabelText("Konfirmasi password baru"), "NewStrongPassword2!");
    await user.click(screen.getByRole("button", { name: "Selesaikan aktivasi" }));

    expect(await screen.findByText("Password saat ini tidak sesuai.")).toBeVisible();
    expect(screen.getByLabelText("Password saat ini")).toHaveAttribute("aria-invalid", "true");
  });
});
