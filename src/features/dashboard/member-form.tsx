import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mediaUrl } from "@/services/api-client";
import { createMember, updateMember } from "@/services/mzt-api";
import { queryKeys } from "@/services/queries";
import type { Member } from "@/types/api";
import { cn } from "@/lib/utils";

const memberSchema = z.object({
  id_anggota: z.string().optional(),
  nama: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  no_hp: z.string().min(1, "Phone is required"),
  alamat: z.string().min(1, "Address is required"),
  niqobah: z.string().min(1, "Niqobah is required"),
  pekerjaan: z.string().min(1, "Occupation is required"),
  tempat_lahir: z.string().optional(),
  tanggal_lahir: z.string().min(1, "Date of birth is required"),
  tahun_masuk: z.string().min(1, "Year joined is required"),
  tahun_keluar: z.string().min(1, "Year left is required"),
  password: z.string().optional(),
});

const createMemberSchema = memberSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const updateMemberSchema = memberSchema.extend({
  password: z.string().optional(),
});

type MemberValues = z.infer<typeof memberSchema>;

const EMPTY: MemberValues = {
  id_anggota: "",
  nama: "",
  email: "",
  no_hp: "",
  alamat: "",
  niqobah: "",
  pekerjaan: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  tahun_masuk: "",
  tahun_keluar: "",
  password: "",
};

function toValues(member: Member): MemberValues {
  return {
    id_anggota: member.id_anggota,
    nama: member.nama,
    email: member.email ?? "",
    no_hp: member.no_hp,
    alamat: member.alamat,
    niqobah: member.niqobah,
    pekerjaan: member.pekerjaan,
    tempat_lahir: member.tempat_lahir ?? "",
    tanggal_lahir: member.tanggal_lahir || "",
    tahun_masuk: member.tahun_masuk,
    tahun_keluar: member.tahun_keluar,
  };
}

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member | null;
}

export function MemberFormDialog({ open, onOpenChange, member }: MemberFormDialogProps) {
  const queryClient = useQueryClient();
  const [photo, setPhoto] = useState<File | null>(null);
  const schema = member ? updateMemberSchema : createMemberSchema;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberValues>({
    resolver: zodResolver(schema),
    defaultValues: member ? toValues(member) : EMPTY,
  });

  const mutation = useMutation({
    mutationFn: async (values: MemberValues) => {
      const form = new FormData();
      (Object.keys(values) as (keyof MemberValues)[]).forEach((key) => {
        const value = values[key];
        if (value === undefined || value === "") return;
        if (key === "id_anggota") return;
        form.append(key, value);
      });
      for (const key of ["tahun_masuk", "tahun_keluar"] as const) {
        const value = form.get(key);
        if (typeof value === "string" && /^\d{4}$/.test(value)) {
          form.set(key, `${value}-01-01`);
        }
      }
      if (photo) form.append("foto", photo);
      return member ? updateMember(member.id_users, form) : createMember(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      toast.success(member ? "Member updated" : "Member created");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{member ? "Edit member" : "New member"}</DialogTitle>
          <DialogDescription>
            {member ? `Update the record for ${member.nama}.` : "Add a new member to the registry."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="member-form"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="grid gap-5 sm:grid-cols-2"
        >
          <div className="space-y-5 sm:col-span-2">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-muted">
                {photo ? (
                  <img
                    src={URL.createObjectURL(photo)}
                    alt="Preview"
                    className="size-full object-cover"
                  />
                ) : member?.foto ? (
                  <img
                    src={mediaUrl(member.foto) ?? undefined}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
                )}
              </div>
              <label className="cursor-pointer text-sm font-medium text-primary">
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="m-id">Member number</Label>
                {member ? (
                  <Input id="m-id" className="mt-2" value={member.id_anggota} readOnly disabled />
                ) : (
                  <>
                    <Input
                      id="m-id"
                      className="mt-2"
                      value="Generated automatically"
                      readOnly
                      disabled
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      The member number is assigned automatically.
                    </p>
                  </>
                )}
              </div>
              <div>
                <Label htmlFor="m-nama">Full name</Label>
                <Input
                  id="m-nama"
                  className="mt-2"
                  placeholder="Full name"
                  aria-invalid={!!errors.nama}
                  {...register("nama")}
                />
                {errors.nama ? (
                  <p className="mt-1.5 text-xs text-destructive">{errors.nama.message}</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="m-email">Email</Label>
                <Input
                  id="m-email"
                  type="email"
                  className="mt-2"
                  placeholder="name@example.com"
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="m-nohp">Phone</Label>
                <Input
                  id="m-nohp"
                  className="mt-2"
                  placeholder="08xxxxxxxxxx"
                  {...register("no_hp")}
                />
              </div>
              <div>
                <Label htmlFor="m-niqobah">Niqobah</Label>
                <Input
                  id="m-niqobah"
                  className="mt-2"
                  placeholder="e.g. 2009"
                  {...register("niqobah")}
                />
              </div>
              <div>
                <Label htmlFor="m-pekerjaan">Occupation</Label>
                <Input
                  id="m-pekerjaan"
                  className="mt-2"
                  placeholder="Occupation"
                  {...register("pekerjaan")}
                />
              </div>
              <div>
                <Label htmlFor="m-tmp">Place of birth</Label>
                <Input
                  id="m-tmp"
                  className="mt-2"
                  placeholder="City"
                  {...register("tempat_lahir")}
                />
              </div>
              <div>
                <Label htmlFor="m-tgl">Date of birth</Label>
                <Input id="m-tgl" type="date" className="mt-2" {...register("tanggal_lahir")} />
              </div>
              <div>
                <Label htmlFor="m-tmasuk">Year joined</Label>
                <Input
                  id="m-tmasuk"
                  className="mt-2"
                  placeholder="2015"
                  {...register("tahun_masuk")}
                />
              </div>
              <div>
                <Label htmlFor="m-tkeluar">Year left</Label>
                <Input
                  id="m-tkeluar"
                  className="mt-2"
                  placeholder="2020"
                  aria-invalid={!!errors.tahun_keluar}
                  {...register("tahun_keluar")}
                />
                {errors.tahun_keluar ? (
                  <p className="mt-1.5 text-xs text-destructive">{errors.tahun_keluar.message}</p>
                ) : null}
              </div>
              {!member ? (
                <div className="sm:col-span-2">
                  <Label htmlFor="m-password">Password</Label>
                  <Input
                    id="m-password"
                    type="password"
                    className="mt-2"
                    placeholder="Minimum 6 characters"
                    aria-invalid={!!errors.password}
                    {...register("password")}
                  />
                  {errors.password ? (
                    <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <Label htmlFor="m-alamat">Address</Label>
                <Input
                  id="m-alamat"
                  className="mt-2"
                  placeholder="Address"
                  {...register("alamat")}
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className={cn("sm:justify-end")}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="member-form" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {member ? "Save changes" : "Create member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
