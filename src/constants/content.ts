import {
  BadgeCheck,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Newspaper,
  QrCode,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import heroCommunity from "@/assets/hero-community.jpg";
import aboutMentoring from "@/assets/about-mentoring.jpg";
import aboutSpeaker from "@/assets/about-speaker.jpg";
import eventGathering from "@/assets/event-gathering.jpg";
import galleryCharity from "@/assets/gallery-charity.jpg";
import galleryQuran from "@/assets/gallery-quran.jpg";
import galleryGraduation from "@/assets/gallery-graduation.jpg";
import galleryOffice from "@/assets/gallery-office.jpg";
import type { GalleryImage } from "@/components/shared/masonry-gallery";
import type { TimelineEntry } from "@/components/shared/timeline";

export const ORG = {
  name: "Maziltu Tholiban",
  shortName: "MZT Apps",
  tagline: "A modern platform for a connected Islamic community",
  description:
    "Maziltu Tholiban unites members, branches and committees under one digital roof — membership records, events, attendance, news and digital identity in a single trusted system.",
  address: "Jl. Pesantren Raya No. 12, Bandung, West Java 40286, Indonesia",
  phone: "+62 812 3456 7890",
  email: "salam@maziltutholiban.org",
  hours: "Saturday – Thursday, 08.00 – 16.00 WIB",
} as const;

export const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Programs", to: "/programs" },
  { label: "Events", to: "/events" },
  { label: "News", to: "/news" },
  { label: "Gallery", to: "/gallery" },
  { label: "Contact", to: "/contact" },
] as const;

export const IMAGES = {
  hero: { src: heroCommunity, width: 1920, height: 1280 },
  mentoring: { src: aboutMentoring, width: 1200, height: 1400 },
  speaker: { src: aboutSpeaker, width: 900, height: 1100 },
  gathering: { src: eventGathering, width: 1400, height: 900 },
} as const;

export interface ProgramItem {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  image: string;
  imageWidth: number;
  imageHeight: number;
}

export const PROGRAMS: readonly ProgramItem[] = [
  {
    slug: "members",
    title: "Membership Registry",
    description:
      "A single verified record for every member — niqobah, cohort years, contact details and photo, always up to date.",
    icon: Users,
    image: galleryGraduation,
    imageWidth: 900,
    imageHeight: 1300,
  },
  {
    slug: "events",
    title: "Events & Programs",
    description:
      "Publish gatherings with banners, locations, pricing and date ranges, then track them from planning to completion.",
    icon: CalendarDays,
    image: eventGathering,
    imageWidth: 1400,
    imageHeight: 900,
  },
  {
    slug: "attendance",
    title: "Attendance Scanning",
    description:
      "Scan member IDs at the door for instant, duplicate-proof attendance records for every event day.",
    icon: QrCode,
    image: galleryQuran,
    imageWidth: 1200,
    imageHeight: 800,
  },
  {
    slug: "news",
    title: "News & Announcements",
    description:
      "Share announcements and stories with images, clean slugs and an editorial preview before anything goes live.",
    icon: Newspaper,
    image: aboutSpeaker,
    imageWidth: 900,
    imageHeight: 1100,
  },
  {
    slug: "id-card",
    title: "Digital ID Card",
    description:
      "Every member carries a printable digital KTA with photo and scannable member barcode.",
    icon: BadgeCheck,
    image: aboutMentoring,
    imageWidth: 1200,
    imageHeight: 1400,
  },
  {
    slug: "payments",
    title: "Online Payment",
    description:
      "Collect event contributions online and reconcile every transaction against the member registry.",
    icon: CreditCard,
    image: galleryCharity,
    imageWidth: 900,
    imageHeight: 1200,
  },
  {
    slug: "dashboard",
    title: "Admin Dashboard",
    description:
      "Role-aware controls for committees: statistics, calendars, activity logs and everything in between.",
    icon: LayoutDashboard,
    image: galleryOffice,
    imageWidth: 1200,
    imageHeight: 900,
  },
];

export const STATISTICS = [
  { label: "Registered members", value: 12480, icon: Users },
  { label: "Events organised", value: 316, icon: CalendarDays },
  { label: "Active branches", value: 48, icon: LayoutDashboard },
  { label: "Committees", value: 22, icon: BadgeCheck },
] as const;

export interface PlaceholderEvent {
  id: number;
  judul_event: string;
  slug: string;
  lokasi: string;
  harga: number;
  deskripsi: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: "Upcomming" | "Ongoing" | "Complate";
  image: string;
  imageWidth: number;
  imageHeight: number;
}

/**
 * Placeholder content only. GET /events requires auth, so the public site
 * cannot read it yet — swap to eventsQuery() once a public endpoint exists.
 */
export const PLACEHOLDER_EVENTS: readonly PlaceholderEvent[] = [
  {
    id: 1,
    judul_event: "Annual Members Assembly",
    slug: "annual-members-assembly",
    lokasi: "Grand Hall, Bandung",
    harga: 0,
    deskripsi:
      "Two days of organisation-wide reporting, committee elections and workshops for every branch delegate.",
    tanggal_mulai: "12/09/2026",
    tanggal_selesai: "13/09/2026",
    status: "Upcomming",
    image: eventGathering,
    imageWidth: 1400,
    imageHeight: 900,
  },
  {
    id: 2,
    judul_event: "Youth Leadership Camp",
    slug: "youth-leadership-camp",
    lokasi: "Lembang Highlands",
    harga: 150000,
    deskripsi:
      "A residential programme building the next generation of branch leaders through mentoring and field practice.",
    tanggal_mulai: "02/10/2026",
    tanggal_selesai: "04/10/2026",
    status: "Upcomming",
    image: galleryGraduation,
    imageWidth: 900,
    imageHeight: 1300,
  },
  {
    id: 3,
    judul_event: "Community Health Outreach",
    slug: "community-health-outreach",
    lokasi: "Cianjur District",
    harga: 0,
    deskripsi:
      "Free clinics and food distribution delivered together with volunteer members from nine branches.",
    tanggal_mulai: "22/08/2026",
    tanggal_selesai: "23/08/2026",
    status: "Ongoing",
    image: galleryCharity,
    imageWidth: 900,
    imageHeight: 1200,
  },
];

export interface PlaceholderNews {
  id: number;
  judul: string;
  slug: string;
  deskripsi: string;
  pembuat: string;
  created_at: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
}

/** Placeholder content only — GET /news currently requires auth. */
export const PLACEHOLDER_NEWS: readonly PlaceholderNews[] = [
  {
    id: 1,
    judul: "Digital membership cards now reach every branch",
    slug: "digital-membership-cards",
    deskripsi:
      "All 48 branches can now issue and print verified digital ID cards on the spot, cutting registration queues from hours to minutes.",
    pembuat: "Secretariat",
    created_at: "2026-07-28",
    image: aboutMentoring,
    imageWidth: 1200,
    imageHeight: 1400,
  },
  {
    id: 2,
    judul: "Scholarship programme opens for 400 students",
    slug: "scholarship-programme-opens",
    deskripsi:
      "Applications are open for the annual education fund supporting members' children across all districts.",
    pembuat: "Education Committee",
    created_at: "2026-07-19",
    image: galleryQuran,
    imageWidth: 1200,
    imageHeight: 800,
  },
  {
    id: 3,
    judul: "Attendance scanning cuts check-in time by 70%",
    slug: "attendance-scanning-results",
    deskripsi:
      "Event organisers report far faster check-in after moving to barcode scanning at every venue entrance.",
    pembuat: "Event Committee",
    created_at: "2026-07-08",
    image: galleryOffice,
    imageWidth: 1200,
    imageHeight: 900,
  },
  {
    id: 4,
    judul: "New branch inaugurated in East Java",
    slug: "new-branch-east-java",
    deskripsi:
      "The organisation welcomes its 48th branch with an inauguration attended by more than 600 members.",
    pembuat: "Secretariat",
    created_at: "2026-06-30",
    image: aboutSpeaker,
    imageWidth: 900,
    imageHeight: 1100,
  },
];

export const GALLERY_IMAGES: readonly GalleryImage[] = [
  {
    src: heroCommunity,
    alt: "Members and teachers gathered in a school courtyard",
    width: 1920,
    height: 1280,
    caption: "Annual community gathering",
  },
  {
    src: galleryGraduation,
    alt: "Students celebrating at a graduation ceremony",
    width: 900,
    height: 1300,
    caption: "Graduation day",
  },
  {
    src: galleryQuran,
    alt: "Students reciting together inside a mosque",
    width: 1200,
    height: 800,
    caption: "Morning recitation",
  },
  {
    src: galleryCharity,
    alt: "Volunteers distributing aid boxes to families",
    width: 900,
    height: 1200,
    caption: "Community outreach",
  },
  {
    src: eventGathering,
    alt: "Large organisation gathering inside a hall",
    width: 1400,
    height: 900,
    caption: "Members assembly",
  },
  {
    src: aboutMentoring,
    alt: "Teachers mentoring students in a library",
    width: 1200,
    height: 1400,
    caption: "Mentoring circle",
  },
  {
    src: galleryOffice,
    alt: "Staff working in the organisation office",
    width: 1200,
    height: 900,
    caption: "The secretariat",
  },
  {
    src: aboutSpeaker,
    alt: "A speaker addressing members at a conference",
    width: 900,
    height: 1100,
    caption: "Committee forum",
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "Registration used to take our branch an entire weekend. Now a new member is verified, photographed and carrying an ID card in under five minutes.",
    name: "Ustadz Rahman Hakim",
    role: "Branch Secretary, Bandung",
  },
  {
    quote:
      "Attendance scanning changed how we run events. We can see who is in the hall in real time instead of counting paper lists at midnight.",
    name: "Siti Nurhaliza",
    role: "Event Committee Lead",
  },
  {
    quote:
      "For the first time every committee reads the same numbers. Reporting to the assembly is no longer a guessing game.",
    name: "Ahmad Fauzan",
    role: "Treasurer, Central Committee",
  },
] as const;

export const MILESTONES: readonly TimelineEntry[] = [
  {
    year: "2009",
    title: "Founded by alumni teachers",
    description:
      "A small circle of alumni formalised Maziltu Tholiban to keep graduates connected to their pesantren.",
  },
  {
    year: "2015",
    title: "First regional branches",
    description:
      "Nine branches were established across West Java, each with its own committee structure.",
  },
  {
    year: "2021",
    title: "Membership goes digital",
    description:
      "Paper registries were replaced by a single verified database covering every member and cohort.",
  },
  {
    year: "2026",
    title: "One connected platform",
    description:
      "Events, attendance, news, digital ID cards and payments now run on the same trusted system.",
  },
];

export const ORG_VALUES = [
  {
    title: "Our history",
    body: "Seventeen years of service that began with a handful of alumni and now reaches tens of thousands of members across the archipelago.",
  },
  {
    title: "Our mission",
    body: "To serve members with integrity — accurate records, transparent finances, and programmes that strengthen faith, family and livelihood.",
  },
  {
    title: "Our vision",
    body: "A community where every member is known, supported and equipped to contribute, wherever in the country they live.",
  },
] as const;
