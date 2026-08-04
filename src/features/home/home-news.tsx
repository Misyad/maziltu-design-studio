import { Link } from "@tanstack/react-router";
import { MoveUpRight, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeaturedNewsCard, NewsCard } from "@/features/news/news-card";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { usePublicNews } from "@/services/public-content";

export function HomeNews() {
  const items = usePublicNews();
  const [featured, ...rest] = items;

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

      <Reveal className="mt-12 flex justify-center" delay={0.1}>
        <Button asChild className="rounded-full px-7">
          <Link to="/news">
            Browse all stories
            <MoveUpRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </Reveal>
    </section>
  );
}
