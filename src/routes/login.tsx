import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginForm } from "@/features/auth/login-form";
import { getStoredToken } from "@/services/api-client";
import { ORG } from "@/constants/content";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ location }) => {
    if (getStoredToken()) {
      throw redirect({ to: "/dashboard", replace: true, from: location.href });
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
          <span className="font-display text-lg font-semibold">Sign in</span>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">
            Use your member number and password.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
