import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/services/api-client";
import { applicantLogin, fetchApplicantMe } from "@/services/mzt-api";
import { queryKeys } from "@/services/queries";

const schema = z.object({
  email: z.string().email("Email tidak valid"),
  application_number: z.string().trim().min(1, "Nomor pendaftaran wajib diisi"),
});

type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/pendaftar/login")({
  component: ApplicantLoginPage,
});

function ApplicantLoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", application_number: "" },
  });

  async function submit(values: Values) {
    setServerError(null);
    try {
      const response = await applicantLogin(values);
      const application =
        response.data?.application ??
        response.data?.applicant?.application ??
        response.applicant?.application;
      queryClient.setQueryData(queryKeys.applicantMe, application ?? (await fetchApplicantMe()));
      await router.navigate({ to: "/pendaftar", replace: true });
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : "Email atau password tidak dapat diverifikasi.",
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Masuk portal pendaftar</CardTitle>
          <CardDescription>
            Gunakan email dan nomor pendaftaran yang diterima setelah mengirim formulir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
            {serverError ? (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {serverError}
              </p>
            ) : null}
            <div>
              <Label htmlFor="applicant-email">Email</Label>
              <Input
                id="applicant-email"
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
              <Label htmlFor="applicant-number">Nomor pendaftaran</Label>
              <Input
                id="applicant-number"
                autoComplete="off"
                className="mt-2"
                aria-invalid={Boolean(errors.application_number)}
                {...register("application_number")}
              />
              {errors.application_number ? (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors.application_number.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <LogIn aria-hidden />
              )}
              {isSubmitting ? "Masuk…" : "Masuk"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Belum mengajukan?{" "}
            <Link to="/daftar-anggota" className="font-medium text-primary hover:underline">
              Daftar anggota
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
