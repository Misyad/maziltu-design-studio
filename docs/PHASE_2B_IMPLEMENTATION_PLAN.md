# PHASE 2B Implementation Plan — Payment & Ticket Engine

**Project** : MZT Apps (Maziltutholiban Members Platform)
**Versi** : 1.0
**Status** : Approved — acuan implementasi Phase 2B (bukan PRD)
**Basis dokumen (Design Freeze v2.1.0-beta1):**
- `docs/PRD-Event Management System.md` (v2.1.0, Final)
- `docs/PRD-Payment & Ticket Engine.md` (v2.1.0-beta1)
- `docs/Audit-Gap-Analysis-EMS.md` (v0.2.0 — akan diselaraskan menjadi v0.3.0)
- `docs/ADR.md` (ADR-001 s.d. ADR-016, Active)
- `docs/RELEASE_NOTES_v2.1.0-alpha1.md`

**Keputusan scope yang sudah disetujui:**
- Skema tabel baru mengikuti **PRD-Payment §16** (bukan placeholder Audit-Gap §5.5).
- `PaymentStatus` **tanpa** `completed` — mengikuti ADR-010 (ditegaskan melalui addendum ADR-017).
- Backend queue = **driver database** + service `worker` (ADR-016, Queue First).
- Finance/Reporting penuh **ditunda ke Phase 2D**; beta1 hanya **Verification Queue** + monitoring payment.

> Dokumen ini **bukan PRD** dan **bukan persetujuan untuk menulis kode**. Ia wajib melewati Architecture Review dan persetujuan Product Owner sebelum implementasi dimulai. Seluruh perubahan tetap melalui proses PRD → Audit → ADR → Review → Implementasi sesuai `PRD §28.11`.

---

# 1. Overview

## 1.1 Tujuan

Mengimplementasikan **Payment Engine** dan **Ticket Engine** di atas Order (Aggregate Root, Phase 2A) sehingga:

1. Pendaftaran pada event berbayar dapat **dibayar**, bukti **diunggah**, dan **diverifikasi** (approve/reject) oleh bendahara.
2. **Tiket digital + QR** diterbitkan otomatis saat syarat terpenuhi; dapat **diunduh**, **diterbitkan ulang**, dan **dicabut**.
3. Komunikasi transaksional (Payment Approved, Payment Rejected, Ticket Ready) mengalir melalui **Queue / Communication Engine** (ADR-016).
4. Bendahara memverifikasi lewat **Verification Queue** dengan outstanding yang dihitung realtime (PRD §9.8).

## 1.2 Input & Prinsip

- **Evolution First** (reuse → migrate → add → retire) — ADR-005.
- **Backward Compatible** (ADR-013): tidak merusak Phase 1 dan Phase 2A.
- **Aggregate Root** (ADR-001): Payment/Ticket merujuk ke `orders`, bukan langsung ke `events`.
- **Additive Migration** (ADR-005): tidak drop/rename/retipe tabel eksisting.
- **Queue First** (ADR-016) & **Service Layer** (ADR-004).
- **UUID publik** (ADR-003/S1) dan **Audit Columns** `created_by`/`updated_by` (ADR-006).

## 1.3 Batas

- `orders` dan skema Phase 2A yang sudah live **tidak diubah** (tidak di-rename, drop, atau retipe).
- Implementasi beta1 tidak menambahkan fitur di luar PRD (anti scope-creep).

## 1.4 Non-Goals (beta1)

Fitur berikut **di luar cakupan beta1** dan dinyatakan eksplisit agar ekspektasi jelas:

- Integrasi payment gateway realtime (Midtrans/Xendit/Duitku/Tripay/Stripe/PayPal) — future (PRD §15 "Future Integration").
- **Refund Automation** — di luar scope hingga setelah v2.1.0 (PRD §4.2).
- Finance Dashboard penuh, Revenue, Export Excel/PDF, Reporting — **Phase 2D** (PRD §28.4, ADR-015).
- Notification Center (in-app) final — tabel `notifications` opsional diterapkan di Phase 2D (PRD §16.3, §20.6).
- QR Check-In & Attendance — **Phase 2C** (PRD §28.4; kolom attendance §16.10 ditunda).
- Sertifikat, Merchandise, Hotel/Transportasi, Multi Event Package, Voucher/Installment.

---

# 2. Scope

## 2.1 In-Scope (beta1)

| Area | Deliverable |
|---|---|
| **Payment** | Pembuatan Payment, Upload Bukti, Verifikasi (Approve/Reject + alasan), Riwayat (my-payments), Outstanding realtime, Payment Timeline (payment_logs) |
| **Metode** | Transfer Bank (upload), Cash (panitia, langsung paid), QRIS manual (upload), Complimentary (event gratis → tiket seketika), Sponsor (paid by sponsor) |
| **Ticket** | Generate otomatis (gratis: saat daftar; berbayar: setelah paid), identity = UUID, QR (payload = UUID tiket), Download PDF (dompdf), Re-issue (UUID tetap), Revoke |
| **Order** | Cancel (ADR-009 — `cancelled` dari state aktif mana pun sesuai kebijakan), idempotent |
| **Communication (fondasi)** | Communication Log, template, queue (ADR-016), hook email untuk PaymentApproved/PaymentRejected/TicketReady, retry otomatis, mandatory notification |
| **Dashboard (minimal)** | **Verification Queue** (approve/reject + note), Payment Summary card (jumlah pending/waiting/paid/rejected/refund) |
| **API** | Payment, Ticket, Cancel Order, Dashboard queue/summary (PRD §21.5, §21.6, §21.7, §21.8) |

## 2.2 Out-of-Scope

Lihat §1.4. Fitur di luar daftar tersebut **tidak** dikerjakan pada sprint beta1; setiap usulan penambahan harus melewati Architecture Review dan persetujuan Product Owner.

---

# 3. Dependency Graph

Dependensi dirakit dari bawah ke atas (setiap layer hanya bergantung pada layer yang sudah selesai).

```
Skema (migration) ──► Enums ──► Models ──► Services ──► Controllers/Routes ──► API
       │
       ▼
 jobs table (queue infra) ──► Events/Jobs ──► Communication Log
                                       │
                                       ▼
                               Frontend: api-client ──► pages
```

## 3.1 Tabel Dependensi Modul

| Modul | Bergantung pada | Alasan |
|---|---|---|
| `jobs`, `failed_jobs` (infra) | config/queue | Queue driver database (ADR-016) |
| `payment_proofs` | `payments` | 1:N upload bukti per payment |
| `payment_logs` | `payments` | Audit perubahan status |
| `tickets` | `orders`, `jobs` | Aggregate Order; generate via queue |
| `ticket_logs` | `tickets` | Audit lifecycle tiket |
| `communication_logs` | `jobs`, `users` | Log komunikasi keluar |
| `PaymentService` | `payments`, `payment_logs`, `payment_proofs` | Kalkulasi outstanding + verify |
| `TicketService` | `tickets`, `ticket_logs`, `Order` | Generate / re-issue / revoke |
| `GenerateTicketJob` | `PaymentService.verify` | Tiket setelah paid |
| API pembayaran | `PaymentService`, RBAC/ownership | |
| API tiket | `TicketService`, RBAC/ownership | |
| Dashboard queue | `PaymentService` + filter (PRD §21.13) | |
| Tiket PDF + QR | `milon/barcode` (DNS‑2D), `barryvdh/laravel-dompdf` | Render QR dalam PDF tiket |
| Frontend pages | Seluruh endpoint baru | |

> **Kritis:** semua penulisan pada Aggregate dilakukan dalam `DB::transaction` (Transaction Boundary, PRD §22.10), dan event/job di-dispatch **setelah commit** (`after_commit`) agar tidak pernah ada tiket yatim atau notifikasi bocor saat transaksi dibatalkan.

---

# 4. Sprint Planning

Model sprint bersifat usulan; total estimasi ±5–8 hari kerja. Setiap sprint memiliki **Exit Criteria** di Bagian 11.

| Sprint | Durasi | Fokus Utama | Keluaran Inti |
|---|---|---|---|
| **S0 — Prasyarat** | 2–3 HR | Dokumentasi + infrastruktur queue | Audit-Gap v0.3.0, ADR-011/017 terbit, tabel `jobs`, `QUEUE_CONNECTION=database`, service `worker` + scheduler |
| **S1 — Domain** | 3–4 HR | Migration + Enums + Models | 6 tabel baru, enum `TicketStatus`/`PaymentMethod`, model + relasi |
| **S2 — Payment** | 4–5 HR | PaymentService + API | create/upload/verify/history/outstanding, proof storage, throttle, cancel order |
| **S3 — Ticket** | 3–4 HR | TicketService + API | generate/QR/download/reissue/revoke, free-event hook |
| **S4 — Queue & Comms** | 3–4 HR | Event/job + scheduler + log | GenerateTicket, SendPaymentApproved, SendTicket, schedule reminder, endpoint verification queue |
| **S5 — Frontend** | 4–5 HR | Portal + Dashboard queue | Bayar, Riwayat Pembayaran, Ticket Saya + QR, Verification Queue |
| **S6 — Verifikasi & Rilis** | 3–4 HR | Unit + E2E + Jenkins | Verify schema extended, Release Notes beta1, review |

---

# 5. Backend Implementation Order

Urutan tahapan paling aman (setiap tahap menghasilkan commit terpisah yang dapat dieksekusi bertahap):

1. **Prasyarat dokumen:** Audit-Gap → v0.3.0 (diselaraskan ke PRD §16); ADR-011 diselaraskan; addendum ADR-017 (state machine payment, tanpa `completed`). *(Tidak menulis kode.)*
2. **Infra queue:** migration `create_jobs_table` (pastikan `failed_jobs` tersedia); `QUEUE_CONNECTION=database` di compose (hapus hardcode `sync`); tambah service `worker` (`queue:work`) dan scheduler (`schedule:run`).
3. **Migration skema:** payments, payment_proofs, payment_logs, tickets, ticket_logs, communication_logs (urutan Bagian 7).
4. **Enum:** `TicketStatus` (draft/issued/checked_in/finished/cancelled/revoked — PRD §16.8), `PaymentMethod` (transfer/cash/qris/sponsor/complimentary). `OrderStatus` dan `PaymentStatus` **tidak berubah**.
5. **Models:** Payment, PaymentProof, PaymentLog, Ticket, TicketLog, CommunicationLog + relasi ke Order + casts.
6. **Numbering:** perluas `OrderNumberService` untuk nomor payment (`PAY-YYYY-NNNNNN` — asumsi Lampiran) dan nomor tiket (`TKT-YYYY-NNNNNN` — PRD §10.5). Generasi nomor global tetap terpusat pada satu service (ADR-007) dan dilakukan **secara atomik** (dalam transaksi database) agar unique constraint `nomor_payment`/`nomor_ticket` tidak bentrok pada saat verifikasi/penerbitan paralel.
7. **PaymentService:** create payment oleh panitia (cash/sponsor/complimentary), upload proof, verify (idempotent) / reject, perhitungan outstanding, penulisan payment_logs.
8. **TicketService:** generate (gratis & berbayar), re-issue (UUID tetap), revoke, penulisan ticket_logs, QR payload = UUID tiket. QR dirender pada PDF tiket menggunakan `milon/barcode` (DNS‑2D) — dependency yang sudah ada — dan PDF dihasilkan via `barryvdh/laravel-dompdf`.
9. **Controller/route:** payment, ticket, cancel order, dashboard queue/summary. Seluruh route `auth:sanctum` + ownership + RBAC (role Alumni/Dashboard/Event/Finance/Ketua/Administrator — PRD §21.4). Parameter publik memakai `uuid` (ADR-003).
10. **Storage:** `storage/app/payments/` (bukan public); nama file = UUID; validasi MIME (JPG/JPEG/PNG/PDF), extension, ukuran maksimum 5 MB (PRD §23.7); akses via controller; nama asli tidak disimpan sebagai path.
11. **Event & Jobs (ADR-016):** events `PaymentStatusChanged`, `TicketIssued` dll di-dispatch dari service; jobs `GenerateTicketJob`, `SendPaymentApprovedNotificationJob`, `SendTicketJob`, `BroadcastJob`, `ReminderJob`, `CleanupTemporaryFileJob`. Seluruh job idempotent (GenerateTicket mengembalikan tiket yang sudah ada, bukan membuat baru — PRD §24.11).
12. **Scheduler** (`routes/console.php`): reminder pembayaran H‑14/H‑7/H‑3/H‑1, reminder kehadiran H‑1/H‑0, cleanup file sementara malam. Dijalankan melalui scheduler service.
13. **Throttle (PRD §21.14):** `throttle:5,1` pada endpoint authentication; `throttle:10,1` pada upload payment.
14. **Validation (PRD §23.11):** seluruh input divalidasi (required, tipe data, panjang maks, allowed value, file validation); tidak ada penggunaan request mentah tanpa validasi.

---

# 6. Frontend Implementation Order

Dilakukan setelah backend API stabil. Urutan per layer:

1. **Types:** `Payment`, `PaymentMethod`, `Ticket`, `TicketStatus`, `PaymentProof` (`src/types/api.ts`).
2. **api-client** (`src/services/mzt-api.ts`): `uploadPaymentProof`, `verifyPayment`, `rejectPayment`, `fetchMyPayments`, `fetchPayment`, `fetchTicket`, `downloadTicket`, `reissueTicket`, `revokeTicket`, `cancelOrder`, `fetchVerificationQueue`, `fetchPaymentSummary`.
3. **TanStack Query:** key + invalidate untuk order/payment/ticket pada saat upload/verify.
4. **Portal — "Bayar"** (order detail): kartu tagihan + status pembayaran + form upload bukti (dengan validasi) + instruksi cash/QRIS manual.
5. **Portal — "Riwayat Pembayaran"**: daftar + detail (timeline status dari payment_logs).
6. **Portal — "Ticket Saya"**: kartu tiket + QR (`qrcode.react`), tombol download PDF, state graceful (pending/batal).
7. **Dashboard — "Verification Queue"**: daftar `waiting_verification` (pagination + filter — PRD §21.12/§21.13), aksi approve/reject + note, Payment Summary card. (Finance penuh di 2D.)
8. **Integrasi SSR:** penanganan 401/403/409/422 konsisten; menu "Order Saya" → aksi cancel.

---

# 7. Migration Order (PRD §16.15 ∩ Infra)

Dijalankan oleh stage pipeline `Migrate DB` (idempotent). Ini merupakan **batch tambahan (additive) di atas migrasi Phase 1 / Phase 2A yang sudah ada** — bukan penanda DB baru. Urutan berikut **aman untuk production** karena seluruhnya aditif:

| # | Migration | Isi | Catatan Aman |
|---|---|---|---|
| 0 | `create_jobs_table` | `jobs` (pastikan `failed_jobs` tersedia) | Guard `Schema::hasTable`; tidak menyentuh tabel lama |
| 1 | `create_payments_table` | payments (PRD §16.5) | Index `uuid, id_order, status, method, paid_at, verified_at` |
| 2 | `create_payment_proofs_table` | payment_proofs (PRD §16.6) | Index `id_payment` |
| 3 | `create_payment_logs_table` | payment_logs (PRD §16.7) | Index `id_payment, created_at` |
| 4 | `create_tickets_table` | tickets (PRD §16.8) | Unique `uuid`, `nomor_ticket`; index `id_order, status` |
| 5 | `create_ticket_logs_table` | ticket_logs (PRD §16.9) | Index `id_ticket, created_at` |
| 6 | `create_communication_logs_table` | communication_logs (PRD §20.13 / ADR-016) | Index `uuid, status, created_at` |
| 7 | Attendance extension | `id_ticket`, `gate`, `scanned_at`, `scanned_by` (PRD §16.10) | **Phase 2C — ditunda; TIDAK dibuat pada beta1** |

**Aturan wajib:** additive, idempotent, memiliki `down()`, backward compatible (ADR-005/013), tidak drop/rename/retipe tabel lama, dan tidak menambahkan FK ketat (cukup index — Audit-Gap §4 anomali #4) agar tidak memecah admin web lama.

---

# 8. Testing Strategy

## Unit

- `PaymentService`: idempotensi verify, perhitungan outstanding (tagihan − dibayar), transisi status yang diizinkan.
- `TicketService`: gate generate (paid/free), re-issue mempertahankan UUID, revoke memblokir re-use.
- Enum `TicketStatus`/`PaymentMethod`: set nilai valid.

## Integration / Feature (PHPUnit + DB)

1. Free event: register → tiket otomatis `issued`.
2. Event berbayar: upload proof → `waiting_verification` → (admin) approve → `paid` → tiket terbit + `payment_logs` terisi.
3. Reject → upload ulang → re-verify.
4. Verify duplikat → mengembalikan state existing (idempotent).

## API Safety

- Ownership: user A tidak dapat mengakses order/payment/ticket milik user B.
- RBAC: non-admin pada endpoint admin → 403.
- Throttle: auth → 429 saat burst; upload → 429 di batas.
- Validasi file: MIME salah/ukuran berlebih → 422.

## E2E Live

- Registrasi event gratis → tiket otomatis.
- Event berbayar: upload → verify via dashboard → QR + PDF tampil.
- Reject → upload ulang → verify.
- Cancel order; ownership/unauthorized.

## Regression

- Seluruh endpoint Phase 2A (register / my-orders / orders/{uuid}), health `/api/public/stats`, serta admin web lama tetap berfungsi.
- Stage pipeline `Verify schema` diperluas namun tetap **schema-only** (memeriksa keberadaan tabel/kolom via `information_schema`), tanpa business logic (PRD §25.7).

---

# 9. Deployment Strategy

- Pipeline yang ada **tidak diubah alurnya**: `Validate host → Sync source → Build images → Backup database → Deploy stack → Migrate DB → Verify schema → Health check → Prune`.
- **Perluasan (bukan perubahan stage lama):**
  - `Verify schema`: tambah pemeriksaan tabel & kolom Phase 2B (`payments`, `payment_proofs`, `payment_logs`, `tickets`, `ticket_logs`, `communication_logs`) + `jobs`. **Schema-only**, tanpa business logic (PRD §25.7).
  - `Health check` tetap dua level (`ps` + HTTP 200 + `/api/public/stats` success:true). Endpoint baru tidak masuk jalur health check.
- **Compose:** backend `QUEUE_CONNECTION=database`; tambah service `worker` (image backend, command `php artisan queue:work --sleep=1 --tries=3`), service scheduler (cron `schedule:run`), dan volume `storage` untuk folder bukti.
- **HTTPS (mandatory sebelum go-live payment):** Caddy dikonfigurasi dengan TLS (domain publik/Cloudflare atau self-signed LAN — menunggu keputusan domain). Tambahkan probe TLS pada Health Check Level 1 (PRD §25.8); ini gap infrastruktur wajib sebelum data pembayaran ditransmisikan.
- **Artefak deploy tercatat:** commit backend + commit frontend + Jenkins Build + Migration Batch (PRD §25.13).

---

# 10. Rollback Strategy

Mengikuti PRD §25.9 (tidak mengubah desain yang di-freeze):

| Level | Kapan | Aksi | Database |
|---|---|---|---|
| **L1 — Application** | Bug hanya pada aplikasi | `git revert` commit → push → pipeline redeploy | Tidak dipulihkan |
| **L2 — Database** | Error data/migration | restore `mzt_pre_migrate_*.sql.gz` (auto-backup pipeline) → redeploy → verify schema + health (level 1 & 2) | Dipulihkan penuh |

Catatan:
- Seluruh migration additive + idempotent → L2 jarang diperlukan; pipeline tetap menjamin backup valid pada stage `Backup database` (ADR-014) sebelum `Migrate DB`.
- File bukti (storage) perlu dipulihkan agar konsisten bila L2 digunakan (best-effort; dokumentasikan titik restore storage).

---

# 11. Exit Criteria per Sprint

| Sprint | Kriteria Keluar (semua terpenuhi) |
|---|---|
| **S0** | `QUEUE_CONNECTION=database` aktif di compose; tabel `jobs` ada; container `worker` running; `schedule:run` terjadwal; Audit-Gap v0.3.0 & ADR-011/017 diterbitkan. |
| **S1** | Seluruh skema Phase 2B lulus `Verify schema`; model & relasi terautoload; `php artisan migrate:fresh --env=testing` bersih tanpa error. |
| **S2** | Unit PaymentService lulus (create/verify/reject/outstanding + idempotent); bukti tersimpan & tervalidasi (MIME/ukuran); ownership + RBAC test hijau. |
| **S3** | TicketService lulus (generate free/paid, reissue UUID tetap, revoke memblokir reuse, download PDF); cancel order hijau (kebijakan Lampiran). |
| **S4** | Queue berjalan: `GenerateTicketJob` & `SendPaymentApprovedNotificationJob` terproses; scheduler reminder ter-register; `communication_log` terisi; endpoint verification queue data akurat. |
| **S5** | E2E frontend: bayar → verify di dashboard → tiket + QR tampil dan dapat diunduh; tanpa error JS. |
| **S6** | Jenkins build SUCCESS (Backup → Migrate → Verify → Health); E2E live hijau; Release Notes beta1 diperbarui; Architecture Review pass; tidak ada regression menu Phase 1/2A. |

---

# 12. Risk & Mitigation

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Skema antar-dokumen tidak sinkron lagi (PRD vs Audit-Gap) | Mismatch implementasi | Satu sumber (PRD §16) + Audit-Gap v0.3.0; direview pada S0. |
| R2 | `completed` ambiguity | Skema/enum salah | Keputusan "tanpa `completed`" (ADR-017); abaikan sebutan `completed` pada PRD §16.5. |
| R3 | Race kuota / double verify / nomor bentrok | Data duplikat atau unique violation | Transaction Boundary + `DB::transaction` + unique `(id_event, id_anggota)`; verify idempotent; job `after_commit`; generasi nomor (`nomor_payment`/`nomor_ticket`) **atomik** saat paralel. |
| R4 | Upload bukti tidak tervalidasi / path bocor | Abuse & kebocoran data | Validasi MIME + ukuran; simpan di `storage/app`; akses via controller; nama file UUID. |
| R5 | Komunikasi gagal (SMTP/WA down) berulang | User tanpa notifikasi | Communication Log + retry otomatis (3x) + status; fallback + monitoring; provider pluggable. |
| R6 | Verification bottleneck (SLA "< 1 menit") | Queue menumpuk | Verification Queue UI + notifikasi pending; rotasi bendahara (operasional). |
| R7 | Infrastruktur HTTPS belum aktif | Data pembayaran bocor | Enforce Caddy TLS sebelum go-live; probe TLS di Health Check. |
| R8 | Scope creep Finance di beta1 | Delay rilis | Gate release beta1 = Payment + Ticket + Communication only (PRD §27.12). |
| R9 | Setup Queue/Worker salah | Proses async gagal | Worker + scheduler di compose; diverifikasi di exit criteria S4. |
| R10 | Dependensi payment gateway (real) | Overlap | Tidak dipakai di beta1; gunakan manual upload / QRIS manual (PRD §15). |

---

# Lampiran — Asumsi / Interpretasi (perlu konfirmasi Product Owner sebelum eksekusi, sesuai aturan #4)

1. **`confirmed` (status registrasi)** — di-set saat tiket terbit (gratis: segera; berbayar: saat payment paid) (PRD §22.11).
2. **Cancel order lunas** — Refund Automation di luar beta1; cancel hanya bila outstanding > 0; bila lunas → proses manual admin mendahului cancel, tiket di-revoke (PRD §10.8, §4.2).
3. **Format `nomor_payment`** — PRD tidak eksplisit; usulan `PAY-YYYY-NNNNNN` (konsisten ADR-007 global).
4. **Endpoint admin create cash/sponsor/complimentary (`POST /api/payments`)** — turunan PRD §8/§13 (tidak tercantum eksplisit di §21.6; ditetapkan sebagai asumsi di sini).
5. **Email terkirim vs journal** — perlu konfigurasi SMTP; default: kirim melalui Mail + simpan `communication_log`; WhatsApp provider bersifat stub/pluggable (dipilih organisasi).
6. **HTTPS/domain** — keputusan domain aktif & pendekatan TLS bagi environment live (Caddy domain/Cloudflare/self-signed LAN) wajib diputuskan sebelum go-live payment.

---

*Dokumen ini menjadi acuan pelaksanaan Phase 2B. Segala perubahan pada ruang lingkup, urutan, atau skema yang menyimpang dari Design Freeze wajib melalui Architecture Review dan persetujuan Product Owner terlebih dahulu.*
