import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
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
      {events.isPending ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-96 rounded-3xl" />
          ))}
        </div>
      ) : events.isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Event belum dapat dimuat"
          action={<Button onClick={events.refetch}>Coba lagi</Button>}
        />
      ) : events.data.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="Belum ada event"
          description="Event yang dipublikasikan akan tampil di sini."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.data.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
