import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  QrCode,
  RotateCcw,
  ScanLine,
  Ticket,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { PageHeader } from "@/features/dashboard/page-header";
import { ApiError } from "@/services/api-client";
import { checkIn } from "@/services/mzt-api";
import { eventTanggalQuery, eventsQuery, queryKeys } from "@/services/queries";
import type { CheckInDuplicate, CheckInResult } from "@/types/api";

export const Route = createFileRoute("/dashboard/checkin/")({
  component: CheckInPage,
});

type ResultState =
  | { kind: "idle" }
  | { kind: "valid"; data: CheckInResult }
  | { kind: "duplicate"; firstScannedAt: string | null; firstScannedBy: number | null }
  | { kind: "invalid"; message: string };

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function CheckInPage() {
  const queryClient = useQueryClient();
  const events = useQuery(eventsQuery());

  const [eventId, setEventId] = useState("");
  const [tanggalId, setTanggalId] = useState("");
  const [gate, setGate] = useState("");
  const [manualUuid, setManualUuid] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState>({ kind: "idle" });

  const tanggal = useQuery({
    ...eventTanggalQuery(Number(eventId)),
    enabled: eventId !== "",
  });

  const checkInMutation = useMutation({
    mutationFn: (uuid: string) =>
      checkIn({
        ticket_uuid: uuid.trim(),
        id_tanggal: Number(tanggalId),
        gate: gate.trim() || null,
      }),
    onSuccess: (response) => {
      if (response.data) {
        setResult({ kind: "valid", data: response.data });
      }
      toast.success(response.message ?? "Check-in berhasil");
      if (eventId !== "" && tanggalId !== "") {
        queryClient.invalidateQueries({
          queryKey: queryKeys.attendance(Number(eventId), Number(tanggalId)),
        });
      }
      setManualUuid("");
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          const dup = error.data as CheckInDuplicate | undefined;
          setResult({
            kind: "duplicate",
            firstScannedAt: dup?.first_scanned_at ?? null,
            firstScannedBy: dup?.first_scanned_by ?? null,
          });
        } else if (error.status === 403) {
          setResult({ kind: "invalid", message: "Tidak memiliki izin check-in" });
        } else if (error.status === 404) {
          setResult({ kind: "invalid", message: "Tiket tidak ditemukan" });
        } else if (error.status === 422) {
          setResult({ kind: "invalid", message: "Tiket atau tanggal kegiatan tidak valid" });
        } else {
          setResult({ kind: "invalid", message: "Gagal melakukan check-in" });
        }
      } else {
        setResult({ kind: "invalid", message: "Gagal melakukan check-in" });
      }
      toast.error(error instanceof Error ? error.message : "Gagal check-in");
    },
  });

  // Keep the QR scanner callback pointing at the latest submitter without
  // restarting the camera whenever the closure changes.
  const submitRef = useRef<(uuid: string) => boolean>(() => false);
  submitRef.current = (uuid: string) => {
    const trimmed = uuid.trim();
    if (!trimmed || checkInMutation.isPending || eventId === "" || tanggalId === "") {
      return false;
    }
    checkInMutation.mutate(trimmed);
    return true;
  };

  useEffect(() => {
    if (!cameraActive || typeof window === "undefined") return;

    let disposed = false;
    let scanner: { clear: () => void } | null = null;

    async function start() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (disposed) return;

      const instance = new Html5Qrcode("qr-reader");
      scanner = instance;

      try {
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (submitRef.current(decodedText)) {
              setCameraActive(false);
            }
          },
          () => undefined,
        );
      } catch {
        if (!disposed) {
          setCameraError("Kamera tidak dapat diakses — gunakan input manual.");
          setCameraActive(false);
        }
      }
    }

    void start();

    return () => {
      disposed = true;
      if (scanner) {
        try {
          scanner.clear();
        } catch {
          // Already stopped — nothing to tear down.
        }
      }
    };
  }, [cameraActive]);

  function toggleCamera() {
    if (cameraActive) {
      setCameraActive(false);
    } else {
      setCameraError(null);
      setResult({ kind: "idle" });
      setCameraActive(true);
    }
  }

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (checkInMutation.isPending) return;
    submitRef.current(manualUuid);
  }

  function resetResult() {
    setResult({ kind: "idle" });
    setManualUuid("");
  }

  const ready = eventId !== "" && tanggalId !== "";

  return (
    <div className="space-y-6">
      <PageHeader title="Check-In" description="Scan QR tiket untuk mencatat kehadiran peserta." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-base">Event</CardTitle>
            <CardDescription>Pilih kegiatan.</CardDescription>
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
                  setResult({ kind: "idle" });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih event…" />
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
            <CardTitle className="font-display text-base">Tanggal</CardTitle>
            <CardDescription>Pilih hari kegiatan.</CardDescription>
          </CardHeader>
          <CardContent>
            {eventId === "" ? (
              <p className="py-2 text-sm text-muted-foreground">Pilih event terlebih dahulu.</p>
            ) : tanggal.isPending ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : (
              <Select
                value={tanggalId}
                onValueChange={(value) => {
                  setTanggalId(value);
                  setResult({ kind: "idle" });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih hari…" />
                </SelectTrigger>
                <SelectContent>
                  {tanggal.data?.map((day) => (
                    <SelectItem key={day.id} value={String(day.id)}>
                      {day.tanggal}
                      {day.set_jam === "dijam"
                        ? ` · ${day.jam_mulai}–${day.jam_selesai}`
                        : " · seharian"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      </div>

      {ready ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-base">Pindai QR</CardTitle>
              <CardDescription>Gunakan kamera atau ketik UUID tiket secara manual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="gate">Gate</Label>
                  <Input
                    id="gate"
                    value={gate}
                    onChange={(event) => setGate(event.target.value)}
                    placeholder="Gate A"
                    maxLength={100}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleCamera}
                  className="rounded-full"
                >
                  {cameraActive ? <XCircle aria-hidden /> : <Camera aria-hidden />}
                  {cameraActive ? "Hentikan Kamera" : "Mulai Kamera"}
                </Button>
              </div>

              {cameraActive ? (
                <div
                  id="qr-reader"
                  className="mx-auto aspect-square max-w-sm overflow-hidden rounded-2xl border border-border"
                />
              ) : null}

              {cameraError ? <p className="text-sm text-destructive">{cameraError}</p> : null}

              <form onSubmit={handleManualSubmit} className="flex items-end gap-3">
                <div className="relative flex-1">
                  <QrCode
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Label htmlFor="manual-uuid" className="sr-only">
                    UUID tiket
                  </Label>
                  <Input
                    id="manual-uuid"
                    value={manualUuid}
                    onChange={(event) => setManualUuid(event.target.value)}
                    className="font-mono pl-10"
                    placeholder="UUID tiket…"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!manualUuid.trim() || checkInMutation.isPending}
                  className="rounded-full"
                >
                  {checkInMutation.isPending ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <ScanLine aria-hidden />
                  )}
                  Check-in
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-base">Hasil</CardTitle>
              <CardDescription>Status scan tiket.</CardDescription>
            </CardHeader>
            <CardContent>
              {result.kind === "idle" ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Pindai atau ketik UUID tiket untuk mulai.
                </p>
              ) : null}

              {result.kind === "valid" ? (
                <div className="space-y-4">
                  <Badge className="bg-emerald-600 text-white">
                    <CheckCircle2 className="size-3.5" aria-hidden />
                    Valid — Check-in berhasil
                  </Badge>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <UserRound className="size-4 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Peserta</p>
                        <p className="truncate font-medium">
                          {result.data.participant?.name ?? "—"}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {result.data.participant?.id_anggota ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Ticket className="size-4 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Nomor Tiket</p>
                        <p className="truncate font-mono font-medium">
                          {result.data.ticket.nomor_ticket}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Event</p>
                        <p className="truncate font-medium">{result.data.event.event_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Waktu Check-in</p>
                        <p className="truncate font-medium">
                          {formatDateTime(result.data.attendance.scanned_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" onClick={resetResult} className="rounded-full">
                    <RotateCcw aria-hidden />
                    Scan berikutnya
                  </Button>
                </div>
              ) : null}

              {result.kind === "duplicate" ? (
                <div className="space-y-4">
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-700">
                    <XCircle className="size-3.5" aria-hidden />
                    Duplikat — tiket sudah digunakan
                  </Badge>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      Pertama kali dipindai:{" "}
                      <span className="font-medium text-foreground">
                        {formatDateTime(result.firstScannedAt)}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Oleh petugas ID:{" "}
                      <span className="font-mono font-medium text-foreground">
                        {result.firstScannedBy ?? "—"}
                      </span>
                    </p>
                  </div>
                  <Button variant="outline" onClick={resetResult} className="rounded-full">
                    <RotateCcw aria-hidden />
                    Scan berikutnya
                  </Button>
                </div>
              ) : null}

              {result.kind === "invalid" ? (
                <div className="space-y-4">
                  <Badge variant="destructive">
                    <XCircle className="size-3.5" aria-hidden />
                    Tidak valid
                  </Badge>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  <Button variant="outline" onClick={resetResult} className="rounded-full">
                    <RotateCcw aria-hidden />
                    Coba lagi
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Pilih event dan tanggal untuk mulai.</p>
      )}
    </div>
  );
}
