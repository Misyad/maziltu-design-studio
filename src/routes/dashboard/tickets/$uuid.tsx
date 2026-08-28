import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, RefreshCw, ShieldX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/dashboard/page-header";
import { OPERATIONS_ROLES, requireRoles } from "@/lib/auth";
import { ApiError } from "@/services/api-client";
import { downloadTicketPdf, reissueTicket, revokeTicket } from "@/services/mzt-api";
import { ticketQuery } from "@/services/queries";
import type { TicketStatus } from "@/types/api";

export const Route = createFileRoute("/dashboard/tickets/$uuid")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, OPERATIONS_ROLES, location.href),
  component: TicketDetailPage,
});

const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  draft: "Draft",
  issued: "Tersedia",
  checked_in: "Sudah check-in",
  finished: "Selesai",
  cancelled: "Dibatalkan",
  revoked: "Dibatalkan",
};

const ALLOWED_REISSUE: TicketStatus[] = ["issued", "checked_in"];
const ALLOWED_REVOKE: TicketStatus[] = ["draft", "issued", "checked_in"];

function TicketDetailPage() {
  const { uuid } = Route.useParams();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const { data: ticket, isPending, isError, error } = useQuery(ticketQuery(uuid));

  const reissue = useMutation({
    mutationFn: () => reissueTicket(uuid, note || null),
    onSuccess: () => {
      toast.success("Tiket diterbitkan ulang");
      queryClient.invalidateQueries({ queryKey: ["tickets", uuid] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.message : "Gagal reissue"),
  });

  const revoke = useMutation({
    mutationFn: () => revokeTicket(uuid, note || null),
    onSuccess: () => {
      toast.success("Tiket dibatalkan");
      queryClient.invalidateQueries({ queryKey: ["tickets", uuid] });
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.message : "Gagal revoke"),
  });

  async function handleDownload() {
    if (!ticket) return;
    try {
      const blob = await downloadTicketPdf(ticket.uuid);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tiket-${ticket.nomor_ticket}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal unduh");
    }
  }

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !ticket) {
    const status = (error as ApiError | undefined)?.status;
    return (
      <div className="space-y-6">
        <PageHeader title="Tiket tidak ditemukan" />
        <p className="text-sm text-muted-foreground">
          {status === 403 ? "Anda tidak memiliki akses ke tiket ini." : "Tiket tidak ditemukan."}
        </p>
      </div>
    );
  }

  const canReissue = ALLOWED_REISSUE.includes(ticket.status);
  const canRevoke = ALLOWED_REVOKE.includes(ticket.status);

  return (
    <div className="space-y-6">
      <PageHeader title={`Tiket ${ticket.nomor_ticket}`} description={ticket.uuid} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Detail Tiket
            <Badge variant={ticket.status === "revoked" || ticket.status === "cancelled" ? "outline" : "default"}>
              {TICKET_STATUS_LABEL[ticket.status]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">UUID</p>
            <p className="font-mono text-xs">{ticket.uuid}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">QR Payload</p>
            <p className="font-mono text-xs">{ticket.qr_payload}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Order</p>
            <p className="text-xs">{ticket.id_order}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Diterbitkan</p>
            <p className="text-xs">{ticket.issued_at ?? "—"}</p>
          </div>
          {ticket.revoked_at && (
            <div>
              <p className="text-xs text-muted-foreground">Dibatalkan</p>
              <p className="text-xs">{ticket.revoked_at}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aksi Operator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Catatan opsional (alasan reissue/revoke)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleDownload} variant="outline" size="sm" className="rounded-full">
              <Download className="size-4" /> Unduh PDF
            </Button>
            <Button
              onClick={() => reissue.mutate()}
              disabled={!canReissue || reissue.isPending}
              size="sm"
              className="rounded-full"
            >
              <RefreshCw className="size-4" /> Reissue
            </Button>
            <Button
              onClick={() => revoke.mutate()}
              disabled={!canRevoke || revoke.isPending}
              variant="destructive"
              size="sm"
              className="rounded-full"
            >
              <ShieldX className="size-4" /> Revoke
            </Button>
          </div>
          {!canReissue && <p className="text-xs text-muted-foreground">Reissue hanya untuk issued / checked_in.</p>}
          {!canRevoke && <p className="text-xs text-muted-foreground">Revoke tidak tersedia pada status terminal.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <p>
            Transisi yang diizinkan: draft→issued→checked_in→finished, draft/issued/checked_in → cancelled/revoked.
            Reissue mempertahankan UUID/nomor.
          </p>
          {ticket.status === "finished" && <p className="mt-2">Tiket telah selesai digunakan.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
