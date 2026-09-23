import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePublicNews } from "@/services/public-content";
import { NewsCard } from "@/features/news/news-card";
import { PageHeader } from "@/features/dashboard/page-header";

export const Route = createFileRoute("/portal/berita")({
  component: PortalNews,
});

function PortalNews() {
  const news = usePublicNews();

  return (
    <div className="space-y-6">
      <PageHeader title="Berita" description="Informasi dan kabar terbaru organisasi" />
      {news.isPending ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-80 rounded-3xl" />
          ))}
        </div>
      ) : news.isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Berita belum dapat dimuat"
          action={<Button onClick={news.refetch}>Coba lagi</Button>}
        />
      ) : news.data.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Belum ada berita"
          description="Berita yang dipublikasikan akan tampil di sini."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {news.data.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
