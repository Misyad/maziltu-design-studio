import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, Loader2, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { ApiError } from "@/services/api-client";
import { resetAccount } from "@/services/mzt-api";
import { queryKeys } from "@/services/queries";
import type { AccountResetAuditItem, Member } from "@/types/api";

interface AccountDialogProps {
  member: Member | null;
  auditItem: AccountResetAuditItem | null;
  onOpenChange: (open: boolean) => void;
}

function resetErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Gagal mereset password. Silakan coba lagi.";
  if (error.status === 403) return "Anda tidak memiliki izin untuk mereset akun ini.";
  if (error.status === 409) return "Akun tidak lagi memenuhi syarat reset. Muat ulang audit akun.";
  if (error.status === 422) {
    return error.errors?.["confirmation_id_anggota"]?.[0] ?? error.message;
  }
  if (error.status === 503) return "Layanan reset akun sedang tidak tersedia. Coba lagi nanti.";
  return error.message;
}

export function AccountDialog({ member, auditItem, onOpenChange }: AccountDialogProps) {
  const queryClient = useQueryClient();
  const submitting = useRef(false);
  const [confirmation, setConfirmation] = useState("");
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const matches = !!member && confirmation === member.id_anggota;

  function clearSensitiveState() {
    submitting.current = false;
    setConfirmation("");
    setResetComplete(false);
    setError(null);
    setIsPending(false);
  }

  function handleOpenChange(open: boolean) {
    if (!open && isPending) return;
    if (!open) clearSensitiveState();
    onOpenChange(open);
  }

  async function handleReset() {
    if (!member || !auditItem?.eligible || !matches || submitting.current) return;
    submitting.current = true;
    setIsPending(true);
    setError(null);
    try {
      await resetAccount(member.id_users, confirmation);
      setResetComplete(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.members }),
        queryClient.invalidateQueries({ queryKey: queryKeys.accountResetAudit }),
      ]);
    } catch (resetError) {
      setError(resetErrorMessage(resetError));
      submitting.current = false;
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(event) => isPending && event.preventDefault()}
        onInteractOutside={(event) => isPending && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" aria-hidden />
            Reset password akun
          </DialogTitle>
          <DialogDescription>
            {member?.nama} ({member?.id_anggota})
          </DialogDescription>
        </DialogHeader>

        {resetComplete ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 aria-hidden />
              <AlertTitle>Reset akun berhasil</AlertTitle>
              <AlertDescription>
                Anggota dapat menggunakan kredensial awal yang berlaku dan wajib menyelesaikan
                pengaturan akun setelah login.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button
                type="button"
                className="rounded-full"
                onClick={() => handleOpenChange(false)}
              >
                Selesai
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <TriangleAlert aria-hidden />
              <AlertTitle>Tindakan sensitif</AlertTitle>
              <AlertDescription>
                Password lama akan langsung tidak berlaku dan anggota dipaksa membuat password baru.
                Reset ini tidak dapat dibatalkan.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="account-reset-confirmation">
                Ketik ID anggota{" "}
                <span className="font-mono font-semibold">{member?.id_anggota}</span>
              </Label>
              <Input
                id="account-reset-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={isPending}
                autoComplete="off"
                aria-invalid={confirmation.length > 0 && !matches}
              />
              {confirmation.length > 0 && !matches ? (
                <p className="text-xs text-destructive">ID anggota harus sama persis.</p>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleOpenChange(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending || !matches || !auditItem?.eligible}
                onClick={handleReset}
              >
                {isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <KeyRound aria-hidden />
                )}
                {isPending ? "Mereset…" : "Reset password"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
