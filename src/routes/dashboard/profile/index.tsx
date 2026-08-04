import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/dashboard/page-header";
import { mediaUrl } from "@/services/api-client";
import { updateMember } from "@/services/mzt-api";
import { currentUserQuery, queryKeys } from "@/services/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: user, isPending } = useQuery(currentUserQuery());
  const [photo, setPhoto] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const data = user?.data;

  const mutation = useMutation({
    mutationFn: (form: FormData) => updateMember(data!.id_users, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      toast.success("Profile updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    const form = new FormData(event.currentTarget);
    if (photo) form.append("foto", photo);
    if (password) form.append("password", password);
    mutation.mutate(form);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your personal details and account settings." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Account</CardTitle>
            <CardDescription>Your identity and member barcode.</CardDescription>
          </CardHeader>
          <CardContent>
            {isPending || !data ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-20 rounded-2xl" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
                    {photo ? (
                      <img
                        src={URL.createObjectURL(photo)}
                        alt="Preview"
                        className="size-full object-cover"
                      />
                    ) : user.foto ? (
                      <img
                        src={mediaUrl(user.foto) ?? undefined}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="size-7 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold">{user.name}</p>
                    <p className="font-mono text-sm text-muted-foreground">{user.id_anggota}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-muted/50 p-5">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Member barcode
                  </p>
                  <p className="mt-2 font-mono text-center text-base tracking-[0.3em]">
                    {data.barcode ?? "—"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">Edit profile</CardTitle>
            <CardDescription>Update your details, photo and password.</CardDescription>
          </CardHeader>
          <CardContent>
            {isPending || !data ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="p-nama">Full name</Label>
                    <Input
                      id="p-nama"
                      name="nama"
                      className="mt-2"
                      defaultValue={user.name}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="p-email">Email</Label>
                    <Input
                      id="p-email"
                      name="email"
                      type="email"
                      className="mt-2"
                      defaultValue={user.email ?? ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="p-nohp">Phone</Label>
                    <Input
                      id="p-nohp"
                      name="no_hp"
                      className="mt-2"
                      defaultValue={data.no_hp ?? ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="p-niqobah">Niqobah</Label>
                    <Input
                      id="p-niqobah"
                      name="niqobah"
                      className="mt-2"
                      defaultValue={data.niqobah ?? ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="p-pekerjaan">Occupation</Label>
                    <Input
                      id="p-pekerjaan"
                      name="pekerjaan"
                      className="mt-2"
                      defaultValue={data.pekerjaan ?? ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="p-tmp">Place of birth</Label>
                    <Input
                      id="p-tmp"
                      name="tempat_lahir"
                      className="mt-2"
                      defaultValue={data.tempat_lahir ?? ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="p-tgl">Date of birth</Label>
                    <Input
                      id="p-tgl"
                      name="tanggal_lahir"
                      type="date"
                      className="mt-2"
                      defaultValue={data.tanggal_lahir ?? ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="p-tmasuk">Year joined</Label>
                    <Input
                      id="p-tmasuk"
                      name="tahun_masuk"
                      className="mt-2"
                      defaultValue={data.tahun_masuk ?? ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="p-tkeluar">Year left</Label>
                    <Input
                      id="p-tkeluar"
                      name="tahun_keluar"
                      className="mt-2"
                      defaultValue={data.tahun_keluar ?? ""}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="p-alamat">Address</Label>
                    <Input
                      id="p-alamat"
                      name="alamat"
                      className="mt-2"
                      defaultValue={data.alamat ?? ""}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="p-password">New password</Label>
                    <Input
                      id="p-password"
                      type="password"
                      className="mt-2"
                      placeholder="Leave blank to keep the current password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <label className={cn("cursor-pointer text-sm font-medium text-primary")}>
                    Upload new photo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <Button type="submit" disabled={mutation.isPending} className="rounded-full">
                    {mutation.isPending ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <Save aria-hidden />
                    )}
                    Save changes
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
