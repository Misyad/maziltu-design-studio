import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
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
import { auditTimelineQuery } from "@/services/queries";
import type { AuditTimelineParams } from "@/types/api";

export const Route = createFileRoute("/dashboard/audit-timeline/")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, FINANCE_ROLES, location.href),
  component: AuditTimelinePage,
});

function AuditTimelinePage() {
  const [eventId, setEventId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [entityType, setEntityType] = useState<string>("all");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Build params only when needed - keeps query key parameter-aware
  const params: AuditTimelineParams = {
    event_id: eventId ? Number(eventId) : null,
    date_from: dateFrom || null,
    date_to: dateTo || null,
    entity_type: entityType !== "all" ? (entityType as "payment" | "ticket" | "checkin") : null,
    action: action || null,
    actor: actor || null,
    q: q || null,
    page,
    per_page: perPage,
  };

  const timeline = useQuery(auditTimelineQuery(params));

  const applyFilters = () => setPage(1);
  const resetFilters = () => {
    setEventId("");
    setDateFrom("");
    setDateTo("");
    setEntityType("all");
    setAction("");
    setActor("");
    setQ("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Timeline"
        description="Timeline read-only audit payment + ticket + check-in — filter dan pagination server-side."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Event ID"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            />
            <Input
              placeholder="Date from (YYYY-MM-DD)"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              placeholder="Date to (YYYY-MM-DD)"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <Select
              value={entityType}
              onValueChange={(v) => {
                setEntityType(v);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua entity</SelectItem>
                <SelectItem value="payment">payment</SelectItem>
                <SelectItem value="ticket">ticket</SelectItem>
                <SelectItem value="checkin">checkin</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
            <Input
              placeholder="Actor"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari (q) — note / status"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={applyFilters} className="flex-1 sm:flex-none">
              Apply
            </Button>
            <Button variant="outline" onClick={resetFilters} className="flex-1 sm:flex-none">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {timeline.isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : timeline.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">Gagal memuat audit timeline.</CardContent>
        </Card>
      ) : !timeline.data?.rows?.length ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Tidak ada entri audit pada filter ini.</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Timestamp</th>
                      <th className="px-4 py-2 text-left">Actor</th>
                      <th className="px-4 py-2 text-left">Entity</th>
                      <th className="px-4 py-2 text-left">Entity ID</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.data.rows.map((item) => (
                      <tr key={`${item.entity}-${item.entity_id}-${item.timestamp}`} className="border-b last:border-0">
                        <td className="px-4 py-2 font-mono text-xs">{item.timestamp}</td>
                        <td className="px-4 py-2 text-xs">{item.actor}</td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.entity}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{item.entity_id}</td>
                        <td className="px-4 py-2 text-xs">
                          {item.old_status ?? "—"} → {item.new_status ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-xs max-w-64 truncate" title={item.note ?? ""}>
                          {item.note ?? "—"}
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
              Hal {page} · {timeline.data.total} data · {timeline.data.rows.length} di halaman ini
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={timeline.data.rows.length < perPage}
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
