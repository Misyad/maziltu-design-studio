import { createFileRoute } from "@tanstack/react-router";
import { HomeHero } from "@/features/home/home-hero";
import { HomeAbout, HomeStatistics } from "@/features/home/home-about";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MZT Apps — Maziltu Tholiban Members Platform" },
      {
        name: "description",
        content:
          "Membership records, events, attendance and digital ID cards for every Maziltu Tholiban branch, in one premium platform.",
      },
      { property: "og:title", content: "MZT Apps — Maziltu Tholiban Members Platform" },
      {
        property: "og:description",
        content:
          "Membership records, events, attendance and digital ID cards for every Maziltu Tholiban branch.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <HomeHero />
      <HomeAbout />
      <HomeStatistics />
    </>
  );
}
