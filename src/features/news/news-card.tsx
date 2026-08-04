import { CalendarDays, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PlaceholderNews } from "@/constants/content";
import { cn } from "@/lib/utils";

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function NewsCard({ item, className }: { item: PlaceholderNews; className?: string }) {
  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated",
        className,
      )}
    >
      <div className="aspect-16/10 overflow-hidden">
        <img
          src={item.image}
          alt={item.judul}
          width={item.imageWidth}
          height={item.imageHeight}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden />
            {formatDate(item.created_at)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-3.5" aria-hidden />
            {item.pembuat}
          </span>
        </div>
        <h3 className="mt-3 font-display text-lg leading-snug font-semibold">
          <Link
            to="/news/$id"
            params={{ id: String(item.id) }}
            className="transition-colors group-hover:text-primary"
          >
            {item.judul}
          </Link>
        </h3>
        <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {item.deskripsi}
        </p>
      </div>
    </article>
  );
}

export function FeaturedNewsCard({ item }: { item: PlaceholderNews }) {
  return (
    <article className="group grid overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-soft transition-shadow duration-300 hover:shadow-elevated lg:grid-cols-2">
      <div className="aspect-4/3 overflow-hidden lg:aspect-auto lg:h-full">
        <img
          src={item.image}
          alt={item.judul}
          width={item.imageWidth}
          height={item.imageHeight}
          loading="lazy"
          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col justify-center p-8 lg:p-12">
        <span className="eyebrow">Featured story</span>
        <h3 className="mt-4 font-display text-2xl leading-tight font-semibold sm:text-3xl">
          <Link
            to="/news/$id"
            params={{ id: String(item.id) }}
            className="transition-colors group-hover:text-primary"
          >
            {item.judul}
          </Link>
        </h3>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{item.deskripsi}</p>
        <p className="mt-6 text-xs text-muted-foreground">
          {formatDate(item.created_at)} &middot; {item.pembuat}
        </p>
      </div>
    </article>
  );
}
