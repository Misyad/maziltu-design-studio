import { createFileRoute } from "@tanstack/react-router";
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
  const items = usePublicNews();
  const [featured, ...rest] = items;

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
    </section>
  );
}
