import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  PackageCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ApiError } from "@/services/api-client";
import { createMyKtaPrintRequest } from "@/services/mzt-api";
import { myKtaPrintRequestQuery, queryKeys } from "@/services/queries";
import type { KtaPrintStatus, MyKtaPrintRequest } from "@/types/api";

const STATUS_LABELS: Record<KtaPrintStatus, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  menunggu_cetak: "Menunggu Cetak",
  sudah_dicetak: "Sudah Dicetak",
  siap_diambil: "Siap Diambil",
  dikirim: "Sedang Dikirim",
  selesai: "Selesai",
  ditolak: "Ditolak",
  pembayaran_expired: "Pembayaran Kedaluwarsa",
};

const STATUS_CLASSES: Record<KtaPrintStatus, string> = {
  menunggu_pembayaran: "border-amber-300 bg-amber-50 text-amber-800",
  menunggu_cetak: "border-sky-300 bg-sky-50 text-sky-800",
  sudah_dicetak: "border-indigo-300 bg-indigo-50 text-indigo-800",
  siap_diambil: "border-emerald-300 bg-emerald-50 text-emerald-800",
  dikirim: "border-blue-300 bg-blue-50 text-blue-800",
  selesai: "border-emerald-300 bg-emerald-50 text-emerald-800",
  ditolak: "border-destructive/30 bg-destructive/10 text-destructive",
  pembayaran_expired: "border-border bg-muted text-muted-foreground",
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatAmount(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const amount = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(amount) ? rupiah.format(amount) : null;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusCardShell({ children }: { children: React.ReactNode }) {
  return (
    <Card className="w-full min-w-0 overflow-hidden" data-testid="my-kta-print-status">
      {children}
    </Card>
  );
}

export function MyKtaPrintStatus() {
  const queryClient = useQueryClient();
  const query = useQuery(myKtaPrintRequestQuery());
  const create = useMutation({
    mutationFn: createMyKtaPrintRequest,
    onSuccess: (request) => {
      queryClient.setQueryData(queryKeys.myKtaPrintRequest, request);
      toast.success("Pengajuan KTA dibuat");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Pengajuan KTA gagal dibuat");
    },
  });

  if (query.isPending) {
    return (
      <StatusCardShell>
        <CardHeader className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="w-full space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-full max-w-sm" />
            </div>
          </div>
          <p className="sr-only" role="status">
            Memuat status KTA fisik...
          </p>
        </CardHeader>
      </StatusCardShell>
    );
  }

  if (query.isError) {
    return (
      <StatusCardShell>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 gap-3" role="alert">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="font-semibold">Status KTA fisik gagal dimuat</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Periksa koneksi Anda, lalu coba lagi.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full shrink-0 rounded-full sm:w-auto"
            onClick={() => void query.refetch()}
          >
            Coba Lagi
          </Button>
        </CardContent>
      </StatusCardShell>
    );
  }

  if (!query.data) {
    return (
      <StatusCardShell>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <CreditCard className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-semibold">Belum ada pengajuan KTA fisik</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajukan pencetakan kartu langsung dari akun anggota Anda.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full shrink-0 rounded-full sm:w-auto"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Ajukan KTA Fisik
          </Button>
        </CardContent>
      </StatusCardShell>
    );
  }

  return <ExistingRequest request={query.data} />;
}

function ExistingRequest({ request }: { request: MyKtaPrintRequest }) {
  const baseAmount = formatAmount(request.base_amount);
  const gatewayFee = formatAmount(request.gateway_fee);
  const amount = formatAmount(request.payment_amount);
  const latePayment =
    request.status === "pembayaran_expired" &&
    (request.paid_at !== null || request.payment_status.toLowerCase() === "paid");

  return (
    <StatusCardShell>
      <CardHeader className="gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <PackageCheck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <CardTitle className="font-display text-lg">Status KTA Fisik Saya</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Pantau pembayaran dan proses pencetakan kartu Anda.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "w-fit shrink-0 whitespace-normal rounded-full px-3 py-1",
            STATUS_CLASSES[request.status],
          )}
        >
          {STATUS_LABELS[request.status]}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
        <dl className="grid min-w-0 gap-4 text-sm sm:grid-cols-3">
          <Detail label="Referensi" value={request.reference} mono />
          <Detail label="Diajukan" value={formatDate(request.submitted_at)} />
          <Detail label="Terakhir diperbarui" value={formatDate(request.updated_at)} />
        </dl>

        {request.delivery_method ? (
          <p className="text-xs text-muted-foreground">
            Data lama — metode penerimaan:{" "}
            {request.delivery_method === "pickup" ? "diambil" : "dikirim"}.
          </p>
        ) : null}

        {(baseAmount ||
          gatewayFee ||
          amount ||
          (request.status === "menunggu_pembayaran" && request.pay_url)) && (
          <div className="rounded-xl border border-border/60 bg-surface p-4">
            <dl className="space-y-2 text-sm">
              {baseAmount ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Harga KTA</dt>
                  <dd className="font-medium">{baseAmount}</dd>
                </div>
              ) : null}
              {gatewayFee ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Biaya gateway</dt>
                  <dd className="font-medium">{gatewayFee}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2">
                <dt className="font-semibold">Total pembayaran</dt>
                <dd className="font-display font-semibold">{amount ?? "—"}</dd>
              </div>
            </dl>
            {request.status === "menunggu_pembayaran" && request.pay_url ? (
              <Button asChild className="mt-4 w-full rounded-full sm:w-auto">
                <a href={request.pay_url} target="_blank" rel="noreferrer noopener">
                  Bayar Sekarang
                </a>
              </Button>
            ) : null}
          </div>
        )}

        {latePayment && (
          <div
            className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
            role="alert"
            data-testid="kta-late-payment-warning"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Pembayaran diterima setelah pengajuan kedaluwarsa. Hubungi admin agar pembayaran
              diperiksa sebelum membuat pengajuan baru.
            </p>
          </div>
        )}

        {request.status === "ditolak" && request.rejection_reason && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <p className="font-semibold text-destructive">Alasan penolakan</p>
            <p className="mt-1 break-words text-muted-foreground">{request.rejection_reason}</p>
          </div>
        )}

        <LifecycleTimeline request={request} />
      </CardContent>
    </StatusCardShell>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={cn("mt-1 break-words font-medium", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}

function LifecycleTimeline({ request }: { request: MyKtaPrintRequest }) {
  const steps = [
    { label: "Diajukan", at: request.submitted_at },
    { label: "Dibayar", at: request.paid_at },
    { label: "Dicetak", at: request.printed_at },
    { label: "Selesai", at: request.completed_at },
    ...(request.rejected_at ? [{ label: "Ditolak", at: request.rejected_at }] : []),
  ];

  return (
    <div>
      <div className="flex items-center gap-2">
        {request.status === "selesai" ? (
          <CheckCircle2 className="size-4 text-primary" aria-hidden />
        ) : (
          <Clock3 className="size-4 text-primary" aria-hidden />
        )}
        <h3 className="text-sm font-semibold">Perjalanan pengajuan</h3>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-5" data-testid="my-kta-print-timeline">
        {steps.map((step) => (
          <li
            key={step.label}
            className={cn(
              "min-w-0 rounded-lg border px-3 py-2 text-xs",
              step.at
                ? "border-primary/30 bg-primary-soft text-foreground"
                : "border-border/60 text-muted-foreground",
            )}
          >
            <p className="font-medium">{step.label}</p>
            <p className="mt-0.5 break-words text-muted-foreground">{formatDate(step.at)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
