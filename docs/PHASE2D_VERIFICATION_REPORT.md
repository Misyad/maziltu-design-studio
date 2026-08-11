# Phase 2D Production Verification Report

## 1. Executive Summary

Phase 2D was deployed through Jenkins `mzt-deploy` build **#57** (SUCCESS). The backend runtime is commit `841ccfa5c40996bdee611db8017e83f5419e1a5d`. The frontend runtime is commit `137cd957311b47379c3cfaa700888b5db53413d3`; its application payload is identical to the Phase 2D frontend baseline `d9be9c770bbc79845aed71749931c6af8ed84630`, with the intervening commits limited to `deploy/Jenkinsfile`.

Authenticated verification was executed against production in two stages:

1. **Live staff verification** with an existing active staff account (id 25, id_anggota `0002162323`, roles `dashboard`/`event`/`prisensi`, non-verifier) against populated legacy data (event 11, 500 legacy attendees).
2. **Isolated smoke-data verification** (operator-approved, API-issued) with a temporary verifier account (finance role) and a temporary alumni/participant account, a dedicated free smoke event, and one smoke order + ticket. All smoke identities were fully removed afterwards; every baseline count was restored.

Every previously open acceptance item is now covered:

- Staff RBAC 200 on all four operational endpoints; verifier RBAC 200.
- Alumni (member-only roles) 403 across operational endpoints, M-01, M-02, revenue, and owner check-in.
- Non-verifier PII masking **and** verifier PII visibility (proven against the same rows).
- MIN-01: dashboard `event_id`/`status` filters produce observable result changes.
- Positive check-in 200 and duplicate scan 409 (with first-scan payload).
- Present (Phase 2C) attendance path end-to-end: ticket → attendance row → operational counts/gates breakdown reflect it.

**Verdict: PHASE 2D — COMPLETE.**

## 2. Release Identity

| Component | Release identity | Evidence | Status |
|---|---|---|---|
| Backend | `841ccfa5c40996bdee611db8017e83f5419e1a5d` | Host `HEAD == origin/main`; runtime routes present | PASS |
| Frontend | `137cd957311b47379c3cfaa700888b5db53413d3` | Host `HEAD == origin/main`; runtime route bundles present | PASS |
| Original frontend application baseline | `d9be9c770bbc79845aed71749931c6af8ed84630` | Diff to deployed release changes only `deploy/Jenkinsfile`; application paths have zero diff | PASS |

The deployed frontend release identity is intentionally `137cd95`; no rollback or hash-only release commit was created.

## 3. Deployment Evidence

Jenkins build **#57**:

- Result: `SUCCESS`
- Backend sync identity: `841ccfa5c40996bdee611db8017e83f5419e1a5d`
- Frontend sync identity: `137cd957311b47379c3cfaa700888b5db53413d3`
- Migration stage: `Nothing to migrate`
- Health stage: `/api/public/stats` HTTP 200, `success:true`

Historical blockers were not hidden:

- Build #54 reported SUCCESS after a failed backend SSH pull and retained stale backend commit `2276282`.
- Builds #55 and #56 failed closed before deployment.
- Build #56 produced a zero-byte backup and exposed the database credential in the Jenkins console.
- Source-sync and backup gate hardening were subsequently implemented and proven by build #57.

## 4. Backup Gate

Build #57 evidence:

| Check | Actual | Status |
|---|---:|---|
| `mariadb-dump` exit | 0 | PASS |
| Dump stdout | 2,136,813 bytes | PASS |
| Dump stderr | 0 bytes | PASS |
| Gzip | exit 0 | PASS |
| Gzip integrity | valid | PASS |
| `event_status` marker | present | PASS |
| Atomic final rename | completed | PASS |
| Final artifact | 257,441 bytes | PASS |

Artifact: `/opt/mzt/backups/mzt_pre_migrate_20260811_065634_57_58082.sql.gz`.

## 5. Runtime Evidence

- Production entrypoint: `http://192.168.1.60:3015`
- Backend, frontend, worker, database, and Caddy containers running; database container healthy.
- Backend host `HEAD == origin/main == 841ccfa`; frontend host `HEAD == origin/main == 137cd95`.
- `GET /api/public/stats`: HTTP 200, `success:true`.

## 6. Backend Routes

Runtime `php artisan route:list --path=operations` returned four routes:

1. `GET api/dashboard/operations/events`
2. `GET api/dashboard/operations/events/{event}/attendance`
3. `GET api/dashboard/operations/events/{event}/attendees`
4. `GET api/dashboard/operations/events/{event}/gates`

Unauthenticated probes to all four returned HTTP 401.

## 7. Frontend Runtime

- `/dashboard/operations` returned HTTP 307 to `/login`, proving the authenticated route is recognized.
- Runtime assets contain operations, attendees, attendance, and gates bundles.
- Application payload is equivalent to `d9be9c7`; additional commits contain deployment pipeline changes only.

## 8. RBAC Matrix

Live account used: id 25 (id_anggota `0002162323`, roles `dashboard`/`event`/`prisensi`, non-verifier). Smoke accounts: verifier (`anggota`/`profil`/`finance`) and alumni/participant (`anggota`/`profil`).

| Role/case | Expected | Actual | Status |
|---|---:|---:|---|
| Unauthenticated operational events / attendees / attendance / gates | 401 | 401 | PASS |
| Staff events | 200 | 200 | PASS |
| Staff attendees | 200 | 200 | PASS |
| Staff attendance summary | 200 | 200 | PASS |
| Staff gate monitoring | 200 | 200 | PASS |
| Alumni operational events / attendees / attendance / gates | 403 | 403 | PASS |
| Alumni M-01 attendance | 403 | 403 | PASS |
| Alumni M-02 transactions | 403 | 403 | PASS |
| Alumni revenue (dashboard finance) | 403 | 403 | PASS |
| Alumni check-in (ticket owner) | 403 | 403 `Forbidden` | PASS |
| Verifier (smoke `finance`) operational endpoints | 200 | 200 | PASS |
| Verifier M-01 attendance | 200 | 200 | PASS |
| Verifier M-02 transactions | 200 | 200 | PASS |
| Verifier revenue | 200 | 200 | PASS |
| Staff (non-verifier) revenue | 403 | 403 | PASS |

`finance`, `ketua`, and `admin` share the single `RoleGuard::canVerify` branch (`['finance','ketua','admin']`), so the verifier path is exercised by the smoke `finance` account covering that branch. Two pre-existing token files (from earlier attempts) returned HTTP 401 from `/api/user` and were not used.

## 9. Operational Events

Authenticated `GET /api/dashboard/operations/events` (staff) returned 200 with full payload (`id_event`, `judul_event`, `tanggal_start`, `lokasi`, `kuota`, `present_count`, `legacy_count`, `gate_count`, `latest_tgl`); no financial fields present, matching the read-only operational contract.

Populated live rows (identity-neutral):

| id_event | judul_event | present | legacy | gates | latest_tgl |
|---|---:|---:|---:|---:|---|
| 11 | Multaqo Sanawi 8 | 0 | 500 | 0 | 2024-10-19 15:27:23 |
| 14 | Multaqo Sanawi 9 | 0 | 373 | 0 | 2025-10-11 14:52:19 |

After the smoke check-in, the smoke row showed `present=1`, `legacy=0`, `gate=1`, `latest_tgl=2026-08-11 05:48:35` (present-count contract proven; smoke data removed afterwards).

## 10. Participants

Live (event 11, 500 legacy attendees, staff):

- `meta`: `total=500`, `page=1`, `per_page=25`, `last_page=20`, `filter{event_id,tgl,gate,q}`; 25 rows/page.
- Server-side search `q=ahmad` narrowed `total` to 45; `page=2` returned 25 rows with `meta.page=2`.

Smoke (event 17, after check-in, `source=phase2c`):

- Staff row: `id_anggota=null`, `nama=null`, `account_status=normal`, `ticket_status=checked_in`, `gate=SMOKE-A`, `scanned_at=2026-08-11 05:48:35`.
- Verifier row: `id_anggota` and `nama` present (see §11).

## 11. PII Verification

PII gating is proven in both directions on identical rows:

- **Non-verifier masking**: the database holds participant member ids and names; the staff (non-verifier) API response nulls `id_anggota` and `nama` (live DB cross-check: all 500 rows of event 11 have both set; API returned null). Smoke row confirmed the same for `source=phase2c`.
- **Verifier visibility**: the smoke `finance` account received `id_anggota=1051981117` and `nama=SMOKE PARTISIPAN P2D` for the same attendance row.

## 12. Attendance Summary

Live (event 11): `present=0`, `legacy_count=500`, `total=500`; `per_tanggal` = `(192, 0, 495)` and `(193, 0, 5)`.

Smoke (event 17, post check-in): `present=1`, `legacy_count=0`, `total=1`; `per_tanggal` = `(203, present=1, legacy=0)`.

## 13. Gate Monitoring

Live (event 11): `rows=[(ungated) 0/500/500]`, `breakdown_per_gate={"(ungated)": {...}}`.

Smoke (event 17, post check-in): `rows` = 1, `breakdown_per_gate.keys = [SMOKE-A]` with `present=1, legacy=0, total=1` — the `SMOKE-A` gate is reflected in the breakdown contract.

## 14. Phase 2C Regression

| Case | Expected | Actual | Status |
|---|---:|---:|---|
| Check-in without authorization | 401 | 401 | PASS |
| Invalid payload with no authorization | 401 | 401 | PASS |
| Invalid UUID authenticated | 422 | 422 `ticket_uuid harus berupa UUID yang valid` | PASS |
| Unknown UUID authenticated | 404 | 404 `Tiket tidak ditemukan` | PASS |
| Ticket owner (alumni) check-in | 403 | 403 `Forbidden` | PASS |
| Valid check-in (operator) | 200 | 200 `Check-in berhasil`; ticket→`checked_in`, attendance row created with gate/`scanned_by` | PASS |
| Duplicate check-in | 409 | 409 `Tiket sudah digunakan` with `first_scanned_at`/`first_scanned_by` | PASS |

Smoke order/ticket/attendance/check-in were created under operator approval, exercised, and fully removed (§19).

## 15. M-01 Regression

- Unauthenticated `GET /api/attendance/16/202` → 401 (PASS).
- Staff 200 with `data:[]` (PASS); smoke verifier 200 (PASS); alumni 403 (PASS).

## 16. M-02 Regression

- Unauthenticated `GET /api/transactions/16` → 401 (PASS).
- Non-verifier staff 403 `"This action is unauthorized."` (PASS); alumni 403 (PASS); smoke verifier 200 (PASS).

## 17. MIN-01 Live Verification

Dashboard filter consumption is proven with observable result changes on `GET /api/dashboard/finance/tickets` (staff):

| Probe | Result |
|---|---:|
| (no filter) | `total_tickets=1` |
| `?event_id=17` (smoke) | `total_tickets=1` |
| `?event_id=16` (other) | `total_tickets=0` |
| `?status=issued` | `total_tickets=1` |
| `?status=checked_in` (before check-in) | `total_tickets=0` |
| `?status=checked_in` (after check-in) | `total_tickets=1` |

`event_id` and `status` filters both change results — **MIN-01 PASS**.

## 18. Performance

Authenticated latency observations (single runs):

| Endpoint | Observed latency | Status |
|---|---:|---|
| `/api/user` | 23 ms | OBSERVATION |
| Operational events | 31 ms | OBSERVATION |
| Attendees (page 1, 25 rows) | 23 ms | OBSERVATION |
| Attendance summary | 21 ms | OBSERVATION |
| Gate monitoring | 21 ms | OBSERVATION |
| M-01 attendance | 20 ms | OBSERVATION |

## 19. Controlled Production Writes & Smoke Cleanup

Controlled production writes: PASS — smoke fixtures were created for verification and completely removed; production business-data baseline was restored exactly.

Business-data counts after cleanup returned to the verified baseline:

| Dataset | Baseline | After smoke | After cleanup |
|---|---:|---:|---:|
| Events | 8 | 9 | 8 |
| Orders | 0 | 1 | 0 |
| Tickets | 0 | 1 | 0 |
| Attendance | 894 | 895 | 894 |
| Phase 2C attendance | 0 | 1 | 0 |
| Ticket logs | 2 | 4 | 2 |
| Users | 1,051 | 1,053 | 1,051 |

Smoke identities removed entirely: 2 temporary users (+ their roles, data_user rows, temporary tokens), 1 temporary event + its event-day row, 1 order, 1 ticket (+ its 2 ticket logs), 1 attendance row. `attendance_smoke_left`, `orders_smoke_left`, `events_smoke_left`, `users_smoke_left`, etc. all equal 0 after cleanup. Verification tokens were logged out and the 4 temporary smoke-token rows were deleted during cleanup; leftover token rows belong to pre-existing sessions, not smoke. Public event list returned to its normal composition (no smoke event visible) and `/api/public/stats` remained healthy.

During verification each login increments `login_count`/`last_login` on the used accounts (id 25 and the temporary smoke accounts); no business data was otherwise mutated.

Credential rotation result (unchanged from build #57 context): **SUCCESS**; old exposed credential rejected; containers recreated via Docker Compose with volume preserved; no credential value appears in this report.

## 20. Infrastructure Limitations

- Production verification used `http://192.168.1.60:3015/api`.
- `api.maziltu.com` remains a known NXDOMAIN observation and was not used.
- Smoke accounts/event were operator-approved, API-issued, and fully removed; fixture identifiers appear only as verification evidence and no credential values appear here.
- Client-behavior note: `POST /api/login` to a non-JSON client with invalid credentials returns the Laravel default 302 to the site root (ValidationException rendered for non-JSON requests). Using `Accept: application/json` returns the intended 422 JSON. Standard framework behavior, not a defect.

## 21. Residual Observations (non-blocking)

- `ketua`/`admin` are covered by the same `RoleGuard::canVerify` branch exercised via the smoke `finance` account; they have zero active production accounts.
- MIN-01 was proven against the dashboard tickets endpoint with a single smoke ticket; aggregate scale is not materially different.
- The parallel-scan race (two operators scanning the same ticket simultaneously) is covered by the atomic status flip in `CheckInService` (unit-tested in `DashboardTest`/service tests) but was not reproduced under production concurrency.

## 22. Final Verdict

### Acceptance Matrix

| Acceptance | Status |
|---|---|
| Release identity | PASS |
| Jenkins deployment | PASS |
| Backup gate | PASS |
| Runtime routes | PASS |
| Public regression | PASS |
| Unauthenticated protection | PASS |
| Credential rotation | PASS |
| Authenticated RBAC — staff | PASS |
| Authenticated RBAC — verifier (finance/ketua/admin branch) | PASS |
| Authenticated RBAC — alumni negative | PASS |
| PII security — non-verifier masking | PASS |
| PII security — verifier visibility | PASS |
| Operational contracts (events/participants/attendance/gates) | PASS |
| Present/legacy API behavior | PASS |
| Legacy authorized regressions (M-01, M-02) | PASS |
| Phase 2C authenticated negatives + positive + duplicate | PASS |
| MIN-01 live filter behavior | PASS |
| Controlled production writes | PASS |

Mandatory authenticated production evidence is now present for all acceptance criteria.

**PHASE 2D — COMPLETE**