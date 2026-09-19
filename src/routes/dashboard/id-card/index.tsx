import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { KTA_PRINT_AREA_ID, PhysicalKtaCard } from "@/features/dashboard/physical-kta-card";
import { PageHeader } from "@/features/dashboard/page-header";
import { KTA_CARD_ROLES, requireRoles } from "@/lib/auth";
import { ktaCardQuery, ktaCardsQuery } from "@/services/queries";

export const Route = createFileRoute("/dashboard/id-card/")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, KTA_CARD_ROLES, location.href),
  component: IdCardPage,
});

export function IdCardPage() {
  const cards = useQuery(ktaCardsQuery());
  const [idUsers, setIdUsers] = useState<string>("");
  const card = useQuery({
    ...ktaCardQuery(idUsers || 0),
    enabled: idUsers !== "",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="KTA Fisik"
        description="Pilih anggota, periksa data kartu, lalu cetak dalam ukuran ID-1 85,6 × 54 mm."
      />

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-base">Pilih anggota</CardTitle>
          <CardDescription>Daftar ini hanya memuat identitas minimum untuk pencetakan KTA.</CardDescription>
        </CardHeader>
        <CardContent>
          {cards.isPending ? (
            <Skeleton className="h-10 w-80 rounded-xl" />
          ) : cards.isError ? (
            <p className="text-sm text-destructive">Gagal memuat daftar anggota.</p>
          ) : (
            <Select value={idUsers} onValueChange={setIdUsers}>
              <SelectTrigger className="w-full sm:w-96">
                <SelectValue placeholder="Pilih anggota…" />
              </SelectTrigger>
              <SelectContent>
                {cards.data?.map((item) => (
                  <SelectItem key={item.id_users} value={String(item.id_users)}>
                    {item.nama} · {item.id_anggota}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {!idUsers ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Pilih anggota untuk menampilkan KTA.
        </div>
      ) : card.isPending ? (
        <Skeleton className="mx-auto aspect-[85.6/54] w-full max-w-4xl rounded-xl" />
      ) : card.isError || !card.data ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Gagal memuat data KTA anggota.
        </div>
      ) : (
        <div className="space-y-4">
          <div id={KTA_PRINT_AREA_ID} className="mx-auto max-w-4xl">
            <PhysicalKtaCard card={card.data} />
          </div>
          <div className="mx-auto max-w-4xl">
            <Button className="w-full rounded-full" onClick={() => window.print()}>
              <Printer aria-hidden />
              Cetak KTA
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
