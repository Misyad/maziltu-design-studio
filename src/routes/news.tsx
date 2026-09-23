import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FeaturedNewsCard, NewsCard } from "@/features/news/news-card";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { usePublicNews } from "@/services/public-content";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News — MZT Apps | Maziltu Tholiban" },
      {
        name: "description",
        content:
          "The latest from the Maziltu Tholiban secretariat, committees and branches — announcements, stories and programme updates.",
      },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const news = usePublicNews();
  const [featured, ...rest] = news.data;

  return (
    <section className="container-page py-20 lg:py-28">
      <Reveal>
        <SectionTitle
          as="h1"
          eyebrow="Stories"
          title="News & announcements"
          description="The latest from the secretariat, committees and branches across the country."
        />
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
            {rest.map((item, index) => (
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
