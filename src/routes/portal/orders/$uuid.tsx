import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Download, QrCode, Ticket, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/features/events/event-card";
import { PageHeader } from "@/features/dashboard/page-header";
import { ApiError } from "@/services/api-client";
import { downloadTicketPdf, uploadPayment } from "@/services/mzt-api";
import { myTicketQuery, orderQuery, queryKeys } from "@/services/queries";
import { formatDateShort } from "@/services/public-content";
import type { EventPaymentChoice, OrderStatus, PaymentStatus, TicketStatus } from "@/types/api";

export const Route = createFileRoute("/portal/orders/$uuid")({
  component: PortalOrderDetail,
});

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  registered: "Terdaftar",
  confirmed: "Terkonfirmasi",
  checked_in: "Sudah hadir",
  finished: "Selesai",
  cancelled: "Dibatalkan",
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Belum bayar",
  waiting_verification: "Menunggu verifikasi",
  paid: "Lunas",
  rejected: "Ditolak",
  refund: "Refund",
};

const PAYMENT_CHOICE_LABEL: Record<EventPaymentChoice, string> = {
  pay_now: "Bayar sekarang",
  pay_at_venue: "Bayar di tempat",
};

const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  draft: "Draft",
  issued: "Tersedia",
  checked_in: "Sudah check-in",
  finished: "Selesai",
  cancelled: "Dibatalkan",
  revoked: "Dibatalkan",
};

function PaymentUploadForm({
  orderUuid,
  paymentStatus,
  paymentChoice,
}: {
  orderUuid: string;
  paymentStatus: PaymentStatus;
  paymentChoice: EventPaymentChoice | undefined;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Pilih file bukti pembayaran");
      const form = new FormData();
      form.append("payment_proof", file);
      return uploadPayment(orderUuid, form);
    },
    onSuccess: (res) => {
      toast.success(res?.message ?? "Bukti pembayaran diunggah — Menunggu verifikasi");
      queryClient.invalidateQueries({ queryKey: queryKeys.order(orderUuid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrders });
      setFile(null);
      const input = document.getElementById("payment_proof") as HTMLInputElement | null;
      if (input) input.value = "";
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : "Upload gagal";
      toast.error(msg);
    },
  });

  if (paymentChoice === "pay_at_venue" && paymentStatus !== "paid") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pembayaran di Tempat</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">Belum bayar</Badge>
          <p className="mt-2 text-sm text-muted-foreground">
            Tunjukkan tiket kepada petugas. Nominal dan pembayaran dicatat saat kedatangan.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === "waiting_verification") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">Menunggu verifikasi</p>
          <p className="text-xs text-muted-foreground">
            Bukti pembayaran telah diunggah dan sedang diverifikasi oleh finance.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === "paid") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge>Lunas</Badge>
          <p className="mt-2 text-xs text-muted-foreground">Pembayaran telah diverifikasi.</p>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === "pending" || paymentStatus === "rejected") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="size-4" aria-hidden />
            Upload Bukti Pembayaran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentStatus === "rejected" && (
            <p className="text-sm text-destructive">
              Pembayaran sebelumnya ditolak. Silakan unggah bukti baru.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="payment_proof">Bukti Pembayaran (JPG, PNG, PDF, max 5 MB)</Label>
            <Input
              id="payment_proof"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={mutation.isPending}
            />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!file || mutation.isPending}
            className="rounded-full"
          >
            {mutation.isPending ? "Mengunggah..." : "Upload Bukti"}
          </Button>
          {mutation.isError && (
            <p className="text-sm text-destructive">
              {(mutation.error as ApiError)?.message ?? "Upload gagal"}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}

function formatAmount(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return formatPrice(Number.isNaN(num) ? 0 : num);
}

function PortalOrderDetail() {
  const { uuid } = Route.useParams();
  const { data: order, isPending, isError } = useQuery(orderQuery(uuid));
  const {
    data: ticket,
    isPending: ticketPending,
    error: ticketError,
  } = useQuery({
    ...myTicketQuery(uuid),
    enabled: !!order && !isPending && !isError,
    retry: false,
  });

  async function handleDownload() {
    if (!ticket) return;
    try {
      const blob = await downloadTicketPdf(ticket.uuid);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tiket-${ticket.nomor_ticket}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengunduh tiket");
    }
  }

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="space-y-6">
        <PageHeader title="Order tidak ditemukan" />
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/portal/orders">Kembali ke Order Saya</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/portal/orders"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Order Saya
      </Link>
      <PageHeader title={order.event_name} description={order.nomor_order} />

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Detail Order
            <Badge variant={order.status_registrasi === "cancelled" ? "outline" : "default"}>
              {ORDER_STATUS_LABEL[order.status_registrasi]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Event
            </dt>
            <dd className="mt-1 font-medium">{order.event_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Tanggal Mulai
            </dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 font-medium">
              {order.event_start_at ? (
                <>
                  <CalendarDays className="size-4 text-primary" aria-hidden />
                  {formatDateShort(order.event_start_at)}
                </>
              ) : (
                "Belum dijadwalkan"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Metode Pembayaran
            </dt>
            <dd className="mt-1 font-medium">
              {order.payment_choice ? PAYMENT_CHOICE_LABEL[order.payment_choice] : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Pembayaran
            </dt>
            <dd className="mt-1 font-medium">{PAYMENT_STATUS_LABEL[order.payment_status]}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Nominal
            </dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 font-semibold">
              <Ticket className="size-4 text-primary" aria-hidden />
              {formatAmount(order.payment_amount ?? order.total_amount)}
            </dd>
          </div>
          {order.payment_source ? (
            <div>
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Sumber Pembayaran
              </dt>
              <dd className="mt-1 font-medium">{order.payment_source}</dd>
            </div>
          ) : null}
          {order.paid_at ? (
            <div>
              <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Dibayar
              </dt>
              <dd className="mt-1 font-medium">
                {new Date(order.paid_at).toLocaleString("id-ID")}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Nomor Order
            </dt>
            <dd className="mt-1 font-mono text-xs">{order.nomor_order}</dd>
          </div>
        </CardContent>
      </Card>

      <PaymentUploadForm
        orderUuid={order.uuid}
        paymentStatus={order.payment_status}
        paymentChoice={order.payment_choice}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="size-4" aria-hidden />
            Tiket
            {ticket && (
              <Badge
                variant={
                  ticket.status === "revoked" || ticket.status === "cancelled"
                    ? "outline"
                    : "default"
                }
              >
                {TICKET_STATUS_LABEL[ticket.status]}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ticketPending ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : ticket ? (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Nomor Tiket</p>
                  <p className="font-mono text-xs font-medium">{ticket.nomor_ticket}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm capitalize">{TICKET_STATUS_LABEL[ticket.status]}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">QR Payload</p>
                  <p className="font-mono text-xs">{ticket.qr_payload}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Diterbitkan</p>
                  <p className="text-xs">
                    {ticket.issued_at ? formatDateShort(ticket.issued_at) : "—"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleDownload} size="sm" className="rounded-full">
                  <Download className="size-4" /> Unduh PDF
                </Button>
              </div>
              {(ticket.status === "revoked" || ticket.status === "cancelled") && (
                <p className="text-xs text-destructive">
                  Tiket dibatalkan dan tidak dapat digunakan untuk check-in.
                </p>
              )}
              {ticket.status === "finished" && (
                <p className="text-xs text-muted-foreground">
                  Tiket telah digunakan — kehadiran tercatat.
                </p>
              )}
            </div>
          ) : ticketError ? (
            <p className="text-sm text-muted-foreground">Tiket belum tersedia untuk order ini.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Memuat tiket…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
