import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { generateAccount, resetAccount, setAccountStatus } from "@/services/mzt-api";
import { queryKeys } from "@/services/queries";
import type { Member } from "@/types/api";

interface AccountDialogProps {
  member: Member | null;
  onOpenChange: (open: boolean) => void;
}

function PasswordResult({ label, password }: { label: string; password: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold tracking-widest">{password}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Berikan password ini kepada anggota. Ia akan diminta mengganti saat login pertama.
      </p>
    </div>
  );
}

export function AccountDialog({ member, onOpenChange }: AccountDialogProps) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<{
    label: string;
    password?: string;
    message?: string;
  } | null>(null);

  const generate = useMutation({
    mutationFn: () => generateAccount(member!.id_users),
    onSuccess: (res) => {
      setResult({ label: "Akun berhasil dibuat", password: res.password });
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Akun sudah ada / gagal");
    },
  });

  const reset = useMutation({
    mutationFn: () => resetAccount(member!.id_users),
    onSuccess: (res) => {
      setResult({ label: "Password berhasil di-reset", password: res.password });
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal mereset password");
    },
  });

  const activate = useMutation({
    mutationFn: (active: "1" | "0") => setAccountStatus(member!.id_users, active),
    onSuccess: (res) => {
      toast.success(res.message ?? "Berhasil");
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Gagal mengubah status");
    },
  });

  const isLoading: boolean = generate.isPending || reset.isPending || activate.isPending;

  return (
    <Dialog
      open={!!member}
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false);
          setResult(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" aria-hidden />
            Manage account
          </DialogTitle>
          <DialogDescription>
            {member?.nama} ({member?.id_anggota}) — kelola akun akses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              disabled={isLoading}
              onClick={() => generate.mutate()}
            >
              {generate.isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <KeyRound aria-hidden />
              )}
              Generate Akun
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={isLoading}
              onClick={() => reset.mutate()}
            >
              {reset.isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <KeyRound aria-hidden />
              )}
              Reset Password
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              className="rounded-full"
              disabled={isLoading}
              onClick={() => activate.mutate("1")}
            >
              <UserCheck aria-hidden />
              Aktifkan
            </Button>
            <Button
              variant="ghost"
              className="rounded-full text-destructive hover:text-destructive"
              disabled={isLoading}
              onClick={() => activate.mutate("0")}
            >
              <UserX aria-hidden />
              Nonaktifkan
            </Button>
          </div>

          {result?.password ? (
            <PasswordResult label={result.label} password={result.password} />
          ) : null}
          {result?.message && !result.password ? (
            <p className="rounded-xl bg-muted p-3 text-sm">{result.message}</p>
          ) : null}

          <Separator />
          <p className="text-xs text-muted-foreground">
            Password hanya ditampilkan sekali setelah aksi. Simpan sebelum menutup pop-up.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
