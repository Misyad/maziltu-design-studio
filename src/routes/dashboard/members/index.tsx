import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus, Printer, Trash2 } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/features/dashboard/data-table";
import { IdCardDialog } from "@/features/dashboard/id-card";
import { MemberFormDialog } from "@/features/dashboard/member-form";
import { AccountDialog } from "@/features/dashboard/account-dialog";
import { PageHeader } from "@/features/dashboard/page-header";
import { mediaUrl } from "@/services/api-client";
import { bulkGenerateAccounts, deleteMember } from "@/services/mzt-api";
import { membersQuery, queryKeys } from "@/services/queries";
import type { Member } from "@/types/api";

export const Route = createFileRoute("/dashboard/members/")({
  component: MembersPage,
});

function MembersPage() {
  const queryClient = useQueryClient();
  const members = useQuery(membersQuery());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [printing, setPrinting] = useState<Member | null>(null);
  const [accountMember, setAccountMember] = useState<Member | null>(null);

  const bulkMutation = useMutation({
    mutationFn: () => bulkGenerateAccounts(),
    onSuccess: (result) => {
      toast.success(`Bulk generate selesai: ${result.created} dibuat, ${result.skipped} dilewati`);
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Bulk generate gagal");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMember(deleting!.id_users),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      toast.success("Member deleted");
      setDeleting(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    },
  });

  const columns: readonly DataTableColumn<Member>[] = [
    {
      key: "nama",
      header: "Member",
      sortable: true,
      sortValue: (row) => row.nama.toLowerCase(),
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarImage src={mediaUrl(row.foto) ?? undefined} alt="" />
            <AvatarFallback>{row.nama.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.nama}</p>
            <p className="truncate text-xs text-muted-foreground">{row.id_anggota}</p>
          </div>
        </div>
      ),
    },
    {
      key: "niqobah",
      header: "Niqobah",
      sortable: true,
      sortValue: (row) => row.niqobah.toLowerCase(),
      cell: (row) => <span className="text-sm">{row.niqobah || "—"}</span>,
    },
    {
      key: "no_hp",
      header: "Phone",
      cell: (row) => <span className="text-sm text-muted-foreground">{row.no_hp || "—"}</span>,
    },
    {
      key: "alamat",
      header: "Address",
      cell: (row) => (
        <span className="block max-w-60 truncate text-sm text-muted-foreground">
          {row.alamat || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-28 text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-lg"
            aria-label={`Print ID card for ${row.nama}`}
            onClick={() => setPrinting(row)}
          >
            <Printer aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-lg"
            aria-label={`Edit ${row.nama}`}
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
            className="rounded-lg"
            aria-label={`Manage account for ${row.nama}`}
            onClick={() => setAccountMember(row)}
          >
            <KeyRound aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-lg text-destructive hover:text-destructive"
            aria-label={`Delete ${row.nama}`}
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
        title="Members"
        description="Manage the member registry across all branches."
        actions={
          <>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={bulkMutation.isPending}
              onClick={() => bulkMutation.mutate()}
            >
              {bulkMutation.isPending ? (
                <Skeleton className="size-4 rounded-full bg-primary-foreground/40" />
              ) : null}
              Bulk generate account
            </Button>
            <Button
              className="rounded-full"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus aria-hidden />
              New member
            </Button>
          </>
        }
      />

      {members.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : (
        <DataTable
          rows={members.data ?? []}
          columns={columns}
          rowKey={(row) => row.id_users}
          searchPlaceholder="Search members…"
          search={(row, query) =>
            `${row.nama} ${row.id_anggota} ${row.niqobah} ${row.no_hp}`
              .toLowerCase()
              .includes(query)
          }
        />
      )}

      <MemberFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editing}
        key={editing?.id_users ?? "new"}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleting?.nama} ({deleting?.id_anggota}) from the
              registry.
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

      <IdCardDialog member={printing} onOpenChange={(open) => !open && setPrinting(null)} />

      <AccountDialog
        member={accountMember}
        onOpenChange={(open) => !open && setAccountMember(null)}
      />
    </div>
  );
}
