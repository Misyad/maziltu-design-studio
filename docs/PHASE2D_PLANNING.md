# PHASE 2D — EMS OPERATIONAL MANAGEMENT (Planning)

## 0. Status & Konteks

| | |
|---|---|
| Milestone | `v2.1.0-rc2` (target) |
| Induk | PRD EMS §7, §13, §14, §15, §16, §19.21; PRD Payment & Ticket §16.10, §17.8, §19.10, §19.11, §21.8 |
| Keputusan arsitektur | Re-scope 2D = EMS Operational Management (event-day ops); paralel dengan Sprint 5B.2 |
| Gate | **DATA-AUDIT PASS** (08 Aug 2026 instance `127.0.0.1:3306`, DB `mazw9983_alvinade_maziltu` — instance yang dikonfigurasikan backend `.env`) |
| Aturan keras | Tanpa migration baru, tanpa backfill, tanpa normalisasi, tanpa deploy. Baca-saja sepenuhnya. |

### Definisi "present" (canonical tunggal)
- **present** = baris `prisensi_kehadiran` dengan `id_ticket IS NOT NULL` (scan QR Phase 2C).
- **legacy/historical** = `id_ticket IS NULL` — TIDAK dihitung sebagai present; hanya ditampilkan berlabel "historical/fallback" sesuai hasil data-audit.
- Tidak ada definisi present kedua. Dua populasi tidak pernah digabung diam-diam.

### Bukti data-audit (ringkas)
- Join key `orders.id_anggota` = `prisensi_kehadiran.id_anggota` = **varchar(255)**, collation `utf8mb4_general_ci` → **comparable; PASS**.
- Volume: `orders`=0, `tickets`=0, `prisensi_kehadiran`=894 (100% legacy), `users`=1051, `events`=8 (id 9–16), `tanggal_events`=37.
- `id_anggota` match ke `users` = **884/894 (98,9%)**; 10 yatim (id_anggota 8-digit, semuanya di event 5 & 6 — event orphan, tidak ada di `events`).
- `id_tanggal` tanpa referensi: **6 baris**; `tanggal_events` juga berisi entry orphan event 5/6.
- Distribusi legacy per event: 5(7), 6(3), 9(2), 10(5), 11(500), 12(1), 13(3), 14(373). Duplikat id_anggota pada event multi-hari = valid (hadir >1 hari).
- **Phase 2C (`id_ticket NOT NULL`) = 0 baris saat ini** → dashboard live akan kosong sampai produksi menerima data 2B/2C; acceptance tidak boleh bergantung pada data final di DB ini.
- Index tersedia: `(id_event, id_tanggal)` & `id_ticket` → pakai dulu; **tanpa index/migration baru** hingga benchmark membuktikan kebutuhan.

---

## 1. EXISTING (jangan diklaim baru)

### 1.1 Backend endpoint (live)
| Method | Route | Controller | Akses |
|---|---|---|---|
| GET | `/dashboard/finance/overview` | `DashboardController::overview` | staff (`viewOverview`) |
| GET | `/dashboard/finance/registration` | `DashboardController::registration` | staff (`viewOverview`) |
| GET | `/dashboard/finance/revenue` | `DashboardController::revenue` | finance/ketua/admin (`viewRevenue`) |
| GET | `/dashboard/finance/payments` | `DashboardController::payments` | finance/ketua/admin (`viewPayment`) |
| GET | `/dashboard/finance/tickets` | `DashboardController::tickets` | staff (`viewTickets`) |
| GET | `/dashboard/finance/operational` | `DashboardController::operational` | staff (`viewOperational`) |
| GET | `/attendance/{eventId}/{tanggalId}` | `ApiController::attendanceIndex` | auth (legacy) |
| POST | `/checkin` | `CheckInController::store` | prisensi/event/verifier |

### 1.2 Backend struktur (live)
- `App\Contracts\DashboardServiceInterface` (overview, registrationSummary, revenueSummary, paymentSummary, ticketSummary, operationalSummary).
- `App\Queries\DashboardQuery` — satu-satunya read-model (skalar/array, tanpa Eloquent model builder returned, tanpa N+1).
- `App\DTO\DashboardFilter` (`start`, `end`, `eventId`, `status`).
- `App\Policies\DashboardPolicy` (`viewOverview`, `viewRevenue`, `viewPayment`, `viewTickets`, `viewOperational`).
- `App\Support\RoleGuard` (STAFF_ROLES, VERIFIER_ROLES, CHECK_IN_ROLES).
- `App\Http\Resources\Dashboard\*` (Overview/Registration/Revenue/Payment/Ticket/Operational).

### 1.3 Frontend (live)
- Halaman `dashboard/finance`, `dashboard/checkin`, `dashboard/attendance`, `dashboard/finance/tickets`.
- `src/services/mzt-api.ts`, `src/services/queries.ts`, `src/types/api.ts`.

### 1.4 Defect tercatat (EXISTING)
- **MIN-01** — `DashboardFilter::eventId` & `status` tidak dikonsumsi oleh `DashboardService`/`DashboardQuery` (semua query hanya pakai `start`/`end`). Harus difiks **sebelum** drill-down event/financial. (Dari SPRINT5B_ARCHITECTURE_REVIEW.)

---

## 2. PROPOSED

### 2.1 Arsitektur (wajib)
```
OperationalController (tipis, read-only, Gate-only)
  → DashboardServiceInterface (extended)
      → DashboardService
          → DashboardQuery  (SATU-SATUNYA read model; TIDAK ada Query class baru)
  → App\DTO\*            (pure value objects)
  → App\Http\Resources\Dashboard\*  → JSON
```
Authorization: **Policy/Gate** di controller. **Dilarang role check ad-hoc di controller.**

### 2.2 Otorisasi (disepakati)
| Kemampuan | Staff/Event/Prisensi | Finance/Ketua/Admin | Alumni | Unauthenticated |
|---|---|---|---|---|
| Ringkasan aggregate (overview, attendance, gates) | ✅ | ✅ | ❌ | 401 |
| PII peserta (nama, id_anggota, kontak) | ❌ | ✅ | ❌ | 401 |
| Financial queue / drill-down finansial | ❌ | ✅ | ❌ | 401 |

Implementasi: **`App\Policies\OperationalPolicy`** (subject = read-model marker, mirip `DashboardPolicy`) dengan abilities:
- `viewOperational` → `RoleGuard::isStaff()`
- `viewParticipantPII` → `RoleGuard::canVerify()`
- `viewFinancialQueue` → `RoleGuard::canVerify()`

Endpoint agregat tidak pernah mengekspos kolom PII/finansial pada response untuk role tanpa hak.

### 2.3 Endpoint baru (semua `auth:sanctum`, read-only)
| Method | Route | Service method | Policy ability |
|---|---|---|---|
| GET | `/dashboard/operations/events` | `operationalEvents($filter)` | `viewOperational` |
| GET | `/dashboard/operations/events/{event}/attendees?tgl=&gate=&q=&page=` | `participants($filter, $page)` | `viewOperational` + gating PII via `viewParticipantPII` |
| GET | `/dashboard/operations/events/{event}/attendance?tgl=` | `attendanceSummary($filter)` | `viewOperational` |
| GET | `/dashboard/operations/events/{event}/gates?tgl=` | `gateMonitoring($filter)` | `viewOperational` |
| GET | `/dashboard/finance/payments?event_id=&status=waiting_verification` | reuse `paymentSummary` (setelah MIN-01) | `viewPayment` (financial queue) |

Catatan: drill-down financial queue = kombinasi endpoint EXISTING + filter `event_id`/`status` yang baru benar-benar aktif setelah fix MIN-01. Endpoint di atas adalah **PROPOSED** — tidak tersedia sampai implementation + verification report.

### 2.4 Perubahan kode (PROPOSED)
**Backend**
- `App\DTO\DashboardFilter` — tetap; tambah opsional `search`, `page`, `perPage` atau DTO baru `ParticipantFilter` (pure, framework-agnostic). Dirinci saat implementasi.
- `App\Contracts\DashboardServiceInterface` — tambah: `operationalEvents`, `participants`, `attendanceSummary`, `gateMonitoring`.
- `App\Services\DashboardService` — implementasi, tetap tanpa side-effect.
- `App\Queries\DashboardQuery` — tambah method agregat: operasional per-event, peserta (pagination via `count`+`offset/limit`, return array + meta total), ringkasan hadir (canonical `id_ticket IS NOT NULL`), gate monitoring. **Total tidak N+1**.
- **Fix MIN-01** — konsumsi `eventId` & `status` di `orderQuery`/`paymentQuery`/`ticketQuery`.
- `App\Policies\OperationalPolicy` (baru) + registrasi Gate (ServiceProvider/AuthServiceProvider).
- `App\Http\Controllers\OperationalController` (baru, tipis) — model `DashboardController`.
- `App\Http\Resources\Dashboard\OperationalEventsResource`, `ParticipantResource` (varian agregat vs PII), `AttendanceSummaryResource`, `GateMonitoringResource`.
- `routes/api.php` — grup `Route::middleware('auth:sanctum')`, blok baru `// Phase 2D — EMS Operational Management`.

**Frontend**
- `src/types/api.ts` — tipe baru (OperationalEvent, Participant, AttendanceSummary, Gate).
- `src/services/mzt-api.ts` — `fetchOperationalEvents`, `fetchParticipants(event, params)`, `fetchAttendanceSummary`, `fetchGateMonitoring`.
- `src/services/queries.ts` — queryKey/queryOptions untuk tiap data + invalidate yang relevan.
- Halaman baru `src/routes/dashboard/operations/`: `index.tsx` (event-day overview), `events/$id/attendees.tsx` (search + pagination), `events/$id/attendance.tsx`, `events/$id/gates.tsx`.
- Nav `src/routes/dashboard/route.tsx` — tambah entri "Operational" yang hanya dirender untuk role berhak (front-end gate oleh role response `/user`).
- **PII masking**: attendance/participants page menyembunyikan kolom PII bila user bukan verifier.

### 2.5 Present & legacy di response
- Kolom/flag respons: `source: "phase2c" | "legacy"`. Ringkasan `present` hanya dari `phase2c`. Bagian `legacy_count` dipisah & berlabel historical.
- Peserta yatim (event 5/6, id_anggota tanpa akun `users`) diflag `account_status: orphan`, TIDAK dihapus/disembunyikan paksa — ditampilkan sesuai kebenaran data.

---

## 3. OUT OF SCOPE (eksplisit)
Email, WhatsApp, Push, Broadcast, Reminder, Campaign, AI, caching, advanced analytics, CSV/XLSX export (→ 5B.2), perubahan ticket state-machine, `checked_in→finished`, refactor `ApiController`, migration baru tanpa evidence + decision, backfill/normalisasi data legacy, deploy.

---

## 4. Performance & Quality
- Target tiap endpoint <500 ms (overview, attendance summary, participant query, gate monitoring).
- Nol N+1 (tes `assertQueryCount` atau setara di feature test).
- Pagination wajib untuk participant list (`page`/`per_page`, default 25–50).
- Gunakan index existing `(id_event,id_tanggal)` & `id_ticket`; tambah index/migration **hanya jika benchmark membuktikan kebutuhan** (dan butuh decision terpisah).

---

## 5. Testing (PROPOSED, saat implementasi)
- Feature test per endpoint: 401 unauthenticated; 403 role tanpa hak; 200 staff → respons agregat **tanpa** field PII/finansial; 200 verifier → respons + PII/financial queue; pagination meta benar.
- Present-definition: fixture scan 2C (`id_ticket` non-null) vs legacy (`id_ticket` null) → hanya scan 2C dihitung `present`.
- MIN-01: filter `event_id` & `status` benar memengaruhi hasil.
- Performa: assert <500 ms (loose, non-flaky).

---

## 6. Document Governance
- Bagian EXISTING vs PROPOSED dipisah tegas (di atas). Endpoint PROPOSED **tidak** boleh dianggap tersedia sampai verification report Sprint 2D.
- Tidak ada klaim production-ready. Verifikasi produksi (volume orders/tickets/2C) dilakukan di tahap verification terpisah terhadap DB produksi — DB audit ini kosong data 2B/2C.

---

## 7. STOP / Deliverables
1. ✅ Data-Audit selesai & PASS
2. ✅ `docs/PHASE2D_PLANNING.md`
3. ✅ Self-review draf (data-audit konsisten, EXISTING vs PROPOSED jelas, present=id_ticket IS NOT NULL, legacy=id_ticket IS NULL, MIN-01 prerequisite, PII/financial verifier-only, DashboardQuery satu-satunya Query Layer, tanpa klaim production-ready, tanpa scope creep, tanpa fakta karangan)
4. STOP — tanpa implementasi, tanpa commit/push, tanpa migration, tanpa deploy, tanpa Sprint 2D architecture review, tanpa verification report. Menunggu instruksi berikutnya.