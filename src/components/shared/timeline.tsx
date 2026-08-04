import { cn } from "@/lib/utils";

export interface TimelineEntry {
  year: string;
  title: string;
  description: string;
}

export function Timeline({
  entries,
  className,
}: {
  entries: readonly TimelineEntry[];
  className?: string;
}) {
  return (
    <ol className={cn("relative border-l border-border pl-8", className)}>
      {entries.map((entry) => (
        <li key={entry.year} className="relative pb-10 last:pb-0">
          <span
            className="absolute -left-[41px] mt-1 inline-flex size-4 items-center justify-center rounded-full border-2 border-background bg-primary"
            aria-hidden
          />
          <span className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">
            {entry.year}
          </span>
          <h3 className="mt-2 text-lg font-semibold">{entry.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {entry.description}
          </p>
        </li>
      ))}
    </ol>
  );
}
