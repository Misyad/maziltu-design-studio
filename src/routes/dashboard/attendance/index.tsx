import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, QrCode } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/features/dashboard/data-table";
import { PageHeader } from "@/features/dashboard/page-header";
import { submitAttendance } from "@/services/mzt-api";
import { attendanceQuery, eventTanggalQuery, eventsQuery, queryKeys } from "@/services/queries";
import type { AttendanceRecord } from "@/types/api";

export const Route = createFileRoute("/dashboard/attendance/")({
  component: AttendancePage,
});

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function AttendancePage() {
  const queryClient = useQueryClient();
  const events = useQuery(eventsQuery());
  const [eventId, setEventId] = useState<string>("");
  const [tanggalId, setTanggalId] = useState<string>("");
  const [code, setCode] = useState("");

  const tanggal = useQuery({
    ...eventTanggalQuery(Number(eventId)),
    enabled: eventId !== "",
  });

  const records = useQuery({
    ...attendanceQuery(Number(eventId), Number(tanggalId)),
    enabled: eventId !== "" && tanggalId !== "",
  });

  const scan = useMutation({
    mutationFn: () =>
      submitAttendance({
        id_anggota: code.trim(),
        id_event: Number(eventId),
        id_tanggal: Number(tanggalId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.attendance(Number(eventId), Number(tanggalId)),
      });
      toast.success("Attendance recorded");
      setCode("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to record");
      setCode("");
    },
  });

  function handleScan(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim() || scan.isPending) return;
    scan.mutate();
  }

  const columns: readonly DataTableColumn<AttendanceRecord>[] = [
    {
      key: "nama",
      header: "Member",
      sortable: true,
      sortValue: (row) => (row.dataUser?.nama ?? "").toLowerCase(),
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.dataUser?.nama ?? "—"}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{row.id_anggota}</p>
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Checked in",
      sortable: true,
      sortValue: (row) => row.created_at,
      cell: (row) => (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
          {formatTime(row.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Scan member IDs to record event attendance." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-base">Event</CardTitle>
            <CardDescription>Choose the gathering.</CardDescription>
          </CardHeader>
          <CardContent>
            {events.isPending ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : (
              <Select
                value={eventId}
                onValueChange={(value) => {
                  setEventId(value);
                  setTanggalId("");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an event…" />
                </SelectTrigger>
                <SelectContent>
                  {events.data?.map((event) => (
                    <SelectItem key={event.id} value={String(event.id)}>
                      {event.judul_event}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-base">Day</CardTitle>
            <CardDescription>Choose the attendance date.</CardDescription>
          </CardHeader>
          <CardContent>
            {eventId === "" ? (
              <p className="py-2 text-sm text-muted-foreground">Pick an event first.</p>
            ) : tanggal.isPending ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : (
              <Select value={tanggalId} onValueChange={setTanggalId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a day…" />
                </SelectTrigger>
                <SelectContent>
                  {tanggal.data?.map((day) => (
                    <SelectItem key={day.id} value={String(day.id)}>
                      {day.tanggal}
                      {day.set_jam === "dijam"
                        ? ` · ${day.jam_mulai}–${day.jam_selesai}`
                        : " · all day"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      </div>

      {eventId !== "" && tanggalId !== "" ? (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-base">Scan member</CardTitle>
            <CardDescription>Type or scan the member number, then press Enter.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="flex items-end gap-3">
              <div className="relative flex-1">
                <QrCode
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Label htmlFor="scan-code" className="sr-only">
                  Member number
                </Label>
                <Input
                  id="scan-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="font-mono pl-10"
                  placeholder="Scan or type member number…"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={!code.trim() || scan.isPending}
                className="rounded-full"
              >
                {scan.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <QrCode aria-hidden />
                )}
                Record
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {tanggalId === "" ? (
        <p className="text-sm text-muted-foreground">Pick an event and day to see attendance.</p>
      ) : records.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : (
        <DataTable
          rows={records.data ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search present members…"
          search={(row, query) =>
            `${row.dataUser?.nama ?? ""} ${row.id_anggota}`.toLowerCase().includes(query)
          }
        />
      )}
    </div>
  );
}
