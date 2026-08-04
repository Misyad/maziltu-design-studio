import { Quote } from "lucide-react";
import { Reveal, RevealGroup, revealItem } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { motion } from "motion/react";
import { TESTIMONIALS } from "@/constants/content";

export function HomeTestimonials() {
  return (
    <section className="container-page py-20 lg:py-28">
      <Reveal>
        <SectionTitle
          eyebrow="Word of mouth"
          title="Trusted by secretaries and committees"
          description="People who run branches and events every day, on the tools the platform gives them."
          align="center"
        />
      </Reveal>

      <RevealGroup className="mt-14 grid gap-5 md:grid-cols-3" stagger={0.08}>
        {TESTIMONIALS.map((testimonial) => (
          <motion.figure
            key={testimonial.name}
            variants={revealItem}
            className="flex h-full flex-col rounded-3xl border border-border/70 bg-card p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
          >
            <Quote className="size-7 text-gold" aria-hidden />
            <blockquote className="mt-5 flex-1 text-sm leading-relaxed text-foreground/90">
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-6 border-t border-border pt-5">
              <p className="font-display text-sm font-semibold">{testimonial.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{testimonial.role}</p>
            </figcaption>
          </motion.figure>
        ))}
      </RevealGroup>
    </section>
  );
}
