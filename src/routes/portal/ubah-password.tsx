import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { changePassword } from "@/services/mzt-api";
import { queryKeys } from "@/services/queries";
import { PageHeader } from "@/features/dashboard/page-header";

const schema = z
  .object({
    current_password: z.string().min(1, "Password lama wajib diisi"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ["password_confirmation"],
    message: "Konfirmasi password tidak cocok",
  });

type Values = z.infer<typeof schema>;

export const Route = createFileRoute("/portal/ubah-password")({
  component: PortalChangePassword,
});

function PortalChangePassword() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: "", password: "", password_confirmation: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      changePassword({
        current_password: values.current_password,
        password: values.password,
        password_confirmation: values.password_confirmation,
      }),
    onSuccess: async () => {
      toast.success("Password berhasil diubah");
      await queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
      await router.navigate({ to: "/portal" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal mengubah password");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Ubah Password" description="Ganti password akun Anda" />

      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" aria-hidden />
            Password baru
          </CardTitle>
          <CardDescription>
            {errors.current_password
              ? null
              : "Gunakan minimal 6 karakter yang tidak mudah ditebak."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-5">
            <div>
              <Label htmlFor="pw-old">Password lama</Label>
              <Input
                id="pw-old"
                type="password"
                className="mt-2"
                autoComplete="current-password"
                aria-invalid={!!errors.current_password}
                {...register("current_password")}
              />
              {errors.current_password ? (
                <p className="mt-1.5 text-xs text-destructive">{errors.current_password.message}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="pw-new">Password baru</Label>
              <Input
                id="pw-new"
                type="password"
                className="mt-2"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password ? (
                <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="pw-confirm">Konfirmasi password baru</Label>
              <Input
                id="pw-confirm"
                type="password"
                className="mt-2"
                autoComplete="new-password"
                aria-invalid={!!errors.password_confirmation}
                {...register("password_confirmation")}
              />
              {errors.password_confirmation ? (
                <p className="mt-1.5 text-xs text-destructive">
                  {errors.password_confirmation.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <KeyRound aria-hidden />
              )}
              Simpan Password Baru
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
