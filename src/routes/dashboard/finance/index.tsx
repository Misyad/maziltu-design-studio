import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Banknote, ClipboardList, ReceiptText, TicketCheck, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/dashboard/page-header";
import {
  dashboardOverviewQuery,
  paymentSummaryQuery,
  registrationSummaryQuery,
  revenueSummaryQuery,
} from "@/services/queries";

export const Route = createFileRoute("/dashboard/finance/")({
  component: FinancePage,
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

function FinancePage() {
  const overview = useQuery(dashboardOverviewQuery());
  const registration = useQuery(registrationSummaryQuery());
  const revenue = useQuery(revenueSummaryQuery());
  const payments = useQuery(paymentSummaryQuery());

  const kpiCards = [
    {
      label: "Total Pendapatan",
      value: formatIdr(overview.data?.total_revenue),
      icon: Banknote,
      loading: overview.isPending,
    },
    {
      label: "Total Terbayar",
      value: formatIdr(overview.data?.total_paid),
      icon: Wallet,
      loading: overview.isPending,
    },
    {
      label: "Sisa Tagihan",
      value: formatIdr(overview.data?.total_outstanding),
      icon: ReceiptText,
      loading: overview.isPending,
    },
    {
      label: "Menunggu Verifikasi",
      value: formatNumber(overview.data?.pending_verifications),
      icon: ClipboardList,
      loading: overview.isPending,
    },
    {
      label: "Total Pesanan",
      value: formatNumber(overview.data?.total_orders),
      icon: ReceiptText,
      loading: overview.isPending,
    },
    {
      label: "Total Tiket",
      value: formatNumber(overview.data?.total_tickets),
      icon: TicketCheck,
      loading: overview.isPending,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Ringkasan keuangan dan operasional platform (read-only)."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map((stat) => (
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

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Registrasi</CardTitle>
            <CardDescription>
              Jumlah pesanan per status ({formatNumber(registration.data?.total_orders)} total).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {registration.isPending ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : registration.data && registration.data.by_status.length > 0 ? (
              <ul className="divide-y divide-border">
                {registration.data.by_status.map((row) => (
                  <li key={row.status} className="flex items-center justify-between py-3">
                    <span className="text-sm capitalize">{row.status.replace("_", " ")}</span>
                    <span className="font-display text-sm font-semibold">{row.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada data registrasi.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Pendapatan</CardTitle>
            <CardDescription>
              Total {formatIdr(revenue.data?.total_revenue)} · Terbayar{" "}
              {formatIdr(revenue.data?.total_paid)} · Sisa{" "}
              {formatIdr(revenue.data?.outstanding)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {revenue.isPending ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : revenue.data && revenue.data.by_status.length > 0 ? (
              <ul className="divide-y divide-border">
                {revenue.data.by_status.map((row) => (
                  <li key={row.status} className="flex items-center justify-between py-3">
                    <span className="text-sm capitalize">{row.status.replace("_", " ")}</span>
                    <span className="font-display text-sm font-semibold">
                      {formatIdr(row.total)}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({row.count}×)
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada data pembayaran.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Pembayaran per Status</CardTitle>
          <CardDescription>
            Menunggu verifikasi: {formatNumber(payments.data?.waiting_verification)}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.isPending ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : payments.data && payments.data.by_status.length > 0 ? (
            <ul className="divide-y divide-border">
              {payments.data.by_status.map((row) => (
                <li key={row.status} className="flex items-center justify-between py-3">
                  <span className="text-sm capitalize">{row.status.replace("_", " ")}</span>
                  <span className="font-display text-sm font-semibold">
                    {formatIdr(row.total)}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({row.count}×)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada data pembayaran.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}