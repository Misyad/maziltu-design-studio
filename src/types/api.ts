/**
 * Types mirroring the existing Laravel API exactly.
 * Field names are the backend's — never rename them.
 */

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export type AppRole =
  | "dashboard"
  | "anggota"
  | "event"
  | "berita"
  | "tampilan"
  | "aktivitas_user"
  | "id_card"
  | "prisensi";

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
}

export interface LoginRequest {
  id_anggota: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: AuthUser;
  message?: string;
}

export interface DashboardStats {
  event: number;
  event_selesai: number;
  event_mendatang: number;
  total_anggota: number;
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
  dataUser?: Member;
}

export interface AttendanceRequest {
  id_anggota: string;
  id_event: number;
  id_tanggal: number;
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

/** Result of POST /members/bulk-account. */
export interface BulkGenerateResult {
  created: number;
  skipped: number;
}
