import { createFileRoute } from "@tanstack/react-router";
import { EventCard } from "@/features/events/event-card";
import { Reveal } from "@/components/shared/reveal";
import { SectionTitle } from "@/components/shared/section-title";
import { usePublicEvents } from "@/services/public-content";

export const Route = createFileRoute("/events")({
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

      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event, index) => (
          <Reveal key={event.id} delay={index * 0.08} className="h-full">
            <EventCard event={event} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
