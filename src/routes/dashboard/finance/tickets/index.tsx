import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, ReceiptText, TicketCheck, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/dashboard/page-header";
import { operationalSummaryQuery, ticketSummaryQuery } from "@/services/queries";

export const Route = createFileRoute("/dashboard/finance/tickets/")({
  component: TicketMonitoringPage,
});

function formatIdr(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("id-ID").format(value);
}

/** Canonical ADR-011 ticket statuses — display order for monitoring. */
const TICKET_STATUS_ORDER = [
  "draft",
  "issued",
  "checked_in",
  "finished",
  "cancelled",
  "revoked",
] as const;

function TicketMonitoringPage() {
  const tickets = useQuery(ticketSummaryQuery());
  const operational = useQuery(operationalSummaryQuery());

  const byStatus = tickets.data?.by_status ?? [];
  const byStatusMap = new Map(byStatus.map((row) => [row.status, row.count]));

  const operationalCards = [
    {
      label: "Total Pesanan",
      value: formatNumber(operational.data?.total_orders),
      icon: ReceiptText,
      loading: operational.isPending,
    },
    {
      label: "Total Terbayar",
      value: formatIdr(operational.data?.total_paid),
      icon: Wallet,
      loading: operational.isPending,
    },
    {
      label: "Sisa Tagihan",
      value: formatIdr(operational.data?.outstanding),
      icon: ClipboardList,
      loading: operational.isPending,
    },
    {
      label: "Menunggu Verifikasi",
      value: formatNumber(operational.data?.waiting_verification),
      icon: ClipboardList,
      loading: operational.isPending,
    },
    {
      label: "Total Tiket",
      value: formatNumber(operational.data?.total_tickets),
      icon: TicketCheck,
      loading: operational.isPending,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tiket & Operasional"
        description="Monitoring tiket per status (canonical ADR-011) dan ringkasan operasional lintas entitas (read-only)."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {operationalCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <stat.icon className="size-5" aria-hidden />
              </span>
              <div>
                {stat.loading ? (
                  <Skeleton className="h-7 w-28" />
                ) : (
                  <p className="font-display text-2xl font-semibold">{stat.value}</p>
                )}
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Tiket per Status</CardTitle>
          <CardDescription>
            Jumlah tiket per status canonical ADR-011 ({formatNumber(tickets.data?.total_tickets)}{" "}
            total). Tanpa mapping status baru — nilai status langsung dari sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.isPending ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : tickets.data && byStatus.length > 0 ? (
            <ul className="divide-y divide-border">
              {TICKET_STATUS_ORDER.map((status) => {
                const count = byStatusMap.get(status) ?? 0;
                return (
                  <li key={status} className="flex items-center justify-between py-3">
                    <span className="text-sm capitalize">{status.replace("_", " ")}</span>
                    <span className="font-display text-sm font-semibold">
                      {formatNumber(count)}
                    </span>
                  </li>
                );
              })}
              {byStatus
                .filter((row) => !(TICKET_STATUS_ORDER as readonly string[]).includes(row.status))
                .map((row) => (
                  <li key={row.status} className="flex items-center justify-between py-3">
                    <span className="text-sm capitalize">{row.status.replace("_", " ")}</span>
                    <span className="font-display text-sm font-semibold">
                      {formatNumber(row.count)}
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada data tiket.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
