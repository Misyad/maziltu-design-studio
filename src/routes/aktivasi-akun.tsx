import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Search, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DEFAULT_MEMBER_PASSWORD } from "@/lib/password";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkAccountActivation, verifyAccountActivation } from "@/services/mzt-api";

const checkSchema = z.object({
  name: z.string().trim().min(2, "Nama lengkap wajib diisi"),
  tanggal_lahir: z.string().min(1, "Tanggal lahir wajib diisi"),
});

const verifySchema = z.object({
  tempat_lahir: z.string().trim().min(2, "Tempat lahir wajib diisi"),
  tahun_masuk: z.string().regex(/^\d{4}$/, "Gunakan 4 digit tahun"),
});

type CheckValues = z.infer<typeof checkSchema>;
type VerifyValues = z.infer<typeof verifySchema>;

export const Route = createFileRoute("/aktivasi-akun")({
  head: () => ({
    meta: [
      { title: "Aktivasi Akun Anggota — MZT Apps" },
      {
        name: "description",
        content: "Aktifkan akun anggota lama Maziltu Tholiban secara aman.",
      },
    ],
  }),
  component: AccountActivationPage,
});

function AccountActivationPage() {
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [genericError, setGenericError] = useState<string | null>(null);
  const checkForm = useForm<CheckValues>({
    resolver: zodResolver(checkSchema),
    defaultValues: { name: "", tanggal_lahir: "" },
  });
  const verifyForm = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { tempat_lahir: "", tahun_masuk: "" },
  });

  async function submitCheck(values: CheckValues) {
    setPending(true);
    setGenericError(null);
    try {
      const response = await checkAccountActivation(values);
      if (!response.success || !response.data?.challenge_token) throw new Error();
      setChallengeToken(response.data.challenge_token);
    } catch {
      setGenericError("Data belum dapat diverifikasi. Periksa kembali isian Anda dan coba lagi.");
    } finally {
      setPending(false);
    }
  }

  async function submitVerify(values: VerifyValues) {
    if (!challengeToken) return;
    setPending(true);
    setGenericError(null);
    try {
      const response = await verifyAccountActivation({
        challenge_token: challengeToken,
        ...values,
      });
      if (!response.success || !response.data?.id_anggota) throw new Error();
      setMemberId(response.data.id_anggota);
    } catch {
      setGenericError("Data belum dapat diverifikasi. Periksa kembali isian Anda dan coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="container-page py-16 lg:py-24">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">Anggota lama</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Aktivasi akun anggota</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Cocokkan data keanggotaan Anda untuk memperoleh nomor anggota dan akses awal.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {memberId ? (
                <CheckCircle2 className="size-5 text-primary" aria-hidden />
              ) : challengeToken ? (
                <ShieldCheck className="size-5 text-primary" aria-hidden />
              ) : (
                <Search className="size-5 text-primary" aria-hidden />
              )}
              {memberId ? "Akun ditemukan" : challengeToken ? "Verifikasi data" : "Cari data Anda"}
            </CardTitle>
            <CardDescription>
              {memberId
                ? "Gunakan informasi berikut untuk masuk pertama kali."
                : challengeToken
                  ? "Lengkapi dua data tambahan untuk memastikan kepemilikan akun."
                  : "Masukkan nama lengkap dan tanggal lahir sesuai data anggota."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {genericError ? (
              <p
                role="alert"
                className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {genericError}
              </p>
            ) : null}

            {memberId ? (
              <div className="space-y-5">
                <div className="rounded-2xl border bg-muted/40 p-5 text-center">
                  <p className="text-xs text-muted-foreground">Nomor anggota</p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-wide">{memberId}</p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                  <p>
                    Password sementara:{" "}
                    <strong className="font-mono">{DEFAULT_MEMBER_PASSWORD}</strong>
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    Setelah login, Anda wajib memverifikasi email dan membuat password baru sebelum
                    menggunakan portal.
                  </p>
                </div>
                <Button asChild className="w-full rounded-full">
                  <Link to="/login">Lanjut ke login</Link>
                </Button>
              </div>
            ) : challengeToken ? (
              <form onSubmit={verifyForm.handleSubmit(submitVerify)} className="space-y-5">
                <div>
                  <Label htmlFor="activation-place">Tempat lahir</Label>
                  <Input
                    id="activation-place"
                    className="mt-2"
                    aria-invalid={Boolean(verifyForm.formState.errors.tempat_lahir)}
                    {...verifyForm.register("tempat_lahir")}
                  />
                  {verifyForm.formState.errors.tempat_lahir ? (
                    <p className="mt-1.5 text-xs text-destructive">
                      {verifyForm.formState.errors.tempat_lahir.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="activation-year">Tahun masuk</Label>
                  <Input
                    id="activation-year"
                    inputMode="numeric"
                    placeholder="2015"
                    className="mt-2"
                    aria-invalid={Boolean(verifyForm.formState.errors.tahun_masuk)}
                    {...verifyForm.register("tahun_masuk")}
                  />
                  {verifyForm.formState.errors.tahun_masuk ? (
                    <p className="mt-1.5 text-xs text-destructive">
                      {verifyForm.formState.errors.tahun_masuk.message}
                    </p>
                  ) : null}
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                  {pending ? "Memverifikasi…" : "Verifikasi data"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setChallengeToken(null);
                    setGenericError(null);
                  }}
                >
                  Kembali
                </Button>
              </form>
            ) : (
              <form onSubmit={checkForm.handleSubmit(submitCheck)} className="space-y-5">
                <div>
                  <Label htmlFor="activation-name">Nama lengkap</Label>
                  <Input
                    id="activation-name"
                    className="mt-2"
                    autoComplete="name"
                    aria-invalid={Boolean(checkForm.formState.errors.name)}
                    {...checkForm.register("name")}
                  />
                  {checkForm.formState.errors.name ? (
                    <p className="mt-1.5 text-xs text-destructive">
                      {checkForm.formState.errors.name.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="activation-dob">Tanggal lahir</Label>
                  <Input
                    id="activation-dob"
                    type="date"
                    className="mt-2"
                    aria-invalid={Boolean(checkForm.formState.errors.tanggal_lahir)}
                    {...checkForm.register("tanggal_lahir")}
                  />
                  {checkForm.formState.errors.tanggal_lahir ? (
                    <p className="mt-1.5 text-xs text-destructive">
                      {checkForm.formState.errors.tanggal_lahir.message}
                    </p>
                  ) : null}
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={pending}>
                  {pending ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <Search aria-hidden />
                  )}
                  {pending ? "Memeriksa…" : "Periksa data"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
