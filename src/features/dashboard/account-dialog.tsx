import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, Loader2, TriangleAlert } from "lucide-react";
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
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const matches = !!member && confirmation === member.id_anggota;

  function clearSensitiveState() {
    submitting.current = false;
    setConfirmation("");
    setTemporaryPassword(null);
    setError(null);
    setIsPending(false);
    setCopied(false);
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
      const result = await resetAccount(member.id_users, confirmation);
      setTemporaryPassword(result.temporary_password);
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

  async function copyPassword() {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
    } catch {
      setError("Password tidak dapat disalin otomatis. Salin secara manual.");
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

        {temporaryPassword ? (
          <div className="space-y-4">
            <Alert>
              <KeyRound aria-hidden />
              <AlertTitle>Password sementara</AlertTitle>
              <AlertDescription>
                Password ini hanya ditampilkan sekali. Anggota wajib menggantinya setelah login.
              </AlertDescription>
            </Alert>
            <div className="flex items-center gap-2 rounded-xl border bg-muted p-3">
              <code className="flex-1 text-center text-lg font-semibold tracking-widest">
                {temporaryPassword}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                <span className="sr-only">Salin password sementara</span>
              </Button>
            </div>
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
