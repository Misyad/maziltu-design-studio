import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberIdCard } from "@/features/dashboard/id-card";
import { idCardQuery } from "@/services/queries";
import { PageHeader } from "@/features/dashboard/page-header";
import type { IdCardData } from "@/types/api";

function toMember(card: IdCardData) {
  return {
    id: card.id,
    id_users: card.id,
    id_anggota: card.id_anggota,
    nama: card.name,
    email: null,
    no_hp: "",
    alamat: "",
    niqobah: card.niqobah ?? "",
    pekerjaan: "",
    foto: card.foto,
    tahun_masuk: "",
    tahun_keluar: "",
    tempat_lahir: null,
    tanggal_lahir: "",
  };
}

export const Route = createFileRoute("/portal/id-card")({
  component: PortalIdCard,
});

function PortalIdCard() {
  const { data: card } = useQuery(idCardQuery());

  return (
    <div className="space-y-6">
      <PageHeader
        title="ID Card Digital"
        description="Kartu identitas digital Anda — barcode lama tetap sebagai identitas fisik"
        actions={
          <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
            <Download aria-hidden />
            Cetak
          </Button>
        }
      />

      {card ? (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div id="print-area">
            <MemberIdCard member={toMember(card)} />
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
            <h3 className="font-display text-lg font-semibold">QR Code</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pindai QR ini untuk verifikasi identitas anggota.
            </p>
            <div className="mt-5 inline-flex rounded-2xl border border-border bg-white p-4">
              <QRCodeCanvas value={card.id_anggota} size={160} level="M" includeMargin />
            </div>
            <p className="mt-4 font-mono text-sm tracking-widest text-muted-foreground">
              {card.id_anggota}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
