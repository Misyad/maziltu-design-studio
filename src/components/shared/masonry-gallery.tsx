import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

/** Responsive masonry gallery with a keyboard-accessible lightbox. */
export function MasonryGallery({
  images,
  className,
}: {
  images: readonly GalleryImage[];
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null ? current : (current + delta + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close, step]);

  const active = openIndex === null ? null : images[openIndex];

  return (
    <>
      <div className={cn("columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5", className)}>
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="group relative block w-full overflow-hidden rounded-3xl border border-border/60 bg-muted shadow-soft transition-shadow duration-300 hover:shadow-elevated"
            aria-label={`Open image: ${image.alt}`}
          >
            <img
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              loading="lazy"
              className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            {image.caption ? (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-4 text-left text-sm font-medium text-background opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {image.caption}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={active.alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4 backdrop-blur-sm"
            onClick={close}
          >
            <motion.img
              key={active.src}
              src={active.src}
              alt={active.alt}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain"
              onClick={(event) => event.stopPropagation()}
            />

            <button
              type="button"
              onClick={close}
              aria-label="Close image viewer"
              className="absolute top-5 right-5 inline-flex size-11 items-center justify-center rounded-full bg-background/90 text-foreground transition hover:bg-background"
            >
              <X className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                step(-1);
              }}
              aria-label="Previous image"
              className="absolute left-4 inline-flex size-11 items-center justify-center rounded-full bg-background/90 text-foreground transition hover:bg-background"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                step(1);
              }}
              aria-label="Next image"
              className="absolute right-4 inline-flex size-11 items-center justify-center rounded-full bg-background/90 text-foreground transition hover:bg-background"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
