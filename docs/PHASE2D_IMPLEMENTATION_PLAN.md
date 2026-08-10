# PHASE 2D — EMS OPERATIONAL MANAGEMENT (Implementation Plan)

## 0. Status & Sumber

| | |
|---|---|
| Fase | Phase 2D — EMS Operational Management (event-day ops) |
| Milestone | `v2.1.0-rc2` |
| Induk | PRD Payment §19.21 (Event Day Mode), §28.4 (Operational Dashboard), §19.11 (Attendance Monitoring), §17.12/§19.18 (Authorization); PRD EMS §13, §15, §22 |
| Prasyarat | `PHASE2D_PLANNING.md` ✓ · `PHASE2D_ARCHITECTURE_GATE_CLOSURE.md` → **READY FOR IMPLEMENTATION** ✓ (C-01, C-02, M-01, M-02, MIN-01 = PASS) |
| Database | `127.0.0.1:3306` `mazw9983_alvinade_maziltu` (instance backend `.env`) — `prisensi_kehadiran` 894 rows (100% legacy) |
| Aturan keras | Tanpa migration baru (kecuali terbukti perlu via benchmark + decision terpisah); tanpa backfill; tanpa deploy; **DashboardQuery satu-satunya read model**; tanpa business logic di `ApiController`; tanpa perubah PRD/ADR |

---

## 1. Scope Final — EMS Operational Management

Backend (read-only, `auth:sanctum`):

1. **Event-day overview per event** — daftar event + KPI hadir/legacy/gate ringkas.
2. **Participant list** (per event, search + pagination, PII di-gate verifier).
3. **Attendance summary** (per event/tanggal, canonical present = `id_ticket IS NOT NULL`).
4. **Gate monitoring** (per event/tanggal, groupBy gate, termasuk break-down per gate).
5. **Financial queue drill-down** — reuse `payments?event_id=&status=` (MIN-01 sudah aktif).

Frontend: halaman `dashboard/operations/{index, events/$id/attendees|attendance|gates}` + nav role-gated + masking PII.

---

## 2. Existing vs Proposed

### Existing (jangan diklaim baru)

- `DashboardQuery` 6 method; `DashboardService` 6 method; `DashboardPolicy` 8 ability; `DashboardController` 6 endpoint; `/attendance/*` & `/transactions/*` (ter-gate per M-01/M-02); `/checkin` (2C); frontend `dashboard/finance/*` + legacy `dashboard/attendance|transactions`.

### Proposed (baru, Phase 2D)

- 4 endpoint operational (`/dashboard/operations/*`), `OperationalController`, `OperationalPolicy` + `Support\Operational` marker, 2 DTO (`EventDay`, `ParticipantResult`), 4 Resource, interface +4 method, query layer +4 aggregator, frontend 4 halaman + service/query/types.
- Financial queue = kombinasi existing + filter aktif.

---

## 3. Backend Architecture (wajib)

```
OperationalController (tipis, read-only)          ← Gate: OperationalPolicy
   → DashboardServiceInterface (extended)
       → DashboardService                          (tanpa side-effect, murni map DTO)
           → DashboardQuery  (SATU-SATUNYA read model; NO Query class baru)
   → App\DTO\*                 (pure value objects)
   → App\Http\Resources\Dashboard\* → JSON
```

- Dilarang role check ad-hoc di controller; otorisasi hanya via Policy/Gate.
- `ApiController` **tidak** menerima logika baru (operational bukan di ApiController).
- Controller mencontoh `DashboardController` (map → authorize → resource).

---

## 4. DashboardQuery Contract (penambahan; inti no-N+1)

Method baru (semua mengembalikan array skalar/plain, tanpa Eloquent builder/collection/paginator):

- `operationalEvents(?start, ?end, ?eventId, ?status): array` → per event: `id_event, judul_event, tanggal_start, lokasi, kuota, present_count (id_ticket IS NOT NULL), legacy_count (id_ticket IS NULL), gate_count, latest_tgl`.
- `participants(?eventId, ?tgl, ?gate, ?q, ?page, ?perPage): array` → data rows: `id_anggota, nama, source (phase2c|legacy)` + `account_status (normal|orphan)`, `ticket status`, `gate`, `scanned_at`; meta: `total, page, per_page, filter`. **Pagination via `count` + `offset/limit`; join ke `users` utk nama (skip orphan dengan id_anggota tanpa match → labeled orphan).**
- `attendanceSummary(?eventId, ?tgl): array` → `present` (canonical), `legacy_count`, `total`, `per_tanggal`.
- `gateMonitoring(?eventId, ?tgl): array` → groupBy `gate`: `gate, present, legacy, total` + `breakdown_per_gate`.

Prinsip: gunakan index existing `(id_event, id_tanggal)` & `id_ticket`; semua groupBy/count di DB, tidak ada eager-relasi/loop-query dalam skala besar.

---

## 5. DTO / Service / Policy / Resource / Controller

- **DTO (baru):** `EventDay` (aggregate per event), `ParticipantResult` (rows + meta), `AttendanceSummary`, `GateMonitoring`; reuse `DashboardFilter` (tambah optional `search`, `page`, `perPage` via DTO baru `ParticipantFilter` pure, diimplementasikan saat implementasi).
- **Interface (`DashboardServiceInterface`):** + `operationalEvents(DashboardFilter)`, `participants(ParticipantFilter)`, `attendanceSummary(DashboardFilter)`, `gateMonitoring(DashboardFilter)`.
- **Policy:** `OperationalPolicy` (subject `App\Support\Operational` marker, mirip `Dashboard`): `viewOperational → isStaff`; `viewParticipantPII → canVerify`; `viewFinancialQueue → canVerify`. Daftarkan di `AuthServiceProvider` (`Operational::class => OperationalPolicy::class`).
- **Controller:** `OperationalController` (baru): `events`, `attendees`, `attendance`, `gates`. Attendees: gating PII per-resource (variants agregat vs PII).
- **Resource:** `OperationalEventsResource`, `ParticipantResource` (varian agregat/PII), `AttendanceSummaryResource`, `GateMonitoringResource`.

---

## 6. API Contract (PROPOSED — belum live sampai verification)

| Method | Route | Policy | Query params |
|---|---|---|---|
| GET | `/dashboard/operations/events` | `viewOperational` | `start, end, event_id, status` |
| GET | `/dashboard/operations/events/{event}/attendees` | `viewOperational` (+PII jika `viewParticipantPII`) | `tgl, gate, q, page, per_page` |
| GET | `/dashboard/operations/events/{event}/attendance` | `viewOperational` | `tgl` |
| GET | `/dashboard/operations/events/{event}/gates` | `viewOperational` | `tgl` |
| GET | `/dashboard/finance/payments?event_id=&status=` | `viewPayment` (existing) | reuse |

- Semua di dalam `Route::middleware('auth:sanctum')`, blok baru `// Phase 2D — EMS Operational Management`. Respons envelope konsisten `{success, data}`.

---

## 7. Frontend Architecture & Routes

- **Pattern:** konvensi existing — `createFileRoute("...")` + `component` + `useQuery` (TIDAK menambah loader; tetap komponen-useQuery).
- **Service:** `src/services/mzt-api.ts` + `fetchOperationalEvents`, `fetchParticipants(event, params)`, `fetchAttendanceSummary`, `fetchGateMonitoring`.
- **Queries:** `src/services/queries.ts` + queryKey (`["dashboard","operations",...]`) & `queryOptions`; tidak ada mutation → tidak perlu invalidate baru (konsisten dgn finance).
- **Types:** `src/types/api.ts` + `OperationalEvent`, `Participant` (PII/aggregate variants), `AttendanceSummary`, `Gate`.
- **Halaman baru:** `src/routes/dashboard/operations/{index.tsx}` (overview), `events/$id/attendees.tsx` (search + pagination), `events/$id/attendance.tsx`, `events/$id/gates.tsx`.
- **Nav:** `src/routes/dashboard/route.tsx` NAV_ITEMS + entri `to:"/dashboard/operations"` roles `["dashboard","event","finance","ketua","admin"]` (isStaff) — `prisensi` tidak ikut (bukan staff; konsisten `isStaff()`).
- **PII masking:** halaman attendees hanya menampilkan nama/id kontak bila role verifier (dari `/user` roles); non-verifier melihat agregat + label.

---

## 8. Canonical Present Definition

- **present** = `prisensi_kehadiran.id_ticket IS NOT NULL` (scan QR Phase 2C). Satu-satunya definisi; respon flag per-row `source: "phase2c"|"legacy"`.
- **legacy** = `id_ticket IS NULL`, dihitung terpisah, selalu berlabel "historical/legacy"; tidak pernah di-merge dengan present.
- Orphan (`id_anggota` tanpa akun `users`) → `account_status: "orphan"`, ditampilkan apa adanya menurưt data (tidak dihapus).

---

## 9. Legacy Attendance Handling

- Endpoint existing `/attendance/{eventId}/{tanggalId}` (role prisensi di UI) tetap, di-gate `viewAttendance = isStaff` (M-01, PASS) — TIDAK direfactor/dipindah.
- Operational pages TIDAK menggantikan legacy page; keduanya coexist: legacy read `prisensi_kehadiran` tanpa filter source; operational menambahkan split `source` + gate monitoring.
- `transactionsIndex` tetap (M-02 PASS), financial queue dibangun di atas `payments` baru, bukan di `ApiController`.

---

## 10. PII / Financial Authorization Matrix

| Kemampuan | Staff (dashboard/event/finance/ketua/admin) | Verifier (finance/ketua/admin) | Alumni | Unauthenticated |
|---|---|---|---|---|
| Ringkasan aggregate (overview, attendance, gates) | ✅ | ✅ | ❌ | 401 |
| PII peserta (nama, id_anggota, kontak) | ❌ | ✅ | ❌ | 401 |
| Financial queue / drill-down finansial | ❌ | ✅ | ❌ | 401 |

- Implementasi: `OperationalPolicy` (viewOperational/viewParticipantPII/viewFinancialQueue) + `DashboardPolicy::viewPayment` existing. Response tidak pernah mengekspos field PII/finansial utk role tanpa hak.

---

## 11. Testing Matrix

Endpoints baru + existing:

- 401 unauthenticated (semua operational + finance payments)
- 403 alumni (semua), 403 staff non-verifier utk `viewParticipantPII` & financial queue
- 200 staff → respons agregat **tanpa** PII/finansial
- 200 verifier → + PII/financial
- Pagination meta benar (`total`, `page`, `per_page`)
- Present-definition: seeder 2C (`id_ticket` non-null) vs legacy → hanya 2C jadi `present`
- MIN-01: `event_id`/`status` mempengaruhi hasil (sudah PASS di review)
- Format fixture: mirror `CheckInTest` buildSchema untuk `prisensi_kehadiran` (11 kolom produksi), `users`, `orders`, `payments`, `tickets`, `events`, `tanggal_events`
- No-N+1: `assertQueryCount` (atau setara) pada attendees/attendance/gates

---

## 12. Performance Gate

- Target tiap endpoint <500 ms (operational events, attendance, participant, gate monitoring) pada dataset audit (894 legacy + kontraktor terkecil).
- Nol N+1 (assertions).
- Pagination wajib (default `per_page=25–50`).
- Pakai index existing `(id_event, id_tanggal)` & `id_ticket`; **tambah index/migration HANYA jika benchmark membuktikan kebutuhan** (+ keputusan terpisah).

---

## 13. Deployment & Verification Sequence

1. Implementasi backend (contract → query → service → policy → controller → routes → resources).
2. Feature tests (matriks §11) hijau + benchmark gate.
3. Implementasi frontend (types → api → queries → pages → nav → masking).
4. Build/typecheck frontend + validasi rut terkait (tanpa deploy).
5. Verification report (draf terpisah) — memuat angka: LegacyGateTest 6/23, DashboardTest 11/62; verification produksi run optional DB produksi (M-03) — di luar scope ini (butuh kredensial).
6. **No deploy tanpa decision terpisah.**

---

## 14. Acceptance Criteria

- Semua endpoint operational: 401/403/200 per matriks → PASS.
- PII & financial hanya verifier; response tanpa bocor field utk role tanpa hak.
- Present hanya dari `phase2c`; legacy ter-label; orphan ter-flag.
- Pagination + meta correct; zero N+1; <500 ms per endpoint.
- MIN-01 filters aktif; dashboard existing tetap hijau.

---

## 15. Exit Criteria

- Backend tests hijau (matriks §11) + benchmark PASS.
- Frontend pages build & run, nav hanya utk role berhak.
- Self-review: EXISTING vs PROPOSED dipisah; DashboardQuery satu-satunya read model; tidak ada query class baru; tidak ada migration baru (kecuali evidence); tidak ada business logic di ApiController; tanpa over-claim production-ready.
- Dokumen ini selesai + verification report (terpisah). **STOP, tanpa commit/push/deploy.**

---

## 16. Out of Scope (eksplisit)

Email/WhatsApp/Push/Broadcast/Reminder/Campaign; AI; caching; advanced analytics; CSV/XLSX export (→ 5B.2); perubahan ticket state-machine & `checked_in→finished`; refactor `ApiController`; migration baru tanpa evidence+decision; backfill/normalisasi data legacy; deploy produksi; verifikasi DB produksi (M-03) tanpa decision terpisah; implementasi "Event Day Mode" full (hanya read model 2D).