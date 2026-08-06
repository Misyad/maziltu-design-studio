# Architecture Decision Records (ADR)

**Project** : MZT Apps (Maziltutholiban Members Platform)
**Version** : 1.0
**Status** : Active
**Last Updated** : 2026-08-06

---

# Tujuan

Dokumen ini mencatat seluruh keputusan arsitektur yang telah disepakati selama pengembangan MZT Apps.

ADR digunakan sebagai referensi utama agar seluruh implementasi tetap konsisten, mengurangi technical debt, dan menghindari perubahan desain yang bertentangan dengan keputusan sebelumnya.

---

# ADR-001 — Order sebagai Aggregate Root

## Status

Accepted

## Keputusan

Seluruh modul bisnis EMS harus berpusat pada **Order**.

Order menjadi representasi utama hubungan antara Alumni dan Event.

Seluruh modul berikutnya harus mereferensikan Order, bukan langsung Event.

## Diagram

```
Event
   │
   ▼
 Order
 ├── Payment
 ├── Ticket
 ├── Attendance
 ├── Certificate
 ├── Merchandise
 └── Consumption
```

## Konsekuensi

* Payment tidak boleh langsung mereferensikan Event.
* Ticket tidak boleh langsung mereferensikan Event.
* Attendance tidak boleh langsung mereferensikan Event.
* Semua histori peserta berasal dari Order.

---

# ADR-002 — Immutable Snapshot

## Status

Accepted

## Keputusan

Order menyimpan snapshot Event pada saat registrasi.

Snapshot minimal:

* event_name
* event_price
* event_start_at

Snapshot bersifat immutable.

## Alasan

Perubahan Event di masa depan tidak boleh mengubah histori transaksi yang sudah terjadi.

---

# ADR-003 — Public Identity

## Status

Accepted

## Keputusan

Seluruh entitas bisnis yang diakses dari luar sistem memiliki tiga identitas:

### Internal ID

Primary key database.

Tidak pernah digunakan di API publik.

### UUID

Digunakan untuk:

* API
* URL
* QR
* Integrasi eksternal

### Nomor Administrasi

Contoh:

```
MZT-2026-000001
```

Digunakan oleh operator dan laporan.

---

# ADR-004 — Business Logic berada di Service

## Status

Accepted

## Keputusan

Controller hanya bertugas:

* validasi request
* authorization
* memanggil service
* mengembalikan response

Business rule tidak ditempatkan di controller.

## Target Struktur

```
app/
└── Services/
    ├── RegistrationService
    ├── EventCapacityService
    ├── OrderNumberService
    ├── PaymentService
    ├── TicketService
    ├── CheckInService
    └── FinanceService
```

---

# ADR-005 — Evolution First Database

## Status

Accepted

## Keputusan

Seluruh perubahan database mengikuti urutan:

```
Reuse

↓

Migrate

↓

Add

↓

Retire
```

## Prinsip

* Hindari rewrite tabel lama.
* Gunakan migration aditif.
* Semua migration harus idempotent.
* Rollback harus tersedia.

---

# ADR-006 — Audit Columns

## Status

Accepted

## Keputusan

Seluruh entitas bisnis baru wajib memiliki:

* created_by
* updated_by

Soft delete akan menambahkan deleted_by ketika benar-benar digunakan.

## Tujuan

Mempermudah audit operasional dan pelacakan perubahan.

---

# ADR-007 — Global Order Number

## Status

Accepted

## Keputusan

Nomor Order bersifat global.

Format:

```
MZT-{TAHUN}-{SEQUENCE}
```

Contoh:

```
MZT-2026-000001
```

## Alasan

* Mudah dicari.
* Mudah diurutkan.
* Tidak bergantung pada Event.

---

# ADR-008 — Event Visibility

## Status

Accepted

## Nilai

### public

Semua alumni dapat melihat dan mendaftar.

### internal

Hanya alumni yang telah login.

### private

Khusus whitelist.

Implementasi whitelist dilakukan pada fase berikutnya.

---

# ADR-009 — Registration Lifecycle

## Status

Accepted

## Registration Status

```
draft

↓

registered

↓

confirmed

↓

checked_in

↓

finished

↓

cancelled
```

Status registrasi tidak bergantung pada pembayaran.

> Catatan interpretasi: status `cancelled` dapat diterapkan dari state aktif mana
> pun sesuai kebutuhan operasional.

# ADR-010 — Payment Lifecycle

## Status

Accepted

## Payment Status

```
pending

↓

waiting_verification

↓

paid

↓

rejected

↓

refund
```

Payment dan Registration merupakan dua lifecycle yang berbeda.

---

# ADR-011 — Ticket Lifecycle

## Status

Planned (Phase 2B)

## Rencana

Ticket hanya dibuat apabila Order memenuhi syarat.

Status awal yang direncanakan:

```
not_generated

↓

generated

↓

used

↓

cancelled
```

---

# ADR-012 — Attendance Rule

## Status

Planned (Phase 2C)

## Keputusan

Attendance hanya dapat dibuat melalui proses Check-In.

Attendance tidak boleh dibuat secara manual tanpa proses validasi.

---

# ADR-013 — Backward Compatibility

## Status

Accepted

## Keputusan

Seluruh perubahan wajib:

* tidak merusak Phase 1
* tidak mengubah kontrak API lama
* tidak menghapus struktur database lama tanpa migration yang aman

Breaking change hanya diperbolehkan melalui ADR baru.

---

# ADR-014 — Production Safety

## Status

Accepted

## Seluruh deploy production wajib memenuhi:

* Backup database sebelum migration.
* Migration idempotent.
* Health check setelah deploy.
* Rollback plan terdokumentasi.
* Verifikasi E2E sebelum dinyatakan selesai.

---

# ADR-015 — Milestone Release

## Status

Accepted

### v2.0.0

Digital Identity Foundation

Status: Released

### v2.1.0-alpha1

Event Core

Registration

Order

Status: Completed

### v2.1.0-beta1

Payment

Ticket

Status: Planned

### v2.1.0-rc1

QR Check-In

Attendance

Status: Planned

### v2.1.0

Dashboard

Finance

Reporting

Status: Planned

---

# Aturan Perubahan ADR

1. ADR yang telah berstatus **Accepted** tidak boleh diubah secara langsung.
2. Perubahan arsitektur dilakukan dengan membuat ADR baru yang menggantikan atau memperbarui ADR sebelumnya.
3. PRD, Audit Gap Analysis, dan implementasi kode harus selalu mengacu pada ADR yang berlaku.
4. Setiap milestone besar (misalnya v2.2, v3.0) harus meninjau kembali ADR untuk memastikan tetap relevan.
