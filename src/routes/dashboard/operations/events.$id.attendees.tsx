import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, History, Search, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { isVerifier } from "@/lib/roles";
import { currentUserQuery, participantsQuery } from "@/services/queries";

export const Route = createFileRoute("/dashboard/operations/events/$id/attendees")({
  validateSearch: z.object({
    q: z.string().optional(),
    page: z.number().int().positive().optional(),
  }),
  component: AttendeesPage,
});

const PER_PAGE = 25;

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function AttendeesPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const page = search.page ?? 1;
  const committedQ = search.q ?? "";

  const [draftQ, setDraftQ] = useState(committedQ);

  const user = useQuery(currentUserQuery());
  const canSeePii = isVerifier(user.data?.roles);

  const participants = useQuery(
    participantsQuery(id, {
      q: committedQ || null,
      page,
      per_page: PER_PAGE,
    }),
  );

  const meta = participants.data?.meta;
  const lastPage = meta?.last_page ?? 1;

  function commitQuery(q: string) {
    setDraftQ(q);
    void navigate({
      search: {
        q: q || undefined,
        page: q !== committedQ ? undefined : page > 1 ? page : undefined,
      },
    });
  }

  const rows = participants.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peserta Event"
        description={`Daftar kehadiran peserta (${meta ? `${formatNumber(meta.total)} total` : "…"}). Sumber: phase2c (scan tiket) vs legacy (historis).`}
        actions={
          canSeePii ? (
            <Badge variant="secondary">
              <ShieldCheck aria-hidden />
              PII terlihat — verifier
            </Badge>
          ) : (
            <Badge variant="outline">
              <ShieldCheck aria-hidden />
              PII disembunyikan
            </Badge>
          )
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Daftar Peserta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={draftQ}
              onChange={(event) => setDraftQ(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitQuery(draftQ.trim());
              }}
              placeholder="Cari id anggota / nama…"
              className="pl-9"
              aria-label="Cari peserta"
            />
          </div>

          {participants.isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : participants.isError ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Gagal memuat data. Coba lagi atau kembali ke halaman sebelumnya.
            </p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Tidak ada peserta {committedQ ? `untuk pencarian "${committedQ}"` : "untuk event ini"}
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{canSeePii ? "Nama" : "Peserta"}</TableHead>
                  {canSeePii ? <TableHead>ID Anggota</TableHead> : null}
                  <TableHead>Sumber</TableHead>
                  <TableHead>Akun</TableHead>
                  <TableHead>Tiket</TableHead>
                  <TableHead>Gate</TableHead>
                  <TableHead>Scan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {canSeePii ? (
                        <span className="font-medium">{row.nama ?? "—"}</span>
                      ) : (
                        <span className="font-mono text-xs">{row.id_anggota ?? "—"}</span>
                      )}
                    </TableCell>
                    {canSeePii ? (
                      <TableCell>
                        <span className="font-mono text-xs">{row.id_anggota ?? "—"}</span>
                      </TableCell>
                    ) : null}
                    <TableCell>
                      {row.source === "phase2c" ? (
                        <Badge className="bg-emerald-600 text-white">phase2c</Badge>
                      ) : (
                        <Badge variant="secondary">
                          <History aria-hidden />
                          legacy
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.account_status === "orphan" ? (
                        <Badge variant="outline" className="text-amber-700">
                          orphan
                        </Badge>
                      ) : (
                        <Badge variant="outline">normal</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{row.ticket_status ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">{row.gate ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(row.scanned_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {meta && lastPage > 1 ? (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Halaman {meta.page} dari {lastPage} · {formatNumber(meta.total)} peserta
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-lg"
                  disabled={page <= 1}
                  onClick={() =>
                    void navigate({ search: { q: committedQ || undefined, page: page - 1 } })
                  }
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-lg"
                  disabled={page >= lastPage}
                  onClick={() =>
                    void navigate({ search: { q: committedQ || undefined, page: page + 1 } })
                  }
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight aria-hidden />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <UserRound className="size-3.5" aria-hidden />
        Kolom PII (nama / ID anggota) hanya tampil untuk peran verifier; sumber kebenaran otorisasi
        ada di API — UI ini hanya merender apa yang dikirim backend.
      </p>
    </div>
  );
}

function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("id-ID").format(value);
}
