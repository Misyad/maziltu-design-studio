import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mediaUrl } from "@/services/api-client";
import { updateProfileJson } from "@/services/mzt-api";
import { profileQuery, queryKeys } from "@/services/queries";
import { PageHeader } from "@/features/dashboard/page-header";

const editSchema = z.object({
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  no_hp: z.string().optional(),
  alamat: z.string().optional(),
  pekerjaan: z.string().optional(),
  tempat_lahir: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{value || "—"}</dd>
    </div>
  );
}

export default function PortalProfile() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery(profileQuery());
  const [photo, setPhoto] = useState<File | null>(null);

  const { register, handleSubmit } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: {
      email: profile?.email ?? "",
      no_hp: profile?.no_hp ?? "",
      alamat: profile?.alamat ?? "",
      pekerjaan: profile?.pekerjaan ?? "",
      tempat_lahir: profile?.tempat_lahir ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: EditValues) => {
      const form = new FormData();
      (Object.keys(values) as (keyof EditValues)[]).forEach((key) => {
        const value = values[key];
        if (value === undefined || value === "") return;
        form.append(key, value);
      });
      if (photo) form.append("foto", photo);
      return updateProfileJson(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      setPhoto(null);
      toast.success("Profil berhasil diperbarui");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan profil");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Profil Saya" description="Data keanggotaan Anda di MZT Apps" />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informasi Anggota</CardTitle>
            <CardDescription>Field ini tidak dapat diubah</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={mediaUrl(profile?.foto) ?? undefined} alt="" />
                <AvatarFallback>{(profile?.name ?? "A").charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold">{profile?.name}</p>
                <p className="text-xs text-muted-foreground">{profile?.id_anggota}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Nama" value={profile?.name} />
              <Field label="NIAM / Nomor Anggota" value={profile?.id_anggota} />
              <Field label="Tahun Masuk" value={profile?.tahun_masuk} />
              <Field label="Tahun Keluar" value={profile?.tahun_keluar} />
              <Field label="Status" value={profile?.status == "1" ? "Aktif" : "Tidak aktif"} />
              <Field label="Barcode" value={profile?.barcode || "—"} />
            </dl>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Edit Profil</CardTitle>
            <CardDescription>
              Ubah data yang diperbolehkan mengikuti kebijakan organisasi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              id="profile-form"
              onSubmit={handleSubmit((values) => mutation.mutate(values))}
              className="grid gap-5 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <div className="flex items-center gap-4">
                  <Avatar className="size-16">
                    {photo ? (
                      <img
                        src={URL.createObjectURL(photo)}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <AvatarImage src={mediaUrl(profile?.foto) ?? undefined} alt="" />
                    )}
                    <AvatarFallback>{(profile?.name ?? "A").charAt(0)}</AvatarFallback>
                  </Avatar>
                  <label className="cursor-pointer text-sm font-medium text-primary">
                    <ImagePlus className="mr-1 inline size-4" aria-hidden />
                    Ganti foto
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="p-email">Email</Label>
                <Input id="p-email" type="email" className="mt-2" {...register("email")} />
              </div>
              <div>
                <Label htmlFor="p-nohp">Nomor HP</Label>
                <Input id="p-nohp" className="mt-2" placeholder="08xxxx" {...register("no_hp")} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="p-alamat">Alamat</Label>
                <Input id="p-alamat" className="mt-2" {...register("alamat")} />
              </div>
              <div>
                <Label htmlFor="p-pekerjaan">Pekerjaan</Label>
                <Input id="p-pekerjaan" className="mt-2" {...register("pekerjaan")} />
              </div>
              <div>
                <Label htmlFor="p-tempat">Tempat Lahir</Label>
                <Input id="p-tempat" className="mt-2" {...register("tempat_lahir")} />
              </div>

              <Button
                type="submit"
                form="profile-form"
                disabled={mutation.isPending}
                className="mt-2 rounded-full sm:col-span-2"
              >
                {mutation.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Save aria-hidden />
                )}
                Simpan Perubahan
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
