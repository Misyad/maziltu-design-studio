import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/features/dashboard/page-header";
import { MEMBER_ADMIN_ROLES, requireRoles } from "@/lib/auth";
import { ApiError } from "@/services/api-client";
import { updateKtaPriceSettings } from "@/services/mzt-api";
import { ktaPriceSettingsQuery, queryKeysKtaPrint } from "@/services/queries";

export const Route = createFileRoute("/dashboard/kta/settings/")({
  beforeLoad: ({ context, location }) =>
    requireRoles(context.queryClient, MEMBER_ADMIN_ROLES, location.href),
  component: KtaPriceSettingsPage,
});

const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("id-ID");
}

export function KtaPriceSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery(ktaPriceSettingsQuery());
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (settings.data) setAmount(String(settings.data.setting.amount));
  }, [settings.data]);

  const numericAmount = Number(amount);
  const valid = amount !== "" && Number.isInteger(numericAmount) && numericAmount >= 0;

  const update = useMutation({
    mutationFn: () => updateKtaPriceSettings(numericAmount),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeysKtaPrint.settings, data);
      setAmount(String(data.setting.amount));
      toast.success("Harga KTA berhasil diperbarui");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Harga KTA gagal disimpan");
    },
  });

  if (settings.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (settings.isError || !settings.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Pengaturan Harga KTA" />
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm text-destructive">Pengaturan harga KTA tidak dapat dimuat.</p>
            <Button variant="outline" onClick={() => void settings.refetch()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Harga KTA"
        description="Harga baru hanya berlaku untuk pengajuan baru. Transaksi lama tetap memakai harga snapshot."
        actions={
          <Button asChild variant="outline" className="rounded-full">
            <a href="/dashboard/kta">
              <ArrowLeft aria-hidden />
              Kembali ke Antrean
            </a>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Harga Aktif</CardTitle>
            <CardDescription>
              Saat ini {RUPIAH.format(settings.data.setting.amount)}
              {settings.data.setting.updated_at
                ? ` · diperbarui ${formatDate(settings.data.setting.updated_at)}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (valid && !update.isPending) update.mutate();
              }}
            >
              <div>
                <Label htmlFor="kta-price">Harga KTA Fisik</Label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    id="kta-price"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="pl-10"
                    aria-invalid={amount !== "" && !valid}
                  />
                </div>
                {amount !== "" && !valid ? (
                  <p className="mt-1 text-xs text-destructive">
                    Harga harus berupa bilangan bulat minimal 0.
                  </p>
                ) : null}
              </div>
              <Button className="w-full rounded-full" disabled={!valid || update.isPending}>
                {update.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Save aria-hidden />
                )}
                Simpan Harga Baru
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riwayat Perubahan</CardTitle>
            <CardDescription>Harga lama, harga baru, aktor, dan waktu perubahan.</CardDescription>
          </CardHeader>
          <CardContent>
            {settings.data.history.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Belum ada perubahan harga tercatat.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Harga Lama</th>
                      <th className="px-3 py-2">Harga Baru</th>
                      <th className="px-3 py-2">Aktor</th>
                      <th className="px-3 py-2">Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.data.history.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="px-3 py-3">{RUPIAH.format(item.old_amount)}</td>
                        <td className="px-3 py-3 font-medium">{RUPIAH.format(item.new_amount)}</td>
                        <td className="px-3 py-3">{item.actor ?? "—"}</td>
                        <td className="px-3 py-3">{formatDate(item.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
