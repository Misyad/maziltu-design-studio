import { Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarArrowUp, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
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

        {events.isPending ? (
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="status">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-96 rounded-3xl" />
            ))}
          </div>
        ) : events.isError ? (
          <EmptyState
            className="mt-14"
            icon={AlertTriangle}
            title="Event belum dapat dimuat"
            description="Coba muat ulang data event."
            action={<Button onClick={events.refetch}>Coba lagi</Button>}
          />
        ) : events.data.length === 0 ? (
          <EmptyState
            className="mt-14"
            icon={CalendarX}
            title="Belum ada event"
            description="Event yang dipublikasikan akan tampil di sini."
          />
        ) : (
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.data.slice(0, 3).map((event, index) => (
              <Reveal key={event.id} delay={index * 0.08} className="h-full">
                <EventCard event={event} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
