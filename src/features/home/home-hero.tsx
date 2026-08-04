import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { MoveUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { IMAGES, ORG } from "@/constants/content";
import { mediaUrl } from "@/services/api-client";
import { usePublicCarousel, usePublicStatistics } from "@/services/public-content";

const easing = [0.22, 1, 0.36, 1] as const;

export function HomeHero() {
  const carousel = usePublicCarousel();
  const statistics = usePublicStatistics();
  const heroImage = mediaUrl(carousel?.[0]?.foto) ?? IMAGES.hero.src;

  return (
    <section className="relative isolate overflow-hidden">
      <img
        src={heroImage}
        alt="Members of Maziltu Tholiban gathered together at a community event"
        width={IMAGES.hero.width}
        height={IMAGES.hero.height}
        className="absolute inset-0 -z-20 size-full object-cover object-center"
      />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-[oklch(0.28_0.07_155/0.94)] via-[oklch(0.3_0.07_155/0.78)] to-[oklch(0.18_0.02_220/0.86)]"
        aria-hidden
      />

      <div className="container-page relative flex min-h-[38rem] flex-col justify-center py-24 sm:min-h-[44rem] lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easing }}
          className="max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.12em] text-gold uppercase backdrop-blur-sm">
            <Sparkles className="size-3.5" aria-hidden />
            {ORG.shortName}
          </span>

          <h1 className="mt-6 font-display text-4xl leading-[1.05] font-bold text-balance-tight text-white sm:text-5xl lg:text-6xl">
            One trusted platform for the whole <span className="text-gold">{ORG.name}</span> family
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            {ORG.description}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/programs">
                Explore the platform
                <MoveUpRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/35 bg-white/10 px-7 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
            >
              <Link to="/events">See upcoming events</Link>
            </Button>
          </div>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: easing }}
          className="mt-16 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 border-t border-white/20 pt-8 sm:grid-cols-4"
        >
          {statistics.map((stat) => (
            <div key={stat.label}>
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-display text-2xl font-bold text-white sm:text-3xl">
                  <AnimatedCounter value={stat.value} suffix="+" />
                </span>
                <span className="mt-1 block text-xs text-white/70 sm:text-sm">{stat.label}</span>
              </dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}
