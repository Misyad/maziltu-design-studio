import { createFileRoute } from "@tanstack/react-router";
import { CekKtaForm } from "@/features/kta/cek-kta-form";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";

export const Route = createFileRoute("/cek-kta")({
  head: () => ({
    meta: [
      { title: "Cek Status KTA — MZT Apps | Maziltu Tholiban" },
      {
        name: "description",
        content:
          "Cek apakah Anda sudah terdaftar sebagai anggota dan ketahui status KTA Anda secara aman.",
      },
    ],
  }),
  component: CekKtaPage,
});

function CekKtaPage() {
  return (
    <section className="container-page py-20 lg:py-28">
      <Reveal>
        <SectionTitle
          as="h1"
          eyebrow="Cek Status KTA"
          title="Cek status keanggotaan & KTA Anda"
          description="Tidak tahu apakah Anda sudah terdaftar atau belum? Cari dengan nama + tanggal lahir, atau langsung dengan nomor anggota. Data yang tampil selalu disamarkan dan hanya pemilik data yang bisa memverifikasi kepemilikan."
        />
      </Reveal>

      <Reveal delay={0.1} className="mt-10">
        <div className="mx-auto max-w-2xl">
          <CekKtaForm />
        </div>
      </Reveal>

      <Reveal delay={0.15} className="mt-8">
        <p className="mx-auto max-w-2xl text-center text-xs text-muted-foreground">
          Halaman ini tidak menampilkan email, nomor HP, alamat, tanggal lahir, atau foto. Status
          kartu fisik belum tercatat di sistem.
        </p>
      </Reveal>
    </section>
  );
}
