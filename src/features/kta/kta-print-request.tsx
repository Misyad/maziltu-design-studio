import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PackageCheck, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/services/api-client";
import { createKtaPrintRequest, fetchKtaPrintRequest } from "@/services/mzt-api";
import type { KtaPrintRequest, KtaPrintStatus } from "@/types/api";

const STATUS_LABEL: Record<KtaPrintStatus, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  menunggu_cetak: "Menunggu Cetak",
  sudah_dicetak: "Sudah Dicetak",
  siap_diambil: "Siap Diambil",
  dikirim: "Sedang Dikirim",
  selesai: "Selesai",
  ditolak: "Ditolak",
  pembayaran_expired: "Pembayaran Kedaluwarsa",
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatRupiah(value: number) {
  return rupiah.format(value).replace(/^Rp\s*/, "Rp");
}

function amountValue(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : value;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

/**
 * Physical KTA print request block, shown after a successful ownership
 * verification. Identity is proven by `printToken` (issued by the backend on
 * verify) — the browser never sends the member id.
 *
 * Active statuses hide the form and show the live status + payment link
 * instead, so a member cannot create a second request.
 */
export function KtaPrintRequestBlock({
  printToken,
  status,
  baseAmount,
}: {
  printToken: string;
  status: "active" | "non_active";
  baseAmount?: number;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const own = useQuery({
    queryKey: ["kta-print", "own", printToken],
    queryFn: () => fetchKtaPrintRequest(printToken),
    retry: 0,
    enabled: status === "active",
  });

  const request = own.data?.data?.request ?? null;
  const basePrice = amountValue(request?.base_amount) ?? amountValue(baseAmount);
  const customerTotal = amountValue(request?.payment_amount);
  const gatewayFee =
    amountValue(request?.gateway_fee) ??
    (customerTotal !== null && basePrice !== null && customerTotal >= basePrice
      ? customerTotal - basePrice
      : null);

  const create = useMutation({
    mutationFn: () => createKtaPrintRequest({ print_token: printToken }),
    onSuccess: () => {
      toast.success("Pengajuan KTA dibuat. Silakan selesaikan pembayaran.");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["kta-print", "own", printToken] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengajukan KTA");
    },
  });

  // Inactive members can never request a card.
  if (status !== "active") {
    return (
      <div
        className="mt-6 rounded-2xl border border-border/60 bg-surface p-5"
        data-testid="kta-print-inactive"
      >
        <p className="text-sm font-semibold">Pengajuan KTA fisik tidak tersedia</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Akun anggota Anda tidak aktif. Hubungi admin untuk mengaktifkan kembali.
        </p>
      </div>
    );
  }

  if (own.isPending) {
    return (
      <div className="mt-6 rounded-2xl border border-border/60 bg-surface p-5">
        <p className="text-sm text-muted-foreground">Memuat status KTA fisik...</p>
      </div>
    );
  }

  // An active (or terminal) request already exists — show status + timeline.
  if (request) {
    return (
      <div
        className="mt-6 rounded-2xl border border-border/60 bg-surface p-5"
        data-testid="kta-print-status"
      >
        <div className="flex items-center gap-2">
          <PackageCheck className="size-5 text-primary" aria-hidden />
          <p className="text-sm font-semibold">Pengajuan KTA Fisik</p>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Referensi</dt>
            <dd className="mt-0.5 font-mono text-xs">{request.reference}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Status</dt>
            <dd className="mt-0.5 font-medium">{STATUS_LABEL[request.status]}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Pembayaran</dt>
            <dd className="mt-0.5 capitalize">{request.payment_status}</dd>
          </div>
        </dl>

        {customerTotal !== null && (
          <div
            className="mt-4 rounded-xl border border-border/60 bg-card p-4"
            data-testid="kta-payment-breakdown"
          >
            <dl className="space-y-2 text-sm">
              {basePrice !== null && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Harga KTA</dt>
                  <dd className="font-medium">{formatRupiah(basePrice)}</dd>
                </div>
              )}
              {gatewayFee !== null && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Biaya gateway</dt>
                  <dd className="font-medium">{formatRupiah(gatewayFee)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2">
                <dt className="font-semibold">Total pembayaran</dt>
                <dd className="font-semibold">{formatRupiah(customerTotal)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Total pembayaran mengikuti nominal dari Paymenku.
            </p>
          </div>
        )}

        {request.status === "menunggu_pembayaran" && request.pay_url && (
          <Button asChild className="mt-4 w-full rounded-full">
            <a href={request.pay_url} target="_blank" rel="noreferrer noopener">
              Bayar Sekarang
            </a>
          </Button>
        )}

        {request.status === "menunggu_cetak" && (
          <p className="mt-4 text-sm text-muted-foreground">
            Pembayaran berhasil. KTA Anda masuk antrean cetak.
          </p>
        )}

        {request.status === "ditolak" && request.rejection_reason && (
          <p className="mt-4 text-sm text-destructive">Ditolak: {request.rejection_reason}</p>
        )}

        {request.delivery_method ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Data lama — metode penerimaan:{" "}
            {request.delivery_method === "pickup" ? "diambil" : "dikirim"}.
          </p>
        ) : null}

        <PrintTimeline request={request} />
      </div>
    );
  }

  // No request yet — offer the form.
  if (!open) {
    return (
      <Button
        className="mt-6 w-full rounded-full"
        data-testid="kta-print-open"
        onClick={() => setOpen(true)}
      >
        <Printer className="size-4" aria-hidden />
        Ajukan Cetak KTA Fisik
      </Button>
    );
  }

  return (
    <form
      className="mt-6 rounded-2xl border border-border/60 bg-surface p-5"
      data-testid="kta-print-form"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <p className="text-sm font-semibold">Ajukan pencetakan KTA fisik?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Harga akan disnapshot saat pengajuan dibuat. KTA diproses setelah pembayaran terverifikasi.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={create.isPending} className="flex-1 rounded-full">
          {create.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Ajukan
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="rounded-full"
          onClick={() => setOpen(false)}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}

/**
 * Compact lifecycle timeline from the request's own timestamps.
 */
function PrintTimeline({ request }: { request: KtaPrintRequest }) {
  const steps: { label: string; at: string | null }[] = [
    { label: "Diajukan", at: request.submitted_at },
    { label: "Dibayar", at: request.paid_at },
    { label: "Dicetak", at: request.printed_at },
    { label: "Selesai", at: request.completed_at },
  ];

  return (
    <ol className="mt-4 space-y-2" data-testid="kta-print-timeline">
      {steps.map((s) => (
        <li key={s.label} className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block size-2 rounded-full ${s.at ? "bg-primary" : "bg-border"}`}
            aria-hidden
          />
          <span className={s.at ? "font-medium" : "text-muted-foreground"}>{s.label}</span>
          {s.at && (
            <span className="text-muted-foreground">
              · {new Date(s.at).toLocaleDateString("id-ID")}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
