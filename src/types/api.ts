/**
 * Types mirroring the existing Laravel API exactly.
 * Field names are the backend's — never rename them.
 */

export interface ApiEnvelope<T> {
  success: boolean;
  code?: string;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export type AppRole =
  | "dashboard"
  | "anggota"
  | "profil"
  | "event"
  | "berita"
  | "tampilan"
  | "aktivitas_user"
  | "id_card"
  | "prisensi"
  | "finance"
  | "ketua"
  | "admin";

/** Shape of the `data_users` row embedded in GET /user (`user.data`). */
export interface UserProfileData {
  id: number;
  id_users: number;
  no_hp: string | null;
  barcode: string | null;
  alamat: string | null;
  pekerjaan: string | null;
  niqobah: string | null;
  tanggal_lahir: string | null;
  tahun_masuk: string | null;
  tahun_keluar: string | null;
  tempat_lahir: string | null;
  foto: string | null;
  is_active: number | string;
}

export interface AuthUser {
  id: number;
  id_anggota: string;
  name: string;
  email: string | null;
  roles: AppRole[] | string[];
  foto: string | null;
  /** Only present on GET /user (not on login). Holds `barcode` for ID cards. */
  data?: UserProfileData | null;
  /** Phase 1 — force a password change on first login. */
  must_change_password?: boolean;
  account_setup_required?: boolean;
}

export interface AccountResetAuditItem {
  id_users: number;
  id_anggota: string;
  nama: string;
  eligible: boolean;
  reason_code: string;
  reason: string;
}

export interface AccountResetAudit {
  audited_at: string;
  total_accounts: number;
  eligible_count: number;
  ineligible_count: number;
  reason_counts: Record<string, number>;
  items: AccountResetAuditItem[];
}

export interface AccountResetResult {
  must_change_password: true;
}

export interface LoginRequest {
  id_anggota: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  /**
   * Personal access token — only returned for non-browser (stateless) API
   * clients. Browser sessions authenticate via the Sanctum HttpOnly cookie and
   * never receive a token, so this is optional.
   */
  token?: string;
  user: AuthUser;
  message?: string;
}

export interface DashboardStats {
  event: number;
  event_selesai: number;
  event_mendatang: number;
  total_anggota: number;
}

/* ---------------------------------------------------- Sprint 5A — Finance */

export interface DashboardOverview {
  total_orders: number;
  total_revenue: number;
  total_paid: number;
  total_outstanding: number;
  total_tickets: number;
  pending_verifications: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface RegistrationSummary {
  total_orders: number;
  by_status: StatusCount[];
}

export interface StatusTotal {
  status: string;
  total: number;
  count: number;
}

export interface RevenueSummary {
  total_revenue: number;
  total_paid: number;
  outstanding: number;
  by_status: StatusTotal[];
}

export interface PaymentSummary {
  by_status: StatusTotal[];
  waiting_verification: number;
}

/* ------------------------------------------- Sprint 5B.1 — Ticket & Operational */

/** Ticket status (mirrors app/Enums/TicketStatus.php / canonical ADR-011). */
export type TicketStatus = "draft" | "issued" | "checked_in" | "finished" | "cancelled" | "revoked";

export interface Ticket {
  id: number;
  uuid: string;
  nomor_ticket: string;
  id_order: number;
  qr_payload: string;
  status: TicketStatus;
  issued_at: string | null;
  expired_at: string | null;
  used_at: string | null;
  revoked_at: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  order?: Order | null;
}

export interface TicketLog {
  id: number;
  id_ticket: number;
  old_status: string | null;
  new_status: string;
  note: string | null;
  changed_by: number | null;
  created_at: string;
}

export interface TicketSummary {
  total_tickets: number;
  by_status: StatusCount[];
}

export interface OperationalSummary {
  total_orders: number;
  total_paid: number;
  outstanding: number;
  waiting_verification: number;
  total_tickets: number;
}

export interface DashboardCalendarEntry {
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export type EventComputedStatus = "Ongoing" | "Upcomming" | "Complate";

export interface DashboardEvent {
  id: number;
  judul_event: string;
  slug: string;
  lokasi: string;
  harga: number | string;
  deskripsi: string;
  banner: string | null;
  status: EventComputedStatus;
  tanggal: string;
}

export interface MemberRoleManagement {
  required_roles: string[];
  assigned_roles: string[];
  optional_roles: string[];
}

export interface Member {
  id: number;
  id_users: number;
  id_anggota: string;
  nama: string;
  email: string | null;
  no_hp: string;
  alamat: string;
  niqobah: string;
  pekerjaan: string;
  foto: string | null;
  tahun_masuk: string;
  tahun_keluar: string;
  tempat_lahir: string | null;
  tanggal_lahir: string;
  // Phase 1 UX: account status fields exposed by the members endpoint (from
  // existing users.login_count / users.last_login / users.is_active). Additive
  // only; absent for older clients.
  has_account?: boolean;
  account_is_active?: number | boolean;
  login_count?: number;
  last_login?: string | null;
}

export interface EventItem {
  id: number;
  judul_event: string;
  slug: string;
  lokasi: string;
  harga: number | string;
  deskripsi: string;
  banner: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  is_active: number | boolean;
  /** Phase 2A — registration/capacity fields (additive). */
  kuota?: number | null;
  venue?: string | null;
  visibility?: "public" | "internal" | "private";
  registrasi_dibuka?: string | null;
  registrasi_ditutup?: string | null;
  harga_amount?: number | string | null;
}

/** Order status (S2 — VARCHAR + constants, mirrors app/Enums/OrderStatus.php). */
export type OrderStatus =
  "draft" | "registered" | "confirmed" | "checked_in" | "finished" | "cancelled";

/** Payment status (mirrors app/Enums/PaymentStatus.php). */
export type PaymentStatus =
  | "pending"
  | "waiting_verification"
  | "paid"
  | "rejected"
  | "refund"
  | "expired"
  | "cancelled"
  | "failed";
export type EventPaymentChoice = "pay_now" | "pay_at_venue";

export interface EventRegistrationRequest {
  payment_choice: EventPaymentChoice;
}

export interface EventGatewayPayment {
  id: number;
  uuid: string;
  nomor_payment: string;
  id_order: number;
  provider: string;
  payment_url: string | null;
  base_amount: number | string;
  gateway_fee: number | string;
  gateway_total: number | string;
  expires_at: string | null;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

/** Shape of an `orders` row (Phase 2A — root aggregate of EMS). */
export interface Order {
  id: number;
  uuid: string;
  nomor_order: string;
  id_event: number;
  id_anggota: string;
  created_by: number | null;
  updated_by: number | null;
  event_name: string;
  event_price: number | string;
  event_start_at: string | null;
  total_amount: number | string;
  status_registrasi: OrderStatus;
  payment_status: PaymentStatus;
  payment_choice?: EventPaymentChoice;
  payment_amount?: number | string | null;
  payment_source?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRegistrationData extends Order {
  payment: EventGatewayPayment | null;
  checkout_error: string | null;
}

export interface EventRegistrationResponse extends ApiEnvelope<EventRegistrationData> {
  data?: EventRegistrationData;
}

export interface OrderCheckoutData {
  payment: EventGatewayPayment;
}

export interface OrderCheckoutResponse extends ApiEnvelope<OrderCheckoutData> {
  data?: OrderCheckoutData;
}

/** Attendance day for an event (Tanggal_event row). */
export interface EventTanggal {
  id: number;
  id_event: number;
  tanggal: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  set_jam: "seharian" | "dijam";
}

export interface NewsItem {
  id: number;
  judul: string;
  slug: string;
  deskripsi: string;
  foto: string | null;
  /** Backend `beritas` has no `pembuat` column, so this may be absent. */
  pembuat?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  /** Stores the member's `users.id` (int), not the string `id_anggota`. */
  id_anggota: number | string;
  id_event: number;
  id_tanggal: number;
  created_at: string;
  /** Phase 2C — ticket-based check-in fields (additive; absent on legacy rows). */
  id_ticket?: number | null;
  gate?: string | null;
  scanned_at?: string | null;
  scanned_by?: number | null;
  dataUser?: Member;
}

export interface AttendanceRequest {
  id_anggota: string;
  id_event: number;
  id_tanggal: number;
}

/** Payload for POST /api/checkin (Phase 2C). The event is derived server-side. */
export interface CheckInRequest {
  ticket_uuid: string;
  id_tanggal: number;
  gate?: string | null;
}

/** Successful check-in response body (Phase 2C). */
export interface CheckInResult {
  ticket: {
    id: number;
    uuid: string;
    nomor_ticket: string;
    status: TicketStatus;
    used_at: string | null;
    issued_at?: string | null;
    qr_payload?: string;
  };
  attendance: {
    id: number;
    id_event: number;
    id_tanggal: number;
    id_anggota: number | string;
    id_ticket: number;
    gate: string | null;
    scanned_at: string | null;
    scanned_by: number | null;
  };
  participant: {
    id: number;
    id_anggota: string;
    name: string;
  } | null;
  event: {
    id_event: number;
    event_name: string;
  };
}

/** Duplicate-scan body (409): first scan info, nothing else is mutated. */
export interface CheckInDuplicate {
  first_scanned_at: string | null;
  first_scanned_by: number | null;
}

export type ScannerAttendanceStatus = "not_present" | "present";

export type ScannerIdentifierType = "ticket" | "member_card";

export interface ScannerLookupRequest {
  identifier: string;
  identifier_type: ScannerIdentifierType;
  id_event: number;
  id_tanggal: number;
}

export interface ScannerLookupResult {
  ticket: {
    id: number;
    uuid: string;
    nomor_ticket: string;
    status: TicketStatus;
  };
  participant: {
    id: number;
    id_anggota: string;
    name: string;
    foto: string | null;
    niqobah: string | null;
  };
  event: {
    id_event: number;
    event_name: string;
  };
  payment: {
    choice: EventPaymentChoice;
    status: PaymentStatus;
    amount: number | string | null;
    source: string | null;
    paid_at: string | null;
  };
  attendance: {
    status: ScannerAttendanceStatus;
    scanned_at: string | null;
    scanned_by: number | null;
    gate: string | null;
  };
}

export interface OnsiteAdmissionRequest extends CheckInRequest {
  amount: number;
}

export interface TransactionRecord {
  id: number;
  id_anggota: string;
  id_event: number;
  jumlah?: number | string;
  status?: string;
  created_at: string;
  dataUser?: Member;
}

export interface CarouselSlide {
  id: number;
  foto: string | null;
  judul?: string | null;
}

/** Shape shared by GET /info/pesantren and GET /info/mzt (both PUBLIC). */
export interface OrgInfo {
  judul: string;
  deskripsi: string;
  alamat: string;
  telpon: string;
  email: string | null;
  foto: string | null;
}

export interface ActivityLogEntry {
  id: number;
  id_users: number;
  aktivitas: string;
  created_at: string;
  dataUser?: Member;
}

/** Shape of GET /public/stats (PUBLIC). */
export interface PublicStats {
  event: number;
  event_selesai: number;
  event_mendatang: number;
  total_anggota: number;
}

/** Payload for POST /public/contact (PUBLIC). */
export interface ContactRequest {
  nama: string;
  email: string;
  pesan: string;
}

export interface AccountActivationCheckRequest {
  name: string;
  tanggal_lahir: string;
}

export interface AccountActivationVerifyRequest {
  challenge_token: string;
  tempat_lahir: string;
  tahun_masuk: string;
}

export interface AccountActivationResult {
  challenge_token?: string;
  id_anggota?: string;
}

export type MemberApplicationStatus =
  "pending_email" | "submitted" | "under_review" | "approved" | "rejected";

export interface MemberApplicationDuplicate {
  id_users?: number;
  id_anggota?: string;
  name: string;
  tanggal_lahir: string;
  no_hp?: string | null;
}

export interface MemberApplication {
  uuid: string;
  application_number?: string;
  name: string;
  email: string;
  no_hp: string;
  alamat: string;
  pekerjaan: string;
  niqobah: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  tahun_masuk: string;
  tahun_keluar: string;
  foto: string | null;
  status: MemberApplicationStatus;
  id_anggota?: string | null;
  rejection_reason?: string | null;
  possible_duplicates?: MemberApplicationDuplicate[];
  created_at?: string;
  updated_at?: string;
}

export interface ApplicantUser {
  email: string;
  application: MemberApplication;
}

export interface ApplicantLoginRequest {
  email: string;
  application_number: string;
}

export interface ApplicantLoginResponse {
  success: boolean;
  message?: string;
  applicant?: ApplicantUser;
  data?: { applicant?: ApplicantUser; application?: MemberApplication };
}

export interface MemberApplicationsResponse {
  applications: MemberApplication[];
}

/* ------------------------------------------------------------ portal (Phase 1) */

/** Shape of GET /api/profile (Portal Alumni). */
export interface AlumniProfile {
  id: number;
  name: string;
  id_anggota: string;
  email: string | null;
  no_hp: string | null;
  alamat: string | null;
  pekerjaan: string | null;
  tempat_lahir: string | null;
  niqobah: string | null;
  tahun_masuk: string | null;
  tahun_keluar: string | null;
  foto: string | null;
  status: number | string;
  barcode: string | null;
}

/** Editable fields for PUT /profile (Phase 1). */
export interface ProfileUpdateRequest {
  no_hp?: string;
  email?: string;
  alamat?: string;
  pekerjaan?: string;
  tempat_lahir?: string;
}

/** Payload for PUT /password. */
export interface PasswordChangeRequest {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface AccountSetupCompleteRequest {
  password: string;
  password_confirmation: string;
}

/** Shape of GET /id-card (QR encodes id_anggota). */
export interface IdCardData {
  id: number;
  id_anggota: string;
  name: string;
  foto: string | null;
  niqobah: string | null;
  status: number | string;
  barcode: string | null;
}

export interface KtaCardSummary {
  id_users: number;
  id_anggota: string;
  nama: string;
}

export interface KtaCard {
  id_users: number;
  id_anggota: string;
  nama: string;
  alamat: string;
  niqobah: string;
  tahun_masuk: string | null;
  tahun_keluar: string | null;
  foto: string | null;
  barcode_value: string;
  barcode_data_uri: string;
  background_url: string;
}

/* ------------------------------------------- Phase 2D — EMS Operational Management */
/* Endpoints: GET /dashboard/operations/* (auth:sanctum, read-only). Field names
   mirror the Laravel Resources exactly — never rename. PII fields (id_anggota,
   nama) are `null` for callers WITHOUT the viewParticipantPII ability; the
   backend does the cut, the UI only renders what the API sends. */

/** Aggregate row from GET /dashboard/operations/events. */
export interface OperationalEvent {
  id_event: number;
  judul_event: string;
  tanggal_start: string | null;
  lokasi: string | null;
  kuota: number | null;
  present_count: number;
  legacy_count: number;
  gate_count: number;
  latest_tgl: string | null;
}

/** Source split: phase2c = scanned with a ticket (present), legacy = historical. */
export type ParticipantSource = "phase2c" | "legacy";

/** Account linkage: normal = matched to a `users` row, orphan = no match. */
export type AccountStatus = "normal" | "orphan";

/** One participant row from GET /dashboard/operations/events/{id}/attendees. */
export interface Participant {
  id: number;
  id_event: number;
  id_tanggal: number | null;
  /** PII — null unless the caller holds viewParticipantPII (backend-cut). */
  id_anggota: string | null;
  /** PII — null unless the caller holds viewParticipantPII (backend-cut). */
  nama: string | null;
  source: ParticipantSource;
  account_status: AccountStatus;
  ticket_status: string | null;
  gate: string | null;
  scanned_at: string | null;
}

/** Echo of the applied query params, always present in attendees `meta`. */
export interface ParticipantFilterState {
  event_id?: number | null;
  tgl?: number | null;
  gate?: string | null;
  q?: string | null;
}

export interface ParticipantMeta {
  total: number;
  page: number;
  per_page: number;
  last_page: number;
  filter: ParticipantFilterState;
}

/** Payload of GET /dashboard/operations/events/{id}/attendees. */
export interface ParticipantListResponse {
  rows: Participant[];
  meta: ParticipantMeta;
}

/** Per-day attendance breakdown from GET /dashboard/operations/events/{id}/attendance. */
export interface PerTanggalRow {
  tanggal_id: number | null;
  present: number;
  legacy_count: number;
}

/** Payload of GET /dashboard/operations/events/{id}/attendance. */
export interface AttendanceSummary {
  event_id: number;
  tanggal_id: number | null;
  /** Canonical present = prisensi_kehadiran.id_ticket IS NOT NULL (Phase 2C). */
  present: number;
  legacy_count: number;
  total: number;
  per_tanggal: PerTanggalRow[];
}

/** One gate group row from GET /dashboard/operations/events/{id}/gates. */
export interface GateMonitorRow {
  gate: string;
  present: number;
  legacy: number;
  total: number;
}

/** Payload of GET /dashboard/operations/events/{id}/gates. */
export interface GateMonitoringResponse {
  event_id: number;
  tanggal_id: number | null;
  rows: GateMonitorRow[];
  breakdown_per_gate: Record<string, GateMonitorRow>;
}

/* ------------------------------- Phase 3 — Payment Verification Queue */

export interface PaymentItem {
  id: number;
  uuid: string;
  nomor_payment: string;
  id_order: number;
  method: string;
  amount: number | string;
  status: PaymentStatus;
  paid_at: string | null;
  verified_at: string | null;
  verified_by: number | null;
  reference_number: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  order: {
    id: number;
    uuid: string;
    nomor_order: string;
    event_name: string;
    event_price: number | string;
    total_amount: number | string;
    id_event: number;
    payment_status: string;
    event?: { id: number; judul_event: string; slug: string } | null;
  } | null;
  proofs: {
    id: number;
    id_payment: number;
    file_path: string;
    original_name: string | null;
    file_size: number | null;
  }[];
}

export interface VerificationQueueParams {
  status?: PaymentStatus | string | null;
  event_id?: number | null;
  date_from?: string | null;
  date_to?: string | null;
  q?: string | null;
  page?: number | null;
  per_page?: number | null;
}

export interface VerificationQueueResponse {
  data: PaymentItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/* ------------------------------- Phase 3 — Audit Timeline (M-05) */

export interface AuditTimelineItem {
  actor: string;
  action: string;
  entity: "payment" | "ticket" | "checkin";
  entity_id: number;
  old_status?: string | null;
  new_status?: string | null;
  timestamp: string;
  note?: string | null;
}

export interface AuditTimelineResponse {
  rows: AuditTimelineItem[];
  total: number;
}

export type AuditTimelineParams = {
  event_id?: number | null;
  date_from?: string | null;
  date_to?: string | null;
  entity_type?: "payment" | "ticket" | "checkin" | null;
  action?: string | null;
  actor?: string | null;
  q?: string | null;
  page?: number | null;
  per_page?: number | null;
};

/* ------------------------------- Public "Cek Status KTA" (read-only) */

/**
 * Stage-1 lookup request. The public response is intentionally generic
 * (`stage: "challenge"`) and never reveals whether the lookup matched zero,
 * one, or many members — that state lives only inside the challenge token.
 */
export type KtaCheckRequest =
  | { mode: "name_dob"; name: string; tanggal_lahir: string }
  | { mode: "member_id"; id_anggota: string };

export interface KtaCheckResponse {
  stage: "challenge";
  challenge_token: string;
}

/** Field order the backend will ask for when a lookup is ambiguous. */
export type KtaDisambiguateField = "tahun_masuk" | "tempat_lahir" | "niqobah";

export type KtaVerifyRequest =
  | { challenge_token: string; method: "hp_last4"; value: string }
  | {
      challenge_token: string;
      method: "no_hp_fallback";
      value: { tahun_masuk: string; tempat_lahir: string };
    }
  | {
      challenge_token: string;
      method: "disambiguate";
      field: KtaDisambiguateField;
      value: string;
    };

/** Successful verification — masked identity only, no raw PII. */
export interface KtaVerifiedResult {
  verified: true;
  nama_masked: string;
  id_anggota_masked: string;
  status: "active" | "non_active";
  qr_payload: string;
  kta: { type: "digital"; fisik: string };
  note?: string;
  /** Short-lived proof of ownership, required to request a physical card. */
  print_token?: string;
  print_amount?: number;
}

/** Intermediate challenge (wrong answer, or narrowed disambiguation). */
export interface KtaChallengeResult {
  stage: "challenge";
  challenge_token: string;
  attempts_left?: number;
}

export interface KtaManualReviewResult {
  stage: "manual_review";
  message: string;
}

export type KtaVerifyResponse = KtaVerifiedResult | KtaChallengeResult | KtaManualReviewResult;

/* ---------------------------------- Physical KTA print request (v3.0) */

export type KtaPrintStatus =
  | "menunggu_pembayaran"
  | "menunggu_cetak"
  | "sudah_dicetak"
  | "siap_diambil"
  | "dikirim"
  | "selesai"
  | "ditolak"
  | "pembayaran_expired";

export type KtaDeliveryMethod = "pickup" | "delivery";

export interface KtaPaymentBreakdown {
  base_amount?: number | string | null;
  gateway_fee?: number | string | null;
  payment_amount: number | string | null;
}

/** Public projection of a print request (masked identity, no raw PII). */
export interface KtaPrintRequest extends KtaPaymentBreakdown {
  id: number;
  reference: string;
  status: KtaPrintStatus;
  delivery_method?: KtaDeliveryMethod | null;
  payment_status: string;
  pay_url: string | null;
  submitted_at: string | null;
  paid_at: string | null;
  printed_at: string | null;
  ready_at?: string | null;
  shipped_at?: string | null;
  completed_at: string | null;
  rejection_reason: string | null;
}

export interface MyKtaPrintRequest extends KtaPaymentBreakdown {
  reference: string;
  status: KtaPrintStatus;
  delivery_method?: KtaDeliveryMethod | null;
  payment_status: string;
  pay_url: string | null;
  submitted_at: string | null;
  paid_at: string | null;
  printed_at: string | null;
  ready_at?: string | null;
  shipped_at?: string | null;
  completed_at: string | null;
  rejected_at: string | null;
  updated_at: string | null;
  rejection_reason: string | null;
}

export interface MyKtaPrintRequestResponse {
  success: true;
  data: {
    request: MyKtaPrintRequest | null;
  };
}

export interface KtaPrintRequestCreate {
  print_token: string;
}

/** Admin queue row — masked identity only. */
export interface KtaPrintRequestAdminRow extends KtaPaymentBreakdown {
  id: number;
  reference: string;
  nama_masked: string;
  id_anggota_masked: string;
  status: KtaPrintStatus;
  delivery_method?: KtaDeliveryMethod | null;
  payment_status: string;
  submitted_at: string | null;
  updated_at: string | null;
}

export interface KtaPrintRequestAuditLog {
  old_status: string | null;
  new_status: string;
  reason: string | null;
  source: string;
  actor_id: number | null;
  at: string | null;
}

export interface KtaPrintRequestAdminDetail extends KtaPrintRequestAdminRow {
  recipient_name?: string | null;
  recipient_phone?: string | null;
  shipping_address?: string | null;
  notes: string | null;
  logs: KtaPrintRequestAuditLog[];
}

export interface KtaPriceSetting {
  amount: number;
  updated_at: string | null;
  updated_by?: string | null;
}

export interface KtaPriceHistoryItem {
  id: number;
  old_amount: number;
  new_amount: number;
  actor: string | null;
  created_at: string;
}

export interface KtaPriceSettingsResponse {
  setting: KtaPriceSetting;
  history: KtaPriceHistoryItem[];
}

export interface KtaPrintRequestQueueResponse {
  data: KtaPrintRequestAdminRow[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
