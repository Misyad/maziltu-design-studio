import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CalendarDays, LayoutDashboard, Users, type LucideIcon } from "lucide-react";
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

export interface PublicEventCard {
  id: number;
  judul_event: string;
  slug: string;
  lokasi: string;
  harga: number;
  deskripsi: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: "Upcomming" | "Ongoing" | "Complate";
  image: string | null;
  imageWidth: number;
  imageHeight: number;
}

export interface PublicNewsCard {
  id: number;
  judul: string;
  slug: string;
  deskripsi: string;
  pembuat: string;
  created_at: string;
  image: string | null;
  imageWidth: number;
  imageHeight: number;
}

export interface PublicContentState<T> {
  data: T;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateShort(value: string): string {
  const date = parseDate(value);
  if (!date) return value;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function eventStatus(start: string, end: string): PublicEventCard["status"] {
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

export function parsePrice(harga: number | string): number {
  return parseHarga(harga);
}

export function stripHtml(value: string): string {
  if (typeof document === "undefined") return value;
  const el = document.createElement("div");
  el.innerHTML = value;
  return el.textContent ?? "";
}

function toPublicEvent(event: EventItem): PublicEventCard {
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
    image: mediaUrl(event.banner),
    imageWidth: 1200,
    imageHeight: 800,
  };
}

function toPublicNewsItem(item: NewsItem): PublicNewsCard {
  return {
    id: item.id,
    judul: item.judul,
    slug: item.slug || `berita-${item.id}`,
    deskripsi: stripHtml(item.deskripsi),
    pembuat: item.pembuat ?? "Sekretariat",
    created_at: item.created_at,
    image: mediaUrl(item.foto),
    imageWidth: 1200,
    imageHeight: 800,
  };
}

function toStatistics(stats: PublicStats): PublicStatItem[] {
  return [
    { label: "Anggota terdaftar", value: stats.total_anggota, icon: Users },
    { label: "Event selesai", value: stats.event_selesai, icon: BadgeCheck },
    { label: "Event mendatang", value: stats.event_mendatang, icon: CalendarDays },
    { label: "Event aktif", value: stats.event, icon: LayoutDashboard },
  ];
}

export function usePublicEvents(): PublicContentState<PublicEventCard[]> {
  const query = useQuery(publicEventsQuery());
  return {
    data: (query.data ?? []).map(toPublicEvent),
    isPending: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

export function usePublicNews(): PublicContentState<PublicNewsCard[]> {
  const query = useQuery(publicNewsQuery());
  return {
    data: (query.data ?? []).map(toPublicNewsItem),
    isPending: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

export function usePublicCarousel(): PublicContentState<CarouselSlide[]> {
  const query = useQuery(publicCarouselQuery());
  return {
    data: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

export function usePublicStatistics(): PublicContentState<PublicStatItem[]> {
  const query = useQuery(publicStatsQuery());
  return {
    data: query.data ? toStatistics(query.data) : [],
    isPending: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}
