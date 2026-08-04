import { Link } from "@tanstack/react-router";
import { CalendarArrowUp, MoveUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/features/events/event-card";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { usePublicEvents } from "@/services/public-content";

export function HomeEvents() {
  const events = usePublicEvents();

  return (
    <section className="border-y border-border bg-surface py-20 lg:py-28">
      <div className="container-page">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionTitle
              eyebrow="Gatherings"
              title="Upcoming events"
              description="Assemblies, camps and outreach across every region — open to all members and branches."
            />
            <Button asChild variant="outline" className="shrink-0 rounded-full">
              <Link to="/events">
                <CalendarArrowUp className="size-4" aria-hidden />
                All events
              </Link>
            </Button>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event, index) => (
            <Reveal key={event.id} delay={index * 0.08} className="h-full">
              <EventCard event={event} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
