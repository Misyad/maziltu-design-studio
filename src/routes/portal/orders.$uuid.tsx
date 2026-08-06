import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/features/events/event-card";
import { PageHeader } from "@/features/dashboard/page-header";
import { orderQuery } from "@/services/queries";
import { formatDateShort } from "@/services/public-content";
import type { OrderStatus, PaymentStatus } from "@/types/api";

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

function formatAmount(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return formatPrice(Number.isNaN(num) ? 0 : num);
}

function PortalOrderDetail() {
  const { uuid } = Route.useParams();
  const { data: order, isPending, isError } = useQuery(orderQuery(uuid));

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
              Pembayaran
            </dt>
            <dd className="mt-1 font-medium">{PAYMENT_STATUS_LABEL[order.payment_status]}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Total
            </dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 font-semibold">
              <Ticket className="size-4 text-primary" aria-hidden />
              {formatAmount(order.total_amount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Nomor Order
            </dt>
            <dd className="mt-1 font-mono text-xs">{order.nomor_order}</dd>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
