import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Pencil, Plus, Trash2, UserRound } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/features/dashboard/data-table";
import { NewsFormDialog } from "@/features/dashboard/news-form";
import { PageHeader } from "@/features/dashboard/page-header";
import { mediaUrl } from "@/services/api-client";
import { deleteNews } from "@/services/mzt-api";
import { newsQuery, queryKeys } from "@/services/queries";
import type { NewsItem } from "@/types/api";

export const Route = createFileRoute("/dashboard/news/")({
  component: NewsPage,
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function NewsPage() {
  const queryClient = useQueryClient();
  const news = useQuery(newsQuery());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [deleting, setDeleting] = useState<NewsItem | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => deleteNews(deleting!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.news });
      toast.success("News deleted");
      setDeleting(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    },
  });

  const columns: readonly DataTableColumn<NewsItem>[] = [
    {
      key: "judul",
      header: "Title",
      sortable: true,
      sortValue: (row) => row.judul.toLowerCase(),
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
            {row.foto ? (
              <img
                src={mediaUrl(row.foto) ?? undefined}
                alt=""
                className="size-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.judul}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">/{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "pembuat",
      header: "Author",
      sortable: true,
      sortValue: (row) => (row.pembuat ?? "").toLowerCase(),
      cell: (row) => (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <UserRound className="size-3.5" aria-hidden />
          {row.pembuat ?? "Secretariat"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Published",
      sortable: true,
      sortValue: (row) => row.created_at,
      cell: (row) => (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          {formatDate(row.created_at)}
        </span>
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
            aria-label={`Edit ${row.judul}`}
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
            aria-label={`Delete ${row.judul}`}
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
        title="News"
        description="Publish announcements and stories for members and the public."
        actions={
          <Button
            className="rounded-full"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus aria-hidden />
            New news
          </Button>
        }
      />

      {news.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : (
        <DataTable
          rows={news.data ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search news…"
          search={(row, query) =>
            `${row.judul} ${row.pembuat ?? ""} ${row.slug}`.toLowerCase().includes(query)
          }
        />
      )}

      <NewsFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        news={editing}
        key={editing?.id ?? "new"}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete news?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &ldquo;{deleting?.judul}&rdquo;.
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
