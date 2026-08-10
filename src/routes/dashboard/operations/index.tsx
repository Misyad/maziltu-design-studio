import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DoorOpen, History, ListChecks, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/dashboard/page-header";
import { operationalEventsQuery } from "@/services/queries";
import { formatDateShort } from "@/services/public-content";

export const Route = createFileRoute("/dashboard/operations/")({
  component: OperationsPage,
});

function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("id-ID").format(value);
}

function OperationsPage() {
  const events = useQuery(operationalEventsQuery());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operasional"
        description="Monitoring penyelenggaraan event: kehadiran canonical, data historis, dan gate (read-only)."
      />

      {events.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : events.isError ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-sm text-muted-foreground">
              Gagal memuat data. Coba lagi atau kembali ke halaman sebelumnya.
            </p>
          </CardContent>
        </Card>
      ) : events.data && events.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.data.map((event) => (
            <Card key={event.id_event} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="font-display text-base">{event.judul_event}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-1">
                      {event.lokasi ?? "Lokasi tidak dicatat"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {formatNumber(event.present_count)} hadir
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3.5" aria-hidden />
                      Hadir (2C)
                    </p>
                    <p className="font-display text-lg font-semibold">
                      {formatNumber(event.present_count)}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <History className="size-3.5" aria-hidden />
                      Legacy
                    </p>
                    <p className="font-display text-lg font-semibold">
                      {formatNumber(event.legacy_count)}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <DoorOpen className="size-3.5" aria-hidden />
                      Gate
                    </p>
                    <p className="font-display text-lg font-semibold">
                      {formatNumber(event.gate_count)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Mulai {event.tanggal_start ? formatDateShort(event.tanggal_start) : "—"}
                  {event.latest_tgl
                    ? ` · terakhir dicatat ${formatDateShort(event.latest_tgl)}`
                    : ""}
                </p>

                <div className="mt-auto flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link
                      to="/dashboard/operations/events/$id/attendees"
                      params={{ id: String(event.id_event) }}
                    >
                      <Users aria-hidden />
                      Peserta
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link
                      to="/dashboard/operations/events/$id/attendance"
                      params={{ id: String(event.id_event) }}
                    >
                      <ListChecks aria-hidden />
                      Kehadiran
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link
                      to="/dashboard/operations/events/$id/gates"
                      params={{ id: String(event.id_event) }}
                    >
                      <DoorOpen aria-hidden />
                      Gate
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-sm text-muted-foreground">
              Belum ada event untuk ditampilkan.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
