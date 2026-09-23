import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CheckCircle2, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strongPasswordSchema } from "@/lib/password";
import { ApiError } from "@/services/api-client";
import { completeAccountSetup, setupAccountEmail, verifyAccountEmail } from "@/services/mzt-api";
import { currentUserQuery, queryKeys } from "@/services/queries";

const emailSchema = z.object({ email: z.string().email("Email tidak valid") });
const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Kode verifikasi harus terdiri dari 6 digit"),
});
const passwordSchema = z
  .object({
    password: strongPasswordSchema,
    password_confirmation: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "Konfirmasi password tidak cocok",
  });
type EmailValues = z.infer<typeof emailSchema>;
type CodeValues = z.infer<typeof codeSchema>;
type SetupPasswordValues = z.infer<typeof passwordSchema>;

export const Route = createFileRoute("/portal/aktivasi-akun")({
  beforeLoad: async ({ location }) => {
    const { redirect } = await import("@tanstack/react-router");
    throw redirect({ to: "/account/setup", replace: true, from: location.href } as never);
  },
  component: PortalAccountSetup,
});

export function PortalAccountSetup() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"email" | "verify" | "password">("email");
  const [serverError, setServerError] = useState<string | null>(null);
  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });
  const passwordForm = useForm<SetupPasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", password_confirmation: "" },
  });

  function handleError(error: unknown) {
    setServerError(error instanceof ApiError ? error.message : "Permintaan belum dapat diproses.");
  }

  const emailMutation = useMutation({
    mutationFn: setupAccountEmail,
    onSuccess: (response) => {
      if (!response.success) throw new Error();
      setServerError(null);
      setStep("verify");
      toast.success(response.message ?? "Kode verifikasi telah dikirim");
    },
    onError: handleError,
  });

  const verifyMutation = useMutation({
    mutationFn: verifyAccountEmail,
    onSuccess: (response) => {
      if (!response.success) throw new Error();
      setServerError(null);
      setStep("password");
      toast.success(response.message ?? "Email berhasil diverifikasi");
    },
    onError: handleError,
  });

  const completeMutation = useMutation({
    mutationFn: completeAccountSetup,
    onSuccess: async (response) => {
      if (!response.success) throw new Error();
      await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      const user = await queryClient.fetchQuery(currentUserQuery());
      if (user.account_setup_required) {
        setServerError("Status aktivasi belum diperbarui. Silakan coba lagi.");
        return;
      }
      toast.success("Aktivasi akun selesai");
      await router.navigate({ to: "/portal", replace: true });
    },
    onError: handleError,
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Selesaikan aktivasi akun</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verifikasi email terlebih dahulu, lalu ganti password sementara Anda.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {[
          ["email", "1. Email"],
          ["verify", "2. Verifikasi"],
          ["password", "3. Password"],
        ].map(([key, label]) => (
          <div
            key={key}
            className={`rounded-full border px-2 py-2 ${step === key ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
          >
            {label}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {step === "email" ? (
              <Mail className="size-5 text-primary" aria-hidden />
            ) : step === "verify" ? (
              <ShieldCheck className="size-5 text-primary" aria-hidden />
            ) : (
              <KeyRound className="size-5 text-primary" aria-hidden />
            )}
            {step === "email"
              ? "Tambahkan email"
              : step === "verify"
                ? "Verifikasi email"
                : "Buat password baru"}
          </CardTitle>
          <CardDescription>
            {step === "email"
              ? "Email ini akan digunakan untuk pemulihan akun dan pemberitahuan penting."
              : step === "verify"
                ? "Masukkan kode yang dikirim ke email Anda."
                : "Buat password minimal 12 karakter dengan huruf besar, huruf kecil, angka, dan simbol."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serverError ? (
            <p
              role="alert"
              className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {serverError}
            </p>
          ) : null}

          {step === "email" ? (
            <form
              onSubmit={emailForm.handleSubmit((values) => emailMutation.mutate(values))}
              className="space-y-5"
            >
              <div>
                <Label htmlFor="setup-email">Email aktif</Label>
                <Input
                  id="setup-email"
                  type="email"
                  autoComplete="email"
                  className="mt-2"
                  aria-invalid={Boolean(emailForm.formState.errors.email)}
                  {...emailForm.register("email")}
                />
                {emailForm.formState.errors.email ? (
                  <p className="mt-1.5 text-xs text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <Button
                type="submit"
                className="w-full rounded-full"
                disabled={emailMutation.isPending}
              >
                {emailMutation.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Mail aria-hidden />
                )}
                Kirim kode verifikasi
              </Button>
            </form>
          ) : step === "verify" ? (
            <form
              onSubmit={codeForm.handleSubmit((values) => verifyMutation.mutate(values))}
              className="space-y-5"
            >
              <div>
                <Label htmlFor="setup-code">Kode verifikasi</Label>
                <Input
                  id="setup-code"
                  autoComplete="one-time-code"
                  className="mt-2"
                  aria-invalid={Boolean(codeForm.formState.errors.code)}
                  {...codeForm.register("code")}
                />
                {codeForm.formState.errors.code ? (
                  <p className="mt-1.5 text-xs text-destructive">
                    {codeForm.formState.errors.code.message}
                  </p>
                ) : null}
              </div>
              <Button
                type="submit"
                className="w-full rounded-full"
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <ShieldCheck aria-hidden />
                )}
                Verifikasi email
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep("email")}
              >
                Ganti email
              </Button>
            </form>
          ) : (
            <form
              onSubmit={passwordForm.handleSubmit((values) => completeMutation.mutate(values))}
              className="space-y-5"
            >
              <PasswordField
                id="setup-new-password"
                label="Password baru"
                autoComplete="new-password"
                error={passwordForm.formState.errors.password?.message}
                input={passwordForm.register("password")}
              />
              <PasswordField
                id="setup-password-confirmation"
                label="Konfirmasi password baru"
                autoComplete="new-password"
                error={passwordForm.formState.errors.password_confirmation?.message}
                input={passwordForm.register("password_confirmation")}
              />
              <Button
                type="submit"
                className="w-full rounded-full"
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 aria-hidden />
                )}
                Selesaikan aktivasi
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  error,
  input,
}: {
  id: string;
  label: string;
  autoComplete: string;
  error: string | undefined;
  input: ReturnType<ReturnType<typeof useForm<SetupPasswordValues>>["register"]>;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        className="mt-2"
        aria-invalid={Boolean(error)}
        {...input}
      />
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
