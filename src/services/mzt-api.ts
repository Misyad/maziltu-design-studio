import { apiDelete, apiGet, apiPost, apiPostRaw, setStoredToken } from "./api-client";
import type {
  ActivityLogEntry,
  AttendanceRecord,
  AttendanceRequest,
  AuthUser,
  CarouselSlide,
  DashboardCalendarEntry,
  DashboardEvent,
  DashboardStats,
  EventItem,
  LoginRequest,
  LoginResponse,
  Member,
  NewsItem,
  OrgInfo,
  TransactionRecord,
} from "@/types/api";

/* ------------------------------------------------------------------ auth */

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const result = await apiPostRaw<LoginResponse>("/login", payload);
  if (result?.token) setStoredToken(result.token);
  return result;
}

export function fetchCurrentUser() {
  return apiGet<AuthUser>("/user");
}

export async function logout() {
  try {
    await apiPost<unknown>("/logout");
  } finally {
    setStoredToken(null);
  }
}

/* ------------------------------------------------------------- dashboard */

export const fetchDashboardStats = () => apiGet<DashboardStats>("/dashboard/stats");
export const fetchDashboardCalendar = () =>
  apiGet<DashboardCalendarEntry[]>("/dashboard/calendar");
export const fetchDashboardEvents = () => apiGet<DashboardEvent[]>("/dashboard/events");

/* --------------------------------------------------------------- members */
/* NOTE: detail / update / delete always key on `id_users`, never `id`. */

export const fetchMembers = () => apiGet<Member[]>("/members");
export const fetchMember = (idUsers: number | string) => apiGet<Member>(`/members/${idUsers}`);
export const createMember = (form: FormData) => apiPost<Member>("/members", form);
export const updateMember = (idUsers: number | string, form: FormData) =>
  apiPost<Member>(`/members/${idUsers}`, form);
export const deleteMember = (idUsers: number | string) =>
  apiDelete<unknown>(`/members/${idUsers}`);

/* ---------------------------------------------------------------- events */

export const fetchEvents = () => apiGet<EventItem[]>("/events");
export const fetchEvent = (id: number | string) => apiGet<EventItem>(`/events/${id}`);
export const createEvent = (form: FormData) => apiPost<EventItem>("/events", form);
export const updateEvent = (id: number | string, form: FormData) =>
  apiPost<EventItem>(`/events/${id}`, form);
export const deleteEvent = (id: number | string) => apiDelete<unknown>(`/events/${id}`);

/* ------------------------------------------------------------------ news */

export const fetchNews = () => apiGet<NewsItem[]>("/news");
export const fetchNewsItem = (id: number | string) => apiGet<NewsItem>(`/news/${id}`);
export const createNews = (form: FormData) => apiPost<NewsItem>("/news", form);
export const updateNews = (id: number | string, form: FormData) =>
  apiPost<NewsItem>(`/news/${id}`, form);
export const deleteNews = (id: number | string) => apiDelete<unknown>(`/news/${id}`);

/* ------------------------------------------------------------ attendance */

export const fetchAttendance = (eventId: number | string, tanggalId: number | string) =>
  apiGet<AttendanceRecord[]>(`/attendance/${eventId}/${tanggalId}`);
export const submitAttendance = (payload: AttendanceRequest) =>
  apiPostRaw<{ success: boolean; message?: string }>("/attendance", payload);

/* ---------------------------------------------------------- transactions */

export const fetchTransactions = (eventId: number | string) =>
  apiGet<TransactionRecord[]>(`/transactions/${eventId}`);

/* --------------------------------------------------------------- content */

export const fetchCarousel = () => apiGet<CarouselSlide[]>("/carousel");
export const updateCarousel = (id: number | string, form: FormData) =>
  apiPost<CarouselSlide>(`/carousel/${id}`, form);

/** PUBLIC */
export const fetchPesantrenInfo = () => apiGet<OrgInfo>("/info/pesantren");
/** PUBLIC */
export const fetchMztInfo = () => apiGet<OrgInfo>("/info/mzt");

export const updatePesantrenInfo = (form: FormData) => apiPost<OrgInfo>("/info/pesantren", form);
export const updateMztInfo = (form: FormData) => apiPost<OrgInfo>("/info/mzt", form);

/* ---------------------------------------------------------- activity log */

export const fetchActivityLog = () => apiGet<ActivityLogEntry[]>("/activity-log");
export const fetchUserActivityLog = (userId: number | string) =>
  apiGet<ActivityLogEntry[]>(`/activity-log/${userId}`);

/* -------------------------------------------------------------- profile */
/* Backend note: POST /profile currently writes columns that don't exist on
   data_users. Prefer updateMember(id_users, form) until that is fixed. */
export const updateProfile = (form: FormData) => apiPost<Member>("/profile", form);
