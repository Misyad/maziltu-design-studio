import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/features/events/event-card";
import { PageHeader } from "@/features/dashboard/page-header";
import { myOrdersQuery } from "@/services/queries";
import type { Order, OrderStatus, PaymentStatus } from "@/types/api";
import { formatDateShort } from "@/services/public-content";

export const Route = createFileRoute("/portal/orders")({
  component: PortalOrders,
});

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  registered: "Terdaftar",
  confirmed: "Terkonfirmasi",
  checked_in: "Sudah hadir",
  finished: "Selesai",
  cancelled: "Dibatalkan",
};

const ORDER_STATUS_VARIANT: Record<OrderStatus, "outline" | "secondary" | "default"> = {
  draft: "secondary",
  registered: "default",
  confirmed: "default",
  checked_in: "default",
  finished: "default",
  cancelled: "outline",
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

function OrderCard({ order }: { order: Order }) {
  return (
    <Card className="p-0">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{order.nomor_order}</span>
            <Badge variant={ORDER_STATUS_VARIANT[order.status_registrasi]}>
              {ORDER_STATUS_LABEL[order.status_registrasi]}
            </Badge>
          </div>
          <h3 className="mt-2 truncate font-display text-lg font-semibold">{order.event_name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              {order.event_start_at ? formatDateShort(order.event_start_at) : "Belum dijadwalkan"}
            </span>
            <span>Pembayaran: {PAYMENT_STATUS_LABEL[order.payment_status]}</span>
            <span className="font-medium text-foreground">{formatAmount(order.total_amount)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/portal/orders/$uuid" params={{ uuid: order.uuid }}>
              Detail
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PortalOrders() {
  const { data, isPending } = useQuery(myOrdersQuery());

  if (isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title="Order Saya" description="Registrasi event Anda" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const orders = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order Saya"
        description="Pendaftaran Anda untuk berbagai event."
        actions={
          orders.length > 0 ? (
            <Button asChild variant="outline" className="rounded-full" size="sm">
              <Link to="/portal/event">
                <Ticket className="size-4" aria-hidden />
                Jelajahi event
              </Link>
            </Button>
          ) : undefined
        }
      />

      {orders.length === 0 ? (
        <Card className="p-8 text-center">
          <Ticket className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold">Belum ada pendaftaran</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Anda belum mendaftar event apa pun. Jelajahi dan daftar event terdekat.
          </p>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/portal/event">Jelajahi event</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.uuid} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
