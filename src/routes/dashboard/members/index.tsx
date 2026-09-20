import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Power } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountDialog } from "@/features/dashboard/account-dialog";
import { DataTable, type DataTableColumn } from "@/features/dashboard/data-table";
import { PageHeader } from "@/features/dashboard/page-header";
import { accountStatus } from "@/lib/account-status";
import { MEMBER_ADMIN_ROLES, STAFF_ROLES, requireRoles } from "@/lib/auth";
import { mediaUrl } from "@/services/api-client";
import { setAccountStatus } from "@/services/mzt-api";
import {
  accountResetAuditQuery,
  currentUserQuery,
  membersQuery,
  queryKeys,
} from "@/services/queries";
import type { AccountResetAuditItem, Member } from "@/types/api";

export const Route = createFileRoute("/dashboard/members/")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, STAFF_ROLES, location.href),
  component: MembersPage,
});

function formatAuditTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function isAccountActive(member: Member): boolean {
  return member.account_is_active === true || member.account_is_active === 1;
}

export function MembersPage() {
  const queryClient = useQueryClient();
  const members = useQuery(membersQuery());
  const currentUser = useQuery(currentUserQuery());
  const canManage =
    currentUser.data?.roles.some((role) => MEMBER_ADMIN_ROLES.includes(role)) ?? false;
  const audit = useQuery({ ...accountResetAuditQuery(), enabled: canManage });
  const auditByUser = useMemo(
    () => new Map(audit.data?.items.map((item) => [item.id_users, item]) ?? []),
    [audit.data?.items],
  );
  const [accountMember, setAccountMember] = useState<Member | null>(null);
  const [statusMember, setStatusMember] = useState<Member | null>(null);

  const statusMutation = useMutation({
    mutationFn: () => {
      if (!statusMember) throw new Error("Anggota tidak dipilih.");
      return setAccountStatus(statusMember.id_users, !isAccountActive(statusMember));
    },
    onSuccess: async () => {
      const activated = statusMember ? !isAccountActive(statusMember) : false;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.members }),
        queryClient.invalidateQueries({ queryKey: queryKeys.accountResetAudit }),
      ]);
      toast.success(activated ? "Akun diaktifkan" : "Akun dinonaktifkan");
      setStatusMember(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Status akun gagal diubah");
    },
  });

  const columns: readonly DataTableColumn<Member>[] = [
    {
      key: "nama",
      header: "Anggota",
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
      key: "contact",
      header: "Kontak",
      cell: (row) => (
        <div className="max-w-56 text-sm text-muted-foreground">
          <p className="truncate">{row.no_hp || "—"}</p>
          <p className="truncate text-xs">{row.email || "—"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status akun",
      sortable: true,
      sortValue: (row) => accountStatus(row).label,
      cell: (row) => {
        const status = accountStatus(row);
        return (
          <div>
            <Badge variant={status.variant}>{status.label}</Badge>
            {row.last_login ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Login terakhir {formatAuditTime(row.last_login)}
              </p>
            ) : null}
          </div>
        );
      },
    },
    ...(canManage
      ? [
          {
            key: "reset-eligibility",
            header: "Kelayakan reset",
            cell: (row: Member) => {
              const item = auditByUser.get(row.id_users);
              if (!item) {
                return (
                  <span className="text-sm text-muted-foreground">
                    {audit.isPending ? "Memuat audit…" : "Tidak diaudit"}
                  </span>
                );
              }
              return (
                <div className="max-w-56">
                  <Badge variant={item.eligible ? "default" : "secondary"}>
                    {item.eligible ? "Memenuhi syarat" : "Tidak memenuhi syarat"}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                </div>
              );
            },
          },
          {
            key: "actions",
            header: "Aksi akun",
            className: "w-32 text-right",
            cell: (row: Member) => {
              const auditItem = auditByUser.get(row.id_users);
              const active = isAccountActive(row);
              return (
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={
                      active ? "rounded-lg text-destructive hover:text-destructive" : "rounded-lg"
                    }
                    aria-label={`${active ? "Nonaktifkan" : "Aktifkan"} akun ${row.nama}`}
                    onClick={() => setStatusMember(row)}
                  >
                    <Power aria-hidden />
                  </Button>
                  {auditItem?.eligible ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-lg"
                      aria-label={`Reset password ${row.nama}`}
                      onClick={() => setAccountMember(row)}
                    >
                      <KeyRound aria-hidden />
                    </Button>
                  ) : null}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  const selectedAuditItem: AccountResetAuditItem | null = accountMember
    ? (auditByUser.get(accountMember.id_users) ?? null)
    : null;
  const activating = statusMember ? !isAccountActive(statusMember) : false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Akun anggota"
        description="Pantau status akun, aktifkan atau nonaktifkan akses, dan reset password akun yang memenuhi syarat."
      />

      {canManage ? (
        audit.isPending ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : audit.isError ? (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">
              Audit reset akun tidak dapat dimuat. Tombol reset dinonaktifkan.
            </CardContent>
          </Card>
        ) : audit.data ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit kelayakan reset akun</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-semibold">{audit.data.total_accounts}</p>
                <p className="text-xs text-muted-foreground">Total akun</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-primary">{audit.data.eligible_count}</p>
                <p className="text-xs text-muted-foreground">Memenuhi syarat</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{audit.data.ineligible_count}</p>
                <p className="text-xs text-muted-foreground">Tidak memenuhi syarat</p>
              </div>
              <div>
                <p className="text-sm font-medium">{formatAuditTime(audit.data.audited_at)}</p>
                <p className="text-xs text-muted-foreground">Waktu audit</p>
              </div>
              {Object.keys(audit.data.reason_counts).length > 0 ? (
                <div className="flex flex-wrap gap-2 sm:col-span-4">
                  {Object.entries(audit.data.reason_counts).map(([reason, count]) => (
                    <Badge key={reason} variant="outline">
                      {reason}: {count}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null
      ) : null}

      {members.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : members.isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Daftar akun anggota tidak dapat dimuat.
          </CardContent>
        </Card>
      ) : (
        <DataTable
          rows={members.data ?? []}
          columns={columns}
          rowKey={(row) => row.id_users}
          searchPlaceholder="Cari nama, ID anggota, niqobah, atau nomor telepon…"
          search={(row, query) =>
            `${row.nama} ${row.id_anggota} ${row.niqobah} ${row.no_hp}`
              .toLowerCase()
              .includes(query)
          }
          emptyState={
            <p className="text-center text-sm text-muted-foreground">
              Tidak ada akun anggota yang dapat dikelola.
            </p>
          }
        />
      )}

      {canManage ? (
        <>
          <AlertDialog
            open={!!statusMember}
            onOpenChange={(open) => !open && !statusMutation.isPending && setStatusMember(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {activating ? "Aktifkan akun anggota?" : "Nonaktifkan akun anggota?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {activating
                    ? `Akses ${statusMember?.nama} (${statusMember?.id_anggota}) akan diaktifkan kembali.`
                    : `Akses ${statusMember?.nama} (${statusMember?.id_anggota}) akan langsung dinonaktifkan.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={statusMutation.isPending}>Batal</AlertDialogCancel>
                <AlertDialogAction
                  className={
                    activating
                      ? undefined
                      : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  }
                  disabled={statusMutation.isPending}
                  onClick={(event) => {
                    event.preventDefault();
                    statusMutation.mutate();
                  }}
                >
                  {statusMutation.isPending
                    ? "Menyimpan…"
                    : activating
                      ? "Aktifkan akun"
                      : "Nonaktifkan akun"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AccountDialog
            member={accountMember}
            auditItem={selectedAuditItem}
            onOpenChange={(open) => !open && setAccountMember(null)}
          />
        </>
      ) : null}
    </div>
  );
}
