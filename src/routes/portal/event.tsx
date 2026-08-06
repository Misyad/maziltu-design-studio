import { createFileRoute } from "@tanstack/react-router";
import { usePublicEvents } from "@/services/public-content";
import { EventCard } from "@/features/events/event-card";
import { PageHeader } from "@/features/dashboard/page-header";

export const Route = createFileRoute("/portal/event")({
  component: PortalEvents,
});

function PortalEvents() {
  const events = usePublicEvents();

  return (
    <div className="space-y-6">
      <PageHeader title="Event" description="Agenda dan kegiatan mendatang" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
