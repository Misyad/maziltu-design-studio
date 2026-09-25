import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Loader2, Lock, LogIn, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/services/api-client";
import { login } from "@/services/mzt-api";
import { queryKeys } from "@/services/queries";
import { homePathFor } from "@/lib/roles";
import type { LoginRequest } from "@/types/api";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email atau nomor anggota wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    try {
      const payload: LoginRequest = { identifier: values.identifier, password: values.password };
      const result = await login(payload);
      queryClient.setQueryData(queryKeys.currentUser, result.user);
      await router.navigate({ to: homePathFor(result.user) });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Login gagal. Silakan coba lagi.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {serverError}
        </p>
      ) : null}

      <div>
        <Label htmlFor="identifier">Email atau Nomor Anggota</Label>
        <div className="relative mt-2">
          <UserRound
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="identifier"
            autoComplete="username"
            className="pl-10"
            placeholder="email@contoh.com atau MZT000001"
            aria-invalid={!!errors.identifier}
            {...register("identifier")}
          />
        </div>
        {errors.identifier ? (
          <p className="mt-1.5 text-xs text-destructive">{errors.identifier.message}</p>
        ) : null}
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="password">Password</Label>
          <Link to="/lupa-password" className="text-xs font-medium text-primary hover:underline">
            Lupa password?
          </Link>
        </div>
        <div className="relative mt-2">
          <Lock
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="pl-10"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </div>
        {errors.password ? (
          <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : <LogIn aria-hidden />}
        {isSubmitting ? "Masuk…" : "Masuk"}
      </Button>
    </form>
  );
}
