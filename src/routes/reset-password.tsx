import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strongPasswordSchema } from "@/lib/password";
import { ApiError } from "@/services/api-client";
import { resetPassword } from "@/services/mzt-api";

const searchSchema = z.object({
  token: z.string().catch(""),
  email: z.string().catch(""),
});

const formSchema = z
  .object({
    email: z.string().email("Email tidak valid"),
    password: strongPasswordSchema,
    password_confirmation: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ["password_confirmation"],
    message: "Konfirmasi password tidak sama",
  });

type Values = z.infer<typeof formSchema>;

export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const search = Route.useSearch();
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: search.email, password: "", password_confirmation: "" },
  });

  async function submit(values: Values) {
    setServerError(null);
    if (!search.token) {
      setServerError("Tautan reset password tidak valid atau tidak lengkap.");
      return;
    }
    try {
      await resetPassword({ token: search.token, ...values });
      setSuccess(true);
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : "Password belum dapat diubah. Coba lagi.",
      );
    }
  }

  return (
    <section className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{success ? "Password berhasil diubah" : "Atur ulang password"}</CardTitle>
          <CardDescription>
            {success
              ? "Gunakan password baru untuk masuk ke akun anggota."
              : "Buat password minimal 12 karakter dengan huruf besar, huruf kecil, angka, dan simbol."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="mx-auto size-12 text-primary" aria-hidden />
              <Button asChild className="w-full rounded-full">
                <Link to="/login">Masuk sekarang</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(submit)} className="space-y-5">
              {serverError ? (
                <p role="alert" className="text-sm text-destructive">
                  {serverError}
                </p>
              ) : null}
              <div>
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  className="mt-2"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="reset-password">Password baru</Label>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  className="mt-2"
                  aria-invalid={Boolean(errors.password)}
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="reset-confirmation">Konfirmasi password baru</Label>
                <Input
                  id="reset-confirmation"
                  type="password"
                  autoComplete="new-password"
                  className="mt-2"
                  aria-invalid={Boolean(errors.password_confirmation)}
                  {...register("password_confirmation")}
                />
                {errors.password_confirmation ? (
                  <p className="mt-1.5 text-xs text-destructive">
                    {errors.password_confirmation.message}
                  </p>
                ) : null}
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <KeyRound aria-hidden />
                )}
                Simpan password baru
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
