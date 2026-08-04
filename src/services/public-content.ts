import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CalendarDays, LayoutDashboard, Users, type LucideIcon } from "lucide-react";
import {
  PLACEHOLDER_EVENTS,
  PLACEHOLDER_NEWS,
  STATISTICS,
  type PlaceholderEvent,
  type PlaceholderNews,
} from "@/constants/content";
import { mediaUrl } from "@/services/api-client";
import {
  publicCarouselQuery,
  publicEventsQuery,
  publicNewsQuery,
  publicStatsQuery,
} from "@/services/queries";
import type { CarouselSlide, EventItem, NewsItem, PublicStats } from "@/types/api";

export interface PublicStatItem {
  label: string;
  value: number;
  icon: LucideIcon;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Renders backend date values (ISO or dd/mm/yyyy) as dd/mm/yyyy. */
export function formatDateShort(value: string): string {
  const date = parseDate(value);
  if (!date) return value;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function eventStatus(start: string, end: string): PlaceholderEvent["status"] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  if (!startDate || !endDate) return "Upcomming";
  if (endDate < today) return "Complate";
  if (startDate <= today) return "Ongoing";
  return "Upcomming";
}

function parseHarga(harga: number | string): number {
  if (typeof harga === "number") return harga;
  const digits = harga.replace(/[^\d]/g, "");
  const parsed = Number.parseInt(digits, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Converts the backend `harga` (string like "Rp. 100.000" or number) to a number. */
export function parsePrice(harga: number | string): number {
  return parseHarga(harga);
}

/** Strips HTML tags (backend `deskripsi` is stored as markup) for card previews. */
export function stripHtml(value: string): string {
  if (typeof document === "undefined") return value;
  const el = document.createElement("div");
  el.innerHTML = value;
  return el.textContent ?? "";
}

function toPublicEvent(event: EventItem): PlaceholderEvent {
  return {
    id: event.id,
    judul_event: event.judul_event,
    slug: event.slug || `event-${event.id}`,
    lokasi: event.lokasi || "—",
    harga: parseHarga(event.harga),
    deskripsi: stripHtml(event.deskripsi),
    tanggal_mulai: formatDateShort(event.tanggal_mulai),
    tanggal_selesai: formatDateShort(event.tanggal_selesai),
    status: eventStatus(event.tanggal_mulai, event.tanggal_selesai),
    image: mediaUrl(event.banner) ?? PLACEHOLDER_EVENTS[0]?.image ?? "",
    imageWidth: 1200,
    imageHeight: 800,
  };
}

function toPublicNewsItem(item: NewsItem): PlaceholderNews {
  return {
    id: item.id,
    judul: item.judul,
    slug: item.slug || `berita-${item.id}`,
    deskripsi: stripHtml(item.deskripsi),
    pembuat: item.pembuat ?? "Secretariat",
    created_at: item.created_at,
    image: mediaUrl(item.foto) ?? PLACEHOLDER_NEWS[0]?.image ?? "",
    imageWidth: 1200,
    imageHeight: 800,
  };
}

function toStatistics(stats: PublicStats): PublicStatItem[] {
  return [
    { label: "Registered members", value: stats.total_anggota, icon: Users },
    { label: "Events completed", value: stats.event_selesai, icon: BadgeCheck },
    { label: "Upcoming events", value: stats.event_mendatang, icon: CalendarDays },
    { label: "Active events", value: stats.event, icon: LayoutDashboard },
  ];
}

/** PUBLIC events with graceful fallback to placeholder content. */
export function usePublicEvents(): PlaceholderEvent[] {
  const { data } = useQuery(publicEventsQuery());
  const events = (data ?? []).map(toPublicEvent);
  return events.length > 0 ? events : [...PLACEHOLDER_EVENTS];
}

/** PUBLIC news with graceful fallback to placeholder content. */
export function usePublicNews(): PlaceholderNews[] {
  const { data } = useQuery(publicNewsQuery());
  const items = (data ?? []).map(toPublicNewsItem);
  return items.length > 0 ? items : [...PLACEHOLDER_NEWS];
}

/** PUBLIC hero carousel images, or null to keep the static hero image. */
export function usePublicCarousel(): CarouselSlide[] | null {
  const { data } = useQuery(publicCarouselQuery());
  return data && data.length > 0 ? data : null;
}

/** PUBLIC statistics with graceful fallback to placeholder content. */
export function usePublicStatistics(): PublicStatItem[] {
  const { data } = useQuery(publicStatsQuery());
  return data ? toStatistics(data) : [...STATISTICS];
}
