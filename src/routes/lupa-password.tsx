import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/services/api-client";
import { requestPasswordReset } from "@/services/mzt-api";

const schema = z.object({ email: z.string().email("Email tidak valid") });
type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/lupa-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function submit(values: Values) {
    setServerError(null);
    try {
      await requestPasswordReset(values);
      setSent(true);
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : "Permintaan belum dapat diproses. Coba lagi.",
      );
    }
  }

  return (
    <section className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{sent ? "Periksa email Anda" : "Lupa password"}</CardTitle>
          <CardDescription>
            {sent
              ? "Jika email terdaftar, tautan reset password telah dikirim."
              : "Masukkan email akun anggota untuk menerima tautan reset password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="mx-auto size-12 text-primary" aria-hidden />
              <Button asChild variant="outline" className="w-full rounded-full">
                <Link to="/login">Kembali ke login</Link>
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
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
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
              <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Mail aria-hidden />
                )}
                Kirim tautan reset
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">Kembali ke login</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
