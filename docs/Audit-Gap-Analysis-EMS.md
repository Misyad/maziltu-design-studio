# Audit &amp; Gap Analysis — EMS (Event Management System)

**Modul** : Phase 2 — Event Management System (EMS)
**Versi** : 0.2.0 (Aligned to Phase 2A)
**Status** : Disetujui — mendasar implementasi v2.1.0-alpha1 (Event Core + Registration + Order)
**Pendahulu** : `docs/PRD-Event Management System.md` (v2.1.0, Final PRD)

> Prinsip: **evolusi, bukan membangun ulang sistem**. Sama seperti Phase 1,
> seluruh perubahan skema bersifat **aditif** dan **non-destruktif**: tidak ada
> kolom eksisting yang di-drop, direname, atau di-retipe. Data lama dipertahankan
> sebagai riwayat.

---

# 1. Ringkasan Eksekutif

Audit dilakukan terhadap database produksi `mazw9983_alvinade_maziltu` dan kedua
codebase (Laravel backend `laravel-mzt`, frontend TanStack Start
`maziltu-design-studio`).

Terkait EMS, DB memiliki 5 objek inti:
`events`, `tanggal_events`, `m_transaksi_events`, `prisensi_kehadiran`, dan VIEW
`event_status`.

**Klasifikasi ringkas:**

| Tabel | Klasifikasi | Perubahan |
|---|---|---|
| `events` | MIGRATE | + `kuota`, `venue`, `visibility`, `registrasi_dibuka`, `registrasi_ditutup`, `harga_amount` |
| `tanggal_events` | REUSE | tanpa perubahan |
| `event_status` (VIEW) | REUSE | diformalisasi menjadi migration idempotent |
| `m_transaksi_events` | MIGRATE (index) + RETIRE (write-path) | UNIQUE `id_anggota` → UNIQUE `(id_event, id_anggota)`; tidak lagi ditulis oleh sistem baru |
| `prisensi_kehadiran` | MIGRATE (2C) | tambah `id_ticket` + `gate` (fase 2C, bukan 2A) |
| `users`, `data_users`, dll. | REUSE | tidak disentuh |

**ADD (Phase 2A):** tabel `orders` — root aggregate dari seluruh modul EMS.
**ADD (fase berikutnya):** `payments`, `tickets` (2B); atribut attendance (2C); dashboard/finance/reporting (2D).

Empat standar arsitektur proyek (lihat §10) berlaku untuk semua entitas baru: **UUID publik**, **pola audit `created_by`/`updated_by`**, **snapshot order immutable**, dan **status VARCHAR + konstanta enum**.

---

# 2. Metodologi

Audit dilakukan dengan:

1. Inventori skema & volume data via `information_schema` pada **DB produksi live**
   (read-only, `SELECT`).
2. Inventori kode Laravel: `database/migrations`, `app/Models`, `app/Http/Controllers`,
   `routes/api.php` & `routes/web.php`.
3. Inventori kode React: `src/routes`, `src/services/*`, `src/types/api.ts`,
   `src/features/*`.
4. Verifikasi relasi (orphan), duplikasi, dan distribusi status.
5. Penyusunan klasifikasi REUSE / MIGRATE / RETIRE / ADD serta peta API-frontend.

---

# 3. Inventori Data Aktual

Sumber: DB produksi (live), `users` +1,051; `data_users` 1,046.

## 3.1 `events`

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | bigint unsigned | PK |
| `judul_event` | varchar(255) | |
| `deskripsi` | text | |
| `tanggal` | varchar(255) | string rentang `dd/mm/yyyy - dd/mm/yyyy` (legacy) |
| `tanggal_selesai` | date | |
| `tanggal_mulai` | date | |
| `slug` | varchar(255) | nullable |
| `lokasi` | varchar(255) | |
| `banner` | text | |
| `is_active` | enum('1','0') | `1` = aktif |
| `harga` | varchar(255) | berisi `"Rp. 100.000"` (string) |
| `created_at` / `updated_at` | | |

Baris: **8** — aktif id `10, 11, 14, 16`; non-aktif `9, 12, 13, 15`.

## 3.2 `tanggal_events`

| Field | Tipe |
|---|---|
| `id` | int unsigned PK |
| `id_event` | bigint (default 0) |
| `tanggal` | date |
| `jam_mulai` / `jam_selesai` | time / varchar |
| `set_jam` | enum('seharian','dijam') |

Baris: **37** (multi-hari per event).

## 3.3 `m_transaksi_events`

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | int unsigned PK | |
| `id_anggota` | varchar(255) **UNIQUE** | <- masalah (limited to 1 baris/anggota) |
| `id_event` | bigint NOT NULL | |
| `order_id` / `gross_amount` | varchar nullable | |
| `payment_code` / `payment_type` / `pdf_url` | varchar nullable | |
| `status_code` / `status_message` | varchar nullable | |
| `transaction_id` / `transaction_status` / `transaction_time` | varchar/date nullable | |
| `snaptoken` | varchar nullable | |

**Data: 832 baris.**

| `transaction_status` | jumlah |
|---|---|
| settlement | 781 |
| offline | 25 |
| pending | 16 |
| NULL | 10 |

Distribusi per event: `10` → 526, `11` → 296, `14` → 10.

## 3.4 `prisensi_kehadiran`

| Field | Tipe |
|---|---|
| `id` | int unsigned PK |
| `id_event` | int NOT NULL |
| `id_tanggal` | bigint nullable |
| `id_anggota` | varchar(255) NOT NULL default '' |
| `id_user` | bigint NOT NULL default 0 |
| `tanggal_kehadiran` | timestamp default now |
| `jam_kehadiran` | timestamp default now |

**Data: 894 baris.** Per event: `11`→500, `14`→373, `5`→7, `10`→5,
`13`→3, `6`→3, `9`→2, `12`→1.

## 3.5 VIEW `event_status`

Persistent view atas `events`, menambahkan kolom `status`
(`'Ongoing' | 'Complate' | 'Upcomming'`) yang dihitung dari `tanggal_mulai`
dan `tanggal_selesai` terhadap `curdate()`.

> Catatan: typo pada nilai enum — `'Complate'` (seharusnya `Completed`) dan
> `'Upcomming'`. Dipakai untuk kompatibilitas admin lama.

---

# 4. Anomali Data &amp; Risiko

Diidentifikasi saat audit; **harus diselesaikan sebelum/bersamaan migrasi:**

| # | Anomali | Detail | Penanganan |
|---|---|---|---|
| 1 | UNIQUE `id_anggota` di `m_transaksi_events` | 1 anggota hanya boleh punya 1 baris transaksi global → **bertentangan dengan PRD §8** (anggota bisa daftar banyak event). | Hapus UNIQUE `id_anggota`, tambah UNIQUE `(id_event, id_anggota)` **(setelah verifikasi tak ada dupe)**. |
| 2 | 10 transaksi yatim (event 10) | id_anggota yang tak ada di `users` (`0016097370`, `0170021728`, dsb.) | Arsip — tandai tanpa valid FK; jangan di-drop. |
| 3 | 10 kehadiran yatim (event 5/6) | id_anggota 8-digit (`05020213`, `02062323`, ...) tak ada di `users`; event 5/6 tak ada di `events`. | Tandai sebagai riwayat legacy (test). |
| 4 | `events.harga` berupa string `"Rp. 100.000"` | Tidak dapat dikalkulasi numeric (kuota/pendapatan). | Tambah kolom `harga_amount` DECIMAL, backfill dari `harga` (parse string). Kolom `harga` lama dipertahankan utuh. |
| 5 | Nol foreign-key & tipe inkonsisten | `prisensi.id_user` bigint default 0; `jam_kehadiran` timestamp. | Tidak menambah FK ketat (hindari break admin lama); perbaiki via kolom aditif saja. |

---

# 5. Klasifikasi REUSE / MIGRATE / RETIRE / ADD

## 5.1 REUSE (dipakai ulang tanpa perubahan)

Yang tidak tersentuh (fondasi Phase 1 + content):

- `users`, `data_users`, `role_user`, `hak_akses_role`, `personal_access_tokens`
- `beritas`, `carosels`, `info_pesantrens`, `tentang_mzts`, `kontaks`,
  `template_id_card`, `component_template_id_card`, `activitas_logs`

## 5.2 REUSE (tanpa perubahan skema)

- **`tanggal_events`** — dipakai admin lama (`C_event_detail`) dan halaman
  attendance dashboard.

## 5.3 MIGRATE (perubahan aditif non-destruktif)

### `events`
Tambahkan kolom (semua baru, tidak menghapus yang ada):

| Kolom baru | Tipe | Keperluan |
|---|---|---|
| `kuota` | int unsigned nullable | kapasitas maksimum |
| `venue` | varchar nullable | nama venue/gedung |
| `visibility` | varchar(20) default `'public'` | `public` / `internal` / `private` |
| `registrasi_dibuka` | datetime nullable | window buka |
| `registrasi_ditutup` | datetime nullable | window tutup |
| `harga_amount` | decimal(12,2) nullable | backfill dari `harga` untuk kalkulasi |

Semantik `visibility`:
| Nilai | Siapa yang melihat | Perilaku Stage 2A |
|---|---|---|
| `public` | Semua alumni | Tampil publik + bisa didaftarkan |
| `internal` | Alumni yang login | Hanya tampil saat login; bisa didaftarkan |
| `private` | Whitelist/undangan (2B+) | Placeholder; tidak bisa didaftarkan di 2A |

`is_active` tetap sebagai saklar **publish/arsip** (PRD §5: Publish, Arsip).

### `m_transaksi_events`
- Drop UNIQUE `id_anggota` → UNIQUE `(id_event, id_anggota)` (index — protokol ketat §7).
- **Retire write-path**: sistem baru (Phase 2) memakai `orders` + `payments`,
  BUKAN menulis `m_transaksi_events`. Data 832 baris tetap riwayat terbaca.

### `prisensi_kehadiran` — (ditunda ke Phase 2C, lihat §10)
- Tambah `id_ticket` nullable + `gate` varchar nullable.
- Konfirmasi: `id_user` = id petugas yang melakukan check-in.

### VIEW `event_status`
- Formalize sebagai migration idempotent (cek keberadaan view → create) agar
  DB **fresh boot** ikut memiliki VIEW (saat ini tidak ada migration-nya).
  Nama & bentuk tetap, nilai status tetap (typo `Complate`/`Upcomming`)
  untuk kompatibilitas admin lama.

## 5.4 RETIRE (tidak dipakai sistem baru; data dipertahankan)

- **`m_transaksi_events` (write-path)** — tidak lagi menjadi sumber penulisan
  registrasi/**pembayaran** oleh sistem baru. Penulisan oleh admin lama tetap berjalan.

## 5.5 ADD (tabel baru)

### `orders` — root aggregate (Phase 2A)
Inti sistem (PRD §8). Satu anggota dapat punya banyak order di event berbeda.
Seluruh modul berikutnya (Payment/Ticket/Attendance/Certificate) mengacu ke Order.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | int unsigned PK | internal |
| `uuid` | varchar(36) UNIQUE | identitas publik (QR, link, API eksternal) |
| `nomor_order` | varchar(20) UNIQUE | `MZT-YYYY-NNNNNN`, global (nomor admin) |
| `id_event` | bigint (index) | referensi event |
| `id_anggota` | varchar(255) (index) | referensi alumni |
| `created_by` | bigint nullable | audit (Walk-In dibuat panitia) |
| `updated_by` | bigint nullable | audit |
| `event_name` | varchar(255) | **snapshot immutable** pada saat daftar |
| `event_price` | decimal(12,2) default 0 | **snapshot immutable** |
| `event_start_at` | date nullable | **snapshot immutable** |
| `total_amount` | decimal(12,2) default 0 | |
| `status_registrasi` | varchar(30) default `'draft'` | konstanta `OrderStatus` (bukan enum DB) |
| `payment_status` | varchar(30) default `'pending'` | konstanta `PaymentStatus` (bukan enum DB) |
| `created_at` / `updated_at` | | |

Index: UNIQUE `(id_event, id_anggota)`; UNIQUE `uuid`; UNIQUE `nomor_order`.

Status registrasi **tidak bergantung pada pembayaran** (PRD §7) →
`status_registrasi` dan `payment_status` kolom terpisah.
`ticket_status`/`ticket_id` **tidak** ada di 2A — ditambahkan bersama tabel `tickets` pada 2B.

### `tickets` (Phase 2B)
PRD §12. Dibuat setelah order status `confirmed`/order selesai.

| Kolom | Tipe |
|---|---|
| `id` | int unsigned PK |
| `uuid` | varchar(36) UNIQUE (standar proyek) |
| `id_order` | FK → `orders.id` |
| `nomor_ticket` | varchar, UNIQUE |
| `token` | varchar UNIQUE (isi QR; berupa ticket id, BUKAN id card) |
| `id_event` | bigint (denormalized) |
| `status` | varchar(30) (const: issued/used/cancelled) |
| `created_by` / `updated_by` | bigint nullable (standar proyek) |
| `created_at` / `updated_at` |

### `payments` (Phase 2B)

| Kolom | Tipe |
|---|---|
| `id` | int unsigned PK |
| `uuid` | varchar(36) UNIQUE (standar proyek) |
| `id_order` | FK → `orders.id` |
| `metode` | varchar(30) (const: transfer/qris/cash) |
| `nominal` | decimal(12,2) |
| `bukti_path` | varchar nullable (upload bukti) |
| `status` | varchar(30) (const: pending/waiting_verification/paid/rejected/refund) |
| `verified_by` / `verified_at` | int / datetime nullable |
| `created_by` / `updated_by` | bigint nullable (standar proyek) |
| `transaction_id_midtrans` | varchar nullable (tautan ke `m_transaksi_events`) |
| `created_at` / `updated_at` |

---

# 6. Peta API &amp; Frontend

## 6.1 Endpoint eksisting (reuse / penyesuaian)

| PRD § | Endpoint | Status |
|---|---|---|
| GET /events | `GET /public/events` | ✔ eksisting (`eventsIndex`) |
| GET /events/{id} | `GET /public/events/{id}` | ✔ eksisting (`eventsShow`) |
| GET /my-events | — | **BARU** (lihat §6.2) |
| GET /transactions/{eventid} | `GET /transactions/{id}` | ✔ eksisting (`transactionsIndex`) |
| POST /attendance | `POST /attendance` (`attendanceStore`) | ✔ eksisting (check-in manual) |
| GET /attendance | `GET /attendance/{event}/{tanggal}` | ✔ eksisting (`attendanceIndex`) |

## 6.2 Endpoint BARU (Phase 2A)

| PRD § | Endpoint | Kontroller |
|---|---|---|
| POST /events/{id}/register | buat `orders` + status `registered` | baru `EventRegister` |
| GET /my-orders | daftar order anggota | baru (`myOrders`) |
| GET /orders/{uuid} | detail order by UUID | baru (`orderShow`) |

### Endpoint ditunda (Phase 2B+):

| PRD § | Endpoint | Kontroller |
|---|---|---|
| GET /my-events | daftar event yang diikuti anggota | `myEvents` (2B) |
| GET /my-ticket/{id} | data ticket + QR | baru (2B) |
| POST /payments | buat payment (transfer/qris/cash) | baru (2B) |
| GET /payments | riwayat payment | baru (2B) |

Semua endpoint baru di bawah middleware `auth:sanctum` (authenticated), mengacu
ke **single identity** (token dari `users`). Hanya data milik sendiri
yang dapat dilihat (PRD §20). Endpoint `GET /orders/{uuid}` memakai **UUID**
(standar S1), bukan integer.

## 6.3 Frontend

### Baru (Portal / anggota):
- `/portal/my-events` — "Event Saya"
- `/portal/my-ticket` — "Ticket Saya" (QR tampil; `qrcode.react` sudah ada di dependency)
- `/portal/payments` — "Pembayaran"

### Dashboard (Refactor/extend):
- Dashboard panitia ditambah: total registrasi, hadir, belum hadir, bayar,
  pendapatan, kuota tersisa (PRD §16) — realtime (polling/fetch refresh).
- Halaman check-in diperluas: pilihan gate + petugas konteks.

### Reporting (PRD §17):
- Backend: export Excel/PDF. `barryvdh/laravel-dompdf` sudah ada di backend;
  tambah package Excel bila diperlukan.
- Frontend: tombol download export explorer (member, attendance, payments, stats).

---

# 7. Rencana &amp; Urutan Migrasi

1. **Backup DB** (logical `mariadb-dump`) — dibuat & disimpan di `/opt/mzt/backups/`.
2. **Verifikasi pra-migrasi**: pastikan tidak ada baris duplikat
   `(id_event, id_anggota)` pada `m_transaksi_events` (jika ada → resolusi dulu).
3. **Skema aditif (2A)**: migration untuk kolom baru `events` (kuota, venue,
   visibility, registrasi_dibuka, registrasi_ditutup, harga_amount backfill),
   drop/rebuild index `m_transaksi_events`, formalisasi VIEW `event_status`.
4. **Tabel baru (2A)**: migration untuk `orders`.
5. **Backfill**: parse `harga` → `harga_amount` (pastikan semua nilai valid).
6. **Migrasi backend (2A)**: enums + services + kontroller + route PHP.
7. **Migrasi frontend (2A)**: api-client, query, types, portal & dashboard pages.
8. **Verifikasi akhir**: API & kedua admin (dashboard React + admin web lama)
   masih berfungsi, `GET /api/public/stats`, per event baru (Reuni Akbar).
9. **Fase berikutnya (2B)**: tabel `tickets` + `payments`;
   **2C**: kolom attendance (`id_ticket`, `gate`); **2D**: dashboard/finance/reporting.

---

## 8. Keputusan yang sudah disepakati

- **Riwayat data legacy** dipertahankan (bukan di-drop), termasuk data yatim
  yang ditandai.
- **UNIQUE `id_anggota`** pada `m_transaksi_events` **dibongkar** → diganti
  UNIQUE `(id_event, id_anggota)` untuk mendukung multi-event.
- **Admin web lama** masih dipakai sebagian → setiap perubahan skema harus
  tetap kompatibel (aditif).
- **Status** memakai **VARCHAR + konstanta PHP enum** (bukan ENUM database)
  agar perubahan status masa depan tidak memerlukan ALTER TABLE.
- **`ticket_status` di tunda ke 2B** — atribut tiket hidup di tabel `tickets`,
  bukan `orders`.
- **Pembayaran** disarankan menempel ke **vendor penyedia pembayaran** yang
  sudah dipakai (`m_transaksi_events`/Midtrans legacy); Order diarahkan ke
  vendor tersebut sebagai tautan.
- **Order adalah root aggregate**: Payment/Ticket/Attendance/Certificate
  mengacu ke `orders`, bukan ke `events`.
- **ID publik memakai UUID** (`orders.uuid`), endpoint eksternal memakai UUID;
  ID integer hanya untuk internal.
- **Snapshot immutable pada Order** (`event_name`, `event_price`,
  `event_start_at`): nilai diambil saat order dibuat; perubahan data event
  tidak mengubah order lama.
- **Audit `created_by`/`updated_by`** wajib pada semua entitas baru (orders,
  payments, dst.).
- Keluaran fase ini adalah dokumen ini (bukan implementasi).

---

## 9. Daftar pihak &amp; riwayat

- **Audit dilakukan**: `[Nama]`
- **Tanggal**: `[YYYY-MM-DD]`
- **Data diambil dari**: DB produksi `mazw9983_alvinade_maziltu` (live) + codebase.
- **Referensi**: `docs/PRD-Event Management System.md`

---

# 10. Standar Arsitektur (berlaku untuk seluruh EMS)

Empat standar ini sudah disepakati dan wajib diikuti di setiap implementasi:

| # | Standar | Penerapan |
|---|---|---|
| S1 | **UUID untuk identitas publik** | `orders.uuid` (Phase 2A); `payments.uuid`, `tickets.token` (2B). Endpoint publik memakai UUID; integer hanya internal. |
| S2 | **Status = VARCHAR + konstanta PHP enum** | Bukan ENUM database. `app/Enums/OrderStatus.php`, `PaymentStatus.php`. Menghindari ALTER TABLE saat status baru. |
| S3 | **Snapshot immutable pada Order** | `event_name`, `event_price`, `event_start_at` disalin saat order dibuat; tidak berubah walau event diubah. |
| S4 | **Audit `created_by` / `updated_by`** | Semua entitas baru menyimpan siapa pembuat/editor. Walk-In: petugas sebagai pembuat. |

Catatan fase:

- **2A**: enums `OrderStatus`, `PaymentStatus`; service `OrderNumberService`
  (nomor `MZT-YYYY-NNNNNN` global), `EventCapacityService` (kuota + window
  registrasi + visibility), `RegistrationService`; API register + my-orders +
  order by UUID.
- **2B**: `PaymentStatus` mulai dipakai penuh; tabel `payments` + `tickets`.
- **2C**: `prisensi_kehadiran` ditambah `id_ticket`, `gate`.
- **2D**: dashboard, finance, reporting (export Excel/PDF).

---

## 11. Logbook

| Tanggal | Entri |
|---|---|
| 2026-08-06 | Sinkronisasi ulang dengan PRD v2.1.0 final. Penyesuaian Phase 2A: `orders` diperluas (uuid, snapshot, audit, status VARCHAR); `tickets`/`payments` ditunda ke 2B dan dipatuh standar S1–S4; `prisensi` perubahan pindah ke 2C. Standar arsitektur S1–S4 ditambahkan. Status dokumen: Disetujui — dasar implementasi v2.1.0-alpha1. |