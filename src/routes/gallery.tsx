import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Galeri — MZT Apps | Maziltu Tholiban" },
      {
        name: "description",
        content: "Informasi ketersediaan galeri Maziltu Tholiban.",
      },
    ],
  }),
  component: GalleryPage,
});

export function GalleryPage() {
  return (
    <section className="container-page py-20 lg:py-28">
      <Card className="mx-auto max-w-xl text-center">
        <CardHeader>
          <h1 className="font-semibold leading-none tracking-tight">Galeri belum tersedia</h1>
          <CardDescription>
            Dokumentasi kegiatan belum dipublikasikan. Silakan kembali lagi nanti.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="rounded-full">
            <a href="/">Kembali ke beranda</a>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
