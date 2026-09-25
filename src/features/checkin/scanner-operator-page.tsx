import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CheckCircle2,
  ExternalLink,
  Loader2,
  QrCode,
  RotateCcw,
  ScanLine,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { CameraScanner } from "@/features/checkin/camera-scanner";
import { createDisplayPublisher } from "@/features/checkin/display-transport";
import { createLookupGate } from "@/features/checkin/scanner";
import { PageHeader } from "@/features/dashboard/page-header";
import { formatPrice } from "@/features/events/event-card";
import { ApiError, mediaUrl } from "@/services/api-client";
import {
  admitScannerParticipantOnsite,
  checkIn,
  lookupScannerParticipant,
} from "@/services/mzt-api";
import { eventTanggalQuery, eventsQuery, queryKeys } from "@/services/queries";
import type {
  CheckInDuplicate,
  ScannerIdentifierType,
  ScannerLookupRequest,
  ScannerLookupResult,
} from "@/types/api";

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

const paymentStatusLabel: Record<string, string> = {
  pending: "Menunggu pembayaran",
  waiting_verification: "Menunggu verifikasi",
  paid: "Lunas",
  rejected: "Ditolak",
  refund: "Dikembalikan",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  failed: "Gagal",
};

function lookupErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "Jaringan bermasalah. Periksa koneksi lalu coba lagi.";
  }
  if (error.status === 404) return "Peserta belum terdaftar atau identifier tidak ditemukan.";
  if (error.status === 409) return "Identifier ambigu atau status tiket/peserta tidak valid.";
  if (error.status === 422) return "Kode, event, atau tanggal tidak valid untuk peserta ini.";
  if (!error.status) return "Jaringan bermasalah. Periksa koneksi lalu coba lagi.";
  if (error.status >= 500) return "Server sedang bermasalah. Coba lagi beberapa saat.";
  return error.message || "Pencarian peserta gagal.";
}

function isCheckInDuplicate(value: unknown): value is CheckInDuplicate {
  if (typeof value !== "object" || value === null) return false;
  const duplicate = value as Record<string, unknown>;
  return (
    (typeof duplicate["first_scanned_at"] === "string" || duplicate["first_scanned_at"] === null) &&
    (typeof duplicate["first_scanned_by"] === "number" || duplicate["first_scanned_by"] === null)
  );
}

interface AttendanceMutationInput {
  participant: ScannerLookupResult;
  idTanggal: number;
  gate: string | null;
}

interface OnsiteMutationInput extends AttendanceMutationInput {
  amount: number;
}

export function ScannerOperatorPage() {
  const queryClient = useQueryClient();
  const events = useQuery(eventsQuery());
  const [eventId, setEventId] = useState("");
  const [tanggalId, setTanggalId] = useState("");
  const [gate, setGate] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [identifierType, setIdentifierType] = useState<ScannerIdentifierType>("ticket");
  const [participant, setParticipant] = useState<ScannerLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [displaySession, setDisplaySession] = useState("");
  const lookupGateRef = useRef(createLookupGate());
  const displayPublisherRef = useRef<ReturnType<typeof createDisplayPublisher> | null>(null);

  useEffect(() => {
    setDisplaySession(globalThis.crypto.randomUUID());
  }, []);

  useEffect(() => {
    if (!displaySession) return;
    const publisher = createDisplayPublisher(displaySession);
    displayPublisherRef.current = publisher;
    publisher.idle();
    return () => {
      publisher.close();
      if (displayPublisherRef.current === publisher) displayPublisherRef.current = null;
    };
  }, [displaySession]);

  const tanggal = useQuery({
    ...eventTanggalQuery(Number(eventId)),
    enabled: eventId !== "",
  });

  const lookup = useMutation({
    mutationFn: (request: ScannerLookupRequest) => lookupScannerParticipant(request),
    onSuccess: (response) => {
      if (response.success !== true || !response.data) {
        const message =
          response.message || "Peserta belum terdaftar atau identifier tidak ditemukan.";
        setLookupError(message);
        toast.error(message);
        return;
      }
      setParticipant(response.data);
      setIdentifier("");
      setLookupError(null);
    },
    onError: (error) => {
      const message = lookupErrorMessage(error);
      setParticipant(null);
      setLookupError(message);
      toast.error(message);
    },
    onSettled: () => lookupGateRef.current.finish(),
  });

  const attendance = useMutation({
    mutationFn: ({
      participant: selected,
      idTanggal,
      gate: selectedGate,
    }: AttendanceMutationInput) =>
      checkIn({
        ticket_uuid: selected.ticket.uuid,
        id_tanggal: idTanggal,
        gate: selectedGate,
      }),
    onSuccess: (response, input) => {
      if (response.success !== true || !response.data) {
        toast.error(response.message || "Konfirmasi kehadiran gagal");
        return;
      }
      const scannedAt = response.data.attendance.scanned_at ?? new Date().toISOString();
      const updated: ScannerLookupResult = {
        ...input.participant,
        ticket: { ...input.participant.ticket, status: "checked_in" },
        attendance: {
          status: "present",
          scanned_at: scannedAt,
          scanned_by: response.data.attendance.scanned_by ?? null,
          gate: response.data.attendance.gate ?? input.gate,
        },
      };
      setParticipant((current) =>
        current?.ticket.uuid === input.participant.ticket.uuid ? updated : current,
      );
      invalidateAttendance(input.participant.event.id_event, input.idTanggal);
      displayPublisherRef.current?.success(updated, mediaUrl(updated.participant.foto));
      toast.success(response.message ?? "Kehadiran berhasil dikonfirmasi");
    },
    onError: (error, input) => {
      if (error instanceof ApiError && error.status === 409 && isCheckInDuplicate(error.data)) {
        const duplicate = error.data;
        setParticipant((current) =>
          current?.ticket.uuid === input.participant.ticket.uuid
            ? {
                ...current,
                attendance: {
                  ...current.attendance,
                  status: "present",
                  scanned_at: duplicate.first_scanned_at ?? current.attendance.scanned_at,
                  scanned_by: duplicate.first_scanned_by ?? current.attendance.scanned_by,
                },
              }
            : current,
        );
        toast.error("Peserta sudah hadir");
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "Konfirmasi kehadiran gagal");
    },
  });

  const onsite = useMutation({
    mutationFn: ({
      participant: selected,
      idTanggal,
      gate: selectedGate,
      amount,
    }: OnsiteMutationInput) =>
      admitScannerParticipantOnsite({
        ticket_uuid: selected.ticket.uuid,
        id_tanggal: idTanggal,
        gate: selectedGate,
        amount,
      }),
    onSuccess: (response, input) => {
      if (response.success !== true || !response.data) {
        toast.error(response.message || "Pembayaran onsite gagal disimpan");
        return;
      }
      const updated = response.data;
      setParticipant((current) =>
        current?.ticket.uuid === input.participant.ticket.uuid ? updated : current,
      );
      invalidateAttendance(input.participant.event.id_event, input.idTanggal);
      displayPublisherRef.current?.success(updated, mediaUrl(updated.participant.foto));
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

  function invalidateAttendance(
    selectedEventId = Number(eventId),
    selectedTanggalId = Number(tanggalId),
  ) {
    if (!selectedEventId || !selectedTanggalId) return;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.attendance(selectedEventId, selectedTanggalId),
    });
  }

  function reset(publishIdle = true) {
    setParticipant(null);
    setIdentifier("");
    setLookupError(null);
    lookupGateRef.current.reset();
    lookup.reset();
    attendance.reset();
    onsite.reset();
    if (publishIdle) displayPublisherRef.current?.idle();
  }

  function submitIdentifier(value: string, type: ScannerIdentifierType) {
    const trimmed = value.trim();
    if (!trimmed) {
      setLookupError("Kode tidak boleh kosong.");
      return false;
    }
    if (
      !eventId ||
      !tanggalId ||
      attendance.isPending ||
      onsite.isPending ||
      !lookupGateRef.current.tryStart(trimmed, type)
    ) {
      return false;
    }
    displayPublisherRef.current?.idle();
    setParticipant(null);
    setLookupError(null);
    lookup.mutate({
      identifier: trimmed,
      identifier_type: type,
      id_event: Number(eventId),
      id_tanggal: Number(tanggalId),
    });
    return true;
  }

  function openDisplay() {
    if (!displaySession) return;
    displayPublisherRef.current?.idle();
    window.open(
      `/dashboard/scanner/display?session=${encodeURIComponent(displaySession)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const ready = Boolean(eventId && tanggalId);
  const actionPending = lookup.isPending || attendance.isPending || onsite.isPending;
  const isPaid = participant?.payment.status === "paid";
  const isPresent = participant?.attendance.status === "present";
  const canPayOnsite = participant?.payment.choice === "pay_at_venue" && !isPaid;
  const onsiteAmount = participant?.payment.amount;
  const onsiteAmountNumber = Number(onsiteAmount);
  const onsiteAmountValid = Number.isFinite(onsiteAmountNumber) && onsiteAmountNumber > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scanner Peserta"
        description="Pindai QR tiket atau barcode kartu anggota, periksa peserta, lalu konfirmasi kehadiran."
        actions={
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={!displaySession}
            onClick={openDisplay}
          >
            <ExternalLink aria-hidden />
            Buka Layar Peserta
          </Button>
        }
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
                disabled={actionPending}
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
                disabled={actionPending}
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
              <CardTitle className="font-display text-base">Pindai Peserta</CardTitle>
              <CardDescription>
                QR dibaca sebagai tiket. Code 39 dan Code 128 dibaca sebagai kartu anggota.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="scanner-gate">Gate</Label>
                <Input
                  id="scanner-gate"
                  value={gate}
                  onChange={(event) => setGate(event.target.value)}
                  placeholder="Gate A"
                  maxLength={100}
                />
              </div>

              {!participant ? (
                <CameraScanner
                  onDecode={submitIdentifier}
                  onStart={() => displayPublisherRef.current?.idle()}
                />
              ) : null}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitIdentifier(identifier, identifierType);
                }}
                className="space-y-3"
              >
                <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
                  <div className="space-y-1.5">
                    <Label htmlFor="scanner-identifier-type">Jenis identifier</Label>
                    <Select
                      value={identifierType}
                      onValueChange={(value: ScannerIdentifierType) => setIdentifierType(value)}
                    >
                      <SelectTrigger id="scanner-identifier-type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ticket">Tiket</SelectItem>
                        <SelectItem value="member_card">Kartu Anggota</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="scanner-identifier">Kode</Label>
                    <div className="relative">
                      <QrCode
                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="scanner-identifier"
                        value={identifier}
                        onChange={(event) => setIdentifier(event.target.value)}
                        className="font-mono pl-10"
                        placeholder="Masukkan kode tanpa mengubah angka nol…"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={!identifier.trim() || lookup.isPending}
                  className="w-full rounded-full"
                >
                  {lookup.isPending ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <ScanLine aria-hidden />
                  )}
                  Cari Peserta
                </Button>
              </form>

              {lookupError ? (
                <p
                  className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                  role="alert"
                >
                  {lookupError}
                </p>
              ) : null}
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
                  Pindai kode untuk melihat data peserta terdaftar.
                </p>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="size-20 border">
                      <AvatarImage
                        src={mediaUrl(participant.participant.foto) ?? undefined}
                        alt={`Foto ${participant.participant.name}`}
                        className="object-cover"
                      />
                      <AvatarFallback aria-label="Foto peserta tidak tersedia">
                        <UserRound className="size-8" aria-hidden />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold">
                        {participant.participant.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {participant.participant.niqobah || "Niqobah belum tercatat"}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {participant.participant.id_anggota}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={isPaid ? "default" : "outline"}>
                      Pembayaran:{" "}
                      {paymentStatusLabel[participant.payment.status] ?? participant.payment.status}
                    </Badge>
                    <Badge variant={isPresent ? "default" : "secondary"}>
                      Kehadiran: {isPresent ? "Hadir" : "Belum Hadir"}
                    </Badge>
                  </div>

                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
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
                    <Detail label="Outstanding" value={amount(participant.payment.amount)} />
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
                        <Label htmlFor="onsite-amount">Outstanding dari server</Label>
                        <Input
                          id="onsite-amount"
                          type="number"
                          inputMode="numeric"
                          value={onsiteAmount ?? ""}
                          readOnly
                          className="mt-2"
                        />
                      </div>
                      <Button
                        className="w-full rounded-full"
                        disabled={!onsiteAmountValid || onsite.isPending}
                        onClick={() =>
                          onsite.mutate({
                            participant,
                            idTanggal: Number(tanggalId),
                            gate: gate.trim() || null,
                            amount: onsiteAmountNumber,
                          })
                        }
                      >
                        {onsite.isPending ? (
                          <Loader2 className="animate-spin" aria-hidden />
                        ) : (
                          <Banknote aria-hidden />
                        )}
                        Bayar di Tempat dan Check-in
                      </Button>
                    </div>
                  ) : isPaid ? (
                    <Button
                      className="w-full rounded-full"
                      disabled={attendance.isPending}
                      onClick={() =>
                        attendance.mutate({
                          participant,
                          idTanggal: Number(tanggalId),
                          gate: gate.trim() || null,
                        })
                      }
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
                      Pembayaran bayar sekarang belum lunas. Check-in diblokir.
                    </p>
                  )}

                  <Button
                    variant="outline"
                    className="rounded-full"
                    disabled={actionPending}
                    onClick={() => reset()}
                  >
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
