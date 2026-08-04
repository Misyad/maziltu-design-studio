import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
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
import type { LoginRequest } from "@/types/api";

const loginSchema = z.object({
  id_anggota: z.string().min(1, "Member number is required"),
  password: z.string().min(1, "Password is required"),
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
    defaultValues: { id_anggota: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    try {
      const payload: LoginRequest = { id_anggota: values.id_anggota, password: values.password };
      const result = await login(payload);
      queryClient.setQueryData(queryKeys.currentUser, result.user);
      await router.navigate({ to: "/dashboard" });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Login failed. Try again.");
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
        <Label htmlFor="id_anggota">Member number</Label>
        <div className="relative mt-2">
          <UserRound
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="id_anggota"
            autoComplete="username"
            className="pl-10"
            placeholder="e.g. MZT000001"
            aria-invalid={!!errors.id_anggota}
            {...register("id_anggota")}
          />
        </div>
        {errors.id_anggota ? (
          <p className="mt-1.5 text-xs text-destructive">{errors.id_anggota.message}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
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
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
