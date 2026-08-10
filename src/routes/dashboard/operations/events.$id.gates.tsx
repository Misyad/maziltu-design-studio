import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DoorOpen, History, UserRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/dashboard/page-header";
import { gateMonitoringQuery } from "@/services/queries";

export const Route = createFileRoute("/dashboard/operations/events/$id/gates")({
  component: GatesPage,
});

function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("id-ID").format(value);
}

function GatesPage() {
  const { id } = Route.useParams();
  const monitoring = useQuery(gateMonitoringQuery(id, {}));

  const data = monitoring.data;

  const totals = (data?.rows ?? []).reduce(
    (acc, row) => ({
      present: acc.present + row.present,
      legacy: acc.legacy + row.legacy,
      total: acc.total + row.total,
    }),
    { present: 0, legacy: 0, total: 0 },
  );

  const kpis = [
    {
      label: "Hadir (scan tiket 2C)",
      value: formatNumber(totals.present),
      icon: UserRound,
      loading: monitoring.isPending,
    },
    {
      label: "Legacy (historis)",
      value: formatNumber(totals.legacy),
      icon: History,
      loading: monitoring.isPending,
    },
    {
      label: "Total Scan",
      value: formatNumber(totals.total),
      icon: DoorOpen,
      loading: monitoring.isPending,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring Gate"
        description="Kehadiran per gate dengan rincian present / legacy. Baris tanpa gate dikelompokkan sebagai (ungated)."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {kpis.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <stat.icon className="size-5" aria-hidden />
              </span>
              <div>
                {stat.loading ? (
                  <Skeleton className="h-7 w-24" />
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
          <CardTitle className="font-display">Per Gate</CardTitle>
          <CardDescription>Grouping dan breakdown per gate sesuai API contract.</CardDescription>
        </CardHeader>
        <CardContent>
          {monitoring.isPending ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : monitoring.isError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Gagal memuat data. Coba lagi atau kembali ke halaman sebelumnya.
            </p>
          ) : data && data.rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gate</TableHead>
                  <TableHead className="text-right">Hadir (2C)</TableHead>
                  <TableHead className="text-right">Legacy</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={row.gate}>
                    <TableCell className="font-medium">{row.gate}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.present)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.legacy)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatNumber(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada data gate untuk event ini.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
