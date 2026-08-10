import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, History, UserRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/dashboard/page-header";
import { attendanceSummaryQuery } from "@/services/queries";

export const Route = createFileRoute("/dashboard/operations/events/$id/attendance")({
  component: AttendancePage,
});

function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("id-ID").format(value);
}

function AttendancePage() {
  const { id } = Route.useParams();
  const summary = useQuery(attendanceSummaryQuery(id, {}));

  const data = summary.data;

  const kpis = [
    {
      label: "Hadir (scan tiket 2C)",
      value: formatNumber(data?.present),
      icon: UserRound,
      loading: summary.isPending,
      accent: "text-emerald-700",
    },
    {
      label: "Legacy (historis)",
      value: formatNumber(data?.legacy_count),
      icon: History,
      loading: summary.isPending,
      accent: "text-muted-foreground",
    },
    {
      label: "Total",
      value: formatNumber(data?.total),
      icon: CalendarDays,
      loading: summary.isPending,
      accent: "text-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kehadiran"
        description="Ringkasan kehadiran event. Hadir didefinisikan sebagai catatan dengan tiket ter-scan (phase2c); data historis dihitung terpisah dan selalu berlabel legacy."
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
                  <p className={`font-display text-2xl font-semibold ${stat.accent}`}>
                    {stat.value}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Per Tanggal Kegiatan</CardTitle>
          <CardDescription>
            Rincian present / legacy untuk setiap hari kegiatan event ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.isPending ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : summary.isError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Gagal memuat data. Coba lagi atau kembali ke halaman sebelumnya.
            </p>
          ) : data && data.per_tanggal.length > 0 ? (
            <ul className="divide-y divide-border">
              {data.per_tanggal.map((row) => (
                <li
                  key={row.tanggal_id ?? "ungrouped"}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {row.tanggal_id !== null
                        ? `Tanggal #${row.tanggal_id}`
                        : "Tanpa tanggal terkait"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(row.present)} hadir · {formatNumber(row.legacy_count)} legacy
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-semibold">
                      {formatNumber(row.present + row.legacy_count)}
                    </p>
                    <p className="text-xs text-muted-foreground">total</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada catatan kehadiran untuk event ini.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
