import { createFileRoute } from "@tanstack/react-router";
import { MasonryGallery } from "@/components/shared/masonry-gallery";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { GALLERY_IMAGES } from "@/constants/content";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — MZT Apps | Maziltu Tholiban" },
      {
        name: "description",
        content:
          "Gatherings, graduations and outreach captured across Maziltu Tholiban branches — moments from a national community.",
      },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  return (
    <section className="container-page py-20 lg:py-28">
      <Reveal>
        <SectionTitle
          as="h1"
          eyebrow="Moments"
          title="A community in pictures"
          description="Gatherings, graduations and outreach captured across the branches."
        />
      </Reveal>

      <Reveal className="mt-14">
        <MasonryGallery images={GALLERY_IMAGES} />
      </Reveal>
    </section>
  );
}
