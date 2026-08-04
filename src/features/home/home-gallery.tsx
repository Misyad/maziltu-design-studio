import { Link } from "@tanstack/react-router";
import { Camera, MoveUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MasonryGallery } from "@/components/shared/masonry-gallery";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { GALLERY_IMAGES } from "@/constants/content";

export function HomeGallery() {
  const images = GALLERY_IMAGES.slice(0, 6);

  return (
    <section className="border-y border-border bg-surface py-20 lg:py-28">
      <div className="container-page">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle
              eyebrow="Moments"
              title="A community in pictures"
              description="Gatherings, graduations and outreach captured across the branches."
            />
            <Button asChild variant="outline" className="shrink-0 rounded-full">
              <Link to="/gallery">
                <Camera className="size-4" aria-hidden />
                Full gallery
              </Link>
            </Button>
          </div>
        </Reveal>

        <Reveal className="mt-14">
          <MasonryGallery images={images} />
        </Reveal>

        <Reveal className="mt-12 flex justify-center" delay={0.1}>
          <Button asChild className="rounded-full px-7">
            <Link to="/gallery">
              See every moment
              <MoveUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
