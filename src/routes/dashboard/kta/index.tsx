import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/dashboard/page-header";
import { KTA_PRINT_AREA_ID, PhysicalKtaCard } from "@/features/dashboard/physical-kta-card";
import { KTA_QUEUE_ROLES, requireRoles } from "@/lib/auth";
import { canViewKtaCards, isVerifier } from "@/lib/roles";
import { ApiError } from "@/services/api-client";
import { updateKtaPrintStatus } from "@/services/mzt-api";
import {
  currentUserQuery,
  ktaPrintDetailQuery,
  ktaPrintQueueQuery,
  ktaPrintRequestCardQuery,
} from "@/services/queries";
import type { KtaPrintRequestAdminRow, KtaPrintStatus } from "@/types/api";

export const Route = createFileRoute("/dashboard/kta/")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, KTA_QUEUE_ROLES, location.href),
  component: KtaQueuePage,
});

const STATUS_LABEL: Record<KtaPrintStatus, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  menunggu_cetak: "Menunggu Cetak",
  sudah_dicetak: "Sudah Dicetak",
  siap_diambil: "Siap Diambil",
  dikirim: "Sedang Dikirim",
  selesai: "Selesai",
  ditolak: "Ditolak",
  pembayaran_expired: "Kedaluwarsa",
};

/** Queue reset (no explicit status) → production statuses only. */
const QUEUE_VALUE = "queue";
const PRINTABLE_STATUSES = new Set<KtaPrintStatus>([
  "menunggu_cetak",
  "sudah_dicetak",
  "siap_diambil",
  "dikirim",
  "selesai",
]);
const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function KtaQueuePage() {
  const queryClient = useQueryClient();
  const currentUser = useQuery(currentUserQuery());
  const [status, setStatus] = useState<string>(QUEUE_VALUE);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<KtaPrintRequestAdminRow | null>(null);
  const [printing, setPrinting] = useState<KtaPrintRequestAdminRow | null>(null);
  const canManage = isVerifier(currentUser.data?.roles);
  const canPrint = canViewKtaCards(currentUser.data?.roles);
  const perPage = 15;

  const queue = useQuery(
    ktaPrintQueueQuery({
      status: status === QUEUE_VALUE ? null : status,
      q: q || null,
      page,
      per_page: perPage,
    }),
  );

  const transition = useMutation({
    mutationFn: (payload: { id: number; status: string; reason?: string | null }) =>
      updateKtaPrintStatus(payload.id, { status: payload.status, reason: payload.reason ?? null }),
    onSuccess: () => {
      toast.success("Status KTA diperbarui");
      queryClient.invalidateQueries({ queryKey: ["kta-print", "queue"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiError ? e.message : "Gagal memperbarui status");
    },
  });

  function nextActions(row: KtaPrintRequestAdminRow): { label: string; status: string }[] {
    if (row.status === "menunggu_cetak") {
      return [{ label: "Tandai Sudah Dicetak", status: "sudah_dicetak" }];
    }
    if (row.status === "sudah_dicetak") {
      return row.delivery_method === "pickup"
        ? [{ label: "Siap Diambil", status: "siap_diambil" }]
        : [{ label: "Dikirim", status: "dikirim" }];
    }
    if (row.status === "siap_diambil" || row.status === "dikirim") {
      return [{ label: "Selesai", status: "selesai" }];
    }
    return [];
  }

  function handleAction(row: KtaPrintRequestAdminRow, target: string) {
    const resolved = target;
    if (resolved === "ditolak") {
      const reason = window.prompt("Alasan penolakan (wajib)");
      if (!reason || !reason.trim()) {
        toast.error("Alasan penolakan wajib diisi");
        return;
      }
      transition.mutate({ id: row.id, status: resolved, reason: reason.trim() });
      return;
    }
    transition.mutate({ id: row.id, status: resolved });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cetak KTA Fisik"
        description="Antrean cetak KTA fisik — pembayaran dikonfirmasi otomatis melalui Paymenku."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={QUEUE_VALUE}>Antrean Cetak</SelectItem>
              {(Object.keys(STATUS_LABEL) as KtaPrintStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="max-w-xs"
            placeholder="Cari nama / no. anggota / referensi"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {queue.isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : queue.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            Gagal memuat antrean KTA.
          </CardContent>
        </Card>
      ) : !queue.data?.data?.length ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Tidak ada pengajuan KTA pada filter ini.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Nama</th>
                      <th className="px-4 py-2 text-left">No. Anggota</th>
                      <th className="px-4 py-2 text-left">Referensi</th>
                      <th className="px-4 py-2 text-left">Pembayaran</th>
                      <th className="px-4 py-2 text-left">Metode</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.data.data.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-4 py-2">{row.nama_masked}</td>
                        <td className="px-4 py-2 font-mono text-xs">{row.id_anggota_masked}</td>
                        <td className="px-4 py-2 font-mono text-xs">{row.reference}</td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {row.payment_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 capitalize">
                          {row.delivery_method === "pickup" ? "Diambil" : "Dikirim"}
                        </td>
                        <td className="px-4 py-2">{STATUS_LABEL[row.status]}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            {canPrint &&
                            row.payment_status === "paid" &&
                            PRINTABLE_STATUSES.has(row.status) ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-full"
                                onClick={() => setPrinting(row)}
                              >
                                <Printer aria-hidden />
                                Cetak
                              </Button>
                            ) : null}
                            {canManage ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-full"
                                onClick={() => setSelected(row)}
                              >
                                Detail
                              </Button>
                            ) : null}
                            {canManage
                              ? nextActions(row).map((a) => (
                                  <Button
                                    key={a.status}
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full"
                                    disabled={transition.isPending}
                                    onClick={() => handleAction(row, a.status)}
                                  >
                                    {a.label}
                                  </Button>
                                ))
                              : null}
                            {canManage &&
                            (row.status === "menunggu_pembayaran" ||
                              row.status === "menunggu_cetak") ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-full text-destructive"
                                disabled={transition.isPending}
                                onClick={() => handleAction(row, "ditolak")}
                              >
                                Tolak
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Hal {queue.data.current_page} / {queue.data.last_page} · {queue.data.total} data
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (queue.data.last_page ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}

      <KtaDetailDialog
        request={selected}
        open={selected !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelected(null);
        }}
      />
      <KtaPrintDialog
        request={printing}
        open={printing !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPrinting(null);
        }}
      />
    </div>
  );
}

function KtaPrintDialog({
  request,
  open,
  onOpenChange,
}: {
  request: KtaPrintRequestAdminRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const card = useQuery({
    ...ktaPrintRequestCardQuery(request?.id ?? 0),
    enabled: open && request !== null,
  });

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview KTA</DialogTitle>
          <DialogDescription className="font-mono text-xs">{request.reference}</DialogDescription>
        </DialogHeader>
        {card.isPending ? (
          <Skeleton className="aspect-[85.6/54] w-full rounded-xl" />
        ) : card.isError || !card.data ? (
          <p className="text-sm text-destructive">Gagal memuat data KTA.</p>
        ) : (
          <div className="space-y-4">
            <div id={KTA_PRINT_AREA_ID}>
              <PhysicalKtaCard card={card.data} />
            </div>
            <Button className="w-full rounded-full" onClick={() => window.print()}>
              <Printer aria-hidden />
              Cetak KTA
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KtaDetailDialog({
  request,
  open,
  onOpenChange,
}: {
  request: KtaPrintRequestAdminRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const detail = useQuery({
    ...ktaPrintDetailQuery(request?.id ?? 0),
    enabled: open && request !== null,
  });

  if (!request) return null;

  const data = detail.data?.request;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Pengajuan KTA</DialogTitle>
          <DialogDescription className="font-mono text-xs">{request.reference}</DialogDescription>
        </DialogHeader>

        {detail.isPending ? (
          <Skeleton className="h-48 w-full" />
        ) : detail.isError || !data ? (
          <p className="text-sm text-destructive">Gagal memuat detail pengajuan KTA.</p>
        ) : (
          <div className="space-y-5 text-sm">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Metode pengiriman">
                {data.delivery_method === "pickup" ? "Diambil" : "Dikirim"}
              </DetailField>
              <DetailField label="Status pembayaran">{data.payment_status}</DetailField>
              <DetailField label="Nominal pembayaran">
                {data.payment_amount === null ? "—" : RUPIAH.format(Number(data.payment_amount))}
              </DetailField>
              <DetailField label="Status cetak">{STATUS_LABEL[data.status]}</DetailField>
              {data.delivery_method === "delivery" && (
                <>
                  <DetailField label="Nama penerima">{data.recipient_name || "—"}</DetailField>
                  <DetailField label="Nomor HP penerima">{data.recipient_phone || "—"}</DetailField>
                  <DetailField label="Alamat pengiriman" className="sm:col-span-2">
                    {data.shipping_address || "—"}
                  </DetailField>
                </>
              )}
              {data.notes && (
                <DetailField label="Catatan" className="sm:col-span-2">
                  {data.notes}
                </DetailField>
              )}
            </dl>

            {data.logs.length > 0 && (
              <div>
                <p className="font-medium">Riwayat status</p>
                <ol className="mt-2 space-y-2">
                  {data.logs.map((log, index) => (
                    <li key={`${log.at ?? "log"}-${index}`} className="rounded-lg border p-3">
                      <p>
                        {log.old_status
                          ? `${STATUS_LABEL[log.old_status as KtaPrintStatus] ?? log.old_status} → `
                          : ""}
                        {STATUS_LABEL[log.new_status as KtaPrintStatus] ?? log.new_status}
                      </p>
                      {log.reason && <p className="text-xs text-muted-foreground">{log.reason}</p>}
                      <p className="text-xs text-muted-foreground">
                        {log.source}
                        {log.at ? ` · ${new Date(log.at).toLocaleString("id-ID")}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap font-medium">{children}</dd>
    </div>
  );
}
