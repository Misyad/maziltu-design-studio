import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { ApplicationForm } from "@/features/applications/application-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { memberApplicationsEnabled } from "@/services/api-client";
import { submitMemberApplication } from "@/services/mzt-api";
import { queryKeys } from "@/services/queries";
import type { MemberApplication } from "@/types/api";

export const Route = createFileRoute("/daftar-anggota")({
  head: () => ({
    meta: [
      { title: "Pendaftaran Anggota — MZT Apps" },
      {
        name: "description",
        content: "Ajukan pendaftaran anggota baru Maziltu Tholiban.",
      },
    ],
  }),
  component: MemberApplicationPage,
});

export function MemberApplicationPage() {
  if (!memberApplicationsEnabled()) {
    return (
      <section className="container-page py-16 lg:py-24">
        <Card className="mx-auto max-w-xl text-center">
          <CardHeader>
            <h1 className="font-semibold leading-none tracking-tight">
              Pendaftaran anggota belum tersedia
            </h1>
            <CardDescription>
              Pendaftaran anggota baru belum dibuka. Silakan hubungi pengurus untuk informasi lebih
              lanjut.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="rounded-full">
              <a href="/contact">Hubungi pengurus</a>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return <MemberApplicationFormPage />;
}

function MemberApplicationFormPage() {
  const queryClient = useQueryClient();
  const [submittedApplication, setSubmittedApplication] = useState<MemberApplication | null>(null);
  const mutation = useMutation({
    mutationFn: submitMemberApplication,
  });

  if (submittedApplication) {
    return <ApplicationSubmitted application={submittedApplication} />;
  }

  return (
    <section className="container-page py-16 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">Anggota baru</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Daftar anggota MZT</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Lengkapi data dengan benar. Setelah dikirim, verifikasi email dan pantau prosesnya di
            portal pendaftar.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Formulir pendaftaran</CardTitle>
            <CardDescription>Semua field wajib diisi.</CardDescription>
          </CardHeader>
          <CardContent>
            <ApplicationForm
              submitLabel="Kirim pendaftaran"
              pending={mutation.isPending}
              onSubmit={async (form) => {
                const application = await mutation.mutateAsync(form);
                queryClient.setQueryData(queryKeys.applicantMe, application);
                setSubmittedApplication(application);
              }}
            />
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sudah mengajukan?{" "}
          <Link to="/pendaftar/login" className="font-medium text-primary hover:underline">
            Masuk ke portal pendaftar
          </Link>
        </p>
      </div>
    </section>
  );
}

export function ApplicationSubmitted({ application }: { application: MemberApplication }) {
  return (
    <section className="container-page py-16 lg:py-24">
      <Card className="mx-auto max-w-xl text-center">
        <CardHeader>
          <CheckCircle2 className="mx-auto size-10 text-primary" aria-hidden />
          <CardTitle>Pendaftaran berhasil dikirim</CardTitle>
          <CardDescription>
            Simpan nomor pendaftaran berikut untuk masuk kembali dan memantau status pengajuan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Nomor pendaftaran</p>
          <p className="mt-2 break-all select-all font-mono text-lg font-bold sm:text-2xl">
            {application.application_number ?? "Belum tersedia"}
          </p>
          <Button asChild className="mt-6 rounded-full">
            <a href="/pendaftar">Buka portal pendaftar</a>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
