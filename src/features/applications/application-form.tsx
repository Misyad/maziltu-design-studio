import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/services/api-client";
import type { MemberApplication } from "@/types/api";

const photoSchema = z.custom<File>(
  (value) => typeof File !== "undefined" && value instanceof File,
  "Foto wajib diunggah",
);

const baseSchema = z.object({
  name: z.string().trim().min(2, "Nama lengkap wajib diisi"),
  email: z.string().trim().email("Email tidak valid"),
  no_hp: z.string().trim().min(8, "Nomor HP tidak valid"),
  alamat: z.string().trim().min(5, "Alamat wajib diisi"),
  pekerjaan: z.string().trim().min(1, "Pekerjaan wajib diisi"),
  niqobah: z.string().trim().min(1, "Niqobah wajib diisi"),
  tempat_lahir: z.string().trim().min(2, "Tempat lahir wajib diisi"),
  tanggal_lahir: z.string().min(1, "Tanggal lahir wajib diisi"),
  tahun_masuk: z.string().regex(/^\d{4}$/, "Gunakan 4 digit tahun"),
  tahun_keluar: z.string().regex(/^\d{4}$/, "Gunakan 4 digit tahun"),
  foto: photoSchema.optional(),
});

const createSchema = baseSchema.extend({ foto: photoSchema });

const editSchema = baseSchema;

function yearValue(value?: string): string {
  return value?.match(/^\d{4}/)?.[0] ?? "";
}

export type ApplicationFormValues = z.infer<typeof baseSchema>;

interface ApplicationFormProps {
  application?: MemberApplication;
  submitLabel: string;
  pending: boolean;
  onSubmit: (form: FormData) => Promise<void> | void;
}

const FIELDS: readonly {
  name: keyof ApplicationFormValues;
  label: string;
  type?: string;
  placeholder?: string;
  wide?: boolean;
}[] = [
  { name: "name", label: "Nama lengkap", placeholder: "Nama sesuai identitas", wide: true },
  { name: "email", label: "Email", type: "email", placeholder: "nama@email.com" },
  { name: "no_hp", label: "Nomor HP", type: "tel", placeholder: "08xxxxxxxxxx" },
  { name: "pekerjaan", label: "Pekerjaan" },
  { name: "niqobah", label: "Niqobah" },
  { name: "tempat_lahir", label: "Tempat lahir" },
  { name: "tanggal_lahir", label: "Tanggal lahir", type: "date" },
  { name: "tahun_masuk", label: "Tahun masuk", placeholder: "2015" },
  { name: "tahun_keluar", label: "Tahun keluar", placeholder: "2020" },
];

export function ApplicationForm({
  application,
  submitLabel,
  pending,
  onSubmit,
}: ApplicationFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submissionToken] = useState(() => crypto.randomUUID());
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(application ? editSchema : createSchema),
    defaultValues: {
      name: application?.name ?? "",
      email: application?.email ?? "",
      no_hp: application?.no_hp ?? "",
      alamat: application?.alamat ?? "",
      pekerjaan: application?.pekerjaan ?? "",
      niqobah: application?.niqobah ?? "",
      tempat_lahir: application?.tempat_lahir ?? "",
      tanggal_lahir: application?.tanggal_lahir ?? "",
      tahun_masuk: yearValue(application?.tahun_masuk),
      tahun_keluar: yearValue(application?.tahun_keluar),
      foto: undefined,
    },
  });

  async function submit(values: ApplicationFormValues) {
    setServerError(null);
    const form = new FormData();
    if (!application) form.set("submission_token", submissionToken);
    for (const [key, value] of Object.entries(values)) {
      if (key === "foto") {
        if (value instanceof File) form.append(key, value);
        continue;
      }
      form.append(key, value ?? "");
    }
    try {
      await onSubmit(form);
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        for (const [field, messages] of Object.entries(error.errors)) {
          if (field in values && messages?.[0]) {
            setError(field as keyof ApplicationFormValues, {
              type: "server",
              message: messages[0],
            });
          }
        }
      }
      setServerError(
        error instanceof ApiError ? error.message : "Permintaan belum dapat diproses. Coba lagi.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-5 sm:grid-cols-2">
      {serverError ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:col-span-2"
        >
          {serverError}
        </p>
      ) : null}

      {FIELDS.map((field) => (
        <div key={field.name} className={field.wide ? "sm:col-span-2" : undefined}>
          <Label htmlFor={`application-${field.name}`}>{field.label}</Label>
          <Input
            id={`application-${field.name}`}
            type={field.type ?? "text"}
            placeholder={field.placeholder}
            className="mt-2"
            aria-invalid={Boolean(errors[field.name])}
            {...register(field.name)}
          />
          {errors[field.name]?.message ? (
            <p className="mt-1.5 text-xs text-destructive">{errors[field.name]?.message}</p>
          ) : null}
        </div>
      ))}

      <div className="sm:col-span-2">
        <Label htmlFor="application-alamat">Alamat</Label>
        <Textarea
          id="application-alamat"
          className="mt-2 min-h-24"
          aria-invalid={Boolean(errors.alamat)}
          {...register("alamat")}
        />
        {errors.alamat ? (
          <p className="mt-1.5 text-xs text-destructive">{errors.alamat.message}</p>
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="application-foto">Foto</Label>
        <Controller
          name="foto"
          control={control}
          render={({ field: { onChange, ref } }) => (
            <Input
              id="application-foto"
              type="file"
              accept="image/*"
              className="mt-2"
              aria-invalid={Boolean(errors.foto)}
              ref={ref}
              onChange={(event) => onChange(event.target.files?.[0])}
            />
          )}
        />
        {errors.foto ? (
          <p className="mt-1.5 text-xs text-destructive">{errors.foto.message}</p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {application ? "Kosongkan bila foto tidak diubah." : "Gunakan foto diri yang jelas."}
          </p>
        )}
      </div>

      {!application ? (
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground sm:col-span-2">
          Setelah disetujui, anggota masuk menggunakan password awal yang ditetapkan sistem dan
          wajib menyelesaikan pengaturan akun.
        </p>
      ) : null}

      <Button type="submit" className="rounded-full sm:col-span-2" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        {pending ? "Memproses…" : submitLabel}
      </Button>
    </form>
  );
}
