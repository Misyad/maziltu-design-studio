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

export interface NewsItem {
  id: number;
  judul: string;
  slug: string;
  deskripsi: string;
  foto: string | null;
  pembuat: string;
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
