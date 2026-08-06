import { Link } from "@tanstack/react-router";
import { Menu, MoveUpRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NAV_LINKS, ORG } from "@/constants/content";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-colors duration-300",
        scrolled ? "border-b border-border bg-background/85 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="container-page flex h-18 items-center justify-between gap-6 py-3">
        <Link to="/" className="flex items-center gap-3" aria-label={`${ORG.name} home`}>
          <span
            className="gradient-emerald inline-flex size-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold text-primary-foreground"
            aria-hidden
          >
            MZT
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block font-display text-sm font-semibold">{ORG.name}</span>
            <span className="block text-xs text-muted-foreground">Members Platform</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle className="rounded-full" />
          <Button asChild variant="outline" className="hidden rounded-full sm:inline-flex">
            <Link to="/login">Masuk</Link>
          </Button>
          <Button asChild className="hidden rounded-full sm:inline-flex">
            <Link to="/contact">
              Get involved
              <MoveUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </Button>
        </div>
      </div>

      {open ? (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-border bg-background px-5 pb-6 lg:hidden"
        >
          <ul className="flex flex-col py-2">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
                  activeProps={{ className: "text-primary" }}
                  activeOptions={{ exact: link.to === "/" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="w-full rounded-full">
            <Link to="/login" onClick={() => setOpen(false)}>
              Masuk
            </Link>
          </Button>
          <Button asChild className="w-full rounded-full">
            <Link to="/contact" onClick={() => setOpen(false)}>
              Get involved
            </Link>
          </Button>
        </nav>
      ) : null}
    </header>
  );
}
