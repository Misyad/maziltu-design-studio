import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/features/dashboard/data-table";
import { PageHeader } from "@/features/dashboard/page-header";
import { activityLogQuery } from "@/services/queries";
import type { ActivityLogEntry } from "@/types/api";

export const Route = createFileRoute("/dashboard/activity/")({
  component: ActivityPage,
});

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActivityPage() {
  const activity = useQuery(activityLogQuery());

  const columns: readonly DataTableColumn<ActivityLogEntry>[] = [
    {
      key: "aktivitas",
      header: "Action",
      sortable: true,
      sortValue: (row) => row.aktivitas.toLowerCase(),
      cell: (row) => (
        <span className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
          {row.aktivitas}
        </span>
      ),
    },
    {
      key: "user",
      header: "User",
      sortable: true,
      sortValue: (row) => (row.dataUser?.nama ?? "").toLowerCase(),
      cell: (row) => (
        <span className="text-sm font-medium">{row.dataUser?.nama ?? `User #${row.id_users}`}</span>
      ),
    },
    {
      key: "created_at",
      header: "When",
      sortable: true,
      sortValue: (row) => row.created_at,
      cell: (row) => (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity log"
        description="A record of recent actions across the platform."
      />

      {activity.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : (
        <DataTable
          rows={activity.data ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search activity…"
          search={(row, query) =>
            `${row.aktivitas} ${row.dataUser?.nama ?? ""} ${row.id_users}`
              .toLowerCase()
              .includes(query)
          }
          pageSize={15}
        />
      )}
    </div>
  );
}
