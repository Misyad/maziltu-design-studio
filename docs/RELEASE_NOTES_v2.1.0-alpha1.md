# MZT Apps Release Notes

**Project** : Maziltutholiban Members Platform (MZT Apps)  
**Version** : v2.1.0-alpha1  
**Release Type** : Alpha  
**Status** : Stable (Production Verified)  
**Release Date** : 06 Agustus 2026

---

# Ringkasan

Release **v2.1.0-alpha1** merupakan milestone pertama dari pengembangan **Event Management System (EMS)**.

Pada fase ini, MZT Apps bertransformasi dari aplikasi keanggotaan menjadi platform event yang telah memiliki fondasi registrasi peserta berbasis **Order**.

Seluruh implementasi telah berhasil dideploy ke production, diverifikasi melalui Jenkins Pipeline, serta lulus Architecture Review sesuai ADR dan Audit Gap Analysis.

---

# Highlights

## Event Core

- Event memiliki informasi kapasitas (Kuota)
- Venue Event
- Visibility Event
- Registration Window
- Harga numerik (`harga_amount`)

---

## Registration Engine

- Alumni dapat melakukan registrasi event
- Validasi kuota
- Validasi waktu registrasi
- Validasi visibility event
- Pencegahan registrasi ganda
- Ownership validation

---

## Order Engine

Order diperkenalkan sebagai **Aggregate Root** untuk seluruh transaksi Event Management System.

Fitur:

- UUID Public Identity
- Nomor Order Global
- Immutable Snapshot
- Registration Status
- Payment Status
- Audit Columns

---

# Architecture

## Aggregate Root

```
Event
    │
    ▼
Order
```

Seluruh modul berikutnya akan mereferensikan Order.

Planned:

- Payment
- Ticket
- Attendance
- Certificate
- Merchandise

---

## Public Identity

Setiap Order memiliki tiga identitas:

| Jenis | Digunakan Untuk |
|--------|-----------------|
| Internal ID | Database |
| UUID | API, QR, Integrasi |
| Nomor Order | Operator & Administrasi |

---

## Immutable Snapshot

Order menyimpan snapshot:

- Event Name
- Event Price
- Event Start Date

Perubahan Event tidak mengubah histori Order.

---

# Database

## Migration M1

Enhancement tabel **events**

Kolom baru:

- kuota
- venue
- visibility
- registrasi_dibuka
- registrasi_ditutup
- harga_amount

---

## Migration M2

Tabel baru:

**orders**

Kolom utama:

- uuid
- nomor_order
- id_event
- id_anggota
- created_by
- updated_by
- event_name
- event_price
- event_start_at
- total_amount
- status_registrasi
- payment_status

---

## Migration M3

Normalisasi struktur lama:

- UNIQUE(id_anggota)
  →

- UNIQUE(id_event,id_anggota)

Migration bersifat:

- additive
- idempotent
- rollback tersedia

---

# Backend

Fitur baru:

- RegistrationService
- EventCapacityService
- OrderNumberService

Model baru:

- Order

Enum baru:

- OrderStatus
- PaymentStatus

Endpoint baru:

POST /events/{id}/register

GET /my-orders

GET /orders/{uuid}

---

# Frontend

Portal Alumni

Menu baru:

- Event Saya
- Order Saya

Event Detail:

- Register Button
- Capacity Information
- Registration Validation

Dashboard Admin:

Event Form mendukung:

- Kuota
- Venue
- Visibility
- Registration Window

---

# Security

Implementasi:

- UUID sebagai Public Identifier
- Ownership Validation
- Auth Sanctum
- Immutable Snapshot
- Duplicate Registration Protection

---

# Deployment

Deployment dilakukan menggunakan Jenkins Pipeline.

Pipeline:

```
Validate Host

↓

Sync Source

↓

Build Images

↓

Backup Database

↓

Deploy Stack

↓

Migrate Database

↓

Verify Schema

↓

Health Check

↓

Prune
```

---

# Backup Strategy

Backup otomatis sebelum migration.

Output:

```
mzt_pre_migrate_YYYYMMDD_HHMMSS.sql.gz
mzt_pre_migrate_YYYYMMDD_HHMMSS.json
```

Metadata:

- created_at
- pipeline
- git_backend
- git_frontend
- reason
- database
- compressed

Retention:

14 Hari

---

# Verification

## Schema

Verified

- Audit Columns
- Orders Table
- Events Enhancement

---

## API

Verified

- Register Event
- My Orders
- Order Detail
- Duplicate Registration
- Unauthorized Access
- Unknown Event

---

## E2E

Production Verified

- Registrasi berhasil
- Duplicate ditolak (409)
- Ownership valid
- Cleanup berhasil

---

# Architecture Review

Status:

**PASSED**

Standar yang tervalidasi:

- ADR-001
- ADR-002
- ADR-003
- ADR-004
- ADR-005
- ADR-006
- ADR-007
- ADR-008
- ADR-009
- ADR-010

ADR-014 berhasil ditutup melalui implementasi:

- Backup sebelum migration
- Verify Schema
- Health Check dua level

---

# Breaking Changes

Tidak ada.

Seluruh perubahan bersifat:

- Additive
- Backward Compatible

---

# Known Limitations

Belum termasuk dalam release ini:

- Payment Engine
- Ticket Engine
- QR Ticket
- Check-In
- Attendance
- Finance Dashboard
- Reporting

Seluruh fitur tersebut akan diimplementasikan pada Phase 2B–2D.

---

# Next Milestone

## v2.1.0-beta1

Target:

- Payment Engine
- Ticket Engine
- Payment Verification
- Manual Transfer
- QRIS Manual
- Ticket Generation

---

## v2.1.0-rc1

Target:

- QR Check-In
- Attendance
- Gate Management

---

## v2.1.0

Target:

- Finance Dashboard
- Reporting
- Analytics
- Event Monitoring

---

# Release Status

| Item | Status |
|------|--------|
| Identity Platform | ✅ Released |
| Event Core | ✅ Completed |
| Registration | ✅ Completed |
| Order Engine | ✅ Completed |
| CI/CD | ✅ Production Ready |
| Backup Strategy | ✅ Production Ready |
| Rollback Strategy | ✅ Production Ready |
| Architecture Review | ✅ Passed |
| Phase 2A | ✅ Completed |

---

# Penutup

Release **v2.1.0-alpha1** menandai selesainya fondasi **Event Management System** pada MZT Apps.

Dengan selesainya fase ini, sistem telah memiliki fondasi arsitektur yang stabil untuk pengembangan modul Payment, Ticket, Attendance, dan Finance tanpa perlu melakukan perubahan besar pada struktur inti aplikasi.

Seluruh implementasi telah diverifikasi pada lingkungan produksi, memenuhi standar Architecture Decision Records (ADR), Audit Gap Analysis, serta Production Safety yang telah ditetapkan.