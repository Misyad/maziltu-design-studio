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

# ADR-016 — Communication Engine as Cross-Cutting Service

**Status:** Accepted

**Date:** 2026-08-06

**Decision Makers:**
- MZT Core Team
- Hasan Project

---

# Context

Seiring berkembangnya MZT Apps, semakin banyak modul yang membutuhkan kemampuan mengirim komunikasi kepada pengguna.

Saat ini maupun pada fase berikutnya, komunikasi akan digunakan oleh:

- Membership
- Authentication
- Event Registration
- Payment
- Ticket
- Attendance
- Finance
- News
- Organization Announcement
- Future Certificate
- Future Donation
- Future Merchandise

Tanpa arsitektur yang jelas, setiap modul berpotensi mengimplementasikan mekanisme pengiriman komunikasi sendiri.

Contoh:

PaymentService
→ kirim Email

AttendanceService
→ kirim WhatsApp

MembershipService
→ kirim Push Notification

Pendekatan tersebut akan menyebabkan:

- Duplikasi kode.
- Ketergantungan langsung terhadap provider.
- Sulit mengganti provider.
- Sulit melakukan retry.
- Sulit melakukan logging.
- Sulit melakukan audit.
- Sulit melakukan broadcast.
- Sulit melakukan monitoring.

---

# Problem Statement

Bagaimana cara memastikan seluruh komunikasi aplikasi memiliki pola yang konsisten, scalable, dan mudah dikembangkan tanpa membuat setiap Domain Service bergantung pada provider komunikasi tertentu?

---

# Decision

MZT Apps menetapkan bahwa seluruh komunikasi keluar (Outbound Communication) wajib melalui Communication Engine.

Business Domain tidak diperbolehkan mengirim Email, WhatsApp, Push Notification, ataupun channel komunikasi lainnya secara langsung.

Sebagai gantinya, Business Domain hanya menghasilkan Domain Event.

Communication Engine bertanggung jawab untuk:

- menerima Domain Event,
- memilih template,
- menentukan channel,
- memasukkan pekerjaan ke Queue,
- memilih Provider,
- melakukan Retry,
- mencatat Communication Log.

---

# Architecture

```
Business Domain

Membership
Order
Payment
Ticket
Attendance
Finance
Announcement

        │

        ▼

Domain Event

        │

        ▼

Communication Engine

        │

        ▼

Queue

        │

        ▼

Provider Layer

├── SMTP
├── WhatsApp
├── Firebase
├── Telegram
├── Discord
└── Future Provider

        │

        ▼

Recipient
```

Business Domain tidak mengetahui implementasi provider.

Business Domain hanya mengetahui bahwa sebuah Domain Event telah dipublikasikan.

---

# Principles

Communication Engine wajib mengikuti prinsip berikut.

## Single Communication Gateway

Seluruh komunikasi keluar harus melalui satu gateway yang sama.

Tidak boleh ada pengiriman komunikasi langsung dari Controller maupun Domain Service.

---

## Event Driven

Communication dipicu oleh Domain Event.

Contoh:

```
PaymentApproved

↓

Communication Engine
```

bukan

```
PaymentService

↓

Send WhatsApp
```

---

## Provider Independence

Communication Engine tidak bergantung pada provider tertentu.

Provider dapat diganti tanpa mengubah Domain Layer.

---

## Queue First

Seluruh komunikasi diproses secara asynchronous.

Tidak ada proses komunikasi yang memblokir request pengguna.

---

## Template Driven

Seluruh pesan berasal dari Template.

Template dipisahkan dari Business Logic.

---

## Audit Friendly

Seluruh komunikasi wajib memiliki log yang dapat diaudit.

---

# Supported Communication Types

Communication Engine mendukung:

- Transactional Notification
- Reminder
- Broadcast
- Scheduled Communication
- Future Campaign

---

# Supported Channels

Phase awal mendukung:

- In-App Notification
- Email
- WhatsApp

Future:

- Push Notification
- Telegram
- Discord
- Slack
- Microsoft Teams

---

# Responsibilities

Communication Engine bertanggung jawab terhadap:

- Template Resolution
- Channel Selection
- Queue Dispatch
- Retry Policy
- Provider Selection
- Delivery Logging
- User Preference
- Broadcast Processing

Communication Engine tidak bertanggung jawab terhadap Business Logic.

---

# Business Domain Responsibility

Business Domain hanya bertanggung jawab terhadap:

- Validasi bisnis
- Perubahan data
- Publish Domain Event

Business Domain tidak mengetahui:

- SMTP
- WhatsApp API
- Firebase
- Retry
- Queue
- Broadcast

---

# Provider Layer

Provider diimplementasikan menggunakan pola Adapter.

```
CommunicationProviderInterface

├── SMTPProvider

├── WhatsAppProvider

├── FirebaseProvider

├── TelegramProvider

└── FutureProvider
```

Provider dapat diganti tanpa perubahan pada Domain Layer.

---

# User Preferences

Communication Engine harus menghormati preferensi pengguna.

Contoh:

Email

☑ Payment

☑ Ticket

☐ News

WhatsApp

☑ Reminder

☑ Broadcast

Namun komunikasi Mandatory tidak dapat dimatikan.

Contoh:

- Password Reset
- Payment Approved
- Ticket Revoked

---

# Communication Log

Setiap komunikasi menghasilkan log minimal:

- UUID
- Domain Event
- User
- Channel
- Provider
- Template
- Status
- Retry Count
- Response
- Created At
- Delivered At

Communication Log merupakan bagian dari audit trail sistem.

---

# Consequences

## Positive

- Arsitektur lebih bersih.
- Business Domain tetap sederhana.
- Provider mudah diganti.
- Retry terpusat.
- Broadcast lebih mudah.
- Monitoring lebih sederhana.
- Audit lebih lengkap.
- Mudah dikembangkan ke channel baru.
- Konsisten pada seluruh modul.

---

## Negative

- Membutuhkan Queue Worker.
- Menambah satu lapisan arsitektur.
- Membutuhkan Template Management.
- Membutuhkan Communication Log.

Trade-off ini diterima karena memberikan skalabilitas jangka panjang.

---

# Alternatives Considered

## Alternative 1

Setiap Domain mengirim komunikasi sendiri.

Ditolak karena menyebabkan duplikasi dan tight coupling.

---

## Alternative 2

Membuat Notification Service terpisah untuk setiap provider.

Ditolak karena sulit dikelola ketika jumlah provider bertambah.

---

## Alternative 3

Menggunakan Communication Engine terpusat.

Dipilih karena:

- scalable,
- maintainable,
- provider independent,
- sesuai prinsip Evolution First.

---

# Impact

ADR ini memengaruhi seluruh modul:

- Membership
- Authentication
- Event
- Order
- Payment
- Ticket
- Attendance
- Finance
- Certificate (Future)
- Donation (Future)
- Merchandise (Future)

Semua modul baru wajib menggunakan Communication Engine.

---

# References

- ADR-001 — Order as Aggregate Root
- ADR-002 — Immutable Snapshot
- ADR-003 — Public Identity
- ADR-004 — Business Logic in Service Layer
- ADR-006 — Audit Columns
- ADR-013 — Backward Compatibility
- ADR-015 — Phase Milestones

Dokumen terkait:

- PRD Event Management System v2.1
- PRD Payment & Ticket Engine
- Audit-Gap-Analysis-EMS.md

---

# Decision Summary

Mulai ADR-016, seluruh komunikasi pada MZT Apps harus mengikuti arsitektur berbasis Domain Event melalui Communication Engine.

Tidak diperbolehkan ada Domain Service, Controller, maupun Repository yang mengirim Email, WhatsApp, Push Notification, atau channel komunikasi lainnya secara langsung.

Seluruh pengiriman wajib melalui Communication Engine agar memenuhi prinsip:

- Evolution First
- Provider Independence
- Queue First
- Audit Friendly
- Cross-Cutting Service