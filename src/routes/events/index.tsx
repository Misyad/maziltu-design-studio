import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/features/events/event-card";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { usePublicEvents } from "@/services/public-content";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Events — MZT Apps | Maziltu Tholiban" },
      {
        name: "description",
        content:
          "Upcoming and ongoing Maziltu Tholiban events — assemblies, camps and outreach across every region, open to all members and branches.",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const events = usePublicEvents();

  return (
    <section className="container-page py-20 lg:py-28">
      <Reveal>
        <SectionTitle
          as="h1"
          eyebrow="Gatherings"
          title="Upcoming events"
          description="Assemblies, camps and outreach across every region — open to all members and branches."
        />
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
          {events.data.map((event, index) => (
            <Reveal key={event.id} delay={index * 0.08} className="h-full">
              <EventCard event={event} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
