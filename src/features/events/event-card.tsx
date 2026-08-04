import { CalendarDays, MapPin, MoveUpRight, Ticket } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlaceholderEvent } from "@/constants/content";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<PlaceholderEvent["status"], string> = {
  Upcomming: "Upcoming",
  Ongoing: "Happening now",
  Complate: "Completed",
};

const STATUS_CLASS: Record<PlaceholderEvent["status"], string> = {
  Upcomming: "bg-primary-soft text-accent-foreground",
  Ongoing: "bg-gold-soft text-gold",
  Complate: "bg-muted text-muted-foreground",
};

export function formatPrice(harga: number) {
  if (!harga) return "Free entry";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(harga);
}

export function EventCard({ event, className }: { event: PlaceholderEvent; className?: string }) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated",
        className,
      )}
    >
      <div className="relative aspect-16/10 overflow-hidden">
        <img
          src={event.image}
          alt={event.judul_event}
          width={event.imageWidth}
          height={event.imageHeight}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <Badge
          className={cn(
            "absolute top-4 left-4 rounded-full border-0 px-3 py-1 text-xs font-semibold",
            STATUS_CLASS[event.status],
          )}
        >
          {STATUS_LABEL[event.status]}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl leading-snug font-semibold">{event.judul_event}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {event.deskripsi}
        </p>

        <dl className="mt-5 space-y-2.5 text-sm">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
            <dt className="sr-only">Dates</dt>
            <dd>
              {event.tanggal_mulai} — {event.tanggal_selesai}
            </dd>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
            <dt className="sr-only">Location</dt>
            <dd>{event.lokasi}</dd>
          </div>
          <div className="flex items-center gap-2.5">
            <Ticket className="size-4 shrink-0 text-primary" aria-hidden />
            <dt className="sr-only">Contribution</dt>
            <dd>{formatPrice(event.harga)}</dd>
          </div>
        </dl>

        <Button asChild variant="outline" className="mt-6 w-full rounded-full">
          <Link to="/contact">
            Register interest
            <MoveUpRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}
