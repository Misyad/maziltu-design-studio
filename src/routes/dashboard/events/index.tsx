import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/features/dashboard/data-table";
import { EventFormDialog } from "@/features/dashboard/event-form";
import { PageHeader } from "@/features/dashboard/page-header";
import { formatPrice } from "@/features/events/event-card";
import { mediaUrl } from "@/services/api-client";
import { deleteEvent } from "@/services/mzt-api";
import { eventsQuery, queryKeys } from "@/services/queries";
import type { EventItem } from "@/types/api";

export const Route = createFileRoute("/dashboard/events/")({
  component: EventsPage,
});

type Status = "Ongoing" | "Upcomming" | "Complate";

function computeStatus(event: EventItem): Status {
  const start = new Date(event.tanggal_mulai).getTime();
  const end = new Date(event.tanggal_selesai).getTime();
  const now = Date.now();
  if (now < start) return "Upcomming";
  if (now <= end) return "Ongoing";
  return "Complate";
}

const STATUS_LABEL: Record<Status, string> = {
  Upcomming: "Upcoming",
  Ongoing: "Ongoing",
  Complate: "Completed",
};

const STATUS_CLASS: Record<Status, string> = {
  Upcomming: "border-primary/30 bg-primary-soft text-accent-foreground",
  Ongoing: "border-gold-soft bg-gold-soft text-gold",
  Complate: "border-border bg-muted text-muted-foreground",
};

function EventsPage() {
  const queryClient = useQueryClient();
  const events = useQuery(eventsQuery());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState<EventItem | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => deleteEvent(deleting!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events });
      toast.success("Event deleted");
      setDeleting(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    },
  });

  const columns: readonly DataTableColumn<EventItem>[] = [
    {
      key: "judul_event",
      header: "Event",
      sortable: true,
      sortValue: (row) => row.judul_event.toLowerCase(),
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
            {row.banner ? (
              <img
                src={mediaUrl(row.banner) ?? undefined}
                alt=""
                className="size-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.judul_event}</p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3" aria-hidden />
              {row.lokasi}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "tanggal_mulai",
      header: "Dates",
      sortable: true,
      sortValue: (row) => row.tanggal_mulai,
      cell: (row) => (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          {row.tanggal_mulai} — {row.tanggal_selesai}
        </span>
      ),
    },
    {
      key: "harga",
      header: "Contribution",
      sortable: true,
      sortValue: (row) => Number(row.harga) || 0,
      cell: (row) => (
        <span className="flex items-center gap-1.5 text-sm">
          <Ticket className="size-3.5 text-muted-foreground" aria-hidden />
          {formatPrice(Number(row.harga) || 0)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (row) => computeStatus(row),
      cell: (row) => (
        <Badge variant="outline" className={STATUS_CLASS[computeStatus(row)]}>
          {STATUS_LABEL[computeStatus(row)]}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-20 text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-lg"
            aria-label={`Edit ${row.judul_event}`}
            onClick={() => {
              setEditing(row);
              setFormOpen(true);
            }}
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-lg text-destructive hover:text-destructive"
            aria-label={`Delete ${row.judul_event}`}
            onClick={() => setDeleting(row)}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Plan, publish and track events across every branch."
        actions={
          <Button
            className="rounded-full"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus aria-hidden />
            New event
          </Button>
        }
      />

      {events.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : (
        <DataTable
          rows={events.data ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search events…"
          search={(row, query) => `${row.judul_event} ${row.lokasi}`.toLowerCase().includes(query)}
        />
      )}

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editing}
        key={editing?.id ?? "new"}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleting?.judul_event} and its scheduling.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
