# PHASE 2D — ARCHITECTURE GATE CLOSURE
**C-01 · C-02 · M-01 · M-02 · MIN-01 · M-03 — READ-ONLY**

## Metadata
| | |
|---|---|
| Repo backend | `laravel-mzt` HEAD `4427461` == `origin/main` |
| Repo frontend | `maziltu-design-studio` HEAD `3073017` == `origin/main` |
| DB audit | `127.0.0.1:3306` / `mazw9983_alvinade_maziltu` (MariaDB 10.4) — instance `.env` |
| Kemajuan arsitektur | APPROVED WITH CONDITIONS — 78/100 |
| Batasan | Tanpa kode/migration/deploy/PRD/ADR; tanpa fix; tanpa commit/push |

---

## Executive Summary

Gate closure dilakukan read-only untuk melock status 5 blocker sebelum implementation gate dibuka. Hasil kunci: **(C-01) hotfix `70f26f7` TIDAK ada di git** dan source `CheckInService.php` **masih** `format('H:i:s')` → bug 1292 akan terulang begitu check-in produksi aktif. **(C-02) schema drift nyata** antara migration vs produksi pada `jam_kehadiran`, `id_user`, `id_anggota`, `id_tanggal` — dan DB `testing` (dipakai phpunit) mengikuti migration, bukan produksi. **(M-01/M-02) dua endpoint legacy (`/attendance/*`, `/transactions/*`) mengekspos PII & transaksi finansial tanpa gate** — alumni dapat membaca lewat API. **(MIN-01) `eventId`/`status` dikonfirmasi masih tidak dikonsumsi** oleh `DashboardService`/`DashboardQuery`. **(M-03) DB audit kosong untuk data 2B/2C** → acceptance wajib produksi.

Karena seluruh keputusan **belum dieksekusi** dan sebagian (C-01 fix, C-02 canonical) masih menunggu arahan eksplisit, **implementation gate tetap TERTUTUP**.

> **UPDATE — POST-GATE REVIEW (Gate Review berikutnya, implementation verified).**
> Kelima blocker **PASS** berdasarkan review evidence source & DB aktual: **C-01 = PASS** (`CheckInService` `Y-m-d H:i:s`, fixture `timestamp`, tidak ada `H:i:s` murni tersisa di jalur check-in). **C-02 = PASS untuk acceptance fixture/schema** (fixture `CheckInTest` kini memirror 11 kolom `prisensi_kehadiran` produksi); **drift migration ↔ production tetap dicatat sebagai technical debt/open item** (migration tidak diamandemen, tanpa backfill). **M-01 = PASS**, **M-02 = PASS**, **MIN-01 = PASS**. Regression: `LegacyGateTest` 6 tes / 23 assertions PASS; `DashboardTest` 11 tes / 62 assertions PASS (termasuk sentinel filter); Full Feature suite 32 tes / 131 assertions dengan 1 **pre-existing failure** (`ExampleTest`) yang **tidak dihitung sebagai regresi**. **Implementation Gate → READY FOR IMPLEMENTATION.** (Detail di section **Post-Gate Review** di bawah.)

---

## C-01 Decision — Hotfix Check-In

**EXISTING FACT (verified langsung):**
- `git -C laravel-mzt cat-file -t 70f26f7` → `fatal: Not a valid object name 70f26f7`; pencarian pesan commit `70f26f7|jam_kehadiran|1292|22007` → kosong. Frontend serupa.
- `HEAD == origin/main` kedua repo → bukan masalah local-lag.
- `app/Services/CheckInService.php:98` → `'jam_kehadiran' => $scannedAt->format('H:i:s')` (belum berubah).
- Migration `2023_07_05_040953` → `jam_kehadiran` = `time`.
- **Skema produksi** → `jam_kehadiran timestamp NOT NULL DEFAULT current_timestamp()`.
- Laporan Phase 2C mengklaim fix `Y-m-d H:i:s` di commit `70f26f7` + fixture test diubah ke `timestamp` — klaim **tidak dapat direproduksi dari source**.
- `tests/Feature/CheckInTest.php` fixture → `$table->time('jam_kehadiran')` (masih `time`, menyamai migration, **bukan** produksi).
- `phpunit.xml` → `DB_DATABASE=testing`; DB `testing` punya `jam_kehadiran time` → **test gagal menangkap bug produksi** (false green).

**Impact:** Pada sql_mode produksi (MariaDB 11.4 strict), menulis `'H:i:s'` ke kolom `timestamp` → `SQLSTATE[22007] 1292` → HTTP 500 → tidak ada data present 2C → dashboard 2D kosong permanen.

**Decision (PROPOSED):** `format` canonical mengikuti **schema produksi**: `Y-m-d H:i:s`. Keputusan eksplisit diminta dari user sebelum implementasi. Tidak ada fix kode dalam tahap ini.

**POST-GATE VERIFICATION → C-01 = PASS**
- `app/Services/CheckInService.php:98` → `'jam_kehadiran' => $scannedAt->format('Y-m-d H:i:s')` (canonical produksi).
- `tests/Feature/CheckInTest.php:157` → `$table->timestamp('jam_kehadiran')->useCurrent()` (fixture kini `timestamp`, bukan `time`).
- Scan seluruh `app/`: semua penulisan `jam_kehadiran` memakai `Y-m-d H:i:s` (`CheckInService:98`, `ApiController.php:1127` legacy); tidak tersisa `H:i:s` murni di jalur check-in.

---

## C-02 Decision — Schema Drift

**EXISTING FACT (information_schema vs migration `2023_07_05_040953`):**

| Kolom | Migration | Produksi | DB `testing` |
|---|---|---|---|
| `id_anggota` | `int` | `varchar(255) NOT NULL ''` | `int(11)` |
| `id_user` | `timestamp` | `bigint(20) NOT NULL 0` | `timestamp` |
| `tanggal_kehadiran` | `timestamp` | `timestamp` | `timestamp` |
| `jam_kehadiran` | `time` | `timestamp NOT NULL cur_ts` | `time` |
| `id_tanggal` | `int` | `bigint(20) NULL` | `int` |
| `id_ticket` (2C) | — | `bigint unsigned NULL` (idx) | `bigint unsigned NULL` |

**Impact:** Migration & DB `testing` TIDAK merepresentasikan produksi → CI hijau ≠ produksi aman. Kolom yang disentuh Check-In/2D (`id_anggota`, `id_tanggal`, `jam_kehadiran`, `id_ticket`, `gate`) drift pada 2 kolom.

**Decision:** **Schema produksi = canonical** (sumber kebenaran; audit DB produksi membuktikan). Migration perlu **diamandemen agar menerima produksi** (tanpa menjalankan migration apa pun, tanpa backfill) — butuh keputusan terpisah kapan migrasi schema diluruskan. Untuk fase ini: fixture test wajib dimirror ke schema produksi dulu.

**POST-GATE VERIFICATION → C-02 = PASS (acceptance fixture/schema); drift tetap dicatat**
- Fixture `tests/Feature/CheckInTest.php` kini memirror **11 kolom `prisensi_kehadiran` produksi**: `id_tanggal bigint NULL`, `id_anggota varchar default ''`, `id_user bigint default 0`, `tanggal_kehadiran timestamp NULL`, `jam_kehadiran timestamp useCurrent`, `id_ticket bigint unsigned NULL`, `gate varchar(100)`, `scanned_at datetime`, `scanned_by bigint unsigned` — divalidasi ulang terhadap `information_schema.COLUMNS` DB produksi.
- **OPEN ITEM / technical debt:** migration `2023_07_05_040953` **tidak diamandemen** (tidak ada perubahan di git status) — drift migration ↔ production (`jam_kehadiran time` vs `timestamp`, `id_anggota int` vs `varchar`, `id_user timestamp` vs `bigint`, `id_tanggal int` vs `bigint`) **tetap tercatat**. Tidak ada migration baru, tidak ada backfill.

---

## M-01 Decision — Legacy Attendance PII

**EXISTING FACT (verified):**
- Route `routes/api.php:121` → `GET /attendance/{eventId}/{tanggalId}` = **`auth:sanctum` saja**, tanpa policy/gate.
- `ApiController::attendanceIndex` (1065–1082) → ambil rows `prisensi_kehadiran` + `with('dataUser:id,id_anggota,name')` → responsa `data[].dataUser.nama` + `id_anggota` penuh.
- Frontend hanya menyembunyikan menu (role `prisensi`), **API tidak menggating** → alumni (`anggota`) bisa langsung `GET /api/attendance/{e}/{t}` dan membaca nama/id_anggota semua peserta.

**Decision (PROPOSED hardening, tidak dieksekusi):** tambah policy/gate `viewAttendancePII` (atau `isStaff`) pada endpoint; non-verifier → **403**. Wajib disertai regression test 403 alumni dan 200 staff.

**EXECUTED — POST-GATE VERIFICATION → M-01 = PASS**
- `ApiController::attendanceIndex` (API updated) → `Gate::forUser($request->user())->authorize('viewAttendance', Dashboard::class)`; `DashboardPolicy::viewAttendance` → `RoleGuard::isStaff()`.
- Matriks: unauthenticated → **401**; alumni (`anggota`) → **403**; staff berhak (`dashboard`/`event`/`finance`/`ketua`/`admin`) → **200**.
- Legacy attendance **tetap berfungsi**: test 200 me-seed rows `prisensi_kehadiran` sebelum request dan mengembalikan `success:true` (data legacy tetap dirender).

---

## M-02 Decision — Legacy Financial

**EXISTING FACT (verified):**
- Route `routes/api.php:129` → `GET /transactions/{eventId}` = **`auth:sanctum` saja**.
- `ApiController::transactionsIndex` (1141–1157) → `Transaksi_event` + `dataUser.nama` → data transaksi finansial legacy terbuka ke semua login.

**Decision (PROPOSED):** ability `viewFinancialQueue`/`viewPayment` (`RoleGuard::canVerify`):
- unauthenticated → **401**
- non-verifier (staff/event/prisensi/alumni) → **403**
- finance/ketua/admin → **200**

**EXECUTED — POST-GATE VERIFICATION → M-02 = PASS**
- `ApiController::transactionsIndex` (API updated) → `Gate::forUser($request->user())->authorize('viewTransactions', Dashboard::class)`; `DashboardPolicy::viewTransactions` → `RoleGuard::canVerify()` (`finance`/`ketua`/`admin`).
- Matriks: unauthenticated → **401**; non-verifier (`dashboard`/`event`/`prisensi`/`anggota`) → **403**; verifier (`finance`/`ketua`/`admin`) → **200**.
- Legacy transactions **tetap berfungsi**: test 200 me-seed rows `m_transaksi_events` sebelum request dan mengembalikan `success:true`.

---

## MIN-01 Status

**EXISTING FACT (verified langsung di source):**
- `DashboardFilter` → punya (start, end, **eventId**, **status**).
- `DashboardController::map()` → membaca `event_id` & `status` dari request ke DTO.
- `DashboardService` → keenam method hanya meneruskan **`$filter->start, $filter->end`** (baris 33,47,59,69,79,89).
- `DashboardQuery::orderQuery/paymentQuery/ticketQuery` → hanya `whereDate(created_at,…)`.

**Status: KONFIRMASI OPEN.** `eventId`/`status` masih dibuang di layer service; semua query global tanpa filter.

**Required change (PROPOSED, minimal):** terima `eventId`/`status` di `DashboardQuery::orderQuery/paymentQuery/ticketQuery` (filter pada `orders.id_event`, `payments.status`, `tickets.status` + event) dan map ulang melalui service; tambahkan sentinel test yang membuktikan perubahan hasil.

**EXECUTED — POST-GATE VERIFICATION → MIN-01 = PASS**
- `DashboardQuery`: `orderQuery` menerima `eventId` → filter `orders.id_event`; `paymentQuery`/`ticketQuery` menerima `eventId` (via `whereHas('order')`) + `status` (filter `payments.status`/`tickets.status`). Semua method publik (`overview/registration/revenue/payments/tickets/operational`) meneruskan `eventId`/`status`.
- `DashboardService`: keenam method kini meneruskan `$filter->eventId`/`$filter->status`.
- **Sentinel test PASS:** `DashboardTest#test_event_and_status_filters_change_results` — `?event_id=1` menurunkan `total_orders` 3→2; `?status=paid` membatasi `revenue.total_paid`; `?status=confirmed` membatasi `registration.total_orders` 3→2.
- **Tanpa N+1:** query agregat/clone + `whereHas` (subquery), tidak ada eager-load/loop-query.

---

## M-03 Decision — Dataset Audit

**EXISTING FACT (audit):** `orders=0`, `tickets=0`, `prisensi_kehadiran=894` (100% legacy, `id_ticket IS NULL` = 0 untuk 2C). User yatim 10 (event 5/6 orphan), 6 `id_tanggal` tanpa referensi.

**Decision:** Acceptance Phase 2D **tidak** boleh bergantung dataset audit. Production verification **wajib** berjalan di DB produksi (`192.168.1.60`, akses terbatas — butuh kredensial). Live verification menunggu itu.

---

## Evidence (rangkuman)
| ID | Bukti langsung |
|---|---|
| C-01 | `git cat-file -t 70f26f7` invalid (2 repo); `CheckInService.php:98` `H:i:s`; produksi `jam_kehadiran timestamp`; `CheckInTest` `time`; `phpunit.xml` DB=testing |
| C-02 | `information_schema.COLUMNS` (produksi vs testing) + migration `2023_07_05…` |
| M-01 | `routes/api.php:121` (auth only) + `ApiController.php:1065` |
| M-02 | `routes/api.php:129` (auth only) + `ApiController.php:1141` |
| MIN-01 | `DashboardService.php` semua method hanya `start/end`; `DashboardQuery` tanpa filter event/status |
| M-03 | Query audit 07–08 Agu (orders/tickets/id_ticket-non-null = 0) |

---

## Post-Gate Review — Implementation Verified (PASS)

Gate review ulang dilakukan terhadap source aktual (`laravel-mzt`) setelah 5 blocker dieksekusi. Seluruh evidence diverifikasi langsung, bukan klaim.

| Blocker | Checklist | Verifikasi | Status |
|---|---|---|---|
| **C-01** | `Y-m-d H:i:s` di jalur check-in | `CheckInService.php:98` = `format('Y-m-d H:i:s')`; `ApiController.php:1127` (legacy) sama; scan seluruh `app/` tidak tersisa `H:i:s` murni utk `jam_kehadiran` | **PASS** |
| **C-01** | CheckInTest fixture `timestamp` | `CheckInTest.php:157` = `$table->timestamp('jam_kehadiran')->useCurrent()` | **PASS** |
| **C-02** | Fixture/test schema merepresentasikan produksi | 11 kolom `prisensi_kehadiran` fixture == produksi (uraian di section C-02) | **PASS** |
| **C-02** | Drift migration↔production dicatat | Migration **tidak** diamandemen; drift tetap **open item / technical debt**; tanpa migration/backfill | **PASS (open item)** |
| **M-01** | 401 / 403 alumni / 200 staff | Gate `viewAttendance` (`isStaff`); `LegacyGateTest` 401/403/5×200 (staff + seed rows) | **PASS** |
| **M-02** | 401 / 403 non-verifier / 200 verifier | Gate `viewTransactions` (`canVerify`); test 401/403×4/200×3 | **PASS** |
| **M-01/M-02** | Legacy tetap berfungsi | Test 200 me-seed data legacy dan mengembalikan `success:true` | **PASS** |
| **MIN-01** | `event_id` benar-benar memfilter hasil | Sentinel: `?event_id=1` → `total_orders` 3→2; `total_revenue` 3→2×100k | **PASS** |
| **MIN-01** | `status` benar-benar memfilter hasil | Sentinel: `?status=paid` membatasi `total_paid`; `?status=confirmed` membatasi `registration.total_orders` | **PASS** |
| **MIN-01** | Sentinel test PASS | `DashboardTest#test_event_and_status_filters_change_results` PASS | **PASS** |
| **MIN-01** | Tanpa N+1 / regression | Agregat+`whereHas` (subquery), tidak ada eager/loop; DashboardTest 11 tes PASS | **PASS** |

### Hasil Test (angka)

| Suite | Hasil |
|---|---|
| `tests/Feature/LegacyGateTest` (M-01+M-02) | **6 tests / 23 assertions PASS** |
| `tests/Feature/DashboardTest` (termasuk sentinel MIN-01) | **11 tests / 62 assertions PASS** |
| Suite Check-In (`CheckInTest` dkk.) | **PASS** (sudah tercakup di full suite) |
| Full Feature suite | **32 tests / 131 assertions — 1 failure** |
| `ExampleTest` (`GET /`) | **PRE-EXISTING FAILURE — dipisahkan, bukan regresi.** Gagal dengan stacktrace identik ketika perubahan query di-`stash` (`ExampleTest.php:19`, butuh seed DB homepage). Tidak dihitung dalam verdict. |

### Open Items / Follow-up (di luar scope review; tidak di-block di sini)

- **M-03 / production acceptance dataset** — belum diverifikasi dalam scope ini; acceptance Phase 2D wajib berjalan di DB produksi (`192.168.1.60`, akses terbatas). Tetap dicatat sebagai follow-up terpisah.
- **Migration ↔ production drift** — technical debt terbuka (C-02); amandemen migration menunggu keputusan terpisah; tanpa backfill.

---

## Required Changes — Status Eksekusi
1. **C-01**: ✅ **DONE** — `CheckInService` `Y-m-d H:i:s`; fixture `CheckInTest` → `timestamp`; tidak ada `H:i:s` murni tersisa.
2. **C-02**: ⚠️ **SEBAGIAN** — fixture mirror produksi ✅; amandemen migration **belum** (open item, menunggu keputusan terpisah); tanpa backfill.
3. **M-01**: ✅ **DONE** — gate `GET /attendance/*` (`viewAttendance`) + test 403/200.
4. **M-02**: ✅ **DONE** — gate `GET /transactions/*` (`viewTransactions`) + test 401/403/200.
5. **MIN-01**: ✅ **DONE** — `eventId`/`status` dikonsumsi di query layer + sentinel test.
6. **M-03**: ⏳ **BELUM** — verifikasi produksi wajib DB produksi; dicatat sebagai follow-up terpisah.

## Acceptance Criteria (rencana, saat implementasi)
- Semua endpoint 2D baru: 401/403/200 per matriks; PII & financial hanya verifier; zero N+1; <500 ms.
- Sentinel filter `event_id`/`status` mengubah hasil.
- Canonical present (id_ticket non-null) dihitung; legacy di-label, tidak di-merge.
- Regression suite lama tetap hijau (DashboardTest/CheckInTest dengan schema produksi).

## Implementation Gate
**READY FOR IMPLEMENTATION.** Gate review ulang menuntup 5 blocker: C-01 = PASS, C-02 = PASS (acceptance fixture/schema; drift migration tetap open item), M-01 = PASS, M-02 = PASS, MIN-01 = PASS; regression penuh hijau (ExampleTest = pre-existing, tidak dihitung). Semua hal di atas **belum** dieksekusi lagi dalam review ini (tanpa implementasi EMS Phase 2D, tanpa endpoint operational baru, tanpa migration/backfill/deploy).

## Final Verdict
**READY FOR IMPLEMENTATION** — kelima blocker terselesaikan dan diverifikasi dari source aktual. Siap untuk fase implementasi EMS Phase 2D berikutnya. Item terbuka yang tetap di-lock sebagai follow-up: amandemen migration (C-02), M-03 production acceptance dataset.

---

*Phase 2D Architecture Gate Closure — implementasi verified, READY FOR IMPLEMENTATION. Tanpa implementasi EMS Phase 2D lebih lanjut, tanpa migration/backfill/deploy/commit/push. Menunggu instruksi berikutnya.*