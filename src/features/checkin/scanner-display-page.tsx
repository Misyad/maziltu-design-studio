import { CheckCircle2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createDisplayMessageReceiver,
  DISPLAY_RESULT_DURATION_MS,
  subscribeToDisplayMessages,
  type DisplaySuccessMessage,
} from "@/features/checkin/display-transport";

interface ScannerDisplayPageProps {
  session: string;
}

export function ScannerDisplayPage({ session }: ScannerDisplayPageProps) {
  const [result, setResult] = useState<DisplaySuccessMessage | null>(null);

  useEffect(() => {
    setResult(null);
    if (!session) return;
    let expiryTimer: ReturnType<typeof setTimeout> | null = null;
    const receive = createDisplayMessageReceiver(session, (message) => {
      if (expiryTimer) clearTimeout(expiryTimer);
      expiryTimer = null;
      if (message.type === "idle") {
        setResult(null);
        return;
      }
      const receivedAt = Date.now();
      const expiresAt = Math.min(message.expiresAt, receivedAt + DISPLAY_RESULT_DURATION_MS);
      setResult(message);
      expiryTimer = setTimeout(
        () => {
          setResult((current) => (current?.id === message.id ? null : current));
        },
        Math.max(0, expiresAt - receivedAt),
      );
    });
    const unsubscribe = subscribeToDisplayMessages(session, receive);
    return () => {
      if (expiryTimer) clearTimeout(expiryTimer);
      unsubscribe();
    };
  }, [session]);

  if (!session) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-6">
        <p className="text-center text-lg text-muted-foreground">Sesi layar peserta tidak valid.</p>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
      {result ? (
        <section
          className="grid w-full max-w-5xl overflow-hidden rounded-3xl border bg-card shadow-lg md:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]"
          aria-live="assertive"
        >
          <div className="flex min-h-80 items-center justify-center bg-muted">
            {result.participant.photo ? (
              <img
                src={result.participant.photo}
                alt="Foto peserta"
                className="h-full max-h-[65vh] w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <UserRound className="size-24" aria-hidden />
                <span>Foto tidak tersedia</span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center gap-6 p-8 sm:p-12">
            <div className="flex items-center gap-3 text-emerald-700">
              <CheckCircle2 className="size-10" aria-hidden />
              <p className="text-xl font-semibold">{result.status}</p>
            </div>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                {result.participant.maskedName}
              </h1>
              <p className="mt-4 text-xl text-muted-foreground">
                {result.participant.detailLabel}: {result.participant.detail}
              </p>
            </div>
            <p className="text-2xl font-medium">{result.event}</p>
          </div>
        </section>
      ) : (
        <section className="text-center" aria-live="polite">
          <ScanStandbyIcon />
          <h1 className="mt-6 font-display text-4xl font-semibold">Siap Menerima Peserta</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Silakan tunjukkan tiket atau kartu anggota kepada petugas.
          </p>
        </section>
      )}
    </main>
  );
}

function ScanStandbyIcon() {
  return (
    <div className="mx-auto grid size-28 place-items-center rounded-full bg-primary/10 text-primary">
      <div className="size-12 rounded-xl border-4 border-current" aria-hidden />
    </div>
  );
}
