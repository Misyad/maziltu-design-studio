import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  Camera,
  CheckCircle2,
  Loader2,
  QrCode,
  RotateCcw,
  ScanLine,
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
import { formatPrice } from "@/features/events/event-card";
import { CHECKIN_ROLES, requireRoles } from "@/lib/auth";
import { ApiError } from "@/services/api-client";
import {
  admitScannerParticipantOnsite,
  checkIn,
  lookupScannerParticipant,
} from "@/services/mzt-api";
import { eventTanggalQuery, eventsQuery, queryKeys } from "@/services/queries";
import type { CheckInDuplicate, ScannerLookupResult } from "@/types/api";

export const Route = createFileRoute("/dashboard/checkin/")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, CHECKIN_ROLES, location.href),
  component: ScannerPage,
});

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function amount(value: number | string | null) {
  if (value === null) return "—";
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? formatPrice(parsed) : "—";
}

function scannerError(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}`.toLowerCase() : "";
  if (text.includes("permission") || text.includes("notallowed")) {
    return "Izin kamera ditolak. Izinkan kamera di pengaturan browser atau gunakan input manual.";
  }
  if (text.includes("notfound") || text.includes("device") || text.includes("camera")) {
    return "Kamera tidak tersedia. Pastikan perangkat memiliki kamera atau gunakan input manual.";
  }
  if (text.includes("secure") || text.includes("support")) {
    return "Perangkat atau browser tidak kompatibel. Gunakan browser terbaru atau input manual.";
  }
  return "Kamera belum dapat digunakan. Coba lagi atau gunakan input manual.";
}

export function ScannerPage() {
  const queryClient = useQueryClient();
  const events = useQuery(eventsQuery());
  const [eventId, setEventId] = useState("");
  const [tanggalId, setTanggalId] = useState("");
  const [gate, setGate] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [onsiteAmount, setOnsiteAmount] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [participant, setParticipant] = useState<ScannerLookupResult | null>(null);

  const tanggal = useQuery({
    ...eventTanggalQuery(Number(eventId)),
    enabled: eventId !== "",
  });

  const lookup = useMutation({
    mutationFn: (value: string) =>
      lookupScannerParticipant({
        identifier: value.trim(),
        id_event: Number(eventId),
        id_tanggal: Number(tanggalId),
      }),
    onSuccess: (response) => {
      if (!response.data) {
        toast.error("Data peserta tidak ditemukan");
        return;
      }
      setParticipant(response.data);
      setIdentifier("");
      setOnsiteAmount("");
      setCameraActive(false);
    },
    onError: (error) => {
      setParticipant(null);
      if (error instanceof ApiError && error.status === 404) {
        toast.error("Tiket atau peserta tidak ditemukan");
        return;
      }
      if (error instanceof ApiError && error.status === 422) {
        toast.error("Tiket tidak berlaku untuk event atau tanggal ini");
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "Pencarian peserta gagal");
    },
  });

  const attendance = useMutation({
    mutationFn: () => {
      if (!participant) throw new Error("Peserta belum dipilih");
      return checkIn({
        ticket_uuid: participant.ticket.uuid,
        id_tanggal: Number(tanggalId),
        gate: gate.trim() || null,
      });
    },
    onSuccess: (response) => {
      const scannedAt = response.data?.attendance.scanned_at ?? new Date().toISOString();
      setParticipant((current) =>
        current
          ? {
              ...current,
              ticket: { ...current.ticket, status: "checked_in" },
              attendance: {
                status: "present",
                scanned_at: scannedAt,
                scanned_by: response.data?.attendance.scanned_by ?? null,
                gate: response.data?.attendance.gate ?? (gate.trim() || null),
              },
            }
          : null,
      );
      invalidateAttendance();
      toast.success(response.message ?? "Kehadiran berhasil dikonfirmasi");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        const duplicate = error.data as CheckInDuplicate | undefined;
        setParticipant((current) =>
          current
            ? {
                ...current,
                attendance: {
                  ...current.attendance,
                  status: "present",
                  scanned_at: duplicate?.first_scanned_at ?? current.attendance.scanned_at,
                  scanned_by: duplicate?.first_scanned_by ?? current.attendance.scanned_by,
                },
              }
            : null,
        );
        toast.error("Peserta sudah hadir");
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "Konfirmasi kehadiran gagal");
    },
  });

  const onsite = useMutation({
    mutationFn: () => {
      if (!participant) throw new Error("Peserta belum dipilih");
      return admitScannerParticipantOnsite({
        ticket_uuid: participant.ticket.uuid,
        id_tanggal: Number(tanggalId),
        gate: gate.trim() || null,
        amount: Number(onsiteAmount),
      });
    },
    onSuccess: (response) => {
      if (response.data) setParticipant(response.data);
      setOnsiteAmount("");
      invalidateAttendance();
      toast.success(response.message ?? "Pembayaran dan kehadiran berhasil disimpan");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error(error.message || "Pembayaran atau kehadiran sudah tercatat");
        return;
      }
      if (error instanceof ApiError && error.status === 422) {
        toast.error(error.message || "Nominal pembayaran tidak valid");
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "Pembayaran onsite gagal disimpan");
    },
  });

  function invalidateAttendance() {
    if (!eventId || !tanggalId) return;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.attendance(Number(eventId), Number(tanggalId)),
    });
  }

  const submitRef = useRef<(value: string) => boolean>(() => false);
  submitRef.current = (value) => {
    const trimmed = value.trim();
    if (!trimmed || lookup.isPending || !eventId || !tanggalId) return false;
    lookup.mutate(trimmed);
    return true;
  };

  useEffect(() => {
    if (!cameraActive || typeof window === "undefined") return;
    let disposed = false;
    let scanner: { clear: () => Promise<void> | void } | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (disposed) return;
        const instance = new Html5Qrcode("scanner-reader");
        scanner = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 180 } },
          (decodedText) => {
            if (submitRef.current(decodedText)) setCameraActive(false);
          },
          () => undefined,
        );
        timeout = setTimeout(() => {
          if (!disposed) {
            setCameraError(
              "Pemindaian belum menemukan kode. Arahkan QR/barcode dengan jelas atau gunakan input manual.",
            );
            setCameraActive(false);
          }
        }, 30000);
      } catch (error) {
        if (!disposed) {
          setCameraError(scannerError(error));
          setCameraActive(false);
        }
      }
    }

    void start();
    return () => {
      disposed = true;
      if (timeout) clearTimeout(timeout);
      if (scanner) void Promise.resolve(scanner.clear()).catch(() => undefined);
    };
  }, [cameraActive]);

  function reset() {
    setParticipant(null);
    setIdentifier("");
    setOnsiteAmount("");
    lookup.reset();
    attendance.reset();
    onsite.reset();
  }

  const ready = Boolean(eventId && tanggalId);
  const isPaid = participant?.payment.status === "paid";
  const isPresent = participant?.attendance.status === "present";
  const canPayOnsite = participant?.payment.choice === "pay_at_venue" && !isPaid;
  const onsiteAmountValid = Number.isInteger(Number(onsiteAmount)) && Number(onsiteAmount) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scanner Peserta"
        description="Pindai QR atau barcode, periksa peserta, lalu konfirmasi pembayaran dan kehadiran."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-base">Event</CardTitle>
            <CardDescription>Pilih kegiatan.</CardDescription>
          </CardHeader>
          <CardContent>
            {events.isPending ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : events.isError ? (
              <p className="text-sm text-destructive">Event tidak dapat dimuat.</p>
            ) : (
              <Select
                value={eventId}
                onValueChange={(value) => {
                  setEventId(value);
                  setTanggalId("");
                  reset();
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
            {!eventId ? (
              <p className="py-2 text-sm text-muted-foreground">Pilih event terlebih dahulu.</p>
            ) : tanggal.isPending ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : tanggal.isError ? (
              <p className="text-sm text-destructive">Tanggal kegiatan tidak dapat dimuat.</p>
            ) : (
              <Select
                value={tanggalId}
                onValueChange={(value) => {
                  setTanggalId(value);
                  reset();
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

      {!ready ? (
        <p className="text-sm text-muted-foreground">Pilih event dan tanggal untuk mulai.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-base">Pindai Tiket</CardTitle>
              <CardDescription>
                Kamera mendukung QR dan barcode. Input manual selalu tersedia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="scanner-gate">Gate</Label>
                  <Input
                    id="scanner-gate"
                    value={gate}
                    onChange={(event) => setGate(event.target.value)}
                    placeholder="Gate A"
                    maxLength={100}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCameraError(null);
                    setCameraActive((active) => !active);
                  }}
                  className="rounded-full"
                >
                  {cameraActive ? <XCircle aria-hidden /> : <Camera aria-hidden />}
                  {cameraActive ? "Hentikan Kamera" : "Mulai Kamera"}
                </Button>
              </div>

              {cameraActive ? (
                <div
                  id="scanner-reader"
                  className="mx-auto aspect-video max-w-md overflow-hidden rounded-2xl border border-border"
                />
              ) : null}

              {cameraError ? (
                <div
                  className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
                  role="alert"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>{cameraError}</p>
                </div>
              ) : null}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitRef.current(identifier);
                }}
                className="flex items-end gap-3"
              >
                <div className="relative flex-1">
                  <QrCode
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Label htmlFor="scanner-identifier" className="sr-only">
                    Identifier tiket
                  </Label>
                  <Input
                    id="scanner-identifier"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    className="font-mono pl-10"
                    placeholder="QR, barcode, atau UUID tiket…"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!identifier.trim() || lookup.isPending}
                  className="rounded-full"
                >
                  {lookup.isPending ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <ScanLine aria-hidden />
                  )}
                  Cari
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-base">Peserta</CardTitle>
              <CardDescription>Scan tidak otomatis mencatat kehadiran.</CardDescription>
            </CardHeader>
            <CardContent>
              {!participant ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Pindai tiket untuk melihat data peserta.
                </p>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={isPaid ? "default" : "outline"}>
                      Pembayaran: {isPaid ? "Lunas" : "Belum Bayar"}
                    </Badge>
                    <Badge variant={isPresent ? "default" : "secondary"}>
                      Kehadiran: {isPresent ? "Hadir" : "Belum Hadir"}
                    </Badge>
                  </div>

                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <Detail label="Nama" value={participant.participant.name} />
                    <Detail label="Nomor Anggota" value={participant.participant.id_anggota} mono />
                    <Detail label="Event" value={participant.event.event_name} />
                    <Detail label="Nomor Tiket" value={participant.ticket.nomor_ticket} mono />
                    <Detail
                      label="Metode Pembayaran"
                      value={
                        participant.payment.choice === "pay_at_venue"
                          ? "Bayar di tempat"
                          : "Bayar sekarang"
                      }
                    />
                    <Detail label="Nominal" value={amount(participant.payment.amount)} />
                    {participant.payment.source ? (
                      <Detail label="Sumber" value={participant.payment.source} />
                    ) : null}
                    {participant.payment.paid_at ? (
                      <Detail label="Dibayar" value={formatDateTime(participant.payment.paid_at)} />
                    ) : null}
                    {isPresent ? (
                      <Detail
                        label="Waktu Hadir"
                        value={formatDateTime(participant.attendance.scanned_at)}
                      />
                    ) : null}
                  </dl>

                  {isPresent ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                      <CheckCircle2 className="size-4" aria-hidden />
                      Peserta sudah hadir. Tidak ada kehadiran baru yang dibuat.
                    </div>
                  ) : canPayOnsite ? (
                    <div className="space-y-3 rounded-xl border p-4">
                      <div>
                        <Label htmlFor="onsite-amount">Nominal pembayaran onsite</Label>
                        <Input
                          id="onsite-amount"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={onsiteAmount}
                          onChange={(event) => setOnsiteAmount(event.target.value)}
                          className="mt-2"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Backend memvalidasi nominal terhadap harga registrasi.
                        </p>
                      </div>
                      <Button
                        className="w-full rounded-full"
                        disabled={!onsiteAmount || !onsiteAmountValid || onsite.isPending}
                        onClick={() => onsite.mutate()}
                      >
                        {onsite.isPending ? (
                          <Loader2 className="animate-spin" aria-hidden />
                        ) : (
                          <Banknote aria-hidden />
                        )}
                        Simpan Pembayaran dan Kehadiran
                      </Button>
                    </div>
                  ) : isPaid ? (
                    <Button
                      className="w-full rounded-full"
                      disabled={attendance.isPending}
                      onClick={() => attendance.mutate()}
                    >
                      {attendance.isPending ? (
                        <Loader2 className="animate-spin" aria-hidden />
                      ) : (
                        <CheckCircle2 aria-hidden />
                      )}
                      Konfirmasi Hadir
                    </Button>
                  ) : (
                    <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                      Pembayaran belum lunas. Kehadiran belum dapat dikonfirmasi.
                    </p>
                  )}

                  <Button variant="outline" className="rounded-full" onClick={reset}>
                    <RotateCcw aria-hidden />
                    Scan berikutnya
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={mono ? "mt-1 break-words font-mono text-xs" : "mt-1 break-words font-medium"}>
        {value || "—"}
      </dd>
    </div>
  );
}
