import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CalendarDays, UserRound } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/features/dashboard/data-table";
import { PageHeader } from "@/features/dashboard/page-header";
import { eventsQuery, transactionsQuery } from "@/services/queries";
import type { TransactionRecord } from "@/types/api";

export const Route = createFileRoute("/dashboard/transactions/")({
  component: TransactionsPage,
});

function formatPrice(value: number | string | undefined) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

const STATUS_CLASS: Record<string, string> = {
  sukses: "border-primary/30 bg-primary-soft text-accent-foreground",
  pending: "border-gold-soft bg-gold-soft text-gold",
  gagal: "border-border bg-muted text-muted-foreground",
};

function TransactionsPage() {
  const events = useQuery(eventsQuery());
  const [eventId, setEventId] = useState<string>("");
  const transactions = useQuery({
    ...transactionsQuery(Number(eventId)),
    enabled: eventId !== "",
  });

  const columns: readonly DataTableColumn<TransactionRecord>[] = [
    {
      key: "nama",
      header: "Member",
      sortable: true,
      sortValue: (row) => (row.dataUser?.nama ?? "").toLowerCase(),
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.dataUser?.nama ?? "—"}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{row.id_anggota}</p>
        </div>
      ),
    },
    {
      key: "jumlah",
      header: "Amount",
      sortable: true,
      sortValue: (row) => Number(row.jumlah) || 0,
      cell: (row) => (
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Banknote className="size-3.5 text-muted-foreground" aria-hidden />
          {formatPrice(row.jumlah)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => String(row.status ?? "").toLowerCase(),
      cell: (row) => (
        <Badge
          variant="outline"
          className={STATUS_CLASS[String(row.status ?? "").toLowerCase()] ?? ""}
        >
          {row.status ?? "—"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Date",
      sortable: true,
      sortValue: (row) => row.created_at,
      cell: (row) => (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          {new Date(row.created_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Contributions and payments recorded against each event."
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-base">Select event</CardTitle>
        </CardHeader>
        <CardContent>
          {events.isPending ? (
            <Skeleton className="h-10 w-72 rounded-xl" />
          ) : (
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger className="w-full sm:w-80">
                <SelectValue placeholder="Choose an event…" />
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

      {eventId === "" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserRound className="size-4" aria-hidden />
          Pick an event to see its transactions.
        </p>
      ) : transactions.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : (
        <DataTable
          rows={transactions.data ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search by member…"
          search={(row, query) =>
            `${row.dataUser?.nama ?? ""} ${row.id_anggota} ${row.status ?? ""}`
              .toLowerCase()
              .includes(query)
          }
        />
      )}
    </div>
  );
}
