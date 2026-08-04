import { Link } from "@tanstack/react-router";
import { MoveUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal, RevealGroup, revealItem } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { motion } from "motion/react";
import { PROGRAMS } from "@/constants/content";

export function HomePrograms() {
  return (
    <section className="container-page py-20 lg:py-28">
      <Reveal>
        <SectionTitle
          eyebrow="What we offer"
          title="Everything your branch needs, in one place"
          description="Seven tools that replace spreadsheets, paper registries and separate apps — designed to feel as good as they work."
        />
      </Reveal>

      <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
        {PROGRAMS.map((program, index) => (
          <motion.div
            key={program.slug}
            variants={revealItem}
            className={index >= 6 ? "sm:col-span-2 lg:col-span-1 lg:col-start-2" : undefined}
          >
            <Link
              to="/programs"
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className="relative aspect-16/9 overflow-hidden">
                <img
                  src={program.image}
                  alt={program.title}
                  width={program.imageWidth}
                  height={program.imageHeight}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span
                  className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent"
                  aria-hidden
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <program.icon className="size-5" aria-hidden />
                  </span>
                  <MoveUpRight
                    className="size-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                    aria-hidden
                  />
                </div>
                <h3 className="mt-4 font-display text-lg leading-snug font-semibold group-hover:text-primary">
                  {program.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {program.description}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </RevealGroup>

      <Reveal className="mt-12 flex justify-center" delay={0.1}>
        <Button asChild className="rounded-full px-7">
          <Link to="/programs">
            Explore every feature
            <MoveUpRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </Reveal>
    </section>
  );
}
