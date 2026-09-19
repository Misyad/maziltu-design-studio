import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type Theme } from "@/providers/theme-provider";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={className}
    >
      {isDark ? <Moon className="size-5" aria-hidden /> : <Sun className="size-5" aria-hidden />}
    </Button>
  );
}

export function ThemeMenu({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const ThemeIcon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={className}
          aria-label="Pilih tema"
        >
          <ThemeIcon className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
          <DropdownMenuRadioItem value="light" className="rounded-lg py-2">
            <Sun aria-hidden />
            Terang
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="rounded-lg py-2">
            <Moon aria-hidden />
            Gelap
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="rounded-lg py-2">
            <Monitor aria-hidden />
            Ikuti sistem
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
