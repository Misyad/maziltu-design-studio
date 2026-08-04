import { Link } from "@tanstack/react-router";
import { Check, MoveUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { StatCard } from "@/components/shared/stat-card";
import { IMAGES, ORG_VALUES } from "@/constants/content";
import { usePublicStatistics } from "@/services/public-content";

const HIGHLIGHTS = [
  "Verified member records across every branch",
  "Attendance and events tracked in real time",
  "Digital ID cards issued in minutes, not weeks",
] as const;

export function HomeAbout() {
  return (
    <section className="container-page py-20 lg:py-28">
      <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative">
          <div className="overflow-hidden rounded-[2rem] shadow-elevated">
            <img
              src={IMAGES.mentoring.src}
              alt="Teachers mentoring students around a table of books"
              width={IMAGES.mentoring.width}
              height={IMAGES.mentoring.height}
              loading="lazy"
              className="aspect-4/5 size-full object-cover sm:aspect-4/3 lg:aspect-4/5"
            />
          </div>
          <div className="absolute -right-2 -bottom-8 hidden w-56 rounded-3xl border border-border bg-card p-5 shadow-elevated sm:block lg:-right-8">
            <p className="font-display text-3xl font-bold text-primary">17</p>
            <p className="mt-1 text-sm text-muted-foreground">
              years serving members and their families
            </p>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <SectionTitle
              eyebrow="About us"
              title="Serving one community with modern, honest infrastructure"
              description="From a circle of alumni teachers to a national organisation, Maziltu Tholiban has always been about knowing and supporting every member personally. The platform simply makes that possible at scale."
            />
          </Reveal>

          <Reveal delay={0.1} className="mt-8 space-y-6">
            {ORG_VALUES.map((value) => (
              <div key={value.title} className="rounded-2xl border border-border/70 bg-card p-5">
                <h3 className="font-display text-base font-semibold">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
              </div>
            ))}
          </Reveal>

          <Reveal delay={0.15}>
            <ul className="mt-8 space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span
                    className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
                    aria-hidden
                  >
                    <Check className="size-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <Button asChild className="mt-9 rounded-full px-6">
              <Link to="/about">
                Read our story
                <MoveUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function HomeStatistics() {
  const statistics = usePublicStatistics();
  return (
    <section className="border-y border-border bg-surface py-20 lg:py-24">
      <div className="container-page">
        <Reveal>
          <SectionTitle
            eyebrow="By the numbers"
            title="A national community, measured honestly"
            description="Figures reported by branch secretariats at the last assembly."
            align="center"
          />
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statistics.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.08}>
              <StatCard icon={stat.icon} value={stat.value} label={stat.label} suffix="+" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
