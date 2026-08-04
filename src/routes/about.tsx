import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Reveal, RevealGroup, revealItem } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { StatCard } from "@/components/shared/stat-card";
import { Timeline } from "@/components/shared/timeline";
import { motion } from "motion/react";
import { IMAGES, MILESTONES, ORG_VALUES } from "@/constants/content";
import { pesantrenInfoQuery } from "@/services/queries";
import { usePublicStatistics } from "@/services/public-content";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — MZT Apps | Maziltu Tholiban" },
      {
        name: "description",
        content:
          "Maziltu Tholiban's story: from a circle of alumni teachers in 2009 to a national community with digital membership, events and ID cards.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const pesantren = useQuery(pesantrenInfoQuery());
  const statistics = usePublicStatistics();
  const description =
    pesantren.data?.deskripsi ??
    "What began as a small circle of alumni teachers has become a national organisation — and the platform that keeps every member known, supported and connected.";

  return (
    <>
      <section className="container-page grid items-center gap-14 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <Reveal>
            <SectionTitle
              as="h1"
              eyebrow="About us"
              title="Seventeen years of serving one community"
              description={description}
            />
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="mt-8 space-y-3">
              {ORG_VALUES.map((value) => (
                <li key={value.title} className="rounded-2xl border border-border/70 bg-card p-5">
                  <h2 className="font-display text-base font-semibold">{value.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.15} className="relative">
          <div className="overflow-hidden rounded-[2rem] shadow-elevated">
            <img
              src={IMAGES.speaker.src}
              alt="A speaker addressing members at a committee forum"
              width={IMAGES.speaker.width}
              height={IMAGES.speaker.height}
              loading="lazy"
              className="aspect-4/5 size-full object-cover"
            />
          </div>
          <div className="absolute -bottom-8 -left-4 hidden rounded-3xl border border-border bg-card p-5 shadow-elevated sm:block lg:-left-8">
            <p className="flex items-center gap-2 font-display text-lg font-semibold">
              <Check className="size-5 text-primary" aria-hidden />
              48 active branches
            </p>
            <p className="mt-1 text-sm text-muted-foreground">across the archipelago</p>
          </div>
        </Reveal>
      </section>

      <section className="border-y border-border bg-surface py-20 lg:py-24">
        <div className="container-page">
          <Reveal>
            <SectionTitle eyebrow="Our journey" title="Milestones that shaped us" align="center" />
          </Reveal>
          <div className="mx-auto mt-14 max-w-3xl">
            <Timeline entries={MILESTONES} />
          </div>
        </div>
      </section>

      <section className="container-page py-20 lg:py-24">
        <Reveal>
          <SectionTitle
            eyebrow="By the numbers"
            title="A national community, measured honestly"
            align="center"
          />
        </Reveal>
        <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statistics.map((stat, index) => (
            <motion.div key={stat.label} variants={revealItem}>
              <StatCard icon={stat.icon} value={stat.value} label={stat.label} suffix="+" />
            </motion.div>
          ))}
        </RevealGroup>
      </section>
    </>
  );
}
