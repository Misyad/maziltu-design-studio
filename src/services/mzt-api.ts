import {
  apiDelete,
  apiGet,
  apiGetRaw,
  apiPost,
  apiPostRaw,
  apiPut,
  apiPutRaw,
  setStoredToken,
} from "./api-client";
import type {
  ActivityLogEntry,
  AlumniProfile,
  AttendanceRecord,
  AttendanceRequest,
  AuthUser,
  BulkGenerateResult,
  CarouselSlide,
  ContactRequest,
  DashboardCalendarEntry,
  DashboardEvent,
  DashboardOverview,
  DashboardStats,
  EventItem,
  EventTanggal,
  IdCardData,
  LoginRequest,
  LoginResponse,
  Member,
  NewsItem,
  OperationalSummary,
  Order,
  OrgInfo,
  PasswordChangeRequest,
  PaymentSummary,
  ProfileUpdateRequest,
  PublicStats,
  RegistrationSummary,
  RevenueSummary,
  TicketSummary,
  TransactionRecord,
} from "@/types/api";

/* ------------------------------------------------------------------ auth */

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const result = await apiPostRaw<LoginResponse>("/login", payload);
  if (result?.token) setStoredToken(result.token);
  return result;
}

// GET /user returns `{ success, user: {...} }` (no `data` key), so it must be
// read with the raw helper instead of apiGet.
export function fetchCurrentUser() {
  return apiGetRaw<{ user: AuthUser }>("/user").then((res) => res.user);
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
export const fetchDashboardCalendar = () => apiGet<DashboardCalendarEntry[]>("/dashboard/calendar");
export const fetchDashboardEvents = () => apiGet<DashboardEvent[]>("/dashboard/events");

/* ------------------------------------------- Sprint 5A — Finance Dashboard */

export const fetchDashboardOverview = () =>
  apiGet<DashboardOverview>("/dashboard/finance/overview");
export const fetchRegistrationSummary = () =>
  apiGet<RegistrationSummary>("/dashboard/finance/registration");
export const fetchRevenueSummary = () => apiGet<RevenueSummary>("/dashboard/finance/revenue");
export const fetchPaymentSummary = () => apiGet<PaymentSummary>("/dashboard/finance/payments");

export const fetchTicketSummary = () => apiGet<TicketSummary>("/dashboard/finance/tickets");
export const fetchOperationalSummary = () =>
  apiGet<OperationalSummary>("/dashboard/finance/operational");

/* --------------------------------------------------------------- members */
/* NOTE: detail / update / delete always key on `id_users`, never `id`. */

export const fetchMembers = () => apiGet<Member[]>("/members");
export const fetchMember = (idUsers: number | string) => apiGet<Member>(`/members/${idUsers}`);
export const createMember = (form: FormData) => apiPost<Member>("/members", form);
export const updateMember = (idUsers: number | string, form: FormData) =>
  apiPost<Member>(`/members/${idUsers}`, form);
export const deleteMember = (idUsers: number | string) => apiDelete<unknown>(`/members/${idUsers}`);

/* ---------------------------------------------------------------- events */

export const fetchEvents = () => apiGet<EventItem[]>("/events");
export const fetchEvent = (id: number | string) => apiGet<EventItem>(`/events/${id}`);
export const fetchEventTanggal = (id: number | string) =>
  apiGet<EventTanggal[]>(`/events/${id}/tanggal`);
export const createEvent = (form: FormData) => apiPost<EventItem>("/events", form);
export const updateEvent = (id: number | string, form: FormData) =>
  apiPost<EventItem>(`/events/${id}`, form);
export const deleteEvent = (id: number | string) => apiDelete<unknown>(`/events/${id}`);

/* ----------------------------------------------------- registration (Phase 2A) */
/* POST /events/{id}/register creates an order for the authenticated alumni.
   Backend replies with `{ success, message, data }` and non-2xx on rejection
   (409 duplicate / 403 closed / full), so callers must handle ApiError.status. */
export const registerEvent = (id: number | string) =>
  apiPostRaw<{ success: boolean; message?: string; data?: Order }>(`/events/${id}/register`);

export const fetchMyOrders = () => apiGet<Order[]>("/my-orders");
export const fetchOrder = (uuid: string) => apiGet<Order>(`/orders/${uuid}`);

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
// Backend replies 400 with `{ success: false, message }` when the member is
// already present today. Axios turns that into an ApiError, so callers must
// wrap this in try/catch instead of checking `.success`.
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

/* ----------------------------------------------------- public marketing API */

/** PUBLIC */
export const fetchPublicEvents = () => apiGet<EventItem[]>("/public/events");
/** PUBLIC */
export const fetchPublicEvent = (id: number | string) => apiGet<EventItem>(`/public/events/${id}`);
/** PUBLIC */
export const fetchPublicNews = () => apiGet<NewsItem[]>("/public/news");
/** PUBLIC */
export const fetchPublicNewsItem = (id: number | string) => apiGet<NewsItem>(`/public/news/${id}`);
/** PUBLIC */
export const fetchPublicCarousel = () => apiGet<CarouselSlide[]>("/public/carousel");
/** PUBLIC */
export const fetchPublicStats = () => apiGet<PublicStats>("/public/stats");
/** PUBLIC */
export const submitContact = (payload: ContactRequest) =>
  apiPostRaw<{ success: boolean; message?: string }>("/public/contact", payload);

/* ---------------------------------------------------------- activity log */

export const fetchActivityLog = () => apiGet<ActivityLogEntry[]>("/activity-log");
export const fetchUserActivityLog = (userId: number | string) =>
  apiGet<ActivityLogEntry[]>(`/activity-log/${userId}`);

/* -------------------------------------------------------------- profile */
/* Backend note: POST /profile currently writes columns that don't exist on
   data_users. Prefer updateMember(id_users, form) until that is fixed. */
export const updateProfile = (form: FormData) => apiPost<Member>("/profile", form);

/* -------------------------------------------------- portal (Phase 1) */

export function fetchMe() {
  return apiGetRaw<{ user: AuthUser }>("/me").then((res) => res.user);
}

export const fetchProfile = () => apiGet<AlumniProfile>("/profile");
export const fetchIdCard = () => apiGet<IdCardData>("/id-card");
export const updateProfileJson = (payload: ProfileUpdateRequest | FormData) =>
  apiPut<AlumniProfile>("/profile", payload);
export const changePassword = (payload: PasswordChangeRequest) =>
  apiPutRaw<{ success: boolean; message?: string }>("/password", payload);

export const generateAccount = (idUsers: number | string) =>
  apiPostRaw<{ success: boolean; message?: string; password?: string }>(
    `/members/${idUsers}/account`,
  );

export const bulkGenerateAccounts = () => apiPost<BulkGenerateResult>("/members/bulk-account");
export const resetAccount = (idUsers: number | string) =>
  apiPutRaw<{ success: boolean; message?: string; password?: string }>(
    `/members/${idUsers}/account`,
  );
export const setAccountStatus = (idUsers: number | string, isActive: "1" | "0") =>
  apiPutRaw<{ success: boolean; message?: string }>(`/members/${idUsers}/account/status`, {
    is_active: isActive,
  });
