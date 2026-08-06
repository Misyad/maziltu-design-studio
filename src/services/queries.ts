import { queryOptions } from "@tanstack/react-query";
import {
  fetchActivityLog,
  fetchAttendance,
  fetchCarousel,
  fetchCurrentUser,
  fetchDashboardCalendar,
  fetchDashboardEvents,
  fetchDashboardStats,
  fetchEvent,
  fetchEvents,
  fetchEventTanggal,
  fetchIdCard,
  fetchMember,
  fetchMembers,
  fetchMe,
  fetchMztInfo,
  fetchMyOrders,
  fetchNews,
  fetchNewsItem,
  fetchOrder,
  fetchPesantrenInfo,
  fetchProfile,
  fetchPublicCarousel,
  fetchPublicEvent,
  fetchPublicEvents,
  fetchPublicNews,
  fetchPublicNewsItem,
  fetchPublicStats,
  fetchTransactions,
} from "@/services/mzt-api";

export const queryKeys = {
  currentUser: ["current-user"] as const,
  dashboardStats: ["dashboard", "stats"] as const,
  dashboardCalendar: ["dashboard", "calendar"] as const,
  dashboardEvents: ["dashboard", "events"] as const,
  members: ["members"] as const,
  member: (idUsers: number | string) => ["members", idUsers] as const,
  events: ["events"] as const,
  event: (id: number | string) => ["events", id] as const,
  eventTanggal: (id: number | string) => ["events", id, "tanggal"] as const,
  news: ["news"] as const,
  newsItem: (id: number | string) => ["news", id] as const,
  attendance: (eventId: number | string, tanggalId: number | string) =>
    ["attendance", eventId, tanggalId] as const,
  transactions: (eventId: number | string) => ["transactions", eventId] as const,
  carousel: ["carousel"] as const,
  infoMzt: ["info", "mzt"] as const,
  infoPesantren: ["info", "pesantren"] as const,
  activityLog: ["activity-log"] as const,
  publicEvents: ["public", "events"] as const,
  publicEvent: (id: number | string) => ["public", "events", id] as const,
  myOrders: ["my-orders"] as const,
  order: (uuid: string) => ["orders", uuid] as const,
  publicNews: ["public", "news"] as const,
  publicNewsItem: (id: number | string) => ["public", "news", id] as const,
  publicCarousel: ["public", "carousel"] as const,
  publicStats: ["public", "stats"] as const,
  profile: ["profile"] as const,
  idCard: ["id-card"] as const,
};

export const currentUserQuery = () =>
  queryOptions({ queryKey: queryKeys.currentUser, queryFn: fetchCurrentUser });

export const dashboardStatsQuery = () =>
  queryOptions({ queryKey: queryKeys.dashboardStats, queryFn: fetchDashboardStats });

export const dashboardCalendarQuery = () =>
  queryOptions({ queryKey: queryKeys.dashboardCalendar, queryFn: fetchDashboardCalendar });

export const dashboardEventsQuery = () =>
  queryOptions({ queryKey: queryKeys.dashboardEvents, queryFn: fetchDashboardEvents });

export const membersQuery = () =>
  queryOptions({ queryKey: queryKeys.members, queryFn: fetchMembers });

export const memberQuery = (idUsers: number | string) =>
  queryOptions({ queryKey: queryKeys.member(idUsers), queryFn: () => fetchMember(idUsers) });

export const eventsQuery = () => queryOptions({ queryKey: queryKeys.events, queryFn: fetchEvents });

export const eventQuery = (id: number | string) =>
  queryOptions({ queryKey: queryKeys.event(id), queryFn: () => fetchEvent(id) });

export const eventTanggalQuery = (id: number | string) =>
  queryOptions({ queryKey: queryKeys.eventTanggal(id), queryFn: () => fetchEventTanggal(id) });

export const newsQuery = () => queryOptions({ queryKey: queryKeys.news, queryFn: fetchNews });

export const newsItemQuery = (id: number | string) =>
  queryOptions({ queryKey: queryKeys.newsItem(id), queryFn: () => fetchNewsItem(id) });

export const attendanceQuery = (eventId: number | string, tanggalId: number | string) =>
  queryOptions({
    queryKey: queryKeys.attendance(eventId, tanggalId),
    queryFn: () => fetchAttendance(eventId, tanggalId),
  });

export const transactionsQuery = (eventId: number | string) =>
  queryOptions({
    queryKey: queryKeys.transactions(eventId),
    queryFn: () => fetchTransactions(eventId),
  });

export const carouselQuery = () =>
  queryOptions({ queryKey: queryKeys.carousel, queryFn: fetchCarousel });

/** PUBLIC endpoint — safe to use on the marketing site. */
export const mztInfoQuery = () =>
  queryOptions({ queryKey: queryKeys.infoMzt, queryFn: fetchMztInfo, retry: 0 });

/** PUBLIC endpoint — safe to use on the marketing site. */
export const pesantrenInfoQuery = () =>
  queryOptions({ queryKey: queryKeys.infoPesantren, queryFn: fetchPesantrenInfo, retry: 0 });

export const activityLogQuery = () =>
  queryOptions({ queryKey: queryKeys.activityLog, queryFn: fetchActivityLog });

/** PUBLIC — safe to use on the marketing site. */
export const publicEventsQuery = () =>
  queryOptions({ queryKey: queryKeys.publicEvents, queryFn: fetchPublicEvents, retry: 0 });

/** PUBLIC — safe to use on the marketing site. */
export const publicEventQuery = (id: number | string) =>
  queryOptions({
    queryKey: queryKeys.publicEvent(id),
    queryFn: () => fetchPublicEvent(id),
    retry: 0,
  });

/** PUBLIC — safe to use on the marketing site. */
export const publicNewsQuery = () =>
  queryOptions({ queryKey: queryKeys.publicNews, queryFn: fetchPublicNews, retry: 0 });

/** PUBLIC — safe to use on the marketing site. */
export const publicNewsItemQuery = (id: number | string) =>
  queryOptions({
    queryKey: queryKeys.publicNewsItem(id),
    queryFn: () => fetchPublicNewsItem(id),
    retry: 0,
  });

/** PUBLIC — safe to use on the marketing site. */
export const publicCarouselQuery = () =>
  queryOptions({ queryKey: queryKeys.publicCarousel, queryFn: fetchPublicCarousel, retry: 0 });

/** PUBLIC — safe to use on the marketing site. */
export const publicStatsQuery = () =>
  queryOptions({ queryKey: queryKeys.publicStats, queryFn: fetchPublicStats, retry: 0 });

/** PORTAL — current authenticated identity (Phase 1). */
export const meQuery = () => queryOptions({ queryKey: queryKeys.currentUser, queryFn: fetchMe });

/** PORTAL — authenticated member profile (Phase 1). */
export const profileQuery = () =>
  queryOptions({ queryKey: queryKeys.profile, queryFn: fetchProfile });

/** PORTAL — authenticated ID card (Phase 1). */
export const idCardQuery = () => queryOptions({ queryKey: queryKeys.idCard, queryFn: fetchIdCard });

/** PORTAL — my orders (Phase 2A). */
export const myOrdersQuery = () =>
  queryOptions({ queryKey: queryKeys.myOrders, queryFn: fetchMyOrders });

/** PORTAL — single order by UUID (Phase 2A). */
export const orderQuery = (uuid: string) =>
  queryOptions({ queryKey: queryKeys.order(uuid), queryFn: () => fetchOrder(uuid) });
