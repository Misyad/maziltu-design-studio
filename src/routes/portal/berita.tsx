import { createFileRoute } from "@tanstack/react-router";
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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
