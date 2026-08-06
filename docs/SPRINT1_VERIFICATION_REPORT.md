# Sprint 1 Verification Report — Domain Foundation (Phase 2B)

**Project:** MZT Apps — Payment & Ticket Engine (Phase 2B)
**Sprint:** S1 — Domain (Migration + Enums + Models)
**Tanggal:** 2026-08-07 (JKT)
**Environment:** Production single-host `Dockerhost` (192.168.1.60), stack `/opt/mzt`
**Acuan:** `docs/PHASE_2B_IMPLEMENTATION_PLAN.md` (Approved, v1.0), Design Freeze v2.1.0-beta1

---

## Ringkasan Eksekutif

| Item | Hasil |
|---|---|
| Pipeline `mzt-deploy` | **SUCCESS** (build #26) |
| Migrasi Phase 2B (6 tabel) | **DONE — seluruhnya** |
| Skema vs PRD §16.5–16.9 / §20.13 | **PASS** (kolom & index cocok) |
| UUID & audit columns | **PASS** |
| Tidak ada FK ketat | **PASS** (hanya index — Audit-Gap §4 anomali #4) |
| Migration additive & idempotent | **PASS** (re-run: "Nothing to migrate") |
| Tidak ada artefak data uji | **PASS** (row count 0) |
| Regression Phase 2A | **PASS** (Health L1/L2 + endpoint hijau) |
| **Verdict** | **PASS — Sprint 1 COMPLETE** |

---

## 1. Commit & Push

| Repo | Commit | Push |
|---|---|---|
| `Misyad/laravel-mzt` (backend) | `63b074c` feat(phase2b): Sprint 1 domain foundation — Phase 2B tables, TicketStatus & PaymentMethod enums, models (15 files, +486) | `d20d3c3..63b074c` main → main |
| `Misyad/maziltu-design-studio` (frontend) | `961143f` docs(phase2b): design freeze v2.1.0-beta1 — payment/ticket PRD, implementation plan, release notes, ADR-016 (4 files, +12140) | `cb8feae..961143f` main → main |

Catatan: dua artefak docs korup di frontend (`Audit-Gap-Analysis-Phase-2B.md` kosong 2B, `ARCHITECTURE_GATE_Phase2B.md` encoding rusak) **dihapus** sebelum commit atas persetujuan Product Owner — tidak ikut ter-push.

Pipeline ter-trigger otomatis via `pollSCM (H/5)` pada frontend repo; build **#26** mulai 17:22 UTC (00:22 WIB), backend ditarik pada stage `Sync source` di commit `63b074c`.

## 2. Hasil Pipeline — mzt-deploy #26 (SUCCESS, 73.8 detik)

Urutan stage dieksekusi sesuai yang dipersyaratkan:

```
Validate host → Sync source → Build images
  → Backup database        ✔ (mzt_pre_migrate_20260807_002209.sql.gz + .json, 250 KB, valid)
  → Deploy stack           ✔ (backend/frontend/caddy/db up)
  → Migrate DB             ✔ (6 migration DONE)
  → Verify schema          ✔ (users audit cols + Phase 2A orders/events PASS)
  → Health check           ✔ (Level 1 HTTP 200, Level 2 success:true)
  → Prune                  ✔
```

Bukti log kunci (build #26):

```
INFO  Running migrations.
  2026_08_12_000001_create_payments_table ......................... 101ms DONE
  2026_08_12_000002_create_payment_proofs_table .................... 31ms DONE
  2026_08_12_000003_create_payment_logs_table ...................... 18ms DONE
  2026_08_12_000004_create_tickets_table ........................... 52ms DONE
  2026_08_12_000005_create_ticket_logs_table ....................... 18ms DONE
  2026_08_12_000006_create_communication_logs_table ................ 55ms DONE
```

Health check (dari log pipeline):
- Level 1: `mzt-backend-1 Up`, `mzt-caddy-1 Up`, `mzt-db-1 Up (healthy)`, `mzt-frontend-1 Up`; `/api/public/stats -> 200`
- Level 2: body `{"success":true,"data":{"event":4,"event_selesai":4,"event_mendatang":0,"total_anggota":950}}` → `grep "success":true` PASS

## 3. Hasil Migration (status)

`php artisan migrate --force --no-interaction` re-run → **`INFO Nothing to migrate.`** (idempotent).
`migrate:status` → seluruh 6 migrasi Phase 2B berstatus **[15] Ran**.

## 4. Hasil Schema Verification (information_schema)

### 4.1 Tabel terkonfirmasi ada (6/6)
`payments`, `payment_proofs`, `payment_logs`, `tickets`, `ticket_logs`, `communication_logs`

### 4.2 Kolom vs PRD — PASS
| Tabel | Konfirmasi |
|---|---|
| `payments` | id, uuid(36), nomor_payment, id_order, method(30), amount decimal(12,2), status(30), paid_at, verified_at, verified_by, reference_number, gateway_transaction_id, note, created_by, updated_by, timestamps — **sesuai PRD §16.5** |
| `payment_proofs` | id, uuid(36), id_payment, **file_path** (§16.6), original_name, mime_type, file_size, uploaded_by, uploaded_at — **sesuai PRD §16.6** |
| `payment_logs` | id, id_payment, old_status, new_status, note, changed_by, created_at — **sesuai PRD §16.7** |
| `tickets` | id, uuid(36), nomor_ticket, id_order, qr_payload, status(30), issued_at, expired_at, used_at, revoked_at, created_by, updated_by, timestamps — **sesuai PRD §16.8** |
| `ticket_logs` | id, id_ticket, old_status, new_status, note, changed_by, created_at — **sesuai PRD §16.9** |
| `communication_logs` | uuid, event, user_id, channel, provider, template, status, response, retry_count, created_at, delivered_at — **sesuai ADR-016 / PRD §20.13** |

### 4.3 Index vs PRD §16.14 / plan §7 — PASS
- `payments`: UNIQUE `uuid`, UNIQUE `nomor_payment`, index `id_order`, `status`, `method`, `paid_at`, `verified_at`
- `payment_proofs`: UNIQUE `uuid`, index `id_payment`
- `payment_logs`: index `(id_payment, created_at)`
- `tickets`: UNIQUE `uuid`, UNIQUE `nomor_ticket`, index `id_order`, `status`
- `ticket_logs`: index `(id_ticket, created_at)`
- `communication_logs`: UNIQUE `uuid`, index `user_id`, `status`, `created_at`

### 4.4 UUID & Audit columns — PASS
- UUID (char 36, UNIQUE) ada di `payments`, `payment_proofs`, `tickets`, `communication_logs` (PRD §16.12).
- `created_by`/`updated_by` ada di `payments` & `tickets` (ADR-006 / plan §1.2).
- Tabel log memakai `changed_by` + `created_at` sesuai PRD (bukan timestamps standar) — model diset `$timestamps = false`.

### 4.5 Tidak ada FK ketat — PASS
`information_schema.REFERENTIAL_CONSTRAINTS` untuk 6 tabel → **0 baris** (hanya index; Audit-Gap §4 anomali #4; tidak memecah admin web lama).

### 4.6 Additive & backward compatible — PASS
Tabel lama (`events`, `orders`, `m_transaksi_events`, `users`) tetap ada; Phase 2A verify stage lulus; tidak ada drop/rename/retipe. Model `Order` hanya **menambah** relasi `payments()`/`tickets()`.

## 5. Hasil Regression Check (Phase 2A)

| Endpoint | Hasil |
|---|---|
| `GET /api/public/stats` | 200, `{"success":true,...}` |
| `GET /api/public/events` | 200 |
| `GET /api/public/events/10` | 200 |
| `GET /api/public/news` | 200 |
| `GET /api/public/carousel` | 200 |
| `POST /api/login` (empty) | 422 JSON `{"success":false,"message":"id anggota wajib diisi..."}` |
| `POST /api/login` (bad creds) | 422 JSON `"ID Anggota atau password salah."` |
| `GET /api/me`, `/api/my-orders`, `/api/dashboard/stats` (no token) | 401 (auth gate aktif) |

Model & relasi terautoload (tinker, backend container):
`Payment->order/proofs/logs` ✓, `Ticket->order/logs` ✓, `Order->payments/tickets` ✓,
`TicketStatus::values()` = draft,issued,checked_in,finished,cancelled,revoked ✓,
`PaymentMethod::values()` = transfer,cash,qris,sponsor,complimentary ✓.

## 6. Artefak Data Uji

- Row count 6 tabel Phase 2B = **0** (tidak ada data uji).
- `storage/app` tidak berisi folder `payments/` (belum dibuat; Sprint 2) — hanya media produksi lama.

## 7. Screenshot / Log Penting

- Log pipeline lengkap: `/opt/mzt` … Jenkins `mzt-deploy` build **#26** (console log; ringkasan pada Bagian 2–3 di atas).
- Backup valid pra-migrasi: `backups/mzt_pre_migrate_20260807_002209.sql.gz` (+ metadata `.json` berisi `git_backend: 63b074c`, `git_frontend: 961143f`).

## 8. Verdict

**PASS** — seluruh Exit Criteria Sprint 1 terpenuhi:

1. ✔ Skema Phase 2B lulus Verify schema (6 tabel, kolom & index sesuai PRD §16).
2. ✔ Model & relasi terautoload (tinker).
3. ✔ Migration bersih: `migrate --force` idempotent ("Nothing to migrate"), status 6/6 Ran.
4. ✔ Additive & backward compatible; tanpa FK ketat; tanpa artefak data uji.
5. ✔ Pipeline #26 SUCCESS (Backup → Deploy → Migrate → Verify → Health L1/L2 → Prune).
6. ✔ Regression Phase 2A hijau (public + auth + 401 gate).

**Sprint 1 ditandai COMPLETE.** Sprint 2 (PaymentService + API) belum dimulai.

---

*Laporan dibuat dari verifikasi langsung di host 192.168.1.60 (docker compose exec + information_schema + curl).*
