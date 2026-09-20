import { useMutation } from "@tanstack/react-query";
import { IdCard, Loader2, QrCode, Search, ShieldCheck } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KtaPrintRequestBlock } from "@/features/kta/kta-print-request";
import { ApiError } from "@/services/api-client";
import { ktaCheck, ktaVerify } from "@/services/mzt-api";
import type { KtaCheckRequest, KtaDisambiguateField, KtaVerifiedResult } from "@/types/api";

type Mode = "name_dob" | "member_id";

type Stage =
  | { name: "lookup" }
  | { name: "choose_verification"; token: string; attemptsLeft: number | null }
  | { name: "verify_hp"; token: string; attemptsLeft: number | null }
  | { name: "verify_fallback"; token: string; attemptsLeft: number | null }
  | {
      name: "disambiguate";
      token: string;
      field: KtaDisambiguateField;
      attemptsLeft: number | null;
    }
  | { name: "result"; result: KtaVerifiedResult }
  | { name: "manual_review"; message: string }
  | { name: "locked" };

/**
 * Public "Cek Status KTA" flow.
 * Anti-enumeration contract: the lookup response NEVER says whether zero,
 * one or many members matched. The UI therefore cannot short-circuit to a
 * result — it always continues to a verification step (HP last-4, the
 * two-field fallback, or stepwise disambiguation). Raw PII is never rendered:
 * only the masked fields the backend returns.
 *
 * Disambiguation order is fixed server-side (config/kta.php) and mirrored
 * here so the form can advance one field at a time without the response ever
 * revealing how many candidates remain.
 */
const DISAMBIGUATION_ORDER: KtaDisambiguateField[] = ["tahun_masuk", "tempat_lahir", "niqobah"];

function formatDobInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDob(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900 || month < 1 || month > 12 || day < 1) return null;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;

  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const today = new Date();
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return iso <= todayIso ? iso : null;
}

export function CekKtaForm() {
  const [mode, setMode] = useState<Mode>("name_dob");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [dobError, setDobError] = useState("");
  const [memberId, setMemberId] = useState("");
  const [hpLast4, setHpLast4] = useState("");
  const [tahunMasuk, setTahunMasuk] = useState("");
  const [tempatLahir, setTempatLahir] = useState("");
  const [disValue, setDisValue] = useState("");
  const [stage, setStage] = useState<Stage>({ name: "lookup" });

  const reset = () => {
    setStage({ name: "lookup" });
    setHpLast4("");
    setTahunMasuk("");
    setTempatLahir("");
    setDisValue("");
  };

  const check = useMutation({
    mutationFn: (payload: KtaCheckRequest) => ktaCheck(payload),
    onSuccess: (res) => {
      const data = res?.data;
      if (!data?.challenge_token) {
        toast.error("Terjadi kesalahan. Coba lagi.");
        return;
      }
      // Generic — we do not know (and must not guess) whether this will be a
      // single candidate, ambiguous, or a dead end.
      setStage({ name: "choose_verification", token: data.challenge_token, attemptsLeft: null });
    },
    onError: (error: unknown) => {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 429) {
        toast.error("Terlalu banyak percobaan. Coba lagi nanti.");
      } else {
        toast.error("Permintaan gagal. Periksa data lalu coba lagi.");
      }
    },
  });

  const verify = useMutation({
    mutationFn: ktaVerify,
    onSuccess: (res) => {
      const data = res?.data;

      if (data && "verified" in data && data.verified) {
        setStage({ name: "result", result: data });
        return;
      }

      if (data && "stage" in data && data.stage === "manual_review") {
        setStage({ name: "manual_review", message: data.message });
        return;
      }

      // Intermediate challenges stay opaque. Preserve the explicit no-phone
      // route; otherwise advance through the fixed disambiguation sequence.
      if (data && "challenge_token" in data) {
        const attemptsLeft = "attempts_left" in data ? (data.attempts_left ?? null) : null;
        setDisValue("");
        setHpLast4("");
        setStage((prev) => {
          if (prev.name === "verify_fallback") {
            return { name: "verify_fallback", token: data.challenge_token, attemptsLeft };
          }

          const nextIndex =
            prev.name === "disambiguate" ? DISAMBIGUATION_ORDER.indexOf(prev.field) + 1 : 0;
          const nextDis = DISAMBIGUATION_ORDER[nextIndex];

          if (nextDis) {
            return {
              name: "disambiguate",
              token: data.challenge_token,
              field: nextDis,
              attemptsLeft,
            };
          }

          return { name: "verify_hp", token: data.challenge_token, attemptsLeft };
        });
        return;
      }

      toast.error("Verifikasi gagal. Coba lagi.");
    },
    onError: (error: unknown) => {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 403) {
        setStage({ name: "locked" });
        return;
      }
      if (status === 401) {
        toast.error("Sesi verifikasi kedaluwarsa. Silakan mulai ulang.");
        reset();
        return;
      }
      toast.error("Verifikasi gagal. Coba lagi.");
    },
  });

  const pending = check.isPending || verify.isPending;

  function handleLookup(event: FormEvent) {
    event.preventDefault();
    if (mode === "name_dob") {
      const parsedDob = parseDob(dob);
      if (!parsedDob) {
        setDobError("Tanggal lahir tidak valid. Gunakan format DD/MM/YYYY.");
        return;
      }

      setDobError("");
      check.mutate({ mode: "name_dob", name: name.trim(), tanggal_lahir: parsedDob });
    } else {
      check.mutate({ mode: "member_id", id_anggota: memberId.trim() });
    }
  }

  function handleVerifyHp(event: FormEvent) {
    event.preventDefault();
    if (stage.name !== "verify_hp") return;
    verify.mutate({ challenge_token: stage.token, method: "hp_last4", value: hpLast4.trim() });
  }

  function handleVerifyFallback(event: FormEvent) {
    event.preventDefault();
    if (stage.name !== "verify_fallback") return;
    verify.mutate({
      challenge_token: stage.token,
      method: "no_hp_fallback",
      value: { tahun_masuk: tahunMasuk.trim(), tempat_lahir: tempatLahir.trim() },
    });
  }

  function handleDisambiguate(event: FormEvent) {
    event.preventDefault();
    if (stage.name !== "disambiguate") return;
    verify.mutate({
      challenge_token: stage.token,
      method: "disambiguate",
      field: stage.field,
      value: disValue.trim(),
    });
  }

  // ── Result ───────────────────────────────────────────────────────────────
  if (stage.name === "result") {
    const r = stage.result;
    return (
      <div
        className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8"
        data-testid="kta-result"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">Identitas terverifikasi</p>
            <p className="text-sm text-muted-foreground">Hasil pencarian status KTA Anda.</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Nama
            </dt>
            <dd className="mt-1 font-medium">{r.nama_masked}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Nomor Anggota
            </dt>
            <dd className="mt-1 font-mono text-xs font-medium">{r.id_anggota_masked}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Status
            </dt>
            <dd className="mt-1 font-medium">
              {r.status === "active" ? "Terdaftar (aktif)" : "Terdaftar (non-aktif)"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Kartu Fisik
            </dt>
            <dd className="mt-1 font-medium">
              Status pengajuan tersedia setelah Anda mengajukan cetak KTA.
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-surface p-5">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
            <QrCode className="size-4" aria-hidden />
            QR Anggota
          </span>
          <QRCodeCanvas value={r.qr_payload} size={148} level="M" includeMargin />
        </div>

        {r.print_token ? (
          <KtaPrintRequestBlock
            printToken={r.print_token}
            status={r.status}
            {...(r.print_amount === undefined ? {} : { baseAmount: r.print_amount })}
          />
        ) : null}

        <Button variant="outline" className="mt-6 w-full rounded-full" onClick={reset}>
          Cek anggota lain
        </Button>
      </div>
    );
  }

  if (stage.name === "locked") {
    return (
      <div
        className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8"
        data-testid="kta-locked"
      >
        <p className="font-display text-lg font-semibold">Terlalu banyak percobaan</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Demi keamanan, sesi verifikasi ini dikunci. Bila data Anda belum terdaftar, silakan daftar
          sebagai anggota.
        </p>
        <RegisterCta />
        <Button variant="outline" className="mt-3 w-full rounded-full" onClick={reset}>
          Mulai ulang
        </Button>
      </div>
    );
  }

  if (stage.name === "manual_review") {
    return (
      <div
        className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8"
        data-testid="kta-manual-review"
      >
        <p className="font-display text-lg font-semibold">Perlu verifikasi manual</p>
        <p className="mt-2 text-sm text-muted-foreground">{stage.message}</p>
        <RegisterCta />
        <Button variant="outline" className="mt-3 w-full rounded-full" onClick={reset}>
          Mulai ulang
        </Button>
      </div>
    );
  }

  // ── Verification steps ───────────────────────────────────────────────────
  if (stage.name === "choose_verification") {
    return (
      <div
        className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8"
        data-testid="kta-verification-choice"
      >
        <p className="font-display text-lg font-semibold">Pilih cara verifikasi</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Gunakan data yang sudah terdaftar untuk memverifikasi kepemilikan.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            className="rounded-full"
            onClick={() => setStage({ ...stage, name: "verify_hp" } as Stage)}
          >
            Saya punya nomor HP
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => setStage({ ...stage, name: "verify_fallback" } as Stage)}
          >
            Saya tidak punya nomor HP
          </Button>
        </div>
      </div>
    );
  }

  if (stage.name === "verify_hp") {
    return (
      <form
        onSubmit={handleVerifyHp}
        className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8"
        data-testid="kta-verify-hp"
      >
        <p className="font-display text-lg font-semibold">Verifikasi kepemilikan</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Masukkan 4 digit terakhir nomor HP yang terdaftar.
        </p>
        <label htmlFor="kta-hp" className="mt-5 block text-sm font-medium">
          4 digit terakhir nomor HP
        </label>
        <input
          id="kta-hp"
          inputMode="numeric"
          maxLength={4}
          value={hpLast4}
          onChange={(e) => setHpLast4(e.target.value.replace(/\D/g, ""))}
          className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm tracking-[0.4em] outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          placeholder="••••"
        />
        {stage.attemptsLeft !== null && (
          <p className="mt-2 text-xs text-muted-foreground">Sisa percobaan: {stage.attemptsLeft}</p>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            type="submit"
            disabled={pending || hpLast4.length !== 4}
            className="flex-1 rounded-full"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Verifikasi
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => setStage({ ...stage, name: "verify_fallback" } as Stage)}
          >
            Tidak punya nomor HP?
          </Button>
        </div>
      </form>
    );
  }

  if (stage.name === "verify_fallback") {
    return (
      <form
        onSubmit={handleVerifyFallback}
        className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8"
        data-testid="kta-verify-fallback"
      >
        <p className="font-display text-lg font-semibold">Verifikasi data pendukung</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Lengkapi dua data berikut untuk memverifikasi kepemilikan.
        </p>
        <label htmlFor="kta-tahun" className="mt-5 block text-sm font-medium">
          Tahun masuk
        </label>
        <input
          id="kta-tahun"
          value={tahunMasuk}
          onChange={(e) => setTahunMasuk(e.target.value)}
          className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          placeholder="mis. 2011"
        />
        <label htmlFor="kta-tempat" className="mt-4 block text-sm font-medium">
          Tempat lahir
        </label>
        <input
          id="kta-tempat"
          value={tempatLahir}
          onChange={(e) => setTempatLahir(e.target.value)}
          className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
          placeholder="mis. Malang"
        />
        {stage.attemptsLeft !== null && (
          <p className="mt-2 text-xs text-muted-foreground">Sisa percobaan: {stage.attemptsLeft}</p>
        )}
        <Button
          type="submit"
          disabled={pending || !tahunMasuk.trim() || !tempatLahir.trim()}
          className="mt-5 w-full rounded-full"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Verifikasi
        </Button>
      </form>
    );
  }

  if (stage.name === "disambiguate") {
    const LABELS: Record<KtaDisambiguateField, string> = {
      tahun_masuk: "Tahun masuk",
      tempat_lahir: "Tempat lahir",
      niqobah: "Niqobah",
    };
    return (
      <form
        onSubmit={handleDisambiguate}
        className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8"
        data-testid="kta-disambiguate"
      >
        <p className="font-display text-lg font-semibold">Lengkapi data</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ada lebih dari satu data yang cocok. Jawab pertanyaan berikut untuk mempersempit.
        </p>
        <label htmlFor="kta-dis" className="mt-5 block text-sm font-medium">
          {LABELS[stage.field]}
        </label>
        <input
          id="kta-dis"
          value={disValue}
          onChange={(e) => setDisValue(e.target.value)}
          className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        {stage.attemptsLeft !== null && (
          <p className="mt-2 text-xs text-muted-foreground">Sisa percobaan: {stage.attemptsLeft}</p>
        )}
        <Button
          type="submit"
          disabled={pending || !disValue.trim()}
          className="mt-5 w-full rounded-full"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Lanjutkan
        </Button>
      </form>
    );
  }

  // ── Lookup ───────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleLookup}
      className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft sm:p-8"
      data-testid="kta-lookup"
    >
      <fieldset disabled={pending}>
        <legend className="font-display text-lg font-semibold">Cari status KTA</legend>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih cara pencarian yang paling sesuai.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            data-testid="kta-mode-name"
            aria-pressed={mode === "name_dob"}
            onClick={() => setMode("name_dob")}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              mode === "name_dob" ? "border-primary bg-primary-soft" : "border-border/70 bg-card"
            }`}
          >
            <IdCard className="size-5 text-primary" aria-hidden />
            <p className="mt-2 text-sm font-semibold">Saya tidak tahu nomor anggota</p>
            <p className="mt-1 text-xs text-muted-foreground">Cari dengan nama + tanggal lahir.</p>
          </button>
          <button
            type="button"
            data-testid="kta-mode-member"
            aria-pressed={mode === "member_id"}
            onClick={() => setMode("member_id")}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              mode === "member_id" ? "border-primary bg-primary-soft" : "border-border/70 bg-card"
            }`}
          >
            <Search className="size-5 text-primary" aria-hidden />
            <p className="mt-2 text-sm font-semibold">Saya tahu nomor anggota</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cari langsung dengan nomor anggota.
            </p>
          </button>
        </div>

        {mode === "name_dob" ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="kta-name" className="text-sm font-medium">
                Nama lengkap
              </label>
              <input
                id="kta-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
                placeholder="Nama sesuai data pesantren"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="kta-dob" className="text-sm font-medium">
                Tanggal lahir
              </label>
              <input
                id="kta-dob"
                type="text"
                inputMode="numeric"
                autoComplete="bday"
                maxLength={10}
                required
                value={dob}
                onChange={(e) => {
                  setDob(formatDobInput(e.target.value));
                  setDobError("");
                }}
                aria-invalid={dobError ? "true" : undefined}
                aria-describedby="kta-dob-hint"
                placeholder="DD/MM/YYYY"
                className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <p
                id="kta-dob-hint"
                className={`mt-2 text-xs ${dobError ? "text-destructive" : "text-muted-foreground"}`}
              >
                {dobError || "Format: DD/MM/YYYY"}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <label htmlFor="kta-member-id" className="text-sm font-medium">
              Nomor anggota
            </label>
            <input
              id="kta-member-id"
              required
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
              placeholder="mis. 0174011119"
            />
          </div>
        )}

        <Button
          type="submit"
          disabled={pending || (mode === "name_dob" ? !name.trim() || !dob : !memberId.trim())}
          className="mt-6 w-full rounded-full sm:w-auto sm:px-8"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? "Memeriksa..." : "Cek status"}
        </Button>

        <p className="mt-3 text-xs text-muted-foreground">
          Data yang tampil selalu disamarkan. Pemilik data harus melewati verifikasi kepemilikan.
        </p>
      </fieldset>
    </form>
  );
}

/**
 * CTA shown on terminal states. The registry has no public self-service
 * registration yet, so this routes to the existing contact channel instead of
 * inventing a second registration system (PRD v3.0 §4/§11).
 */
function RegisterCta() {
  return (
    <div
      className="mt-6 rounded-2xl border border-border/60 bg-surface p-5"
      data-testid="kta-register-cta"
    >
      <p className="text-sm font-semibold">Data anggota belum ditemukan</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Kami belum menemukan data Anda di database anggota MZT. Silakan hubungi admin untuk
        pendaftaran anggota.
      </p>
      <Button asChild className="mt-4 w-full rounded-full">
        <a href="/contact">Daftar Sebagai Anggota</a>
      </Button>
    </div>
  );
}
