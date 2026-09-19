import { mediaUrl } from "@/services/api-client";
import type { KtaCard } from "@/types/api";

export const KTA_PRINT_AREA_ID = "kta-print-area";

export function PhysicalKtaCard({ card }: { card: KtaCard }) {
  const photo = mediaUrl(card.foto);

  return (
    <div className="kta-card" data-testid="physical-kta-card">
      <img className="kta-card__background" src={card.background_url} alt="" aria-hidden />
      <div className="kta-card__photo">
        {photo ? (
          <img src={photo} alt={`Foto ${card.nama}`} />
        ) : (
          <span aria-label="Foto anggota tidak tersedia">{card.nama.charAt(0)}</span>
        )}
      </div>
      <dl className="kta-card__details">
        <KtaField label="ID Anggota" value={card.id_anggota} />
        <KtaField label="Nama" value={card.nama} />
        <KtaField label="Alamat" value={card.alamat} multiline />
        <KtaField label="Niqobah" value={card.niqobah} />
        <KtaField label="Tahun Masuk" value={card.tahun_masuk ?? "—"} />
        <KtaField label="Tahun Keluar" value={card.tahun_keluar ?? "—"} />
      </dl>
      <div className="kta-card__barcode">
        <img src={card.barcode_data_uri} alt={`Barcode anggota ${card.id_anggota}`} />
      </div>
    </div>
  );
}

function KtaField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className={multiline ? "kta-card__field kta-card__field--multiline" : "kta-card__field"}>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
