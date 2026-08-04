import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { mediaUrl } from "@/services/api-client";
import type { Member } from "@/types/api";
import { ORG } from "@/constants/content";

export function MemberIdCard({ member }: { member: Member }) {
  return (
    <div className="gradient-emerald relative overflow-hidden rounded-2xl p-5 text-white">
      <div
        className="absolute inset-0 bg-[radial-gradient(60%_100%_at_100%_0%,oklch(1_0_0/0.15),transparent)]"
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-semibold">{ORG.name}</p>
          <p className="text-xs opacity-80">{ORG.shortName}</p>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/15">
            {member.foto ? (
              <img
                src={mediaUrl(member.foto) ?? undefined}
                alt={member.nama}
                className="size-full object-cover"
              />
            ) : (
              <span className="font-display text-2xl font-bold">{member.nama.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{member.nama}</p>
            <p className="mt-0.5 text-xs opacity-85">{member.id_anggota}</p>
            <p className="mt-1 text-xs opacity-80">{member.niqobah}</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
          <p className="font-mono text-center text-sm tracking-[0.35em] text-white">
            {member.id_anggota}
          </p>
        </div>
        <p className="mt-4 text-[10px] opacity-70">
          Verified member of {ORG.name}. Present this card for event entry and attendance scanning.
        </p>
      </div>
    </div>
  );
}

interface IdCardDialogProps {
  member: Member | null;
  onOpenChange: (open: boolean) => void;
}

export function IdCardDialog({ member, onOpenChange }: IdCardDialogProps) {
  if (!member) return null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Digital ID card</DialogTitle>
          <DialogDescription>Print preview for {member.nama}.</DialogDescription>
        </DialogHeader>

        <div id="print-area" className="rounded-2xl">
          <MemberIdCard member={member} />
        </div>

        <Button className="w-full" onClick={() => window.print()}>
          <Printer aria-hidden />
          Print card
        </Button>
      </DialogContent>
    </Dialog>
  );
}
