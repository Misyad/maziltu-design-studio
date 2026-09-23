import { Link } from "@tanstack/react-router";
import { AlertTriangle, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { FeaturedNewsCard, NewsCard } from "@/features/news/news-card";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { usePublicNews } from "@/services/public-content";

export function HomeNews() {
  const news = usePublicNews();
  const [featured, ...rest] = news.data;

  return (
    <section className="container-page py-20 lg:py-28">
      <Reveal>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle
            eyebrow="Stories"
            title="News & announcements"
            description="The latest from the secretariat, committees and branches across the country."
          />
          <Button asChild variant="outline" className="shrink-0 rounded-full">
            <Link to="/news">
              <Newspaper className="size-4" aria-hidden />
              All news
            </Link>
          </Button>
        </div>
      </Reveal>

      {news.isPending ? (
        <div className="mt-14 space-y-8" role="status">
          <Skeleton className="h-96 rounded-[2rem]" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-80 rounded-3xl" />
            ))}
          </div>
        </div>
      ) : news.isError ? (
        <EmptyState
          className="mt-14"
          icon={AlertTriangle}
          title="Berita belum dapat dimuat"
          description="Coba muat ulang data berita."
          action={<Button onClick={news.refetch}>Coba lagi</Button>}
        />
      ) : !featured ? (
        <EmptyState
          className="mt-14"
          icon={Newspaper}
          title="Belum ada berita"
          description="Berita yang dipublikasikan akan tampil di sini."
        />
      ) : (
        <>
          <Reveal className="mt-14">
            <FeaturedNewsCard item={featured} />
          </Reveal>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.slice(0, 3).map((item, index) => (
              <Reveal key={item.id} delay={index * 0.08} className="h-full">
                <NewsCard item={item} />
              </Reveal>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
