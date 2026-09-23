import { createFileRoute, Link } from "@tanstack/react-router";
import { LoginForm } from "@/features/auth/login-form";
import { currentUserQuery } from "@/services/queries";
import {
  ApiError,
  memberAccountActivationEnabled,
  memberApplicationsEnabled,
} from "@/services/api-client";
import { homePathFor } from "@/lib/roles";
import { ORG } from "@/constants/content";

export const Route = createFileRoute("/login")({
  beforeLoad: async ({ context, location }) => {
    // Only probe the session on the client — SSR has no cookie jar and would
    // otherwise bounce every visitor back to /login.
    if (typeof window === "undefined") return;
    try {
      const user = await context.queryClient.ensureQueryData(currentUserQuery());
      const { redirect } = await import("@tanstack/react-router");
      const options = { to: homePathFor(user), replace: true } as Parameters<typeof redirect>[0];
      if (location.href) (options as { from?: string }).from = location.href;
      throw redirect(options);
    } catch (error) {
      if (error instanceof ApiError) return; // 401/403 -> stay on the login page
      throw error;
    }
  },
  head: () => ({
    meta: [
      { title: "Sign in — MZT Apps | Maziltu Tholiban" },
      { name: "description", content: "Sign in to the Maziltu Tholiban member platform." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-border shadow-elevated lg:grid-cols-2">
        <div className="gradient-emerald relative hidden flex-col justify-between p-10 lg:flex">
          <div
            className="absolute inset-0 bg-[radial-gradient(70%_90%_at_20%_10%,oklch(1_0_0/0.12),transparent)]"
            aria-hidden
          />
          <div className="relative">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-white/15 font-display text-sm font-bold text-white backdrop-blur-sm">
              MZT
            </span>
            <h1 className="mt-8 font-display text-3xl leading-tight font-bold text-white">
              Welcome back to {ORG.name}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/85">
              Manage members, events, attendance, news and ID cards from one place.
            </p>
          </div>
          <p className="relative text-xs text-white/70">{ORG.name} · Members Platform</p>
        </div>

        <div className="flex flex-col justify-center bg-card p-8 sm:p-12">
          <span className="font-display text-lg font-semibold">Masuk</span>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">
            Gunakan nomor anggota dan password Anda.
          </p>
          <LoginForm />
          <div className="mt-6 grid gap-2 border-t pt-5 text-center text-sm">
            <Link to="/lupa-password" className="font-medium text-primary hover:underline">
              Lupa password?
            </Link>
            {memberAccountActivationEnabled() ? (
              <Link to="/aktivasi-akun" className="text-muted-foreground hover:text-foreground">
                Aktivasi akun anggota lama
              </Link>
            ) : null}
            <Link to="/cek-kta" className="text-muted-foreground hover:text-foreground">
              Cari nomor anggota
            </Link>
            {memberApplicationsEnabled() ? (
              <>
                <Link to="/daftar-anggota" className="text-muted-foreground hover:text-foreground">
                  Daftar sebagai anggota baru
                </Link>
                <Link to="/pendaftar/login" className="text-muted-foreground hover:text-foreground">
                  Masuk sebagai pendaftar
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
