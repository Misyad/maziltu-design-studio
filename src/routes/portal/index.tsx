import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventCard } from "@/features/events/event-card";
import { NewsCard } from "@/features/news/news-card";
import { usePublicEvents, usePublicNews } from "@/services/public-content";
import { mediaUrl } from "@/services/api-client";
import { meQuery } from "@/services/queries";
import { ORG } from "@/constants/content";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export const Route = createFileRoute("/portal/")({
  component: PortalHome,
});

function PortalHome() {
  const { data: user } = useQuery(meQuery());
  const events = usePublicEvents();
  const news = usePublicNews();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14 rounded-2xl">
            <AvatarImage src={mediaUrl(user?.foto) ?? undefined} alt="" />
            <AvatarFallback>{(user?.name ?? "A").charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">
              {greeting()}, {user?.name}
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-semibold tracking-tight">
              Selamat datang di {ORG.name}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Nomor Anggota: {user?.id_anggota ?? "—"}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/portal/id-card">
            Lihat ID Card
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">ID Card Digital</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Identitas resmi keanggotaan Anda selalu tersedia di ponsel.
          </p>
          <Link to="/portal/id-card" className="mt-4 block">
            <div className="gradient-emerald rounded-2xl p-6 text-white transition-transform hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm font-semibold">{ORG.name}</p>
                <p className="text-xs opacity-80">{ORG.shortName}</p>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/15">
                  {user?.foto ? (
                    <img
                      src={mediaUrl(user.foto) ?? undefined}
                      alt={user.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="font-display text-base font-bold">
                      {(user?.name ?? "A").charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-semibold">{user?.name}</p>
                  <p className="mt-0.5 text-xs opacity-85">{user?.id_anggota}</p>
                </div>
              </div>
              <p className="mt-6 text-center font-mono text-sm tracking-[0.3em]">
                {user?.id_anggota ?? "—"}
              </p>
            </div>
          </Link>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <section>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" aria-hidden />
              <h2 className="font-display text-lg font-semibold">Event Terdekat</h2>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {events.slice(0, 2).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2">
              <Newspaper className="size-5 text-primary" aria-hidden />
              <h2 className="font-display text-lg font-semibold">Berita Terbaru</h2>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {news.slice(0, 2).map((item) => (
                <NewsCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
