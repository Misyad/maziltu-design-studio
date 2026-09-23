import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Eye, Loader2, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/features/dashboard/page-header";
import { MEMBER_ADMIN_ROLES, requireRoles } from "@/lib/auth";
import { ApiError, mediaUrl } from "@/services/api-client";
import {
  approveMemberApplication,
  markMemberApplicationUnderReview,
  rejectMemberApplication,
} from "@/services/mzt-api";
import { memberApplicationQuery, memberApplicationsQuery, queryKeys } from "@/services/queries";
import type { MemberApplication, MemberApplicationStatus } from "@/types/api";

const STATUS_LABELS: Record<MemberApplicationStatus, string> = {
  pending_email: "Menunggu email",
  submitted: "Terkirim",
  under_review: "Sedang ditinjau",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export const Route = createFileRoute("/dashboard/applications/")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, MEMBER_ADMIN_ROLES, location.href),
  component: ApplicationsPage,
});

export function ApplicationsPage() {
  const queryClient = useQueryClient();
  const list = useQuery(memberApplicationsQuery());
  const [selectedUuid, setSelectedUuid] = useState("");
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const detail = useQuery(memberApplicationQuery(selectedUuid));
  const applications = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return list.data ?? [];
    return (list.data ?? []).filter((application) =>
      [application.name, application.email, application.no_hp, application.status].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [list.data, query]);

  const mutation = useMutation({
    mutationFn: ({
      application,
      action,
      reason: rejectionReason,
    }: {
      application: MemberApplication;
      action: "review" | "approve" | "reject";
      reason?: string;
    }) => {
      if (action === "review") return markMemberApplicationUnderReview(application.uuid);
      if (action === "approve") return approveMemberApplication(application.uuid);
      return rejectMemberApplication(application.uuid, rejectionReason ?? "");
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.memberApplication(updated.uuid), updated);
      await queryClient.invalidateQueries({ queryKey: queryKeys.memberApplications });
      setReason("");
      toast.success("Status pendaftaran berhasil diperbarui");
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Status belum dapat diperbarui"),
  });

  const selected = detail.data ?? list.data?.find((item) => item.uuid === selectedUuid);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pendaftaran anggota"
        description="Tinjau, setujui, atau tolak pengajuan anggota baru."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Antrean pendaftaran</CardTitle>
            <CardDescription>{applications.length} pengajuan ditampilkan</CardDescription>
            <div className="relative pt-3">
              <Search
                className="absolute top-1/2 left-3 size-4 -translate-y-0.5 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama, email, atau nomor HP"
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {list.isPending ? (
              <div className="h-48 animate-pulse rounded-xl bg-muted" />
            ) : list.isError ? (
              <p className="text-sm text-destructive">Antrean pendaftaran tidak dapat dimuat.</p>
            ) : applications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada pendaftaran pada antrean ini.
              </p>
            ) : (
              applications.map((application) => (
                <button
                  key={application.uuid}
                  type="button"
                  onClick={() => setSelectedUuid(application.uuid)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted/50 ${selectedUuid === application.uuid ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{application.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{application.email}</p>
                  </div>
                  <Badge variant={application.status === "rejected" ? "destructive" : "secondary"}>
                    {STATUS_LABELS[application.status]}
                  </Badge>
                  <Eye className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="self-start lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Detail pendaftaran</CardTitle>
            <CardDescription>
              {selected ? selected.uuid : "Pilih pendaftaran dari antrean."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedUuid && detail.isPending ? (
              <div className="h-64 animate-pulse rounded-xl bg-muted" />
            ) : !selected ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Belum ada pendaftaran dipilih.
              </p>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  {selected.foto ? (
                    <img
                      src={mediaUrl(selected.foto) ?? undefined}
                      alt=""
                      className="size-20 rounded-xl object-cover"
                    />
                  ) : null}
                  <div>
                    <p className="font-display text-lg font-semibold">{selected.name}</p>
                    <Badge className="mt-1" variant="outline">
                      {STATUS_LABELS[selected.status]}
                    </Badge>
                  </div>
                </div>
                <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <Detail label="Email" value={selected.email} />
                  <Detail label="Nomor HP" value={selected.no_hp} />
                  <Detail label="Tempat lahir" value={selected.tempat_lahir} />
                  <Detail label="Tanggal lahir" value={selected.tanggal_lahir} />
                  <Detail label="Tahun masuk" value={selected.tahun_masuk} />
                  <Detail label="Tahun keluar" value={selected.tahun_keluar} />
                  <Detail label="Niqobah" value={selected.niqobah} />
                  <Detail label="Pekerjaan" value={selected.pekerjaan} />
                  <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <Detail label="Alamat" value={selected.alamat} />
                  </div>
                </dl>

                {selected.possible_duplicates?.length ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                    <p className="text-sm font-semibold">Kemungkinan data anggota ganda</p>
                    <p className="mt-1 text-xs">
                      Periksa kandidat berikut sebelum menyetujui atau menolak pendaftaran.
                    </p>
                    <div className="mt-3 space-y-3">
                      {selected.possible_duplicates.map((candidate, index) => (
                        <dl
                          key={`${candidate.id_users ?? candidate.id_anggota ?? candidate.name}-${index}`}
                          className="grid gap-2 rounded-lg border border-amber-300/70 bg-white/70 p-3 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
                        >
                          <Detail label="Nama" value={candidate.name} />
                          <Detail label="Tanggal lahir" value={candidate.tanggal_lahir} />
                          <Detail label="ID anggota" value={candidate.id_anggota ?? ""} />
                          <Detail label="Nomor HP" value={candidate.no_hp ?? ""} />
                        </dl>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selected.status === "submitted" ? (
                  <Button
                    className="w-full"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ application: selected, action: "review" })}
                  >
                    {mutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
                    Tandai sedang ditinjau
                  </Button>
                ) : null}

                {selected.status === "submitted" || selected.status === "under_review" ? (
                  <div className="space-y-3 border-t pt-5">
                    <Button
                      className="w-full"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ application: selected, action: "approve" })}
                    >
                      <Check aria-hidden /> Setujui pendaftaran
                    </Button>
                    <div>
                      <Label htmlFor="application-rejection">Alasan penolakan</Label>
                      <Textarea
                        id="application-rejection"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full"
                      disabled={mutation.isPending || !reason.trim()}
                      onClick={() =>
                        mutation.mutate({ application: selected, action: "reject", reason })
                      }
                    >
                      <X aria-hidden /> Tolak pendaftaran
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words">{value || "—"}</dd>
    </div>
  );
}
