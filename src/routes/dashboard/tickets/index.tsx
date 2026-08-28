import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, Ticket } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/features/dashboard/page-header";
import { OPERATIONS_ROLES, requireRoles } from "@/lib/auth";

export const Route = createFileRoute("/dashboard/tickets/")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, OPERATIONS_ROLES, location.href),
  component: TicketSearchPage,
});

function TicketSearchPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  function go() {
    const v = q.trim();
    if (!v) return;
    navigate({ to: "/dashboard/tickets/$uuid", params: { uuid: v } });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tiket"
        description="Cari tiket berdasarkan UUID atau nomor tiket. Akses sesuai kebijakan: pemilik atau petugas terotorisasi."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="size-4" /> Cari Tiket
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="UUID atau nomor tiket (TKT-...)"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go()}
            />
          </div>
          <Button onClick={go} disabled={!q.trim()} className="rounded-full">
            Cari
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Masukkan UUID tiket (qr_payload) atau nomor tiket. Contoh:{" "}
          <span className="font-mono">TKT-2026-000001</span>. Anda juga dapat membuka langsung{" "}
          <Link to="/dashboard/finance/tickets" className="text-primary underline">
            Monitoring Tiket
          </Link>{" "}
          untuk ringkasan status.
        </CardContent>
      </Card>
    </div>
  );
}
