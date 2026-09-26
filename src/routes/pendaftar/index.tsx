import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApplicationForm } from "@/features/applications/application-form";
import { ApiError } from "@/services/api-client";
import {
  resendApplicantEmail,
  updateApplicantApplication,
  verifyApplicantEmail,
} from "@/services/mzt-api";
import { applicantMeQuery, queryKeys } from "@/services/queries";
import type { MemberApplicationStatus } from "@/types/api";

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Kode verifikasi harus terdiri dari 6 digit"),
});

type CodeValues = z.infer<typeof codeSchema>;

const STATUS: Record<MemberApplicationStatus, { label: string; description: string }> = {
  pending_email: {
    label: "Menunggu verifikasi email",
    description: "Verifikasi email agar pendaftaran dapat masuk ke antrean peninjauan.",
  },
  submitted: {
    label: "Terkirim",
    description: "Pendaftaran sudah diterima dan menunggu pemeriksaan admin.",
  },
  under_review: {
    label: "Sedang ditinjau",
    description: "Admin sedang memeriksa data pendaftaran Anda.",
  },
  approved: {
    label: "Disetujui",
    description: "Pendaftaran disetujui dan nomor anggota telah diterbitkan.",
  },
  rejected: {
    label: "Ditolak",
    description: "Pendaftaran belum dapat disetujui. Perbarui data untuk mengirim ulang.",
  },
};

export const Route = createFileRoute("/pendaftar/")({
  component: ApplicantPortalPage,
});

export function ApplicantPortalPage() {
  const queryClient = useQueryClient();
  const application = useQuery(applicantMeQuery());
  const status = application.data ? STATUS[application.data.status] : null;
  const canEdit =
    application.data?.status === "pending_email" ||
    application.data?.status === "submitted" ||
    application.data?.status === "rejected";
  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const resend = useMutation({
    mutationFn: resendApplicantEmail,
    onSuccess: (response) => toast.success(response.message ?? "Email verifikasi dikirim ulang"),
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Email belum dapat dikirim"),
  });

  const verify = useMutation({
    mutationFn: verifyApplicantEmail,
    onSuccess: async (response) => {
      if (response.data?.application) {
        queryClient.setQueryData(queryKeys.applicantMe, response.data.application);
      } else {
        await queryClient.invalidateQueries({ queryKey: queryKeys.applicantMe });
      }
      toast.success(response.message ?? "Email berhasil diverifikasi");
      codeForm.reset();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Kode verifikasi tidak valid"),
  });

  const update = useMutation({
    mutationFn: updateApplicantApplication,
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.applicantMe, updated);
      toast.success("Data pendaftaran berhasil diperbarui");
    },
  });

  if (application.isPending) {
    return <div className="mx-auto h-64 max-w-4xl animate-pulse rounded-2xl bg-muted" />;
  }

  if (application.isError || !application.data || !status) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="py-10 text-center text-sm text-destructive">
          Data pendaftaran tidak dapat dimuat.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Portal pendaftar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pantau status dan kelola data pendaftaran Anda.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{application.data.name}</CardTitle>
              <CardDescription>{application.data.email}</CardDescription>
              <p className="mt-3 text-xs text-muted-foreground">Nomor pendaftaran</p>
              <p className="mt-1 break-all select-all font-mono text-base font-semibold text-foreground">
                {application.data.application_number ?? "Belum tersedia"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Simpan nomor ini untuk masuk kembali ke portal pendaftar.
              </p>
            </div>
            <Badge variant={application.data.status === "approved" ? "default" : "secondary"}>
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 rounded-xl bg-muted/50 p-4">
            {application.data.status === "approved" ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            ) : (
              <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            )}
            <div className="text-sm">
              <p>{status.description}</p>
              {application.data.status === "rejected" && application.data.rejection_reason ? (
                <p className="mt-2 text-muted-foreground">
                  Alasan: {application.data.rejection_reason}
                </p>
              ) : null}
            </div>
          </div>

          {application.data.status === "approved" ? (
            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
              <p className="text-xs text-muted-foreground">Nomor anggota baru</p>
              <p className="mt-1 font-mono text-2xl font-bold">
                {application.data.id_anggota ?? "Sedang diterbitkan"}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Tautan aman untuk membuat password akun dikirim ke email terverifikasi Anda. Setelah
                membuat password, masuk menggunakan nomor anggota di atas.
              </p>
              <Button asChild className="mt-4 rounded-full">
                <Link to="/login">Masuk setelah membuat password</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {application.data.status === "pending_email" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="size-5 text-primary" aria-hidden /> Verifikasi email
            </CardTitle>
            <CardDescription>Masukkan kode yang dikirim ke email pendaftaran.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={codeForm.handleSubmit((values) => verify.mutate(values))}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <Label htmlFor="applicant-code">Kode verifikasi</Label>
                <Input
                  id="applicant-code"
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
              <Button type="submit" disabled={verify.isPending}>
                {verify.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Verifikasi
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={resend.isPending}
                onClick={() => resend.mutate()}
              >
                <RefreshCw className={resend.isPending ? "animate-spin" : ""} aria-hidden />
                Kirim ulang
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit pendaftaran</CardTitle>
            <CardDescription>
              Perbarui data milik Anda. Perubahan dapat memerlukan pemeriksaan ulang.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApplicationForm
              application={application.data}
              submitLabel="Simpan perubahan"
              pending={update.isPending}
              onSubmit={(form) => update.mutateAsync(form).then(() => undefined)}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
