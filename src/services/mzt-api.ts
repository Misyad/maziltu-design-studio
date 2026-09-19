import {
  apiClient,
  apiDelete,
  apiGet,
  apiGetRaw,
  apiPost,
  apiPostRaw,
  apiPut,
  apiPutRaw,
  ensureCsrfToken,
} from "./api-client";
import type {
  ActivityLogEntry,
  AlumniProfile,
  AttendanceRecord,
  AttendanceRequest,
  AttendanceSummary,
  AuthUser,
  BulkGenerateResult,
  CarouselSlide,
  CheckInRequest,
  CheckInResult,
  ContactRequest,
  DashboardCalendarEntry,
  DashboardEvent,
  DashboardOverview,
  DashboardStats,
  EventItem,
  EventTanggal,
  GateMonitoringResponse,
  IdCardData,
  KtaCard,
  KtaCardSummary,
  LoginRequest,
  LoginResponse,
  Member,
  NewsItem,
  OperationalEvent,
  OperationalSummary,
  Order,
  OrgInfo,
  ParticipantListResponse,
  PasswordChangeRequest,
  PaymentItem,
  PaymentSummary,
  ProfileUpdateRequest,
  PublicStats,
  RegistrationSummary,
  RevenueSummary,
  Ticket,
  TicketSummary,
  TransactionRecord,
  VerificationQueueResponse,
} from "@/types/api";
import type { VerificationQueueParams } from "@/types/api";

/* ------------------------------------------------------------------ auth */

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  await ensureCsrfToken();
  return apiPostRaw<LoginResponse>("/login", payload);
}

// GET /user returns `{ success, user: {...} }` (no `data` key), so it must be
// read with the raw helper instead of apiGet. Marked `authCheck` so the global
// 401 handler leaves the response to the caller (route guards and public-page
// login hints) instead of hard-redirecting anonymous visitors.
export function fetchCurrentUser() {
  return apiGetRaw<{ user: AuthUser }>("/user", { authCheck: true }).then((res) => res.user);
}

export async function logout() {
  await ensureCsrfToken();
  await apiPost<unknown>("/logout");
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

/* ------------------------------------------- Phase 2D — EMS Operational Management */

export type OperationEventsParams = {
  start?: string | null;
  end?: string | null;
  event_id?: number | null;
};

export type ParticipantsParams = {
  tgl?: number | null;
  gate?: string | null;
  q?: string | null;
  page?: number | null;
  per_page?: number | null;
};

export type AttendanceParams = { tgl?: number | null };
export type GateMonitoringParams = { tgl?: number | null };

/** URI-encodes the given params, dropping null/undefined/empty values. */
function buildQuery(params: Record<string, number | string | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const fetchOperationalEvents = (params?: OperationEventsParams) =>
  apiGet<OperationalEvent[]>(`/dashboard/operations/events${buildQuery(params ?? {})}`);

export const fetchParticipants = (eventId: number | string, params?: ParticipantsParams) =>
  apiGet<ParticipantListResponse>(
    `/dashboard/operations/events/${eventId}/attendees${buildQuery(params ?? {})}`,
  );

export const fetchAttendanceSummary = (eventId: number | string, params?: AttendanceParams) =>
  apiGet<AttendanceSummary>(
    `/dashboard/operations/events/${eventId}/attendance${buildQuery(params ?? {})}`,
  );

export const fetchGateMonitoring = (eventId: number | string, params?: GateMonitoringParams) =>
  apiGet<GateMonitoringResponse>(
    `/dashboard/operations/events/${eventId}/gates${buildQuery(params ?? {})}`,
  );

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

export const uploadPayment = (uuid: string, form: FormData) =>
  apiPostRaw<{ success: boolean; message?: string; data?: Order }>(`/orders/${uuid}/payment`, form);

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

/* ------------------------------------------------------- check-in (Phase 2C) */

// Backend replies 409 with `{ success: false, message, data: { first_scanned_at,
// first_scanned_by } }` on a duplicate scan. Axios turns that into an ApiError,
// so callers must handle ApiError.status === 409 (payload is on error.data).
export const checkIn = (payload: CheckInRequest) =>
  apiPostRaw<{ success: boolean; message?: string; data?: CheckInResult }>("/checkin", payload);

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

/* ------------------------------------------------- Ticket (Phase 2B) */

export const fetchMyTicket = (orderUuid: string) =>
  apiGet<{ ticket: Ticket }>(`/orders/${orderUuid}/ticket`).then((r) => r.ticket);

export const fetchTicket = (uuid: string) =>
  apiGet<{ ticket: Ticket }>(`/tickets/${uuid}`).then((r) => r.ticket);

export const downloadTicketPdf = async (uuid: string): Promise<Blob> => {
  const res = await apiClient.get<Blob>(`/tickets/${uuid}/download`, {
    responseType: "blob",
  });
  return res.data;
};

export const reissueTicket = (uuid: string, note?: string | null) =>
  apiPost<{ ticket: Ticket }>(`/tickets/${uuid}/reissue`, { note: note ?? null });

export const revokeTicket = async (uuid: string, note?: string | null) => {
  const payload = note ? { note } : {};
  const res = await apiClient.delete<{ success: boolean; data: { ticket: Ticket } }>(
    `/tickets/${uuid}`,
    { data: payload },
  );
  if (!res.data.success) throw new Error(res.data as unknown as string);
  return (res.data.data ?? res.data) as { ticket: Ticket };
};

/* --------------------------- Phase 3 — Payment Verification Queue */

export const fetchVerificationQueue = (params?: VerificationQueueParams) =>
  apiGet<VerificationQueueResponse>(`/payments${buildQuery((params ?? {}) as Record<string, number | string | null | undefined>)}`);

export const verifyPayment = (uuid: string, payload: { status: string; note?: string | null }) =>
  apiPutRaw<{ success: boolean; message?: string; data?: { payment: PaymentItem; changed: boolean } }>(
    `/payments/${uuid}/verify`,
    payload,
  );

export const fetchPaymentDetail = (uuid: string) =>
  apiGet<{ payment: PaymentItem; outstanding: { total: number; paid: number; outstanding: number; payment_status: string } }>(
    `/payments/${uuid}`,
  );

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

/* ------------------------------------------------- Phase 3 — Audit Timeline (M-05) */

export const fetchAuditTimeline = (params?: import("@/types/api").AuditTimelineParams) =>
  apiGet<import("@/types/api").AuditTimelineResponse>(
    `/audit-timeline/data${buildQuery((params ?? {}) as Record<string, number | string | null | undefined>)}`,
  );

/* ------------------------------------------------- Public "Cek Status KTA" */

/**
 * Stage 1 — start a lookup. The backend answers with a generic
 * `{ stage: "challenge", challenge_token }` for ANY valid input, so callers
 * must never branch on "found / not found" here.
 */
export const ktaCheck = (payload: import("@/types/api").KtaCheckRequest) =>
  apiPostRaw<{ success: boolean; message?: string; data?: import("@/types/api").KtaCheckResponse }>(
    "/public/kta/check",
    payload,
  );

/**
 * Stage 2 — prove ownership / disambiguate. A `200` may still mean "keep
 * going" (another challenge token) or "manual review"; only
 * `data.verified === true` reveals the masked result.
 */
export const ktaVerify = (payload: import("@/types/api").KtaVerifyRequest) =>
  apiPostRaw<{ success: boolean; message?: string; data?: import("@/types/api").KtaVerifyResponse }>(
    "/public/kta/verify",
    payload,
  );

/* ---------------------------------- Physical KTA print request (v3.0) */

/**
 * Read the member's active print request. Identity comes from the verified
 * print token — never from the browser.
 */
export const fetchKtaPrintRequest = (printToken: string) =>
  apiGetRaw<{ success: boolean; message?: string; data?: { request: import("@/types/api").KtaPrintRequest | null } }>(
    `/public/kta/print-request?print_token=${encodeURIComponent(printToken)}`,
  );

export const createKtaPrintRequest = (payload: import("@/types/api").KtaPrintRequestCreate) =>
  apiPostRaw<{ success: boolean; message?: string; data?: { request: import("@/types/api").KtaPrintRequest } }>(
    "/public/kta/print-request",
    payload,
  );

/** Admin print queue (verifier roles). */
export const fetchKtaPrintQueue = (params?: {
  status?: string | null;
  delivery_method?: string | null;
  q?: string | null;
  page?: number | null;
  per_page?: number | null;
}) =>
  apiGet<import("@/types/api").KtaPrintRequestQueueResponse>(
    `/kta/print-requests${buildQuery((params ?? {}) as Record<string, number | string | null | undefined>)}`,
  );

export const fetchKtaPrintDetail = (id: number | string) =>
  apiGet<{ request: import("@/types/api").KtaPrintRequestAdminDetail }>(`/kta/print-requests/${id}`);

export const fetchKtaCards = () => apiGet<KtaCardSummary[]>("/kta/cards");
export const fetchKtaCard = (idUsers: number | string) =>
  apiGet<KtaCard>(`/kta/cards/${idUsers}`);
export const fetchKtaPrintRequestCard = (requestId: number | string) =>
  apiGet<KtaCard>(`/kta/print-requests/${requestId}/card`);

export const updateKtaPrintStatus = (
  id: number | string,
  payload: { status: string; reason?: string | null },
) =>
  apiPutRaw<{ success: boolean; message?: string; data?: { request: import("@/types/api").KtaPrintRequestAdminRow } }>(
    `/kta/print-requests/${id}/status`,
    payload,
  );
