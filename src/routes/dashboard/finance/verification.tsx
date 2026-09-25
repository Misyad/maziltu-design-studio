import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Search, X } from "lucide-react";
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
import { PAYMENT_STATUS_LABEL } from "@/features/payments/payment";
import { FINANCE_ROLES, requireRoles } from "@/lib/auth";
import { ApiError } from "@/services/api-client";
import { fetchPaymentDetail, verifyPayment } from "@/services/mzt-api";
import { verificationQueueQuery } from "@/services/queries";
import type { PaymentItem, PaymentStatus } from "@/types/api";

export const Route = createFileRoute("/dashboard/finance/verification")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, FINANCE_ROLES, location.href),
  component: VerificationQueuePage,
});

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "waiting_verification", label: "Menunggu Verifikasi" },
  { value: "paid", label: "Lunas" },
  { value: "rejected", label: "Ditolak" },
  { value: "pending", label: "Pending" },
  { value: "refund", label: "Refund" },
  { value: "expired", label: "Kedaluwarsa" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "failed", label: "Gagal" },
];

function VerificationQueuePage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PaymentStatus>("waiting_verification");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PaymentItem | null>(null);
  const [note, setNote] = useState("");

  const queue = useQuery(
    verificationQueueQuery({ status, q: q || null, page, per_page: 15 }),
  );

  const mutation = useMutation({
    mutationFn: (payload: { uuid: string; status: string; note?: string | null }) =>
      verifyPayment(payload.uuid, { status: payload.status, note: payload.note ?? null }),
    onSuccess: (res) => {
      if (!res.success) return;
      const msg = (res as unknown as { data?: { changed: boolean } }).data?.changed === false
        ? "Pembayaran sudah diverifikasi."
        : (res.message ?? "Berhasil");
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ["payments", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "finance"] });
      setSelected(null);
      setNote("");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiError ? e.message : "Gagal memverifikasi");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verifikasi Pembayaran"
        description="Antrean pembayaran menunggu verifikasi — filter, periksa bukti, setujui atau tolak."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as PaymentStatus);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nomor payment / order / event"
              className="pl-9"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {queue.isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : queue.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">Gagal memuat antrean.</CardContent>
        </Card>
      ) : !queue.data?.data?.length ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Tidak ada pembayaran pada filter ini.
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
                      <th className="px-4 py-2 text-left">Payment</th>
                      <th className="px-4 py-2 text-left">Order</th>
                      <th className="px-4 py-2 text-left">Event</th>
                      <th className="px-4 py-2 text-right">Jumlah</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.data.data.map((p) => (
                      <tr key={p.uuid} className="border-b last:border-0">
                        <td className="px-4 py-2 font-mono text-xs">{p.nomor_payment}</td>
                        <td className="px-4 py-2 font-mono text-xs">{p.order?.nomor_order ?? "—"}</td>
                        <td className="px-4 py-2 text-xs">{p.order?.event_name ?? "—"}</td>
                        <td className="px-4 py-2 text-right text-xs">{String(p.amount)}</td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className="text-xs">
                            {PAYMENT_STATUS_LABEL[p.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelected(p)}>
                            <Eye className="size-4" /> Detail
                          </Button>
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

      <DetailDialog
        payment={selected}
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null);
            setNote("");
          }
        }}
        note={note}
        onNoteChange={setNote}
        onApprove={() =>
          selected && mutation.mutate({ uuid: selected.uuid, status: "paid", note })
        }
        onReject={() =>
          selected && mutation.mutate({ uuid: selected.uuid, status: "rejected", note })
        }
        pending={mutation.isPending}
      />
    </div>
  );
}

function DetailDialog({
  payment,
  open,
  onOpenChange,
  note,
  onNoteChange,
  onApprove,
  onReject,
  pending,
}: {
  payment: PaymentItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  note: string;
  onNoteChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  const detail = useQuery({
    queryKey: ["payments", payment?.uuid],
    queryFn: () => fetchPaymentDetail(payment!.uuid),
    enabled: !!payment?.uuid && open,
  });

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detail Pembayaran</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {payment.nomor_payment} · {payment.uuid}
          </DialogDescription>
        </DialogHeader>

        {detail.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : detail.isError ? (
          <p className="text-sm text-destructive">Gagal memuat detail.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-muted-foreground">Order</p>
                <p className="font-mono text-xs">{detail.data?.payment.order?.nomor_order}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Event</p>
                <p className="text-xs">{detail.data?.payment.order?.event_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Jumlah</p>
                <p>{String(detail.data?.payment.amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Outstanding</p>
                <p>{String(detail.data?.outstanding?.outstanding ?? "—")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant="outline">
                  {detail.data?.payment.status
                    ? PAYMENT_STATUS_LABEL[detail.data.payment.status]
                    : "—"}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Bukti</p>
                <p className="text-xs">{detail.data?.payment.proofs?.length ?? 0} file</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">Catatan (opsional)</label>
              <Input
                className="mt-1"
                placeholder="Alasan / catatan verifikasi"
                value={note}
                onChange={(e) => onNoteChange(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" onClick={onApprove} disabled={pending}>
            <Check className="size-4" /> Setujui
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onReject} disabled={pending}>
            <X className="size-4" /> Tolak
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
