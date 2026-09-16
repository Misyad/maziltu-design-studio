import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/dashboard/page-header";
import { FINANCE_ROLES, requireRoles } from "@/lib/auth";
import { ApiError } from "@/services/api-client";
import { updateKtaPrintStatus } from "@/services/mzt-api";
import { ktaPrintQueueQuery, queryKeysKtaPrint } from "@/services/queries";
import type { KtaPrintRequestAdminRow, KtaPrintStatus } from "@/types/api";

export const Route = createFileRoute("/dashboard/kta/")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, FINANCE_ROLES, location.href),
  component: KtaQueuePage,
});

const STATUS_LABEL: Record<KtaPrintStatus, string> = {
  menunggu_pembayaran: "Menunggu Pembayaran",
  menunggu_cetak: "Menunggu Cetak",
  sudah_dicetak: "Sudah Dicetak",
  siap_diambil: "Siap Diambil",
  dikirim: "Sedang Dikirim",
  selesai: "Selesai",
  ditolak: "Ditolak",
  pembayaran_expired: "Kedaluwarsa",
};

/** Queue reset (no explicit status) → production statuses only. */
const QUEUE_VALUE = "queue";

function KtaQueuePage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>(QUEUE_VALUE);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 15;

  const queue = useQuery(
    ktaPrintQueueQuery({
      status: status === QUEUE_VALUE ? null : status,
      q: q || null,
      page,
      per_page: perPage,
    }),
  );

  const transition = useMutation({
    mutationFn: (payload: { id: number; status: string; reason?: string | null }) =>
      updateKtaPrintStatus(payload.id, { status: payload.status, reason: payload.reason ?? null }),
    onSuccess: () => {
      toast.success("Status KTA diperbarui");
      queryClient.invalidateQueries({ queryKey: ["kta-print", "queue"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiError ? e.message : "Gagal memperbarui status");
    },
  });

  function nextActions(row: KtaPrintRequestAdminRow): { label: string; status: string }[] {
    if (row.status === "menunggu_cetak") {
      return [{ label: "Tandai Sudah Dicetak", status: "sudah_dicetak" }];
    }
    if (row.status === "sudah_dicetak") {
      return row.delivery_method === "pickup"
        ? [{ label: "Siap Diambil", status: "siap_diambil" }]
        : [{ label: "Dikirim", status: "dikirim" }];
    }
    if (row.status === "siap_diambil" || row.status === "dikirim") {
      return [{ label: "Selesai", status: "selesai" }];
    }
    return [];
  }

  function handleAction(row: KtaPrintRequestAdminRow, target: string) {
    const resolved = target;
    if (resolved === "ditolak") {
      const reason = window.prompt("Alasan penolakan (wajib)");
      if (!reason || !reason.trim()) {
        toast.error("Alasan penolakan wajib diisi");
        return;
      }
      transition.mutate({ id: row.id, status: resolved, reason: reason.trim() });
      return;
    }
    transition.mutate({ id: row.id, status: resolved });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cetak KTA Fisik"
        description="Antrean cetak KTA fisik — pembayaran dikonfirmasi otomatis melalui Paymenku."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={QUEUE_VALUE}>Antrean Cetak</SelectItem>
              {(Object.keys(STATUS_LABEL) as KtaPrintStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="max-w-xs"
            placeholder="Cari nama / no. anggota / referensi"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {queue.isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : queue.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">Gagal memuat antrean KTA.</CardContent>
        </Card>
      ) : !queue.data?.data?.length ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Tidak ada pengajuan KTA pada filter ini.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Nama</th>
                      <th className="px-4 py-2 text-left">No. Anggota</th>
                      <th className="px-4 py-2 text-left">Referensi</th>
                      <th className="px-4 py-2 text-left">Pembayaran</th>
                      <th className="px-4 py-2 text-left">Metode</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.data.data.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-4 py-2">{row.nama_masked}</td>
                        <td className="px-4 py-2 font-mono text-xs">{row.id_anggota_masked}</td>
                        <td className="px-4 py-2 font-mono text-xs">{row.reference}</td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {row.payment_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 capitalize">
                          {row.delivery_method === "pickup" ? "Diambil" : "Dikirim"}
                        </td>
                        <td className="px-4 py-2">{STATUS_LABEL[row.status]}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            {nextActions(row).map((a) => (
                              <Button
                                key={a.status}
                                size="sm"
                                variant="outline"
                                className="rounded-full"
                                disabled={transition.isPending}
                                onClick={() => handleAction(row, a.status)}
                              >
                                {a.label}
                              </Button>
                            ))}
                            {(row.status === "menunggu_pembayaran" ||
                              row.status === "menunggu_cetak") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-full text-destructive"
                                disabled={transition.isPending}
                                onClick={() => handleAction(row, "ditolak")}
                              >
                                Tolak
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Hal {queue.data.current_page} / {queue.data.last_page} · {queue.data.total} data
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (queue.data.last_page ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
