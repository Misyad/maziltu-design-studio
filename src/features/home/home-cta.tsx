import { Link } from "@tanstack/react-router";
import { MoveUpRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/shared/reveal";
import { ORG } from "@/constants/content";

export function HomeCTA() {
  return (
    <section className="container-page py-20 lg:py-24">
      <Reveal>
        <div className="gradient-emerald relative overflow-hidden rounded-[2.5rem] px-6 py-16 text-center shadow-elevated sm:px-16 lg:py-20">
          <div
            className="absolute inset-0 bg-[radial-gradient(60%_120%_at_50%_0%,oklch(1_0_0/0.14),transparent)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.12em] text-white uppercase backdrop-blur-sm">
              <ShieldCheck className="size-3.5" aria-hidden />
              Get involved
            </span>
            <h2 className="mt-6 font-display text-3xl leading-tight font-bold text-balance-tight text-white sm:text-4xl lg:text-5xl">
              Ready to be part of {ORG.name}?
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/85">
              Join as a member, volunteer for a committee, or register your branch on the platform.
              Our secretariat will guide you from the first conversation.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-white px-7 text-primary hover:bg-white/90 hover:text-primary"
              >
                <Link to="/contact">
                  Contact the secretariat
                  <MoveUpRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/35 bg-white/10 px-7 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
              >
                <Link to="/programs">See the platform</Link>
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
