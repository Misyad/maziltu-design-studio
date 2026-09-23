import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ApplicationForm } from "@/features/applications/application-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { submitMemberApplication } from "@/services/mzt-api";
import { queryKeys } from "@/services/queries";

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

function MemberApplicationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: submitMemberApplication,
  });

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
                await router.navigate({ to: "/pendaftar", replace: true });
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
