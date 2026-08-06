# PRD — Payment & Ticket Engine
## Maziltu Tholiban Members Platform (MZT Apps)

Version : v2.1.0-beta1 Draft
Status : Draft
Author : MZT Engineering Team
Last Updated : 2026-08-06

---

# 1. Executive Summary

## 1.1 Overview

Payment & Ticket Engine merupakan fondasi transaksi digital pada Maziltu Tholiban Members Platform (MZT Apps).

Modul ini bertanggung jawab terhadap seluruh proses finansial yang berhubungan dengan kegiatan organisasi, mulai dari registrasi peserta, pembayaran, verifikasi transaksi, penerbitan tiket digital, QR Check-In, hingga proses pelaporan keuangan.

Modul ini dibangun di atas fondasi Phase 2A (Event Core + Registration + Order), dimana Order telah ditetapkan sebagai Aggregate Root untuk seluruh transaksi.

Seluruh aktivitas finansial akan selalu dimulai dari sebuah Order.

```
Event
    │
    ▼
Registration
    │
    ▼
Order
    │
    ├──────────────► Payment
    │
    ├──────────────► Ticket
    │
    ├──────────────► Attendance
    │
    └──────────────► Certificate (Future)
```

Dengan pendekatan ini seluruh histori transaksi tetap konsisten, immutable, dan mudah diaudit.

---

## 1.2 Objectives

Payment & Ticket Engine memiliki tujuan utama:

- menyediakan sistem pembayaran yang fleksibel
- mendukung pembayaran online maupun offline
- menghasilkan tiket digital secara otomatis
- mengurangi proses administrasi manual
- mempercepat proses check-in acara
- menyediakan audit trail lengkap
- mendukung laporan keuangan organisasi

---

## 1.3 Success Metrics

Target implementasi:

- seluruh peserta melakukan registrasi melalui Order
- pembayaran online dan offline memakai engine yang sama
- verifikasi pembayaran maksimal < 1 menit
- check-in peserta < 3 detik
- tidak ada tiket ganda
- tidak ada pembayaran ganda
- histori transaksi immutable

---

# 2. Background

## 2.1 Kondisi Saat Ini

Saat ini MZT telah memiliki:

- 1.046 data alumni
- Portal Alumni
- Dashboard Admin
- Event Management System Phase 2A
- Registration Engine
- Order Engine

Namun proses pembayaran masih dilakukan secara manual menggunakan:

- transfer bank
- konfirmasi WhatsApp
- pengecekan mutasi manual
- pencatatan spreadsheet

Proses tersebut masih dapat digunakan pada skala kecil, namun tidak lagi ideal untuk kegiatan besar seperti Reuni Akbar Internasional.

---

## 2.2 Permasalahan

Permasalahan utama yang ditemukan:

### Registrasi

- pembayaran belum terintegrasi
- status registrasi tidak realtime

### Keuangan

- verifikasi manual
- rawan human error
- sulit audit

### Ticket

- tiket belum otomatis
- tidak ada QR
- tidak ada validasi digital

### Check-In

- masih menggunakan daftar manual
- antrean panjang
- rawan duplikasi peserta

---

## 2.3 Business Context

Pada kegiatan besar MZT, satu event dapat memiliki:

- ribuan peserta
- pembayaran sebelum acara
- pembayaran saat hari-H
- peserta luar negeri
- peserta lokal
- VIP
- panitia
- sponsor

Karena itu sistem harus mendukung berbagai skenario pembayaran tanpa mengubah arsitektur inti.

---

# 3. Problem Statement

Payment dan Ticket saat ini belum menjadi domain terpisah.

Akibatnya:

- data transaksi bercampur
- histori sulit dilacak
- tidak ada audit lengkap
- ticket tidak memiliki lifecycle
- attendance belum memiliki referensi transaksi

Selain itu, sistem lama masih menggunakan tabel transaksi yang hanya cocok untuk satu jenis event.

Phase 2B akan memisahkan domain tersebut menjadi:

- Order
- Payment
- Ticket

yang saling berhubungan namun memiliki tanggung jawab masing-masing.

---

# 4. Goals & Non Goals

## 4.1 Goals

Phase 2B akan membangun:

✓ Payment Engine

✓ Ticket Engine

✓ Payment Verification

✓ Digital Ticket

✓ QR Ticket

✓ Payment History

✓ Payment Timeline

✓ Finance Dashboard

✓ Notification Hook

✓ Multi Payment Method

---

## 4.2 Non Goals

Phase 2B belum mencakup:

- Certificate
- Merchandise
- Hotel Booking
- Transportasi
- Multi Event Package
- Point Reward
- Refund Automation
- Accounting Integration

Semua fitur tersebut akan menjadi bagian roadmap setelah v2.1.0.

---

# 5. Scope

## In Scope

### Payment

- Payment Creation
- Payment Verification
- Manual Verification
- Online Payment
- Offline Payment
- Upload Bukti Transfer
- Payment Timeline

---

### Ticket

- Ticket Generation
- QR Ticket
- Ticket Download
- Ticket Validation
- Ticket Status

---

### Finance

- Dashboard Finance
- Payment Report
- Outstanding Payment
- Daily Income

---

### Portal Alumni

- Bayar Tagihan
- Riwayat Pembayaran
- Download Ticket
- Lihat Status

---

### Dashboard Admin

- Verifikasi Pembayaran
- Approve / Reject
- Cetak Tiket
- Monitoring Pembayaran

---

## Out of Scope

- Refund Gateway
- Payment Gateway Settlement
- Akuntansi
- E-Faktur
- Sertifikat
- Marketplace

---

# 6. Architecture Overview

Payment Engine mengikuti ADR yang telah ditetapkan.

```
Event
    │
    ▼
Order
    │
    ├──────────────┐
    ▼              ▼
Payment        Ticket
    │              │
    └──────┬───────┘
           ▼
      Attendance
```

Order tetap menjadi Aggregate Root.

Payment tidak pernah berdiri sendiri.

Ticket tidak pernah dibuat tanpa Order.

Attendance tidak pernah dibuat tanpa Ticket.

---

## Design Principles

### Single Source of Truth

Order adalah sumber utama.

---

### Immutable Snapshot

Harga event yang telah dibayar tidak berubah walaupun Event berubah.

---

### UUID Public Identity

Seluruh akses publik menggunakan UUID.

---

### Numeric Internal Identity

Primary Key hanya digunakan di internal server.

---

### Auditability

Semua mutasi mempunyai:

- created_by
- updated_by
- timestamps

---

### Service Oriented

Business Logic berada pada:

- RegistrationService
- PaymentService
- TicketService
- CheckInService

Controller hanya menjadi orchestration layer.

---

# 7. Domain Model

## Aggregate Root

```
Order
```

Order mewakili satu registrasi alumni terhadap satu event.

---

## Entity

### Payment

Satu Order dapat memiliki beberapa Payment.

Contoh:

- DP
- Pelunasan
- Koreksi

---

### Ticket

Setiap Order maksimal memiliki satu Ticket aktif.

Ticket dapat diterbitkan ulang apabila diperlukan tanpa mengubah histori Order.

---

### Attendance

Attendance selalu berasal dari Ticket.

Tidak boleh langsung berasal dari Event.

---

## Relationship

```
Event

 1
 │

 *

Order

 1
 │

 *

Payment

 1
 │

 1

Ticket

 1
 │

 *

Attendance
```

---

## Ownership

Semua entity dimiliki oleh Order.

Order tidak boleh dihapus apabila sudah memiliki Payment.

Ticket tidak boleh dihapus apabila sudah digunakan.

Attendance bersifat immutable.

---

# 8. Business Rules

## Registration

- satu alumni hanya boleh memiliki satu Order aktif pada satu Event
- registrasi ditutup sesuai window registrasi
- kuota tidak boleh terlampaui
- private event hanya dapat diakses whitelist

---

## Payment

- Payment hanya dapat dibuat dari Order
- Payment tidak boleh melebihi total tagihan
- Payment yang sudah Approved tidak dapat diedit
- Payment Rejected tetap disimpan sebagai histori
- Semua perubahan status tercatat

---

## Ticket

Ticket diterbitkan apabila:

- registrasi valid
- pembayaran memenuhi aturan event

Untuk event gratis:

Ticket langsung diterbitkan.

Untuk event berbayar:

Ticket diterbitkan setelah pembayaran tervalidasi.

---

## QR

QR hanya berisi UUID Ticket.

Tidak pernah berisi:

- ID Database
- Nomor Urut
- Nomor Anggota

---

## Attendance

Attendance hanya boleh dilakukan menggunakan Ticket aktif.

Ticket yang telah digunakan:

- tidak dapat digunakan kembali
- langsung berubah menjadi Used

---

## Offline Payment

Panitia dapat membuat Payment atas nama peserta.

created_by akan menunjuk User panitia.

Audit tetap tersimpan.

---

## Online Payment

Peserta mengunggah bukti pembayaran.

Status:

Pending

↓

Waiting Verification

↓

Paid / Rejected

---

## Audit Rules

Seluruh perubahan status menghasilkan audit trail.

Minimal mencatat:

- waktu
- user
- status lama
- status baru
- catatan

Tidak ada histori yang boleh dihapus.

---

## Backward Compatibility

Seluruh implementasi harus mengikuti prinsip Evolution First.

Tidak boleh:

- menghapus tabel lama
- mengubah kontrak API lama
- mengubah struktur Phase 2A

Seluruh perubahan harus bersifat aditif.

# 9. Payment Engine

## 9.1 Overview

Payment Engine bertanggung jawab terhadap seluruh proses pembayaran setelah sebuah Order berhasil dibuat.

Payment tidak pernah berdiri sendiri.

Seluruh Payment selalu dimiliki oleh tepat satu Order sesuai prinsip **Order as Aggregate Root**.

```
Event
   │
   ▼
Order
   │
   ▼
Payment
```

Order menentukan:

- total tagihan;
- status registrasi;
- histori pembayaran;
- status pembayaran;
- kelayakan penerbitan Ticket.

Payment hanya merepresentasikan aktivitas pembayaran terhadap suatu Order.

---

## 9.2 Objectives

Payment Engine dirancang agar mampu mendukung berbagai metode pembayaran tanpa mengubah arsitektur inti sistem.

Metode yang didukung:

- Transfer Bank
- Tunai (Cash)
- QRIS
- Payment Gateway
- Sponsor
- Complimentary (Gratis)

Metode yang direncanakan:

- Installment
- Voucher
- Credit
- Manual Adjustment

Seluruh metode pembayaran mengikuti kontrak API yang didefinisikan pada Bab 17.

---

## 9.3 Payment Aggregate

Payment bukan Aggregate Root.

Payment merupakan child entity dari Order.

```
Order
 ├── Payment #1
 ├── Payment #2
 └── Payment #3
```

Contoh:

DP

↓

Pelunasan

↓

Refund

Seluruh histori pembayaran tetap tersimpan.

---

## 9.4 Payment Lifecycle

Lifecycle Payment didefinisikan secara resmi pada:

**Bab 17.14 — State Machine Specification**

Implementasi tidak diperbolehkan membuat transisi status di luar spesifikasi tersebut.

---

## 9.5 Payment Types

Supported:

- Transfer Bank
- Cash
- QRIS
- Payment Gateway
- Sponsor
- Complimentary

Future:

- Installment
- Voucher
- Credit

---

## 9.6 Business Rules

Payment tidak boleh:

- dibuat tanpa Order;
- melebihi total tagihan Order;
- diubah setelah berstatus Paid, kecuali melalui proses bisnis yang telah ditentukan.

Payment dapat:

- ditolak (Rejected);
- menerima upload ulang bukti pembayaran;
- diverifikasi ulang;
- menghasilkan histori Payment Log.

Seluruh perubahan status mengikuti State Machine pada Bab 17.14.

---

## 9.7 Partial Payment

Payment Engine mendukung pembayaran bertahap.

Contoh:

```
Order

Rp500.000

↓

Payment #1

Rp200.000

↓

Outstanding

Rp300.000

↓

Payment #2

Rp300.000

↓

Paid
```

Jumlah Outstanding dihitung berdasarkan total Payment yang telah berhasil dibayar.

---

## 9.8 Outstanding

Order selalu menghitung secara realtime:

- Total Tagihan
- Total Dibayar
- Outstanding
- Payment Status

Perhitungan Outstanding dilakukan pada sisi server dan menjadi sumber kebenaran bagi seluruh modul Payment, Ticket, Finance, maupun Reporting.

# 10. Ticket Engine

## 10.1 Overview

Ticket Engine bertanggung jawab menghasilkan identitas digital peserta.

Ticket bukan pembayaran.

Ticket bukan registrasi.

Ticket adalah bukti hak hadir.

---

## 10.2 Ticket Lifecycle

Draft

↓

Issued

↓

Checked In

↓

Finished

atau

Cancelled

---

## 10.3 Ticket Generation

Ticket diterbitkan apabila:

Event Gratis

↓

Order Registered

↓

Ticket Issued

atau

Event Berbayar

↓

Payment Paid

↓

Ticket Issued

---

## 10.4 Ticket Identity

Ticket memiliki:

UUID

Nomor Ticket

QR

Issue Date

Expire Date

Status

---

## 10.5 Ticket Number

Format:

```
TKT-2026-000001
```

Nomor Ticket hanya untuk administrasi.

Identitas publik tetap UUID.

---

## 10.6 QR Payload

QR hanya berisi:

```
ticket_uuid
```

Contoh:

```
0c4ab931-xxxx-xxxx-xxxx
```

QR tidak pernah berisi:

Nomor Anggota

ID Database

Nomor Order

---

## 10.7 Ticket Reissue

Ticket boleh diterbitkan ulang apabila:

QR rusak

File hilang

Kesalahan cetak

UUID tetap sama.

---

## 10.8 Ticket Revocation

Ticket dapat dicabut apabila:

Order dibatalkan

Refund penuh

Peserta didiskualifikasi

Riwayat tidak dihapus.

---

# 11. Verification Workflow

## 11.1 Overview

Seluruh pembayaran manual wajib diverifikasi.

---

## 11.2 Workflow

```
Upload Bukti

↓

Waiting Verification

↓

Admin Review

↓

Approve

atau

Reject
```

---

## 11.3 Approval Rules

Approve hanya dapat dilakukan apabila:

Nominal sesuai

Tujuan transfer benar

Bukti valid

Belum pernah dipakai

---

## 11.4 Reject Rules

Reject harus mempunyai alasan.

Contoh:

Nominal kurang

Transfer gagal

Bukti tidak jelas

Transfer ke rekening lain

---

## 11.5 Audit Trail

Setiap approval menghasilkan:

User

Tanggal

Status lama

Status baru

Catatan

---

# 12. QR Security Architecture

## 12.1 Objectives

QR harus:

cepat

aman

tidak mudah dipalsukan

---

## 12.2 Public Payload

QR hanya berisi:

Ticket UUID

---

## 12.3 Server Validation

Server melakukan:

UUID Lookup

↓

Ticket Exists

↓

Status Active

↓

Belum Check-In

↓

Success

---

## 12.4 Duplicate Scan

Jika Ticket sudah Used

↓

Reject

↓

Log

↓

Tampilkan petugas pertama

---

## 12.5 Offline Mode

Future Phase.

Belum termasuk Phase 2B.

---

# 13. Payment Methods

## Supported

### Transfer Bank

Upload Bukti

↓

Verify

↓

Paid

---

### Cash

Panitia membuat Payment.

Langsung Paid.

Audit created_by wajib terisi.

---

### QRIS

Gateway

↓

Webhook

↓

Paid

---

### Complimentary

Tidak ada pembayaran.

Order langsung Paid.

Ticket otomatis diterbitkan.

---

### Sponsor

Status:

Paid

dengan metode Sponsor.

---

# 14. Offline Payment Workflow

## Walk In

Peserta datang.

↓

Panitia mencari anggota.

↓

Register Order.

↓

Input Cash.

↓

Payment Paid.

↓

Ticket Issued.

↓

Scan.

↓

Masuk.

---

## Offline Transfer

Peserta transfer.

↓

Menunjukkan bukti.

↓

Admin input manual.

↓

Approve.

↓

Ticket.

---

# 15. Online Payment Workflow

## Flow

Portal Alumni

↓

Daftar Event

↓

Order

↓

Upload Bukti

↓

Waiting Verification

↓

Admin Approve

↓

Ticket Issued

↓

Download Ticket

↓

QR Check In

---

## Notification

Status berubah:

Pending

↓

Waiting Verification

↓

Paid

↓

Ticket Ready

Semua perubahan menghasilkan Notification.

---

## Failure Flow

Reject

↓

Peserta Upload Ulang

↓

Verification

↓

Paid

---

## Future Integration

Phase selanjutnya:

Midtrans

Xendit

Duitku

Tripay

Stripe

PayPal

Tanpa perubahan arsitektur Order.

# 16. Database Design

## 16.1 Design Principles

Seluruh desain database Payment & Ticket Engine mengikuti prinsip arsitektur yang telah ditetapkan pada ADR MZT Apps.

Prinsip utama:

- Evolution First
- Backward Compatible
- Order sebagai Aggregate Root
- UUID sebagai Public Identity
- Snapshot Immutable
- Audit Trail
- Service-Oriented Architecture

Tidak ada tabel legacy yang dihapus pada Phase 2B.

Seluruh perubahan bersifat aditif.

---

# 16.2 Aggregate Hierarchy

```
Event
│
▼
Order
├───────────────┐
│               │
▼               ▼
Payment      Ticket
│               │
│               ▼
│          Attendance
│
▼
Payment Log
```

Order merupakan **Aggregate Root**.

Seluruh entitas baru wajib memiliki hubungan langsung maupun tidak langsung terhadap Order.

Payment, Ticket, Attendance, maupun modul lain pada fase berikutnya tidak diperbolehkan memiliki hubungan bisnis langsung terhadap Event tanpa melalui Order.

---

# 16.3 Database Overview

Phase 2B menghasilkan struktur berikut.

## Existing (Reuse)

- events
- tanggal_events
- users
- data_users
- hak_akses_role
- prisensi_kehadiran

---

## Existing (Migrated)

- orders

---

## New

- payments
- payment_proofs
- payment_logs
- tickets
- ticket_logs
- notifications *(opsional Phase 2D)*

---

# 16.4 Orders

Orders merupakan pusat seluruh transaksi.

```
orders
```

| Field | Type | Notes |
|----------|-----------------|---------------------------|
| id | bigint PK | Internal ID |
| uuid | varchar(36) | Public Identity |
| nomor_order | varchar(30) | Format MZT-YYYY-NNNNNN |
| id_event | bigint | FK Event |
| id_anggota | varchar | FK User (NIAM) |
| created_by | bigint nullable | Audit |
| updated_by | bigint nullable | Audit |
| event_name | varchar | Immutable Snapshot |
| event_price | decimal(12,2) | Immutable Snapshot |
| event_start_at | datetime | Immutable Snapshot |
| total_amount | decimal(12,2) | Total pembayaran |
| status_registrasi | varchar(30) | Registration Lifecycle |
| payment_status | varchar(30) | Payment Lifecycle |
| created_at | timestamp | |
| updated_at | timestamp | |

### Unique Constraint

```
(id_event, id_anggota)
```

### Public Access

```
uuid
```

---

# 16.5 Payments

```
payments
```

Setiap Payment selalu dimiliki oleh tepat satu Order.

Satu Order dapat memiliki satu atau lebih Payment sesuai kebutuhan operasional, misalnya:

- pembayaran bertahap,
- pembayaran ulang setelah ditolak,
- refund,
- metode pembayaran berbeda.

Payment tidak pernah berelasi langsung dengan Event.

Seluruh histori transaksi keuangan selalu ditelusuri melalui Order sebagai Aggregate Root sesuai ADR-001.

| Field | Type |
|----------|----------------|
| id | bigint |
| uuid | varchar(36) |
| id_order | bigint |
| nomor_payment | varchar(30) |
| method | varchar(30) |
| amount | decimal(12,2) |
| status | varchar(30) |
| paid_at | datetime |
| verified_at | datetime |
| verified_by | bigint |
| reference_number | varchar |
| gateway_transaction_id | varchar |
| note | text |
| created_by | bigint |
| updated_by | bigint |
| created_at | timestamp |
| updated_at | timestamp |

### Payment Status

- Pending
- Waiting Verification
- Paid
- Rejected
- Refund
- Completed

### Payment Method

- Transfer
- Cash
- QRIS
- Payment Gateway
- Sponsor
- Complimentary

---

# 16.6 Payment Proofs

```
payment_proofs
```

Digunakan untuk menyimpan seluruh bukti pembayaran.

Satu Payment dapat memiliki beberapa Payment Proof.

Contoh:

```
Upload pertama

↓

Upload ulang

↓

Upload ketiga
```

Seluruh histori tetap tersedia.

| Field | Type |
|-----------|----------------|
| id | bigint |
| uuid | varchar(36) |
| id_payment | bigint |
| file_path | varchar |
| original_name | varchar |
| mime_type | varchar |
| file_size | bigint |
| uploaded_at | datetime |
| uploaded_by | bigint |

## Immutable Rules

Payment Proof bersifat **immutable**.

Upload baru tidak menggantikan upload sebelumnya.

Setiap unggahan menghasilkan record baru pada tabel `payment_proofs`.

Seluruh histori bukti pembayaran harus tetap tersedia untuk:

- Audit
- Investigasi
- Penyelesaian sengketa
- Pelacakan operasional

Penghapusan Payment Proof tidak diperbolehkan melalui proses bisnis normal.

---

# 16.7 Payment Logs

```
payment_logs
```

Digunakan untuk mencatat seluruh perubahan status Payment.

| Field | Type |
|----------|----------------|
| id | bigint |
| id_payment | bigint |
| old_status | varchar |
| new_status | varchar |
| note | text |
| changed_by | bigint |
| created_at | timestamp |

Contoh:

```
Pending

↓

Waiting Verification

↓

Paid

↓

Completed
```

Setiap perubahan status wajib menghasilkan Payment Log.

---

# 16.8 Tickets

```
tickets
```

Ticket diterbitkan dari Order.

Bukan dari Event.

| Field | Type |
|----------|----------------|
| id | bigint |
| uuid | varchar(36) |
| nomor_ticket | varchar |
| id_order | bigint |
| qr_payload | varchar |
| status | varchar |
| issued_at | datetime |
| expired_at | datetime nullable |
| used_at | datetime nullable |
| revoked_at | datetime nullable |
| created_by | bigint |
| updated_by | bigint |
| created_at | timestamp |
| updated_at | timestamp |

### Ticket Status

- Draft
- Issued
- Checked In
- Finished
- Cancelled

### QR Payload

QR Code hanya berisi UUID Ticket.

Contoh:

```json
{
  "ticket_uuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

QR Code tidak boleh menyimpan:

- Internal ID
- Nomor Order
- ID Event
- Data pribadi peserta

Seluruh validasi dilakukan oleh server menggunakan UUID Ticket.

### Ticket Reissue

Reissue bukan merupakan status Ticket.

Reissue adalah proses operasional yang menghasilkan Ticket baru berdasarkan Ticket sebelumnya.

Implementasi mekanisme revisi Ticket akan dilakukan pada fase berikutnya tanpa mengubah lifecycle utama Ticket.

### Unique

```
uuid
```

```
nomor_ticket
```

---

# 16.9 Ticket Logs

```
ticket_logs
```

Audit seluruh perubahan Ticket.

| Field | Type |
|----------|----------------|
| id | bigint |
| id_ticket | bigint |
| old_status | varchar |
| new_status | varchar |
| note | text |
| changed_by | bigint |
| created_at | timestamp |

---

# 16.10 Attendance

Attendance tetap menggunakan tabel legacy.

```
prisensi_kehadiran
```

Phase 2C akan menambahkan:

| Field | Type |
|----------|---------------|
| id_ticket | bigint nullable |
| gate | varchar |
| scanned_at | datetime |
| scanned_by | bigint |

Seluruh relasi Attendance tetap mengacu pada Ticket yang berasal dari Order.

Backward compatible.

---

# 16.11 Entity Relationship Diagram

```
events
│
│ 1
│
▼
orders
│
├──────────────┐
│              │
│ *            │ 1
▼              ▼
payments      tickets
│              │
│ *            │ *
▼              ▼
payment_logs  ticket_logs
│
│
▼
payment_proofs
```

Attendance akan bergabung pada Phase 2C melalui Ticket.

---

# 16.12 UUID Strategy

Seluruh entitas publik wajib memiliki UUID.

| Entity | Public UUID |
|------------|-------------|
| Order | ✔ |
| Payment | ✔ |
| Ticket | ✔ |

Primary Key bigint hanya digunakan sebagai identitas internal.

Seluruh API publik wajib menggunakan UUID.

---

# 16.13 Snapshot Strategy

Snapshot hanya disimpan pada Order.

```
event_name

event_price

event_start_at
```

Snapshot bersifat immutable.

Perubahan pada Event tidak boleh mengubah histori Order.

Ticket maupun Payment tidak menyimpan snapshot tambahan.

---

# 16.14 Index Strategy

### Orders

```
uuid
nomor_order
(id_event,id_anggota)
status_registrasi
payment_status
```

### Payments

```
uuid
id_order
status
method
paid_at
verified_at
```

### Tickets

```
uuid
nomor_ticket
id_order
status
```

### Payment Logs

```
id_payment
created_at
```

### Ticket Logs

```
id_ticket
created_at
```

---

# 16.15 Migration Strategy

Urutan migration wajib:

1. Events Extension

↓

2. Orders

↓

3. Payments

↓

4. Payment Proofs

↓

5. Payment Logs

↓

6. Tickets

↓

7. Ticket Logs

↓

8. Attendance Extension (Phase 2C)

Migration wajib memenuhi prinsip:

- additive
- idempotent
- backward compatible

Migration tidak diperbolehkan:

- rename tabel legacy,
- drop kolom legacy,
- menghapus data produksi.

### Production Safety

Sebelum migration Production dijalankan wajib dilakukan:

- Backup database otomatis.
- Verifikasi integritas backup.
- Migration.
- Verify Schema.
- Health Check.
- Rollback apabila salah satu tahapan gagal.

Standar ini mengikuti ADR-014 (Production Safety).

Seluruh migration harus dapat dijalankan berulang tanpa menghasilkan konflik struktur.

# 17. API Contract

## 17.1 API Principles

Payment & Ticket Engine mengikuti standar REST API yang telah digunakan pada seluruh MZT Apps.

Seluruh endpoint:

- menggunakan JSON
- menggunakan HTTPS
- menggunakan Bearer Token (Sanctum)
- menggunakan UUID sebagai identitas publik
- backward compatible
- versioned melalui `/api`

Selain itu seluruh endpoint wajib memenuhi standar berikut:

- Ownership Validation
- Idempotency untuk operasi yang berpotensi dipanggil berulang
- Consistent Response Format
- Audit Trail pada seluruh mutasi data
- Pagination untuk endpoint list
- Validasi Authorization berdasarkan Role & Permission

Semua endpoint baru berada pada namespace:

```
/api
```

---

## 17.2 Authentication

Endpoint yang memerlukan autentikasi menggunakan:

```
Authorization: Bearer {token}
```

Seluruh endpoint Portal Alumni dan Dashboard Admin menggunakan middleware:

```
auth:sanctum
```

Role authorization tetap menggunakan mekanisme Role & Permission yang telah digunakan sejak Phase 1.

Ownership resource selalu divalidasi pada sisi server.

Alumni hanya dapat mengakses Order, Payment, maupun Ticket miliknya sendiri.

---

# 17.3 Event Registration API

## Register Event

```
POST /api/events/{event_uuid}/register
```

### Authorization

Bearer Token

### Request

```json
{}
```

### Response

201 Created

```json
{
    "success": true,
    "message": "Registrasi berhasil.",
    "data": {
        "order_uuid": "...",
        "nomor_order": "MZT-2026-000001",
        "status_registrasi": "registered",
        "payment_status": "pending"
    }
}
```

### Validation

- Event aktif
- Visibility valid
- Registrasi telah dibuka
- Registrasi belum ditutup
- Kuota tersedia
- Belum pernah mendaftar pada event tersebut

---

### Duplicate Registration

409 Conflict

```json
{
    "success": false,
    "message": "Anda sudah terdaftar pada event ini."
}
```

---

# 17.4 Orders API

## List My Orders

```
GET /api/my-orders
```

Response

```json
{
    "success": true,
    "data": []
}
```

Endpoint list wajib mendukung:

- page
- per_page
- search
- sort
- filter

---

## Order Detail

```
GET /api/orders/{order_uuid}
```

Response

```json
{
    "success": true,
    "data": {
        "uuid": "...",
        "nomor_order": "MZT-2026-000001",
        "event_name": "Reuni Akbar",
        "payment_status": "pending",
        "status_registrasi": "registered"
    }
}
```

Ownership selalu divalidasi.

---

## Cancel Order

Future Phase.

Belum tersedia pada v2.1.

---

# 17.5 Payment API

## Create Payment

```
POST /api/orders/{order_uuid}/payments
```

Digunakan untuk:

- Upload Transfer
- Input Cash
- Payment Gateway Callback

Request

```json
{
    "method": "transfer",
    "amount": 250000
}
```

Response

201 Created

---

## Idempotency

Endpoint Create Payment wajib bersifat idempotent.

Client dapat mengirimkan header:

```
Idempotency-Key: <uuid>
```

Apabila request yang sama diterima lebih dari satu kali dengan Idempotency-Key yang sama, server wajib mengembalikan Payment yang telah dibuat sebelumnya dan tidak membuat Payment baru.

---

## Upload Proof

```
POST /api/payments/{payment_uuid}/proof
```

multipart/form-data

```
proof
```

### Upload Rules

Format yang diperbolehkan:

- JPG
- JPEG
- PNG
- PDF

Ukuran maksimum:

```
5 MB
```

Server wajib:

- memvalidasi MIME Type
- mengganti nama file
- menyimpan file secara aman
- menolak file yang tidak valid

Response

```json
{
    "success": true
}
```

---

## Payment Detail

```
GET /api/payments/{payment_uuid}
```

---

## List Payments

```
GET /api/orders/{order_uuid}/payments
```

Endpoint list mendukung pagination dan filtering.

---

# 17.6 Payment Verification API

(Admin)

```
PUT /api/payments/{payment_uuid}/verification
```

Request

```json
{
    "status": "paid",
    "note": "Nominal sesuai."
}
```

atau

```json
{
    "status": "rejected",
    "note": "Nominal kurang."
}
```

Status yang diperbolehkan:

- waiting_verification
- paid
- rejected
- refund
- completed

Seluruh perubahan status wajib menghasilkan Payment Log.

---

# 17.7 Ticket API

## My Ticket

```
GET /api/orders/{order_uuid}/ticket
```

---

## Ticket Detail

```
GET /api/tickets/{ticket_uuid}
```

---

## Download Ticket

```
GET /api/tickets/{ticket_uuid}/download
```

Response

- PDF
- PNG

---

## Reissue Ticket

(Admin)

```
POST /api/tickets/{ticket_uuid}/reissue
```

Reissue bukan merupakan perubahan status Ticket.

Reissue hanya menghasilkan representasi Ticket yang baru.

Yang tetap:

- ticket_uuid
- nomor_ticket
- id_order

Yang berubah:

- file hasil generate
- QR Image
- generated_at

Lifecycle Ticket tidak berubah.

---

## QR Payload

QR Code hanya berisi UUID Ticket.

```json
{
    "ticket_uuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

QR Code tidak boleh memuat:

- Internal ID
- Nomor Order
- ID Event
- Data pribadi peserta

Seluruh validasi dilakukan oleh server.

---

# 17.8 Check-In API

Phase 2C.

Belum diimplementasikan.

Direncanakan:

```
POST /api/checkin
```

Payload

```json
{
    "ticket_uuid": "..."
}
```

---

# 17.9 Finance Dashboard API

(Admin)

## Dashboard Summary

```
GET /api/dashboard/finance
```

Response

```json
{
    "income_today": 0,
    "paid": 0,
    "pending": 0,
    "rejected": 0
}
```

---

## Payment Report

```
GET /api/dashboard/payment-report
```

---

## Outstanding Payment

```
GET /api/dashboard/outstanding
```

Seluruh endpoint report mendukung:

- page
- per_page
- search
- sort
- filter

---

# 17.10 Notification API

Portal

```
GET /api/notifications
```

```
PUT /api/notifications/read
```

Future Phase.

---

# 17.11 Common Response

## Success

```json
{
    "success": true,
    "message": "OK",
    "data": {},
    "meta": {
        "request_id": "..."
    }
}
```

---

## Validation Error

422

```json
{
    "success": false,
    "message": "Validation Error",
    "errors": {}
}
```

---

## Unauthorized

401

```json
{
    "success": false,
    "message": "Unauthenticated."
}
```

---

## Forbidden

403

```json
{
    "success": false,
    "message": "Forbidden."
}
```

---

## Not Found

404

```json
{
    "success": false,
    "message": "Data tidak ditemukan."
}
```

---

## Conflict

409

```json
{
    "success": false,
    "message": "Duplicate resource."
}
```

---

## Server Error

500

```json
{
    "success": false,
    "message": "Internal Server Error."
}
```

---

# 17.12 Authorization Matrix

| Endpoint | Owner | Panitia | Finance | Admin |
|------------|:-----:|:--------:|:--------:|:------:|
| Register Event | ✓ | ✓ | ✓ | ✓ |
| My Orders | ✓ | ✓ | ✓ | ✓ |
| Upload Payment | ✓ | ✓ | ✓ | ✓ |
| View Ticket | ✓ | ✓ | ✓ | ✓ |
| Payment Verification | ✗ | ✗ | ✓ | ✓ |
| Reissue Ticket | ✗ | ✓ | ✓ | ✓ |
| Finance Dashboard | ✗ | ✗ | ✓ | ✓ |
| Payment Report | ✗ | ✗ | ✓ | ✓ |
| Check-In | ✗ | ✓ | ✓ | ✓ |

Owner menunjukkan pemilik resource (Order, Payment, Ticket) yang divalidasi melalui Ownership Check.

---

# 17.13 API Versioning

Seluruh endpoint Payment & Ticket Engine merupakan bagian dari API v2.

Perubahan mayor pada kontrak API tidak boleh mengubah endpoint yang telah digunakan oleh frontend.

Jika diperlukan perubahan yang bersifat breaking change, endpoint baru dibuat melalui mekanisme versioning, misalnya:

```
/api/v2/orders

/api/v3/orders
```

Endpoint yang telah berstatus deprecated tidak boleh dihapus sebelum seluruh client resmi MZT Apps selesai bermigrasi ke versi baru.

Selama Phase 2B seluruh endpoint tetap mempertahankan kompatibilitas dengan struktur API Phase 1 dan Phase 2A.

# 17.14 State Machine Specification

## 17.14.1 Purpose

State Machine Specification mendefinisikan seluruh transisi status yang diperbolehkan pada setiap entitas bisnis di dalam Event Management System.

Tujuan utama:

- menjadi sumber kebenaran (Source of Truth) bagi Backend, Frontend, QA, dan DevOps;
- mencegah implementasi status yang tidak konsisten;
- mendokumentasikan lifecycle setiap Aggregate Root beserta seluruh entity turunannya;
- memastikan seluruh perubahan status dapat diaudit melalui Audit Log.

State Machine ini bersifat normatif.

Implementasi tidak diperbolehkan membuat transisi status di luar spesifikasi pada bab ini tanpa melalui perubahan PRD dan ADR yang berlaku.

---

# 17.14.2 Registration Lifecycle

Registration Lifecycle menggambarkan perjalanan registrasi peserta terhadap suatu Event.

```
Draft
   │
   ▼
Registered
   │
   ▼
Confirmed
   │
   ▼
Checked In
   │
   ▼
Finished
```

State aktif dapat dibatalkan kapan saja sesuai kebutuhan operasional.

```
Draft
Registered
Confirmed
Checked In
        │
        ▼
   Cancelled
```

## Status

| Status | Deskripsi |
|---------|-----------|
| Draft | Order baru dibuat namun belum selesai diproses. |
| Registered | Peserta berhasil melakukan registrasi. |
| Confirmed | Registrasi telah memenuhi seluruh persyaratan. |
| Checked In | Peserta telah melakukan check-in pada hari pelaksanaan. |
| Finished | Event selesai diikuti peserta. |
| Cancelled | Registrasi dibatalkan. |

---

# 17.14.3 Payment Lifecycle

Payment memiliki lifecycle yang terpisah dari Registration.

```
Pending
    │
    ▼
Waiting Verification
    │             │
    │             ▼
    │        Rejected
    │             │
    │             ▼
    │      Upload Proof
    │             │
    └─────────────┘
    │
    ▼
Paid
    │
    ▼
Completed
```

Refund merupakan cabang setelah Payment berhasil.

```
Paid
   │
   ▼
Refund
```

## Status

| Status | Deskripsi |
|---------|-----------|
| Pending | Payment baru dibuat. |
| Waiting Verification | Menunggu verifikasi Finance. |
| Paid | Pembayaran telah disetujui. |
| Completed | Seluruh proses pembayaran selesai. |
| Rejected | Bukti pembayaran ditolak dan dapat diunggah ulang. |
| Refund | Dana dikembalikan kepada peserta. |

### Rules

- Payment tidak boleh langsung berubah dari Pending ke Paid.
- Payment wajib melewati proses verifikasi apabila metode pembayaran memerlukan bukti.
- Setiap perubahan status menghasilkan Payment Log.
- Rejected tidak menghapus histori Payment maupun Payment Proof.
- Upload ulang bukti menghasilkan Payment Proof baru.

---

# 17.14.4 Ticket Lifecycle

Ticket diterbitkan setelah Order memenuhi syarat penerbitan.

```
Draft
   │
   ▼
Issued
   │
   ▼
Checked In
   │
   ▼
Finished
```

Pembatalan dapat dilakukan selama Ticket belum selesai digunakan.

```
Draft
Issued
Checked In
      │
      ▼
Cancelled
```

## Status

| Status | Deskripsi |
|---------|-----------|
| Draft | Ticket belum diterbitkan. |
| Issued | Ticket telah diterbitkan dan dapat digunakan. |
| Checked In | Ticket telah dipindai pada Gate. |
| Finished | Event selesai. |
| Cancelled | Ticket dibatalkan. |

### Ticket Reissue

Reissue **bukan** merupakan status.

Reissue adalah aksi operasional untuk menghasilkan representasi Ticket yang baru tanpa mengubah identitas bisnis Ticket.

Reissue mempertahankan:

- ticket_uuid
- nomor_ticket
- id_order

Reissue hanya menghasilkan file Ticket baru dan QR Code baru apabila diperlukan.

---

# 17.14.5 Attendance Lifecycle

Attendance merupakan hasil dari proses Check-In.

```
Not Checked In
        │
        ▼
Checked In
        │
        ▼
Verified
```

Attendance selalu berasal dari Ticket yang valid.

Attendance tidak pernah dibuat langsung dari Event.

---

# 17.14.6 Notification Lifecycle

Communication Engine menggunakan lifecycle tersendiri.

```
Queued
   │
   ▼
Sending
   │
   ▼
Delivered
   │
   ▼
Read
```

Apabila gagal:

```
Sending
   │
   ▼
Failed
   │
   ▼
Retry
   │
   ▼
Sending
```

## Status

| Status | Deskripsi |
|---------|-----------|
| Queued | Menunggu diproses Queue Worker. |
| Sending | Sedang dikirim. |
| Delivered | Berhasil diterima penyedia layanan. |
| Read | Pesan telah dibaca (jika didukung provider). |
| Failed | Pengiriman gagal. |
| Retry | Masuk kembali ke antrean pengiriman. |

---

# 17.14.7 Aggregate Relationship

State Machine mengikuti hubungan Aggregate berikut.

```
Event
    │
    ▼
Order
    ├───────────────┐
    ▼               ▼
Payment         Ticket
    │               │
    ▼               ▼
Payment Log   Attendance
```

Order merupakan Aggregate Root.

Perubahan status pada Payment, Ticket, maupun Attendance tidak boleh mengubah Event secara langsung.

---

# 17.14.8 General Rules

Seluruh State Machine wajib mengikuti aturan berikut.

1. Status disimpan sebagai VARCHAR dan divalidasi menggunakan PHP Enum.

2. Perubahan status hanya dilakukan melalui Service Layer.

3. Setiap perubahan status menghasilkan Audit Log.

4. Perubahan status wajib dilakukan di dalam Database Transaction.

5. State Machine tidak boleh dilewati (skip state) kecuali dinyatakan secara eksplisit pada PRD.

6. Seluruh perubahan status harus bersifat idempotent.

7. Frontend tidak diperbolehkan menentukan status secara langsung.

8. Backend merupakan satu-satunya sumber kebenaran (Single Source of Truth) terhadap seluruh lifecycle sistem.

---

# 17.14.9 Compliance

State Machine Specification ini merupakan implementasi dari Architecture Decision Record (ADR):

- ADR-001 — Order as Aggregate Root
- ADR-002 — Immutable Snapshot
- ADR-004 — Business Logic in Service Layer
- ADR-006 — Audit Trail
- ADR-009 — Registration Lifecycle
- ADR-010 — Payment Lifecycle
- ADR-011 — Ticket Lifecycle
- ADR-016 — Communication Engine

Seluruh implementasi Phase 2B dan fase berikutnya wajib mengikuti spesifikasi lifecycle pada bab ini.

# 18. Frontend Experience & User Journey

## 18.1 Overview

Frontend Payment & Ticket Engine dibangun di atas Portal Alumni dan Dashboard Admin yang telah tersedia pada Phase 1 dan Phase 2A.

Phase 2B tidak membuat aplikasi baru, tetapi memperluas pengalaman pengguna melalui modul pembayaran, tiket digital, dan dashboard keuangan.

Target utama:

- sederhana
- cepat
- mobile-first
- minim klik
- mudah dipahami seluruh alumni

---

# 18.2 Design Principles

Seluruh antarmuka mengikuti prinsip berikut.

## Consistency

Semua halaman menggunakan:

- Layout Portal
- Layout Dashboard
- Design Token MZT
- Component Library yang sudah ada

Tidak diperbolehkan membuat gaya UI baru yang berbeda.

---

## Progressive Disclosure

Informasi ditampilkan bertahap.

Contoh:

Order

↓

Payment

↓

Ticket

↓

Check In

Pengguna tidak melihat langkah berikutnya sebelum langkah sebelumnya selesai.

---

## Mobile First

Mayoritas alumni menggunakan smartphone.

Target:

- seluruh fitur pembayaran selesai maksimal 3 menit
- seluruh halaman nyaman digunakan pada lebar 360px

---

## Reusable Components

Seluruh komponen wajib reusable.

Contoh:

OrderCard

PaymentCard

StatusBadge

Timeline

TicketCard

PaymentProofUploader

QRViewer

---

# 18.3 Portal Alumni

Portal Alumni memperoleh dua menu baru.

```
Portal

Dashboard

Profil

ID Card

Berita

Event

Event Saya

Order Saya

Pembayaran

Ticket Saya
```

---

## Event Saya

Menampilkan seluruh event yang pernah diikuti.

Setiap kartu menampilkan:

- Poster
- Nama Event
- Tanggal
- Venue
- Status Registrasi
- Status Pembayaran
- Tombol Detail

---

## Order Saya

Daftar seluruh Order.

```
Nomor Order

Nama Event

Total

Status Registrasi

Status Pembayaran

Tanggal
```

Klik membuka Detail Order.

---

## Pembayaran

Halaman khusus pembayaran.

Isi:

Status

Nominal

Metode

Riwayat

Upload Bukti

Timeline

---

## Ticket Saya

Daftar seluruh Ticket.

```
Ticket

↓

QR

↓

Status

↓

Download

↓

Detail
```

---

# 18.4 Dashboard Admin

Dashboard memperoleh menu baru.

```
Dashboard

Event

Members

Orders

Payments

Tickets

Finance

Reports
```

---

## Orders

Fungsi:

- Monitoring Registrasi
- Detail Order
- Riwayat

Filter:

Event

Status

Tanggal

Nomor Order

---

## Payments

Fungsi:

Approve

Reject

Cari

Filter

Export

Timeline

---

## Tickets

Fungsi:

Generate

Reissue

Revoke

Download

Preview

---

## Finance

Ringkasan:

Hari Ini

Minggu Ini

Bulan Ini

Total

Pending

Outstanding

Reject

Refund

---

# 18.5 User Journey

## Alumni

```
Login

↓

Event

↓

Daftar

↓

Order

↓

Bayar

↓

Waiting Verification

↓

Paid

↓

Ticket

↓

Download

↓

Check In
```

---

## Panitia Walk In

```
Cari Alumni

↓

Register

↓

Input Cash

↓

Paid

↓

Ticket

↓

Print

↓

Scan

↓

Masuk
```

---

## Finance

```
Payment Pending

↓

Review

↓

Approve

↓

Ticket Issued
```

---

# 18.5.1 Alternative User Journey

Selain User Journey utama, sistem juga harus mendukung beberapa alur alternatif yang merupakan bagian dari operasional normal.

Seluruh alur alternatif mengikuti State Machine yang telah didefinisikan pada Bab 17.14.

Implementasi tidak diperbolehkan membuat alur baru yang bertentangan dengan State Machine tersebut.

---

## Payment Rejected

```
Login

↓

Order Saya

↓

Pilih Order

↓

Lihat Detail Payment

↓

Status Rejected

↓

Lihat Alasan Penolakan

↓

Upload Bukti Baru

↓

Waiting Verification

↓

Payment Approved

↓

Ticket Issued
```

Tujuan:

- mempertahankan histori pembayaran;
- mempermudah alumni melakukan upload ulang;
- tidak membuat Payment baru apabila masih berada pada proses verifikasi yang sama.

---

## Complimentary Event

```
Login

↓

Daftar Event

↓

Register

↓

Order Registered

↓

Ticket Issued

↓

Download Ticket
```

Karena tidak terdapat kewajiban pembayaran, Ticket dapat diterbitkan segera setelah registrasi berhasil.

---

## Walk-In Registration

```
Panitia

↓

Cari Alumni

↓

Register Walk-In

↓

Input Cash

↓

Payment Paid

↓

Ticket Issued

↓

Print Ticket

↓

Peserta Masuk
```

Seluruh transaksi tetap menghasilkan Order dan Payment agar histori transaksi tetap lengkap.

---

## Payment Gateway

```
Login

↓

Order

↓

Pilih Payment Gateway

↓

Redirect Gateway

↓

Payment Success

↓

Callback

↓

Payment Paid

↓

Ticket Issued
```

Status Payment hanya berubah setelah callback dari Payment Gateway berhasil diverifikasi oleh server.

---

## Refund

```
Payment Paid

↓

Refund

↓

Ticket Revoked

↓

Notification Sent

↓

Order Updated
```

Refund tidak menghapus histori Payment maupun Ticket.

Seluruh perubahan dicatat pada Payment Log dan Ticket Log.

---

## Ticket Reissue

```
Ticket Issued

↓

Reissue Ticket

↓

Generate File Baru

↓

Download Ticket Baru
```

Reissue bukan merupakan perubahan lifecycle Ticket.

Identitas Ticket tetap menggunakan:

- Ticket UUID
- Nomor Ticket
- Order

Yang berubah hanya representasi file Ticket yang dihasilkan.

---

## Failed Upload

```
Upload Bukti

↓

Upload Gagal

↓

Error Message

↓

Retry Upload

↓

Upload Berhasil
```

Kegagalan upload tidak boleh menghapus bukti pembayaran yang telah berhasil diunggah sebelumnya.

---

## Unauthorized Access

```
User membuka Order

↓

Ownership Check

↓

Forbidden

↓

Redirect
```

User tidak diperbolehkan mengakses Order, Payment, maupun Ticket milik pengguna lain meskipun mengetahui UUID resource tersebut.

# 18.6 Order Detail Page

Menampilkan empat section utama.

## Ringkasan

Nomor Order

Event

Tanggal

Venue

---

## Status

Registrasi

Pembayaran

Ticket

---

## Pembayaran

Riwayat Payment

Upload Bukti

Outstanding

---

## Ticket

QR

Status

Download

---

# 18.7 Payment Detail

Halaman Payment terdiri dari:

```
Header

↓

Summary

↓

Proof

↓

Timeline

↓

History
```

Timeline:

```
Created

↓

Uploaded

↓

Waiting Verification

↓

Paid
```

---

# 18.8 Ticket Detail

Isi halaman:

Poster Event

Nama

Nomor Ticket

QR

Status

Download

Informasi Event

Rules

---

# 18.9 State Management

Seluruh state mengikuti pola TanStack Query.

## Query

Orders

Payments

Tickets

Finance Summary

Event Detail

---

## Mutation

Register

Upload Payment

Approve

Reject

Reissue

---

Semua mutation wajib:

- invalidate query terkait
- optimistic update bila aman
- rollback bila gagal

---

# 18.9.1 Frontend State Strategy

Frontend MZT Apps menggunakan pemisahan state berdasarkan tanggung jawab agar aplikasi tetap mudah dipelihara, mudah diuji, dan memiliki performa yang konsisten.

Seluruh implementasi wajib mengikuti strategi ini.

---

## State Classification

| Jenis State | Teknologi |
|-------------|-----------|
| Server State | TanStack Query |
| Form State | React Hook Form |
| Local UI State | React useState |
| Global UI State | React Context (bila diperlukan) |

Setiap jenis state memiliki tanggung jawab yang berbeda dan tidak boleh saling menggantikan.

---

## Server State

Server State merupakan seluruh data yang berasal dari Backend.

Contoh:

- Event
- Order
- Payment
- Ticket
- Finance Summary
- Notification
- Profile

Seluruh Server State wajib menggunakan TanStack Query.

Server State tidak diperbolehkan disimpan menggunakan React State biasa.

---

## Form State

Seluruh Form menggunakan React Hook Form.

Contoh:

- Registrasi Event
- Upload Bukti Pembayaran
- Verifikasi Payment
- Generate Ticket
- Reissue Ticket
- Event Form

Seluruh validasi Form dilakukan menggunakan schema validation yang konsisten dengan validasi Backend.

---

## Local UI State

Local UI State digunakan untuk kebutuhan tampilan yang tidak berasal dari Backend.

Contoh:

- Dialog terbuka
- Sidebar Collapse
- Tab aktif
- Accordion
- Preview Image
- Modal Confirmation

Local UI State tidak boleh digunakan untuk menyimpan data bisnis.

---

## Global UI State

Global UI State hanya digunakan apabila state diperlukan oleh banyak halaman sekaligus.

Contoh:

- Theme
- Locale
- User Preference
- Layout Preference

Global UI State tidak digunakan untuk menggantikan Server State.

---

## Query Strategy

Seluruh data yang berasal dari Backend wajib menggunakan Query.

Contoh:

```
Event Detail

↓

Orders

↓

Payments

↓

Tickets

↓

Finance Summary
```

Query wajib memiliki Query Key yang konsisten.

Contoh:

```
events

event-detail

orders

order-detail

payments

payment-detail

tickets

ticket-detail

finance-summary
```

---

## Mutation Strategy

Seluruh perubahan data menggunakan Mutation.

Contoh:

- Register Event
- Upload Payment
- Verify Payment
- Reject Payment
- Reissue Ticket

Setiap Mutation wajib:

- menampilkan loading state;
- menampilkan success atau error feedback;
- melakukan invalidate Query yang terkait;
- menggunakan optimistic update apabila aman dilakukan;
- melakukan rollback apabila optimistic update gagal.

---

## Cache Strategy

TanStack Query menjadi satu-satunya mekanisme cache data.

Cache harus:

- mengikuti stale time sesuai kebutuhan data;
- di-refresh setelah Mutation berhasil;
- dihapus ketika pengguna Logout.

Frontend tidak diperbolehkan membuat cache manual yang menyebabkan inkonsistensi data.

---

## Error Handling

Seluruh Query dan Mutation wajib memiliki penanganan Error yang konsisten.

Contoh:

```
Request

↓

Loading

↓

Success
```

atau

```
Request

↓

Error

↓

Retry
```

Kesalahan dari Backend harus ditampilkan menggunakan format Error yang konsisten.

---

## Business Logic

Business Logic tidak diperbolehkan berada di dalam komponen UI.

Seluruh Business Logic ditempatkan pada:

- Service Layer
- Custom Hook
- Utility
- Validation Layer

Komponen UI hanya bertanggung jawab terhadap presentasi dan interaksi pengguna.

---

## API Communication

Seluruh komunikasi HTTP dilakukan melalui Service Layer.

Struktur standar:

```
src/

services/

hooks/

queries/

types/
```

Komponen UI tidak diperbolehkan memanggil `fetch()`, `axios()`, maupun HTTP Client secara langsung.

---

## Source of Truth

Frontend bukan merupakan sumber kebenaran (Source of Truth).

Seluruh keputusan bisnis, validasi, ownership, permission, lifecycle, dan perubahan status hanya ditentukan oleh Backend.

Frontend hanya menampilkan hasil yang diberikan oleh Backend.

# 18.10 UI States

Seluruh halaman memiliki empat state.

Loading

Empty

Error

Success

Contoh:

```
Loading

↓

Skeleton
```

```
Tidak ada Order

↓

Illustration

↓

Button Daftar Event
```

```
Error

↓

Retry
```

---

# 18.10.1 Standard UI States

Seluruh halaman pada MZT Apps wajib memiliki standar tampilan (UI States) yang konsisten.

Tujuan utama:

- memberikan pengalaman pengguna yang konsisten;
- mengurangi kebingungan saat proses loading atau terjadi kesalahan;
- mempermudah implementasi komponen reusable;
- menjadi standar seluruh modul MZT Apps.

UI State merupakan bagian dari Design System dan wajib diterapkan pada seluruh halaman baru.

---

## Standard States

Seluruh halaman minimal memiliki lima kondisi berikut.

| State | Deskripsi |
|--------|-----------|
| Loading | Data sedang dimuat dari server. |
| Empty | Data berhasil dimuat tetapi tidak terdapat isi. |
| Error | Terjadi kesalahan saat memuat data. |
| Unauthorized | Pengguna tidak memiliki hak akses. |
| Success | Data berhasil dimuat dan siap digunakan. |

Implementasi tidak diperbolehkan menghilangkan salah satu State tanpa alasan teknis yang jelas.

---

## Loading State

Loading digunakan ketika aplikasi sedang mengambil data dari Backend.

Loading tidak diperbolehkan menggunakan Spinner penuh halaman apabila struktur data telah diketahui.

Gunakan Skeleton Loading.

Contoh:

```
Header Skeleton

↓

Card Skeleton

↓

Table Skeleton
```

Skeleton harus menyerupai struktur data akhir agar perpindahan tampilan terasa alami.

---

## Empty State

Empty State digunakan apabila proses Query berhasil tetapi tidak terdapat data.

Contoh:

```
Belum ada Order

↓

Illustration

↓

Button "Daftar Event"
```

atau

```
Belum ada Ticket

↓

Illustration

↓

Button "Lihat Event"
```

Empty State wajib memiliki:

- ilustrasi;
- judul;
- deskripsi singkat;
- Call To Action (CTA).

Tidak diperbolehkan menampilkan halaman kosong tanpa informasi.

---

## Error State

Error State digunakan ketika Query atau Mutation gagal diproses.

Contoh:

```
Gagal memuat data

↓

Pesan Error

↓

Button Retry
```

Error Message harus mudah dipahami oleh pengguna.

Informasi teknis seperti Stack Trace, SQL Error, atau Exception tidak boleh ditampilkan kepada pengguna.

---

## Unauthorized State

Unauthorized digunakan ketika pengguna tidak memiliki hak akses terhadap resource yang diminta.

Contoh:

```
403 Forbidden

↓

Anda tidak memiliki akses

↓

Kembali ke Dashboard
```

atau

```
401 Unauthorized

↓

Silakan Login kembali
```

Ownership tetap divalidasi oleh Backend.

Frontend hanya menampilkan hasil validasi tersebut.

---

## Success State

Success State merupakan kondisi normal ketika seluruh data berhasil dimuat.

Seluruh komponen dapat digunakan secara penuh.

Contoh:

```
Header

↓

Summary

↓

Content

↓

Action Button
```

---

## Mutation State

Selain Query State, seluruh Mutation juga wajib memiliki state yang konsisten.

Lifecycle Mutation:

```
Idle

↓

Submitting

↓

Success
```

atau

```
Idle

↓

Submitting

↓

Error
```

Selama proses Submitting:

- tombol Submit dinonaktifkan;
- indikator Loading ditampilkan;
- pengguna tidak dapat mengirim request ganda.

---

## Retry Strategy

Apabila terjadi kegagalan sementara, pengguna harus diberikan kesempatan untuk mencoba kembali.

Contoh:

```
Request

↓

Error

↓

Retry

↓

Success
```

Retry tidak boleh menyebabkan duplikasi transaksi.

Seluruh operasi yang bersifat kritikal wajib mengikuti mekanisme Idempotency yang telah didefinisikan pada Bab 17.

---

## Toast Notification

Setiap Mutation yang berhasil atau gagal wajib memberikan umpan balik kepada pengguna.

Contoh:

Berhasil:

```
Pembayaran berhasil diunggah.
```

```
Ticket berhasil diterbitkan.
```

```
Perubahan berhasil disimpan.
```

Gagal:

```
Upload gagal.
```

```
Verifikasi pembayaran gagal.
```

```
Silakan coba kembali.
```

Toast hanya digunakan untuk notifikasi singkat.

Riwayat lengkap akan disimpan pada Notification Center (Phase 2D).

---

## Offline State

Apabila koneksi internet terputus, aplikasi harus memberikan informasi yang jelas kepada pengguna.

Contoh:

```
Tidak ada koneksi internet.

↓

Periksa jaringan Anda.

↓

Button Coba Lagi
```

Request yang gagal karena jaringan tidak boleh menghasilkan perubahan data sebagian.

---

## Empty Search State

Apabila hasil pencarian tidak ditemukan, tampilkan Empty Search State.

Contoh:

```
Tidak ditemukan hasil untuk

"Reuni 2025"

↓

Button Reset Filter
```

Halaman tidak boleh menampilkan tabel kosong tanpa penjelasan.

---

## Accessibility

Seluruh UI State wajib memenuhi standar aksesibilitas.

Minimal:

- keyboard navigation;
- focus indicator;
- semantic HTML;
- ARIA Label;
- kontras minimum WCAG AA.

Loading maupun Error State tetap harus dapat diakses menggunakan Screen Reader.

---

## General Rules

Seluruh halaman baru wajib mengikuti aturan berikut.

1. Loading menggunakan Skeleton.

2. Empty memiliki Illustration dan Call To Action.

3. Error memiliki pesan yang mudah dipahami serta tombol Retry.

4. Unauthorized tidak menampilkan informasi sensitif.

5. Success menggunakan komponen final tanpa Placeholder.

6. Mutation selalu memberikan umpan balik kepada pengguna.

7. UI State harus konsisten di seluruh Portal maupun Dashboard.

8. Komponen UI State wajib berasal dari Shared Component Library apabila tersedia.

9. Frontend tidak diperbolehkan menentukan Success ataupun Error tanpa respons dari Backend.

10. Backend tetap menjadi Single Source of Truth terhadap seluruh status aplikasi.

# 18.11 Notification UX

Perubahan status menghasilkan Toast.

Contoh:

```
Pembayaran berhasil diunggah.
```

```
Pembayaran disetujui.
```

```
Ticket berhasil diterbitkan.
```

Selain Toast, Notification Center (Phase 2D) akan menyimpan seluruh histori.

---

# 18.12 Responsive Behavior

Desktop

Sidebar penuh.

Tablet

Sidebar collapse.

Mobile

Bottom Navigation.

QR memenuhi lebar layar.

Button minimal tinggi 44px.

---

# 18.13 Accessibility

Semua halaman memenuhi:

- keyboard navigation
- focus indicator
- semantic HTML
- alt image
- aria-label
- contrast minimum WCAG AA

---

# 18.14 Error Experience

Contoh:

Pembayaran ditolak.

Halaman tetap menampilkan:

- alasan penolakan
- tombol Upload Ulang
- histori sebelumnya

Tidak boleh menghapus histori.

---

# 18.15 Design System Compliance

Seluruh komponen mengikuti:

- shadcn/ui
- TailwindCSS
- TanStack Router
- TanStack Query

Tidak diperbolehkan menggunakan library UI lain tanpa ADR baru.

---

# 18.16 Component Inventory

## Portal

- OrderCard
- PaymentCard
- PaymentTimeline
- TicketCard
- QRViewer
- PaymentUploader
- StatusBadge
- OutstandingCard

## Dashboard

- PaymentTable
- FinanceSummaryCard
- VerificationDialog
- TicketPreviewDialog
- TicketReissueDialog
- OrderDetailDialog

---

# 18.16.1 Shared Component Library

Seluruh antarmuka MZT Apps wajib dibangun menggunakan Shared Component Library.

Tujuan utama:

- menjaga konsistensi tampilan;
- mengurangi duplikasi komponen;
- mempercepat pengembangan fitur baru;
- mempermudah pemeliharaan (maintenance);
- memastikan seluruh Portal dan Dashboard memiliki pengalaman pengguna yang seragam.

Komponen yang telah tersedia wajib digunakan kembali sebelum membuat komponen baru.

Tidak diperbolehkan membuat komponen dengan fungsi yang sama tanpa alasan teknis yang jelas.

---

## Component Categories

Shared Component Library dibagi menjadi beberapa kategori.

- Layout Components
- Display Components
- Form Components
- Feedback Components
- Navigation Components
- Dialog Components
- Utility Components

---

# Layout Components

Digunakan untuk membangun struktur halaman.

Komponen:

- PageContainer
- PageHeader
- PageSection
- ContentCard
- GridLayout
- ResponsiveContainer

Seluruh halaman Portal maupun Dashboard wajib menggunakan Layout Components yang sama.

---

# Display Components

Digunakan untuk menampilkan informasi.

Komponen:

- StatusBadge
- Timeline
- InfoCard
- StatisticCard
- Avatar
- PosterPreview
- QRViewer
- DetailList
- KeyValueList

Display Components bersifat presentasional dan tidak mengandung Business Logic.

---

# Form Components

Digunakan pada seluruh proses input.

Komponen:

- TextField
- TextArea
- SelectField
- DatePicker
- DateRangePicker
- CurrencyInput
- FileUploader
- SearchField
- Checkbox
- RadioGroup

Seluruh Form wajib menggunakan React Hook Form.

Validasi dilakukan menggunakan schema validation yang konsisten dengan Backend.

---

# Feedback Components

Digunakan untuk memberikan informasi kepada pengguna.

Komponen:

- LoadingSkeleton
- EmptyState
- ErrorState
- SuccessState
- Toast
- Alert
- ProgressBar

Seluruh Feedback Components wajib mengikuti Standard UI States pada Bab 18.10.1.

---

# Navigation Components

Digunakan untuk navigasi aplikasi.

Komponen:

- Sidebar
- BottomNavigation
- Breadcrumb
- Pagination
- Tabs
- FilterBar
- SearchBar

Navigation Components harus responsif pada Desktop, Tablet, maupun Mobile.

---

# Dialog Components

Digunakan untuk aksi yang memerlukan konfirmasi.

Komponen:

- ConfirmDialog
- DeleteDialog
- VerificationDialog
- TicketPreviewDialog
- TicketReissueDialog
- ImagePreviewDialog

Seluruh Dialog wajib dapat ditutup menggunakan keyboard maupun tombol Escape.

---

# Utility Components

Digunakan oleh berbagai modul.

Komponen:

- CopyButton
- DownloadButton
- ShareButton
- PrintButton
- RefreshButton
- RetryButton

Utility Components harus bersifat reusable dan tidak bergantung pada modul tertentu.

---

# Portal Components

Komponen khusus Portal Alumni.

- EventCard
- OrderCard
- PaymentCard
- TicketCard
- PaymentTimeline
- OutstandingCard
- PaymentUploader
- TicketViewer

Portal Components hanya bertanggung jawab terhadap tampilan Portal.

---

# Dashboard Components

Komponen khusus Dashboard.

- OrderTable
- PaymentTable
- TicketTable
- FinanceSummaryCard
- VerificationDialog
- TicketPreviewDialog
- TicketReissueDialog
- ReportFilter
- DashboardStatistic

Dashboard Components menggunakan Shared Components sebagai fondasi.

---

# Component Rules

Seluruh komponen wajib mengikuti aturan berikut.

1. Satu komponen memiliki satu tanggung jawab.

2. Komponen presentasional tidak boleh memanggil API secara langsung.

3. Business Logic ditempatkan pada Service Layer atau Custom Hook.

4. Komponen menerima data melalui Props.

5. Komponen tidak boleh mengakses Database maupun Storage secara langsung.

6. Seluruh komponen harus dapat digunakan kembali pada lebih dari satu halaman.

7. Styling mengikuti Design Token MZT Apps.

8. Komponen harus mendukung Dark Mode.

9. Komponen harus responsif.

10. Komponen wajib memenuhi standar aksesibilitas WCAG AA.

---

# Component Naming Convention

Penamaan komponen menggunakan PascalCase.

Contoh:

```
OrderCard

PaymentCard

TicketCard

StatusBadge

FinanceSummaryCard

VerificationDialog
```

Nama komponen harus mendeskripsikan fungsi bisnisnya secara jelas.

---

# Component Directory

Struktur direktori frontend direkomendasikan sebagai berikut.

```
src/

components/
│
├── shared/
│
├── layout/
│
├── portal/
│
├── dashboard/
│
├── dialogs/
│
├── feedback/
│
├── forms/
│
└── navigation/
```

Komponen baru wajib ditempatkan pada direktori yang sesuai.

---

# Compliance

Seluruh komponen wajib mengikuti:

- shadcn/ui
- TailwindCSS
- TanStack Router
- TanStack Query
- React Hook Form

Tidak diperbolehkan menggunakan UI Library lain tanpa persetujuan melalui Architecture Decision Record (ADR).

Shared Component Library merupakan fondasi seluruh antarmuka MZT Apps dan menjadi standar implementasi pada seluruh fase pengembangan berikutnya.

# 18.17 Navigation Matrix

| Role | Menu |
|-------|------|
| Alumni | Event Saya, Order Saya, Pembayaran, Ticket Saya |
| Panitia | Orders, Tickets |
| Finance | Orders, Payments, Finance |
| Admin | Semua Menu |

---

# 18.18 UX Acceptance Criteria

UX Acceptance Criteria menjadi standar kualitas minimal yang wajib dipenuhi sebelum suatu fitur dinyatakan selesai (Done).

Seluruh implementasi Frontend pada Phase 2B wajib memenuhi kriteria berikut.

---

## Portal Alumni

Target pengalaman pengguna Portal Alumni.

### Event Registration

- Registrasi Event dapat diselesaikan maksimal dalam 3 klik.
- Waktu proses registrasi tidak lebih dari 10 detik pada koneksi normal.
- Status registrasi langsung diperbarui setelah Order berhasil dibuat.
- Tidak boleh terjadi registrasi ganda pada Event yang sama.

---

### Payment

- Upload bukti pembayaran dapat diselesaikan dalam waktu kurang dari 2 menit.
- Pengguna dapat melihat status pembayaran secara realtime setelah proses verifikasi.
- Pengguna selalu mengetahui alasan penolakan apabila Payment berstatus Rejected.
- Upload ulang bukti pembayaran tidak menghapus histori sebelumnya.

---

### Ticket

- Ticket diterbitkan secara otomatis setelah seluruh syarat terpenuhi.
- Ticket dapat diunduh maksimal dalam 1 klik.
- QR Code ditampilkan dalam waktu kurang dari 1 detik.
- Ticket tetap dapat diakses selama masih berlaku.

---

### User Experience

Seluruh halaman Portal Alumni wajib:

- Mobile Responsive.
- Dark Mode Compatible.
- Mudah dipahami oleh pengguna baru.
- Tidak memerlukan pelatihan khusus.

---

## Dashboard

Target pengalaman pengguna Dashboard Admin.

### Order Management

- Pencarian Order selesai dalam waktu kurang dari 2 detik.
- Filter dapat diterapkan tanpa reload halaman.
- Detail Order dapat dibuka maksimal dalam 1 klik.

---

### Payment Verification

- Finance dapat memverifikasi satu Payment dalam waktu kurang dari 30 detik.
- Riwayat Payment dapat diakses tanpa berpindah halaman.
- Bukti pembayaran dapat diperbesar (Preview) sebelum diverifikasi.

---

### Ticket Management

- Reissue Ticket dapat dilakukan dalam waktu kurang dari 10 detik.
- Ticket Preview tersedia sebelum proses Download.
- Ticket Revocation memberikan konfirmasi sebelum diproses.

---

### Finance Dashboard

Dashboard Finance wajib mampu menampilkan:

- Total Income.
- Pending Payment.
- Outstanding Payment.
- Refund.
- Rejected Payment.

Seluruh informasi harus diperbarui setelah Mutation berhasil tanpa melakukan refresh halaman.

---

## Performance

Target performa Frontend.

| Metric | Target |
|---------|--------|
| Largest Contentful Paint (LCP) | < 2.5 detik |
| Interaction to Next Paint (INP) | < 200 ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| First Contentful Paint (FCP) | < 1.8 detik |

Target di atas mengacu pada Core Web Vitals.

---

## Accessibility

Seluruh halaman wajib memenuhi standar minimum WCAG AA.

Minimal meliputi:

- Keyboard Navigation.
- Focus Indicator.
- Semantic HTML.
- Alt Text pada seluruh gambar.
- ARIA Label pada seluruh komponen interaktif.
- Kontras warna minimum sesuai WCAG AA.

---

## Responsive Design

Seluruh halaman wajib mendukung:

| Device | Lebar |
|----------|--------|
| Mobile | 360–767 px |
| Tablet | 768–1023 px |
| Desktop | ≥1024 px |

Tidak diperbolehkan terdapat Horizontal Scroll pada resolusi yang didukung.

---

## Loading Experience

Seluruh halaman wajib memiliki:

- Skeleton Loading.
- Empty State.
- Error State.
- Unauthorized State.
- Success State.

Loading Spinner penuh halaman hanya diperbolehkan apabila struktur halaman belum dapat ditentukan.

---

## Notification Experience

Setiap Mutation wajib memberikan umpan balik kepada pengguna.

Minimal berupa:

- Toast Success.
- Toast Error.
- Loading Indicator.

Riwayat lengkap akan tersedia pada Notification Center (Phase 2D).

---

## Browser Compatibility

Frontend wajib mendukung:

- Google Chrome (2 versi terakhir)
- Microsoft Edge (2 versi terakhir)
- Mozilla Firefox (2 versi terakhir)
- Safari (2 versi terakhir)

Tidak diperbolehkan menggunakan fitur browser yang belum stabil tanpa mekanisme fallback.

---

## Technical Quality

Seluruh implementasi wajib memenuhi standar berikut.

- Menggunakan TanStack Router.
- Menggunakan TanStack Query.
- Menggunakan React Hook Form.
- Menggunakan Shared Component Library.
- Menggunakan Design Token MZT Apps.
- Tidak terdapat duplikasi komponen.
- Tidak terdapat Business Logic pada UI Component.

---

## Definition of Done (Frontend)

Sebuah fitur Frontend dinyatakan selesai apabila:

1. Seluruh Acceptance Criteria telah terpenuhi.

2. UI telah sesuai Design System MZT Apps.

3. Responsive pada Mobile, Tablet, dan Desktop.

4. Accessibility memenuhi standar minimum WCAG AA.

5. Tidak terdapat Error maupun Warning pada Console Browser.

6. Seluruh Query dan Mutation berjalan sesuai kontrak API.

7. Seluruh UI State (Loading, Empty, Error, Unauthorized, Success) telah diimplementasikan.

8. Telah melalui Code Review.

9. Build Production berhasil tanpa Error.

10. Lulus User Acceptance Test (UAT).

# 18.19 Frontend Architecture Rules

Frontend MZT Apps wajib mengikuti aturan arsitektur yang telah ditetapkan pada PRD, Architecture Decision Record (ADR), dan Design System.

Tujuan utama aturan ini adalah menjaga konsistensi implementasi, mengurangi technical debt, serta memastikan seluruh fitur dapat dikembangkan secara berkelanjutan.

Seluruh implementasi Frontend pada Phase 2B dan fase berikutnya wajib mematuhi aturan berikut.

---

## Architecture Principles

Frontend dikembangkan berdasarkan prinsip berikut.

- Separation of Concerns
- Single Responsibility Principle
- Reusable Components
- Server State First
- Backend as Single Source of Truth
- Composition over Duplication
- Mobile First
- Progressive Enhancement

Seluruh keputusan implementasi harus mengikuti prinsip-prinsip tersebut.

---

## Layer Architecture

Struktur aplikasi dibagi menjadi beberapa lapisan.

```
Presentation Layer

↓

Page Layer

↓

Feature Layer

↓

Service Layer

↓

API

↓

Backend
```

Setiap layer memiliki tanggung jawab yang berbeda.

Tidak diperbolehkan melompati layer tanpa alasan teknis yang jelas.

---

## Presentation Layer

Presentation Layer bertanggung jawab terhadap tampilan antarmuka.

Komponen pada layer ini:

- tidak memiliki Business Logic;
- tidak memanggil API secara langsung;
- hanya menerima Props;
- dapat digunakan kembali (Reusable).

Contoh:

- OrderCard
- PaymentCard
- TicketCard
- StatusBadge
- Timeline
- SummaryCard

---

## Page Layer

Page Layer bertanggung jawab menggabungkan berbagai Feature menjadi satu halaman.

Page hanya mengatur:

- Layout;
- Routing;
- Komposisi Feature;
- Metadata halaman.

Page tidak diperbolehkan berisi Business Logic yang kompleks.

---

## Feature Layer

Feature Layer berisi implementasi proses bisnis pada sisi Frontend.

Contoh:

- Register Event
- Upload Payment
- Verify Payment
- Reissue Ticket
- Download Ticket

Feature menggunakan Service Layer sebagai sumber komunikasi dengan Backend.

---

## Service Layer

Seluruh komunikasi HTTP dilakukan melalui Service Layer.

Contoh struktur:

```
src/

services/

hooks/

queries/

types/
```

Service bertanggung jawab terhadap:

- Request;
- Response;
- Transformasi Data;
- Error Mapping.

Komponen UI tidak diperbolehkan memanggil HTTP Client secara langsung.

---

## State Management Rules

Frontend menggunakan pembagian state sebagai berikut.

| Jenis State | Teknologi |
|-------------|-----------|
| Server State | TanStack Query |
| Form State | React Hook Form |
| Local UI State | React useState |
| Global UI State | React Context (bila diperlukan) |

Setiap jenis state memiliki tanggung jawab yang berbeda.

Server State tidak boleh dipindahkan ke Local State tanpa alasan yang jelas.

---

## API Communication Rules

Seluruh komunikasi API wajib mengikuti kontrak pada Bab 17.

Aturan:

- menggunakan HTTPS;
- menggunakan Bearer Token;
- menggunakan UUID sebagai Public Identifier;
- tidak mengekspos Internal ID;
- mengikuti format Response yang konsisten.

Frontend tidak diperbolehkan membuat kontrak API sendiri.

---

## Mutation Rules

Seluruh perubahan data wajib menggunakan Mutation.

Setiap Mutation harus:

- menampilkan Loading State;
- memberikan Success atau Error Feedback;
- melakukan Invalidate Query terkait;
- menggunakan Optimistic Update apabila aman;
- melakukan Rollback apabila Optimistic Update gagal.

Mutation tidak boleh menyebabkan duplikasi transaksi.

---

## Component Rules

Seluruh komponen wajib:

- reusable;
- stateless apabila memungkinkan;
- memiliki satu tanggung jawab;
- mengikuti Shared Component Library;
- mendukung Dark Mode;
- memenuhi WCAG AA.

Tidak diperbolehkan membuat komponen baru apabila komponen dengan fungsi yang sama telah tersedia.

---

## Folder Structure

Struktur direktori yang direkomendasikan.

```
src/
│
├── components/
│   ├── shared/
│   ├── layout/
│   ├── portal/
│   ├── dashboard/
│   ├── forms/
│   ├── dialogs/
│   └── feedback/
│
├── features/
│
├── services/
│
├── hooks/
│
├── queries/
│
├── types/
│
├── utils/
│
└── routes/
```

Seluruh modul baru harus mengikuti struktur ini.

---

## Error Handling Rules

Seluruh Error berasal dari Backend.

Frontend hanya bertugas:

- menampilkan Error;
- melakukan Retry apabila memungkinkan;
- menjaga agar UI tetap stabil.

Frontend tidak diperbolehkan menentukan keputusan bisnis berdasarkan Error tanpa konfirmasi dari Backend.

---

## Security Rules

Frontend tidak boleh:

- menyimpan Business Rules;
- menyimpan Permission;
- menyimpan Role;
- memvalidasi Ownership.

Seluruh validasi dilakukan oleh Backend.

Frontend hanya menampilkan hasil validasi tersebut.

---

## Performance Rules

Frontend wajib:

- menggunakan Lazy Loading untuk halaman besar;
- melakukan Code Splitting;
- menghindari Render yang tidak diperlukan;
- memanfaatkan Cache TanStack Query;
- mengoptimalkan ukuran gambar dan aset.

Seluruh optimasi dilakukan tanpa mengubah perilaku bisnis aplikasi.

---

## Code Quality Rules

Seluruh implementasi wajib:

- menggunakan TypeScript Strict Mode;
- lulus ESLint;
- lulus Build Production;
- tidak menghasilkan Warning kritis;
- mengikuti Naming Convention proyek.

---

## Design System Compliance

Seluruh antarmuka wajib menggunakan:

- shadcn/ui;
- TailwindCSS;
- Design Token MZT Apps;
- Shared Component Library.

Penggunaan UI Library lain hanya diperbolehkan apabila telah disetujui melalui Architecture Decision Record (ADR).

---

## Definition of Compliance

Implementasi Frontend dinyatakan memenuhi standar arsitektur apabila:

1. Mengikuti struktur Layer Architecture.

2. Menggunakan Shared Component Library.

3. Menggunakan TanStack Query untuk Server State.

4. Menggunakan React Hook Form untuk seluruh Form.

5. Tidak terdapat Business Logic pada komponen presentasional.

6. Seluruh komunikasi API melalui Service Layer.

7. Seluruh halaman memenuhi Standard UI States.

8. Mengikuti Design System MZT Apps.

9. Lulus Code Review.

10. Lulus User Acceptance Test (UAT).

Dokumen ini menjadi pedoman implementasi seluruh Frontend MZT Apps pada Phase 2B dan fase-fase berikutnya.

# 19. Finance Dashboard & Reporting

## 19.1 Overview

Finance Dashboard merupakan pusat kendali operasional seluruh transaksi Event Management System.

Dashboard ini digunakan oleh:

- Bendahara
- Admin Event
- Ketua Panitia
- Pengurus MZT

Tujuan utama dashboard adalah memberikan visibilitas secara realtime terhadap kondisi keuangan, registrasi, pembayaran, dan tiket tanpa perlu melakukan rekap manual.

Finance Dashboard tidak hanya berfungsi sebagai halaman laporan, tetapi juga sebagai pusat pengambilan keputusan selama pelaksanaan event.

---

# 19.2 Objectives

Finance Dashboard harus mampu menjawab pertanyaan berikut secara realtime.

- Berapa peserta yang sudah mendaftar?
- Berapa peserta yang sudah membayar?
- Berapa peserta yang belum membayar?
- Berapa pemasukan hari ini?
- Berapa total pemasukan event?
- Berapa tiket yang sudah diterbitkan?
- Berapa peserta yang sudah check-in?
- Berapa pembayaran yang menunggu verifikasi?
- Berapa pembayaran yang ditolak?
- Berapa kursi yang masih tersedia?

Semua informasi tersebut harus dapat diperoleh tanpa melakukan query manual ke database.

---

# 19.3 Dashboard Layout

Dashboard dibagi menjadi beberapa section utama.

```
Overview
↓

Finance Summary
↓

Registration Summary
↓

Payment Monitoring
↓

Ticket Monitoring
↓

Attendance Monitoring

↓

Activity Timeline

↓

Quick Action
```

---

# 19.4 Overview Cards

Baris pertama berisi KPI utama.

```
+------------------------+
| Total Registrasi       |
+------------------------+

+------------------------+
| Total Pembayaran       |
+------------------------+

+------------------------+
| Total Pendapatan       |
+------------------------+

+------------------------+
| Total Check-In         |
+------------------------+
```

Setiap card menampilkan:

- nilai saat ini
- perubahan hari ini
- persentase terhadap target

---

# 19.5 Registration Summary

Informasi yang ditampilkan:

- Total Registrasi
- Draft
- Registered
- Confirmed
- Checked In
- Finished
- Cancelled

Visualisasi menggunakan:

- Pie Chart
- Progress Bar
- Ring Summary

---

# 19.6 Payment Summary

Menampilkan kondisi pembayaran.

```
Pending

Waiting Verification

Paid

Rejected

Refund
```

Setiap status menampilkan:

- jumlah transaksi
- total nominal
- persentase

---

# 19.7 Revenue Summary

Ringkasan pemasukan.

```
Hari Ini

Minggu Ini

Bulan Ini

Total
```

Semua nominal menggunakan snapshot Payment.

Bukan menghitung ulang dari Event.

---

# 19.7.1 KPI Calculation Rules

Seluruh KPI pada Finance Dashboard harus dihitung menggunakan sumber data yang telah ditentukan.

Dashboard tidak diperbolehkan menghitung nilai yang berbeda dengan data transaksi sumber.

---

## Registration

Sumber:

```
orders.status_registrasi
```

---

## Payment

Sumber:

```
payments.status
```

---

## Revenue

Sumber:

```
payments.amount
```

Hanya Payment dengan status **Paid** yang dihitung sebagai pendapatan.

Payment dengan status:

- Pending
- Waiting Verification
- Rejected

tidak dihitung sebagai Revenue.

Refund mengurangi Total Revenue sesuai nominal Refund yang telah disetujui.

---

## Ticket

Sumber:

```
tickets.status
```

---

## Attendance

Sumber:

```
prisensi_kehadiran
```

Phase 2C akan menambahkan agregasi berdasarkan Gate.

---

## Single Source of Truth

Dashboard tidak diperbolehkan menyimpan hasil agregasi permanen.

Seluruh KPI dihitung berdasarkan data transaksi terbaru atau materialized summary yang telah divalidasi.

Semua angka harus dapat ditelusuri hingga transaksi sumbernya.

# 19.8 Outstanding Payment

Menampilkan seluruh Order yang belum lunas.

Kolom:

- Nomor Order
- Nama
- Event
- Outstanding
- Jatuh Tempo
- Status

Aksi:

- Lihat Detail
- Kirim Pengingat (Phase 2D)

---

# 19.9 Verification Queue

Queue pembayaran yang menunggu verifikasi.

Kolom:

- Nama
- Nomor Order
- Nominal
- Metode
- Upload Terakhir
- Durasi Menunggu

Quick Action:

Approve

Reject

Detail

---

# 19.10 Ticket Monitoring

Menampilkan:

Issued

Downloaded

Checked In

Revoked

Expired

Grafik:

```
Issued

██████████

Downloaded

██████

Checked In

████
```

---

# 19.11 Attendance Monitoring

Data realtime.

```
Masuk Hari Ini

↓

Gate A

↓

Gate B

↓

Gate C
```

Phase 2C akan menambahkan monitoring per gate.

---

# 19.12 Finance Timeline

Menampilkan aktivitas terbaru.

Contoh:

```
09:10

Payment Approved

Andi

Rp250.000
```

```
09:12

Ticket Issued

MZT-2026-000123
```

```
09:15

Check In

Gate A
```

Timeline bersifat realtime.

---

# 19.12.1 Activity Classification

Finance Timeline mengelompokkan aktivitas berdasarkan jenis transaksi.

Kategori aktivitas:

- Registration
- Payment
- Ticket
- Attendance
- Refund
- System

Seluruh aktivitas wajib memiliki:

- waktu kejadian;
- jenis aktivitas;
- pelaku;
- referensi transaksi;
- deskripsi singkat.

Timeline disusun berdasarkan waktu terbaru dan tidak diperbolehkan menghapus histori aktivitas yang telah tercatat.

# 19.13 Search & Filter

Dashboard mendukung filter:

Event

Tanggal

Metode Pembayaran

Status Pembayaran

Status Registrasi

Status Ticket

Petugas

Keyword

Semua filter dapat dikombinasikan.

---

# 19.14 Export

Mendukung ekspor:

CSV

Excel

PDF

Print

Future:

Google Sheets

---

# 19.15 Reports

Laporan utama.

## Registration Report

Berisi:

- seluruh peserta
- status registrasi
- status pembayaran

---

## Finance Report

Berisi:

- seluruh pembayaran
- total
- metode
- status

---

## Ticket Report

Berisi:

- ticket issued
- revoked
- checked in

---

## Attendance Report

Phase 2C.

---

# 19.16 Charts

Dashboard menggunakan visualisasi:

Line Chart

Bar Chart

Pie Chart

Donut Chart

Progress Ring

Heat Map (Future)

Semua chart harus dapat difilter berdasarkan Event.

---

# 19.17 Real-Time Refresh

Dashboard harus mendukung pembaruan data tanpa refresh halaman.

Strategi:

- Auto refresh setiap 30 detik
- Manual refresh
- Background query menggunakan TanStack Query

Untuk data kritikal (Verification Queue), refresh dapat dipercepat menjadi 10 detik.

---

# 19.17.1 Dashboard States

Finance Dashboard wajib memiliki State yang konsisten.

| State | Deskripsi |
|--------|-----------|
| Loading | Dashboard sedang memuat data |
| Empty | Belum terdapat data transaksi |
| Error | Terjadi kesalahan saat mengambil data |
| Unauthorized | Pengguna tidak memiliki hak akses |
| Success | Dashboard berhasil dimuat |

Seluruh Dashboard mengikuti Standard UI States pada Bab 18.10.1.

# 19.18 Permissions

| Menu | Alumni | Panitia | Finance | Admin |
|-------|:------:|:--------:|:--------:|:------:|
| Overview | ✗ | ✓ | ✓ | ✓ |
| Verification Queue | ✗ | ✗ | ✓ | ✓ |
| Finance Summary | ✗ | ✗ | ✓ | ✓ |
| Revenue | ✗ | ✗ | ✓ | ✓ |
| Ticket Monitoring | ✗ | ✓ | ✓ | ✓ |
| Export | ✗ | ✗ | ✓ | ✓ |
| Activity Timeline | ✗ | ✓ | ✓ | ✓ |

---

# 19.19 Performance Requirements

Dashboard harus mampu menangani:

- 10.000 Order
- 20.000 Payment
- 20.000 Ticket
- 50.000 Attendance

Target performa:

- Initial Load < 2 detik
- Filter < 1 detik
- Export < 10 detik
- Refresh < 500 ms (incremental)

---

# 19.20 Audit & Transparency

Seluruh data pada dashboard harus dapat ditelusuri hingga transaksi sumbernya.

Contoh:

Revenue Card

↓

Klik

↓

Daftar Payment

↓

Klik Payment

↓

Order

↓

Event

↓

Bukti Pembayaran

↓

Audit Log

Dashboard tidak boleh menampilkan angka yang tidak dapat ditelusuri ke sumber datanya.

---

# 19.20.1 Drill Down Rules

Seluruh angka yang ditampilkan pada Dashboard wajib dapat ditelusuri hingga transaksi sumbernya.

Contoh:

```
Revenue

↓

Payment

↓

Order

↓

Event

↓

Payment Proof

↓

Audit Log
```

atau

```
Total Registrasi

↓

Order

↓

Member

↓

Event
```

atau

```
Checked In

↓

Attendance

↓

Ticket

↓

Order
```

Dashboard tidak diperbolehkan menampilkan KPI yang tidak memiliki hubungan langsung dengan data transaksi sumber.

Prinsip ini menjadi dasar transparansi dan auditabilitas seluruh laporan keuangan.

# 19.21 Operational Mode

Dashboard memiliki dua mode operasi.

## Daily Mode

Digunakan pada operasional harian.

Fokus:

- Registrasi
- Pembayaran
- Tiket

---

## Event Day Mode

Digunakan saat hari-H acara.

Fokus:

- Check-In
- Gate Monitoring
- Ticket Validation
- Live Attendance
- Incident Monitoring

Mode ini akan diaktifkan penuh pada Phase 2C.

---

# 19.22 Dashboard Acceptance Criteria

Dashboard dianggap selesai apabila:

- KPI realtime tersedia
- Queue verifikasi berjalan
- Ringkasan pembayaran akurat
- Export laporan berfungsi
- Filter bekerja pada seluruh modul
- Semua angka dapat ditelusuri ke data sumber
- Tidak ada query N+1 pada halaman utama
- Mendukung desktop dan tablet
- Siap digunakan bendahara selama Reuni Akbar

# 19.22.1 Definition of Done

Finance Dashboard dinyatakan selesai apabila memenuhi seluruh kriteria berikut.

1. KPI ditampilkan secara realtime sesuai sumber data.

2. Seluruh angka dapat dilakukan Drill Down hingga transaksi sumber.

3. Filter bekerja pada seluruh modul Dashboard.

4. Export menghasilkan data yang konsisten dengan tampilan Dashboard.

5. Tidak terdapat Query N+1 pada halaman utama.

6. Dashboard memenuhi target performa yang telah ditetapkan.

7. Seluruh halaman mengikuti Standard UI States.

8. Dashboard lulus User Acceptance Test (UAT).

9. Dashboard memenuhi Role & Permission yang telah ditentukan.

10. Seluruh perubahan telah melalui Code Review dan siap digunakan pada operasional Reuni Akbar.

# 20. Communication Engine

## 20.1 Overview

Communication Engine merupakan layanan terpusat (centralized communication service) yang bertanggung jawab terhadap seluruh komunikasi keluar (outbound communication) pada MZT Apps.

Communication Engine menjadi lapisan (layer) yang berada di atas seluruh domain bisnis sehingga setiap perubahan penting pada sistem dapat dikomunikasikan secara konsisten kepada pengguna tanpa domain bisnis mengetahui detail cara pengiriman.

Communication Engine mendukung:

- Notification
- Reminder
- Broadcast
- Campaign (Future)
- Multi Channel Delivery
- Queue Processing
- Communication History

Communication Engine merupakan evolusi dari Notification Engine agar mampu mendukung kebutuhan organisasi dalam jangka panjang tanpa perubahan arsitektur.

---

# 20.2 Objectives

Communication Engine memiliki tujuan utama:

- Menyediakan satu pintu komunikasi seluruh aplikasi.
- Memisahkan business logic dari mekanisme pengiriman pesan.
- Mendukung berbagai channel komunikasi.
- Menyediakan histori komunikasi lengkap.
- Mendukung retry otomatis.
- Mendukung komunikasi realtime maupun terjadwal.
- Mendukung broadcast ribuan alumni.
- Menjadi fondasi integrasi WhatsApp, Email, Push Notification, Telegram, dan channel lain.

---

# 20.3 Architecture

Seluruh domain tidak pernah mengirim pesan secara langsung.

Semua domain hanya menghasilkan Domain Event.

```
                Domain Layer

 Order
 Payment
 Ticket
 Attendance
 Membership
 Finance
 Announcement

          │

          ▼

      Domain Event

          │

          ▼

 Communication Engine

          │

 ┌────────┼────────┬─────────┬──────────┐

 ▼        ▼        ▼         ▼          ▼

Queue   Email   WhatsApp   In-App    Push

          │

          ▼

       Provider
```

Business Domain tidak mengetahui:

- SMTP
- WhatsApp
- Firebase
- Telegram

Semua ditangani Communication Engine.

---

# 20.4 Domain Events

Communication Engine bekerja berdasarkan Domain Event.

Contoh:

## Registration

OrderCreated

OrderCancelled

RegistrationConfirmed

---

## Payment

PaymentCreated

PaymentUploaded

PaymentWaitingVerification

PaymentApproved

PaymentRejected

PaymentRefunded

---

## Ticket

TicketIssued

TicketReissued

TicketRevoked

TicketDownloaded

---

## Attendance

CheckInSuccess

CheckInRejected

GateOpened

GateClosed

---

## Membership

AccountCreated

PasswordReset

PasswordChanged

---

## Organization

AnnouncementPublished

NewsPublished

EventPublished

BroadcastCreated

---

Communication Engine hanya mengenali Event.

Business Logic tetap berada pada Domain Service.

---

# 20.4.1 Domain Event Mapping Rules

Communication Engine hanya menerima Domain Event yang berasal dari Domain Layer.

Seluruh Domain Event harus memiliki satu sumber (Source of Truth) yang jelas dan tidak diperbolehkan dihasilkan langsung oleh Controller maupun Frontend.

| Domain | Event |
|---------|-------|
| Order | OrderCreated, OrderCancelled, RegistrationConfirmed |
| Payment | PaymentCreated, PaymentUploaded, PaymentApproved, PaymentRejected, PaymentRefunded |
| Ticket | TicketIssued, TicketReissued, TicketRevoked, TicketDownloaded |
| Attendance | CheckInSuccess, CheckInRejected |
| Membership | AccountCreated, PasswordReset, PasswordChanged |
| Organization | AnnouncementPublished, BroadcastCreated |

Setiap Domain Event hanya boleh dipublikasikan satu kali untuk setiap perubahan bisnis yang sama.

Communication Engine bertanggung jawab memproses Event tersebut menjadi komunikasi yang sesuai.

# 20.5 Communication Types

Communication dibagi menjadi beberapa kategori.

## Transactional

Komunikasi yang berkaitan langsung dengan transaksi pengguna.

Contoh:

- Payment Approved
- Ticket Ready
- Password Reset

Transactional bersifat wajib.

---

## Reminder

Komunikasi yang dikirim berdasarkan waktu.

Contoh:

- H-30
- H-14
- H-7
- H-3
- H-1

---

## Broadcast

Komunikasi massal.

Contoh:

- Pengumuman Reuni
- Pengumuman Organisasi
- Jadwal Baru
- Informasi Penting

---

## Campaign (Future)

Komunikasi promosi atau kegiatan organisasi.

Misalnya:

- Donasi
- Sponsor
- Program Alumni

---

# 20.6 Communication Channels

Phase 2B mendukung channel berikut.

## In-App Notification

Notification Center Portal Alumni.

Selalu aktif.

---

## Email

Digunakan untuk:

- Ticket
- Payment
- Registration
- Reminder

---

## WhatsApp

Digunakan untuk:

- Reminder
- Ticket Ready
- Payment Approved
- Broadcast

Provider dipilih organisasi.

---

## Push Notification

Disiapkan untuk aplikasi mobile.

Implementasi pada fase berikutnya.

---

## Telegram

Future.

---

## Discord

Future.

---

## Slack

Future.

---

# 20.7 Provider Layer

Communication Engine tidak bergantung pada provider tertentu.

```
Communication Engine

        │

        ▼

Communication Provider

├── SMTP

├── WhatsApp Provider

├── Firebase

├── Telegram

├── Discord

└── Future Provider
```

Pergantian provider tidak mengubah Domain Layer.

---

# 20.8 Template Engine

Seluruh komunikasi menggunakan Template.

Template dipisahkan dari Controller.

Contoh:

```
payment-approved

ticket-ready

registration-success

broadcast-announcement
```

Setiap template memiliki placeholder.

```
{{nama}}

{{event}}

{{ticket}}

{{tanggal}}
```

Template dapat memiliki beberapa versi sesuai channel.

Misalnya:

Email

WhatsApp

Push

---

# 20.8.1 Template Versioning

Setiap Template memiliki identitas dan versi.

Contoh:

```
payment-approved:v1

payment-approved:v2

ticket-ready:v1
```

Perubahan isi Template tidak boleh mengubah histori komunikasi yang telah dikirim.

Communication Log wajib menyimpan versi Template yang digunakan.

Template dapat memiliki implementasi berbeda untuk setiap Channel, namun tetap menggunakan nama Template yang sama.

Seluruh perubahan Template harus bersifat Backward Compatible.

# 20.9 Notification

Notification merupakan komunikasi personal kepada satu pengguna.

Contoh:

```
Payment Approved

↓

Hasan
```

Notification selalu memiliki penerima tunggal.

Notification disimpan pada Notification Center.

---

# 20.10 Reminder

Reminder dikirim berdasarkan waktu.

Contoh:

```
Registrasi

↓

H-14

↓

H-7

↓

H-3

↓

H-1
```

Reminder berhenti otomatis apabila kondisi telah terpenuhi.

Contoh:

Outstanding = 0

↓

Reminder pembayaran dihentikan.

---

# 20.11 Broadcast

Broadcast dikirim kepada banyak pengguna.

Contoh:

```
Pengumuman Reuni

↓

1046 Alumni
```

Broadcast mendukung:

- Filter Angkatan
- Filter Wilayah
- Filter Negara
- Filter Status Alumni
- Filter Role

Broadcast berjalan melalui Queue.

---

# 20.12 Queue & Retry

Seluruh komunikasi diproses secara asynchronous.

```
Domain Event

↓

Queue

↓

Worker

↓

Provider

↓

Delivered
```

Retry Policy:

Attempt 1

↓

Attempt 2

↓

Attempt 3

↓

Failed

Retry dilakukan otomatis.

---

# 20.12.1 Queue Priority

Communication Queue menggunakan prioritas berdasarkan tingkat kepentingan komunikasi.

| Priority | Contoh |
|----------|--------|
| High | Password Reset, Payment Approved, Ticket Revoked |
| Medium | Ticket Ready, Registration Success |
| Low | Reminder, Broadcast, Campaign |

Worker harus selalu memproses Queue dengan prioritas lebih tinggi terlebih dahulu.

Broadcast tidak diperbolehkan menghambat pengiriman komunikasi Transactional.

# 20.13 Communication Log

Seluruh komunikasi menghasilkan Log.

Minimal mencatat:

- UUID
- Event
- User
- Channel
- Provider
- Template
- Status
- Response Provider
- Retry Count
- Created At
- Delivered At

Communication Log tidak boleh dihapus.

---

# 20.13.1 Communication Timeline

Setiap komunikasi memiliki Timeline yang dapat ditelusuri.

Contoh:

```
Domain Event

↓

Queue

↓

Processing

↓

Provider

↓

Delivered
```

atau

```
Domain Event

↓

Queue

↓

Processing

↓

Failed

↓

Retry

↓

Delivered
```

Timeline menjadi bagian dari Audit Trail dan tidak boleh dihapus.

# 20.14 User Preferences

Pengguna dapat menentukan preferensi komunikasi.

Contoh:

Email

☑ Payment

☑ Ticket

☐ Berita

WhatsApp

☑ Reminder

☑ Event

☑ Broadcast

Push

☑ Payment

☑ Ticket

Communication Engine wajib menghormati preferensi pengguna kecuali komunikasi bersifat wajib.

Mandatory Notification:

- Password Reset
- Payment Approved
- Ticket Revoked

tidak dapat dimatikan.

---

# 20.15 Security

Communication Engine tidak boleh mengirim:

- Password
- Access Token
- Refresh Token
- Internal Database ID

Ticket selalu menggunakan UUID.

Semua komunikasi wajib melewati proses Authorization sebelum dikirim.

---

# 20.15.1 Privacy & Compliance

Communication Engine wajib melindungi data pribadi pengguna.

Pesan tidak boleh mengandung:

- Password
- Access Token
- Refresh Token
- Internal Database ID

Data pribadi hanya ditampilkan apabila benar-benar diperlukan untuk tujuan komunikasi.

Communication Log tidak menyimpan informasi sensitif yang dapat disalahgunakan apabila terjadi kebocoran data.

Seluruh komunikasi mengikuti prinsip:

- Least Privilege
- Data Minimization
- Privacy by Design

Apabila pengguna meminta penghentian komunikasi yang bersifat opsional, sistem wajib menghormati preferensi tersebut tanpa memengaruhi komunikasi yang bersifat Mandatory.

# 20.16 Performance

Target performa:

In-App

< 1 detik

Email

< 30 detik

WhatsApp

< 30 detik

Broadcast 1000 alumni

< 10 menit

Retry tidak boleh memblokir Queue utama.

---

# 20.17 Future Roadmap

Communication Engine dirancang untuk mendukung:

- Firebase Push
- WhatsApp Official API
- Telegram Bot
- Discord
- Slack
- Marketing Campaign
- Scheduled Campaign
- AI Personalization
- Multi Language Template
- Analytics Communication

Tanpa perubahan arsitektur inti.

---

# 20.18 Acceptance Criteria

Communication Engine dianggap selesai apabila:

✓ Seluruh Domain menggunakan Domain Event.

✓ Tidak ada Controller yang mengirim Email atau WhatsApp secara langsung.

✓ Notification berjalan melalui Queue.

✓ Reminder berjalan otomatis.

✓ Broadcast dapat dikirim ke banyak alumni.

✓ Multi Channel didukung.

✓ Template dapat digunakan ulang.

✓ Retry otomatis berjalan.

✓ Communication Log lengkap.

✓ User Preference dihormati.

✓ Mandatory Notification tetap terkirim.

✓ Provider dapat diganti tanpa mengubah Domain Layer.

✓ Seluruh komunikasi bersifat audit-friendly dan mengikuti prinsip Evolution First.

# 20.18.1 Definition of Done

Communication Engine dinyatakan selesai apabila memenuhi seluruh kriteria berikut.

1. Seluruh Domain menghasilkan komunikasi melalui Domain Event.

2. Tidak ada Business Logic yang mengirim Email, WhatsApp, atau Notification secara langsung.

3. Seluruh komunikasi diproses melalui Queue.

4. Retry Policy berjalan sesuai konfigurasi.

5. Multi Channel Delivery berfungsi.

6. Template dapat digunakan ulang pada seluruh Channel.

7. Provider dapat diganti tanpa mengubah Domain Layer.

8. Communication Log lengkap dan dapat diaudit.

9. User Preference diterapkan pada komunikasi yang bersifat opsional.

10. Mandatory Notification tetap dikirim meskipun pengguna menonaktifkan preferensi komunikasi.

11. Lulus Code Review.

12. Lulus User Acceptance Test (UAT).

# 21. API Specification

## 21.1 Overview

Payment & Ticket Engine menyediakan REST API yang digunakan oleh:

- Portal Alumni
- Dashboard Admin
- Dashboard Panitia
- Mobile Application (Future)
- QR Check-In Service (Phase 2C)
- Third Party Integration (Future)

Seluruh endpoint mengikuti standar RESTful API dan menggunakan JSON sebagai format pertukaran data.

Semua endpoint yang memerlukan autentikasi menggunakan Laravel Sanctum.

---

# 21.2 API Versioning

Base URL:

```
/api
```

Endpoint baru Payment & Ticket Engine menggunakan versi API yang sama dengan modul EMS.

```
/api/orders
/api/payments
/api/tickets
```

Perubahan breaking change hanya diperbolehkan melalui major version.

---

# 21.3 Authentication

Semua endpoint private menggunakan Bearer Token.

```
Authorization: Bearer <token>
```

Autentikasi menggunakan Laravel Sanctum.

Role ditentukan melalui HakAksesRole.

---

# 21.4 Authorization

Authorization mengikuti Role Based Access Control (RBAC).

Role utama:

- Alumni
- Dashboard
- Event
- Finance
- Ketua
- Administrator

Setiap endpoint wajib melakukan validasi ownership atau role sebelum mengembalikan data.

---

# 21.5 Order API

## Register Event

```
POST /api/events/{id}/register
```

Membuat Order baru.

Response:

```
201 Created
```

Payload:

```json
{
    "success": true,
    "message": "Registration successful.",
    "data": {
        "uuid": "...",
        "nomor_order": "MZT-2026-000001"
    }
}
```

---

## My Orders

```
GET /api/my-orders
```

Mengembalikan seluruh order milik pengguna.

---

## Order Detail

```
GET /api/orders/{uuid}
```

Ownership wajib divalidasi.

User hanya dapat melihat order miliknya.

---

## Cancel Order

```
DELETE /api/orders/{uuid}
```

Membatalkan registrasi apabila masih memenuhi kebijakan pembatalan.

---

# 21.6 Payment API

## Upload Payment Proof

```
POST /api/orders/{uuid}/payment
```

Multipart Form Data.

Field:

```
payment_proof

bank_name

account_name

notes
```

---

## Payment Detail

```
GET /api/payments/{uuid}
```

---

## Verify Payment

Admin only.

```
PUT /api/payments/{uuid}/verify
```

Status:

```
paid
```

atau

```
rejected
```

---

## Payment History

```
GET /api/my-payments
```

---

# 21.7 Ticket API

## Ticket Detail

```
GET /api/tickets/{uuid}
```

---

## Download Ticket

```
GET /api/tickets/{uuid}/download
```

Menghasilkan PDF.

---

## Reissue Ticket

Admin.

```
POST /api/tickets/{uuid}/reissue
```

---

## Revoke Ticket

Admin.

```
DELETE /api/tickets/{uuid}
```

---

# 21.8 Dashboard API

## Event Summary

```
GET /api/dashboard/event-summary
```

---

## Finance Summary

```
GET /api/dashboard/payment-summary
```

---

## Ticket Summary

```
GET /api/dashboard/ticket-summary
```

---

## Attendance Summary

```
GET /api/dashboard/attendance-summary
```

(Phase 2C)

---

# 21.9 Common Response Format

Seluruh endpoint menggunakan struktur respons yang konsisten.

Success:

```json
{
    "success": true,
    "message": "Success",
    "data": {}
}
```

Validation Error:

```json
{
    "success": false,
    "message": "Validation Error",
    "errors": {}
}
```

Unauthorized:

```json
{
    "success": false,
    "message": "Unauthorized"
}
```

Forbidden:

```json
{
    "success": false,
    "message": "Forbidden"
}
```

Not Found:

```json
{
    "success": false,
    "message": "Not Found"
}
```

Server Error:

```json
{
    "success": false,
    "message": "Internal Server Error"
}
```

---

# 21.10 HTTP Status Code

| Code | Arti |
|-------|------|
|200|Success|
|201|Created|
|204|No Content|
|400|Bad Request|
|401|Unauthorized|
|403|Forbidden|
|404|Not Found|
|409|Conflict|
|422|Validation Error|
|429|Too Many Requests|
|500|Internal Server Error|

---

# 21.11 Idempotency

Endpoint berikut wajib bersifat idempotent:

- Payment Verification
- Ticket Reissue
- Ticket Revoke
- Order Cancellation

Register Event menggunakan constraint:

```
UNIQUE(id_event,id_anggota)
```

untuk mencegah registrasi ganda.

---

# 21.12 Pagination

Seluruh endpoint list menggunakan pagination.

Parameter:

```
?page=

?per_page=

?sort=

?direction=

?search=
```

Response:

```json
{
    "data": [],
    "meta": {},
    "links": {}
}
```

Mengikuti standar Laravel Pagination.

---

# 21.13 Filtering

Endpoint list mendukung filtering.

Contoh:

```
status

payment_status

ticket_status

event

date

created_by

updated_by
```

Filter hanya diterapkan pada field yang diizinkan.

---

# 21.14 Rate Limiting

Endpoint Authentication:

```
5 request / menit
```

Upload Payment:

```
10 request / menit
```

Check-In API:

```
disesuaikan pada Phase 2C
```

Rate limiting mengikuti middleware Laravel.

---

# 21.15 Security Requirements

API wajib memenuhi ketentuan berikut:

- HTTPS Only
- Bearer Authentication
- CSRF Protection (Web)
- Input Validation
- File Validation
- Ownership Validation
- Audit Logging

Tidak ada endpoint yang boleh mengekspos:

- Internal ID
- Password
- Access Token
- Refresh Token

Identitas publik selalu menggunakan UUID.

---

# 21.16 API Evolution

Seluruh endpoint baru harus mengikuti prinsip:

- Backward Compatible
- Evolution First
- Additive Migration
- Non Breaking Change

Perubahan besar dilakukan melalui major version API.

---

# 21.17 Future API

Disiapkan untuk fase berikutnya.

```
POST /api/check-in

GET /api/check-in/history

POST /api/certificates

GET /api/certificates

POST /api/broadcast

GET /api/notifications
```

Endpoint tersebut belum menjadi bagian implementasi Phase 2B.

---

# 21.18 Acceptance Criteria

API dianggap selesai apabila:

- Seluruh endpoint terdokumentasi.
- Seluruh endpoint menggunakan format respons yang konsisten.
- Seluruh endpoint menggunakan UUID sebagai identitas publik.
- Ownership tervalidasi.
- Role tervalidasi.
- Validation Error konsisten.
- HTTP Status Code sesuai standar.
- Pagination konsisten.
- Filtering konsisten.
- API bersifat backward compatible.
- Seluruh endpoint mengikuti prinsip Evolution First.

# 22. Data Architecture

## 22.1 Overview

Payment & Ticket Engine dibangun menggunakan pendekatan Domain-Driven Design (DDD) dengan prinsip **Order sebagai Aggregate Root** sebagaimana ditetapkan pada ADR-001.

Seluruh data transaksi pembayaran, tiket, kehadiran, dan modul turunannya berpusat pada entitas **Order**.

Data Architecture dirancang agar:

- mudah dikembangkan,
- backward compatible,
- mendukung evolusi bertahap,
- meminimalkan perubahan skema,
- menjaga histori transaksi tetap immutable.

---

# 22.2 Aggregate Structure

```
Event

 │

 ├────────────┐

 ▼            ▼

Order (Aggregate Root)

 │

 ├───────────────┬───────────────┬───────────────┐

 ▼               ▼               ▼               ▼

Payment        Ticket       Attendance      Certificate
                                │
                                ▼
                           Gate History
```

Order menjadi satu-satunya pintu masuk seluruh proses bisnis.

Modul lain tidak boleh memiliki relasi langsung yang melompati Order.

Contoh yang diperbolehkan:

```
Payment

↓

Order
```

Contoh yang tidak diperbolehkan:

```
Payment

↓

Event
```

---

# 22.3 Entity Relationship

Relationship utama:

```
Event

1

│

├───────────────∞

│

Order

1

├──────────────∞

│

Payment

1

├──────────────1

│

Ticket

1

├──────────────∞

│

Attendance
```

Future:

```
Order

│

├── Certificate

├── Merchandise

├── Donation

└── Invoice
```

---

# 22.4 Core Entities

Phase 2B menggunakan entity berikut.

## Event

Master kegiatan.

Contoh:

- Reuni Akbar
- Seminar
- Kajian Nasional

---

## Order

Aggregate Root.

Menyimpan:

- registrasi
- snapshot
- status
- total transaksi

Order menjadi identitas utama seluruh transaksi.

---

## Payment

Menyimpan histori pembayaran.

Satu Order dapat memiliki beberapa Payment apabila organisasi mengaktifkan cicilan pada fase berikutnya.

Phase 2B masih menggunakan satu pembayaran.

---

## Ticket

Representasi hak hadir.

Ticket diterbitkan setelah pembayaran berhasil diverifikasi.

---

## Attendance

Digunakan saat Check-In.

Attendance tidak dibuat sebelum Ticket valid.

---

# 22.5 Public Identity

Seluruh entity transaksi menggunakan UUID.

Contoh:

```
orders.uuid

payments.uuid

tickets.uuid
```

UUID digunakan untuk:

- API
- QR Code
- URL
- Integrasi

Integer ID hanya digunakan secara internal.

---

# 22.6 Immutable Snapshot

Order menyimpan snapshot Event.

Snapshot meliputi:

```
event_name

event_price

event_start_at
```

Snapshot tidak boleh berubah.

Perubahan Event hanya memengaruhi Event baru.

Order lama tetap mempertahankan histori.

---

# 22.7 Status Architecture

Status tidak menggunakan ENUM Database.

Seluruh status menggunakan VARCHAR.

Nilai valid berasal dari PHP Native Enum.

Contoh:

```
OrderStatus

PaymentStatus

TicketStatus
```

Keuntungan:

- tidak memerlukan migration ketika status bertambah,
- mudah digunakan pada API,
- mudah diuji,
- lebih fleksibel.

---

# 22.8 Audit Columns

Seluruh entity bisnis baru wajib memiliki:

```
created_at

updated_at

created_by

updated_by
```

Soft delete akan menggunakan:

```
deleted_at

deleted_by
```

ketika benar-benar diperlukan.

---

# 22.9 Data Ownership

Ownership mengikuti Aggregate Root.

Contoh:

```
Order

↓

Payment

↓

Ticket

↓

Attendance
```

Payment tidak boleh berpindah Order.

Ticket tidak boleh berpindah Order.

Attendance tidak boleh berpindah Ticket.

---

# 22.10 Transaction Boundary

Seluruh perubahan pada Aggregate dilakukan dalam Database Transaction.

Contoh:

```
Register Event

↓

Create Order

↓

Commit
```

atau

```
Upload Payment

↓

Create Payment

↓

Commit
```

Apabila salah satu langkah gagal maka seluruh transaksi dibatalkan.

---

# 22.11 Data Lifecycle

```
Draft

↓

Registered

↓

Confirmed

↓

Paid

↓

Ticket Issued

↓

Checked In

↓

Finished
```

Apabila dibatalkan:

```
Cancelled
```

dapat berasal dari state aktif sesuai ADR-009.

---

# 22.12 Index Strategy

Index utama:

Orders

```
uuid

nomor_order

id_event

id_anggota

status_registrasi

payment_status
```

Payments

```
uuid

id_order

status

created_at
```

Tickets

```
uuid

id_order

status
```

Attendance

```
id_ticket

checkin_time
```

Seluruh index dibuat untuk mendukung query Portal maupun Dashboard.

---

# 22.13 Data Evolution Strategy

Seluruh perubahan skema mengikuti prinsip:

- Additive Migration
- Backward Compatible
- Evolution First

Tidak diperbolehkan:

- rename kolom tanpa migration transisi,
- drop tabel aktif,
- mengubah tipe data secara destruktif.

---

# 22.14 Future Entities

Data Architecture telah menyiapkan ruang untuk:

- Certificates
- Merchandise
- Donations
- Sponsorship
- Invoice
- Refund
- Installment
- Communication Log

Semuanya tetap menggunakan Order sebagai Aggregate Root.

---

# 22.15 Acceptance Criteria

Data Architecture dianggap selesai apabila:

- Order menjadi Aggregate Root.
- Seluruh relasi mengikuti Aggregate.
- UUID digunakan sebagai identitas publik.
- Snapshot bersifat immutable.
- Status menggunakan VARCHAR + PHP Enum.
- Audit Columns tersedia.
- Ownership tervalidasi.
- Transaction Boundary diterapkan.
- Migration bersifat additive.
- Backward compatibility tetap terjaga.

# 23. Security Architecture

## 23.1 Overview

Security Architecture mendefinisikan prinsip keamanan yang diterapkan pada Payment & Ticket Engine untuk melindungi data anggota, transaksi pembayaran, tiket, serta seluruh proses registrasi.

Keamanan merupakan bagian dari arsitektur sistem dan diterapkan pada setiap lapisan aplikasi, mulai dari Authentication, Authorization, Data Access, API, File Storage, hingga Audit Trail.

Seluruh implementasi wajib mengikuti prinsip:

- Defense in Depth
- Least Privilege
- Zero Trust
- Secure by Default
- Evolution First

---

# 23.2 Security Objectives

Payment & Ticket Engine dirancang untuk memastikan:

- hanya pengguna yang sah dapat mengakses data,
- pengguna hanya dapat mengakses data miliknya,
- seluruh transaksi dapat diaudit,
- seluruh komunikasi menggunakan koneksi terenkripsi,
- seluruh file tervalidasi,
- tidak ada data sensitif yang terekspos.

---

# 23.3 Authentication

Seluruh endpoint private menggunakan Laravel Sanctum.

Authentication dilakukan menggunakan Bearer Token.

```
Authorization: Bearer {token}
```

Token hanya diberikan setelah login berhasil.

Authentication tidak boleh menggunakan Session Authentication pada API.

---

# 23.4 Authorization

Authorization menggunakan Role Based Access Control (RBAC).

Role mengikuti struktur organisasi MZT.

Contoh:

- Alumni
- Dashboard
- Event
- Finance
- Ketua
- Administrator

Role digunakan untuk menentukan hak akses terhadap endpoint maupun Dashboard.

Authorization dilakukan pada setiap request.

---

# 23.5 Ownership Validation

Selain Role, sistem wajib memverifikasi Ownership.

Contoh:

```
GET /orders/{uuid}
```

User hanya dapat membuka Order miliknya.

Walaupun UUID diketahui pihak lain, sistem tetap menolak apabila Order tersebut bukan milik pengguna.

Ownership selalu menjadi lapisan validasi kedua setelah Authentication.

---

# 23.6 Public Identity

Seluruh endpoint publik menggunakan UUID.

Contoh:

```
orders.uuid

payments.uuid

tickets.uuid
```

Integer ID tidak boleh digunakan sebagai identitas publik.

Hal ini bertujuan untuk mencegah:

- Enumeration Attack
- Sequential Guessing
- Information Disclosure

---

# 23.7 Payment Security

Upload bukti pembayaran harus memenuhi aturan berikut.

File yang diperbolehkan:

- JPG
- JPEG
- PNG
- PDF

Ukuran maksimum:

```
5 MB
```

Setiap file wajib melalui validasi:

- MIME Type
- Extension
- File Size

Nama file digenerate otomatis oleh sistem.

Nama asli file tidak disimpan sebagai path.

---

# 23.8 Ticket Security

Ticket merupakan dokumen resmi kepesertaan.

Setiap Ticket memiliki:

- UUID
- QR Code
- Digital Signature (Future)

Ticket tidak boleh dapat dimanipulasi melalui URL.

Seluruh akses Ticket wajib melalui validasi:

- Authentication
- Authorization
- Ownership

---

# 23.9 QR Security

QR Code tidak menyimpan data sensitif.

QR hanya berisi UUID Ticket.

Contoh:

```
ticket_uuid
```

Saat QR dipindai:

```
QR

↓

UUID

↓

Lookup Ticket

↓

Ownership

↓

Status

↓

Response
```

QR tidak boleh berisi:

- Nama
- Email
- Nomor HP
- Internal ID
- Payment Status

---

# 23.10 API Security

Seluruh API wajib menerapkan:

- HTTPS
- Authentication
- Authorization
- Ownership Validation
- Request Validation
- Rate Limiting

Endpoint sensitif menggunakan middleware tambahan sesuai kebutuhan.

---

# 23.11 Input Validation

Seluruh input wajib divalidasi.

Minimal meliputi:

- Required Field
- Data Type
- Maximum Length
- Allowed Value
- File Validation

Tidak diperbolehkan menggunakan data request secara langsung tanpa validasi.

---

# 23.12 Output Protection

API tidak boleh mengembalikan:

- Password
- Access Token
- Refresh Token
- Internal Database ID
- Hidden Attribute

Response hanya mengandung field yang dibutuhkan client.

---

# 23.13 Audit Trail

Seluruh aktivitas penting wajib dicatat.

Minimal:

- Login
- Logout
- Registrasi Event
- Upload Payment
- Payment Verification
- Ticket Issued
- Ticket Revoked
- Check-In
- Role Update

Audit Trail tidak boleh dapat dihapus oleh pengguna biasa.

---

# 23.14 File Storage Security

Seluruh file disimpan di storage server.

Tidak disimpan di dalam folder public secara langsung.

Akses file dilakukan melalui Controller atau Signed URL.

Storage wajib memiliki struktur yang jelas.

Contoh:

```
payments/

tickets/

avatars/

certificates/
```

---

# 23.15 Rate Limiting

Endpoint sensitif wajib memiliki batas akses.

Contoh:

Authentication

```
5 request / menit
```

Upload Payment

```
10 request / menit
```

QR Validation

```
sesuai kebutuhan operasional
```

Rate Limiting menggunakan middleware Laravel.

---

# 23.16 Security Logging

Seluruh percobaan yang mencurigakan dicatat.

Contoh:

- Login gagal berulang
- Upload file ilegal
- QR tidak valid
- Forbidden Access
- Ownership Violation

Log digunakan untuk analisis keamanan.

---

# 23.17 Data Privacy

Data anggota merupakan informasi pribadi.

Sistem wajib melindungi:

- Nama
- Email
- Nomor HP
- Alamat
- Dokumen Pembayaran

Data pribadi tidak boleh digunakan di luar kebutuhan organisasi tanpa persetujuan.

---

# 23.18 Future Security Roadmap

Security Architecture telah menyiapkan ruang untuk:

- Two Factor Authentication (2FA)
- Device Management
- Session Management
- Signed URL
- Digital Signature Ticket
- WebAuthn / Passkey
- Security Event Monitoring
- Fraud Detection
- IP Reputation
- WAF Integration

Implementasi dilakukan bertahap sesuai roadmap.

---

# 23.19 Acceptance Criteria

Security Architecture dianggap selesai apabila:

✓ Seluruh endpoint menggunakan Authentication.

✓ Seluruh endpoint menerapkan Authorization.

✓ Ownership selalu divalidasi.

✓ UUID menjadi identitas publik.

✓ Upload file tervalidasi.

✓ Ticket tidak dapat diakses tanpa hak.

✓ QR tidak menyimpan data sensitif.

✓ Audit Trail aktif.

✓ Rate Limiting diterapkan.

✓ File Storage aman.

✓ Data pribadi terlindungi.

✓ Seluruh implementasi mengikuti prinsip Defense in Depth dan Evolution First.

# 24. Background Jobs & Scheduler

## 24.1 Overview

Payment & Ticket Engine memanfaatkan Background Jobs dan Scheduler untuk menjalankan proses yang tidak memerlukan respons langsung kepada pengguna (asynchronous processing).

Pendekatan ini bertujuan untuk:

- meningkatkan performa aplikasi,
- mengurangi waktu respons,
- meningkatkan keandalan proses,
- mendukung retry otomatis,
- memudahkan monitoring,
- mempersiapkan sistem untuk skala ribuan alumni.

Seluruh proses asynchronous mengikuti prinsip **Queue First** sebagaimana ditetapkan pada ADR-016.

---

# 24.2 Objectives

Background Jobs dirancang untuk:

- Memindahkan proses berat keluar dari HTTP Request.
- Menjamin proses tetap berjalan meskipun pengguna telah menutup browser.
- Mendukung retry otomatis.
- Mendukung observability.
- Mendukung proses massal (bulk processing).

---

# 24.3 Architecture

```
HTTP Request

      │

      ▼

Controller

      │

      ▼

Service Layer

      │

      ▼

Domain Event

      │

      ▼

Queue

      │

      ▼

Worker

      │

      ▼

Business Job

      │

      ▼

Communication Engine
```

Controller tidak boleh menjalankan proses berat secara langsung.

---

# 24.4 Queue Strategy

Semua pekerjaan asynchronous dikirim ke Queue.

Queue digunakan untuk:

- Payment Verification
- Ticket Generation
- Ticket Reissue
- Communication
- Reminder
- Broadcast
- Report Generation (Future)

Queue harus dapat diproses secara paralel oleh beberapa Worker.

---

# 24.5 Queue Categories

Queue dipisahkan berdasarkan domain.

Contoh:

```
default

payments

tickets

communications

reports
```

Pembagian Queue bertujuan agar beban kerja tidak saling mengganggu.

---

# 24.6 Background Jobs

Job utama pada Phase 2B:

## GenerateTicketJob

Menerbitkan Ticket setelah Payment berhasil diverifikasi.

---

## SendPaymentApprovedNotificationJob

Mengirim notifikasi Payment Approved melalui Communication Engine.

---

## SendTicketJob

Mengirim Ticket melalui Email atau WhatsApp.

---

## BroadcastJob

Mengirim Broadcast kepada banyak alumni.

---

## ReminderJob

Mengirim Reminder berdasarkan jadwal.

---

## CleanupTemporaryFileJob

Menghapus file sementara yang sudah tidak digunakan.

---

# 24.7 Scheduler

Laravel Scheduler digunakan untuk pekerjaan yang berjalan secara berkala.

Contoh:

```
php artisan schedule:run
```

Scheduler dijalankan setiap menit melalui Cron.

---

# 24.8 Scheduled Tasks

Contoh tugas terjadwal:

### Reminder Pembayaran

```
H-14

H-7

H-3

H-1
```

---

### Reminder Kehadiran

```
H-1

H-0
```

---

### Cleanup Temporary Files

Dijalankan setiap malam.

---

### Cleanup Failed Upload

Dijalankan setiap malam.

---

### Retry Failed Communication

Dijalankan setiap 10 menit.

---

### Backup Verification

Memastikan backup harian berhasil dibuat.

---

# 24.9 Retry Strategy

Semua Job mendukung Retry.

Contoh:

```
Attempt 1

↓

Attempt 2

↓

Attempt 3

↓

Failed
```

Retry tidak boleh menghasilkan duplikasi data.

Job wajib bersifat idempotent.

---

# 24.10 Failed Jobs

Job yang gagal disimpan pada Failed Job Repository.

Minimal menyimpan:

- Job Name
- Queue
- Payload
- Exception
- Attempt
- Failed At

Administrator dapat melakukan Retry secara manual.

---

# 24.11 Idempotency

Seluruh Background Job wajib idempotent.

Contoh:

Generate Ticket

Jika Ticket sudah ada:

```
Return Existing Ticket
```

bukan

```
Create New Ticket
```

Payment Verification juga wajib idempotent.

---

# 24.12 Queue Monitoring

Queue harus menyediakan informasi:

- Pending Jobs
- Processing Jobs
- Completed Jobs
- Failed Jobs
- Retry Jobs

Monitoring dapat dilakukan menggunakan Laravel Horizon atau solusi serupa pada fase berikutnya.

---

# 24.13 Performance Target

Target performa:

Generate Ticket

```
< 5 detik
```

Send Email

```
< 30 detik
```

WhatsApp

```
< 30 detik
```

Broadcast 1000 Alumni

```
< 10 menit
```

Retry tidak boleh menghambat Queue utama.

---

# 24.14 Error Handling

Apabila Job gagal:

- Exception dicatat.
- Retry dijalankan otomatis.
- Setelah batas Retry tercapai, Job dipindahkan ke Failed Jobs.
- Administrator mendapatkan notifikasi apabila diperlukan.

Tidak diperbolehkan mengabaikan Exception secara diam-diam.

---

# 24.15 Scalability

Queue Worker dapat ditambah secara horizontal.

```
Worker 1

Worker 2

Worker 3

Worker 4
```

Semua Worker mengambil pekerjaan dari Queue yang sama.

Arsitektur ini memungkinkan peningkatan kapasitas tanpa mengubah Business Logic.

---

# 24.16 Future Roadmap

Background Jobs akan diperluas untuk mendukung:

- Certificate Generation
- Invoice Generation
- Donation Processing
- Merchandise Fulfillment
- AI Recommendation
- AI Communication Personalization
- Data Synchronization
- External Integration

Seluruh fitur baru tetap menggunakan Queue sebagai mekanisme utama.

---

# 24.17 Acceptance Criteria

Background Jobs & Scheduler dianggap selesai apabila:

✓ Seluruh proses berat berjalan melalui Queue.

✓ Controller tidak menjalankan proses asynchronous secara langsung.

✓ Scheduler aktif dan terdokumentasi.

✓ Retry otomatis berjalan.

✓ Failed Jobs dapat dipantau.

✓ Seluruh Job bersifat idempotent.

✓ Queue dapat diskalakan secara horizontal.

✓ Monitoring Queue tersedia.

✓ Seluruh implementasi mengikuti prinsip Queue First dan Evolution First.

# 25. Deployment Architecture

## 25.1 Overview

Deployment Architecture mendefinisikan proses Continuous Integration dan Continuous Deployment (CI/CD) yang digunakan pada MZT Apps.

Arsitektur deployment dirancang agar:

- aman terhadap perubahan skema database,
- mendukung deployment tanpa downtime yang tidak perlu,
- memiliki mekanisme rollback,
- memiliki backup otomatis sebelum migrasi,
- dapat diverifikasi secara otomatis,
- mendukung evolusi sistem secara bertahap.

Seluruh deployment mengikuti prinsip:

- Evolution First
- Backward Compatible
- Zero Manual Migration
- Safe Deployment
- Production First

---

# 25.2 Deployment Pipeline

Seluruh perubahan source code mengikuti alur berikut.

```
Developer

        │

        ▼

Git Commit

        │

        ▼

GitHub Repository

        │

        ▼

Jenkins Pipeline

        │

        ▼

Validate Host

        │

        ▼

Sync Source

        │

        ▼

Build Docker Images

        │

        ▼

Database Backup

        │

        ▼

Deploy Stack

        │

        ▼

Database Migration

        │

        ▼

Schema Verification

        │

        ▼

Health Check

        │

        ▼

Docker Prune
```

Deployment hanya dianggap berhasil apabila seluruh tahapan selesai tanpa error.

---

# 25.3 Infrastructure

Deployment Production terdiri dari beberapa komponen utama.

```
Internet

        │

        ▼

Cloudflare

        │

        ▼

Reverse Proxy

        │

        ▼

Docker Host

        │

 ┌──────────────┬──────────────┬──────────────┐

 ▼              ▼              ▼

Frontend      Backend        Database

React         Laravel        MariaDB

                │

                ▼

            Storage
```

Komponen pendukung:

- Jenkins
- Docker Compose
- Backup Storage
- GitHub Repository

---

# 25.4 CI/CD Strategy

Source of Truth berada pada GitHub.

Setiap perubahan pada branch utama akan memicu Pipeline Jenkins.

Pipeline bertanggung jawab terhadap:

- sinkronisasi source code,
- build image,
- deployment,
- migrasi,
- verifikasi,
- health check.

Deployment tidak dilakukan secara manual.

---

# 25.5 Database Migration Strategy

Migration mengikuti prinsip:

- Additive Migration
- Idempotent
- Backward Compatible

Migration tidak boleh:

- menghapus tabel aktif,
- mengubah tipe data secara destruktif,
- menghilangkan kompatibilitas versi sebelumnya.

Seluruh migration wajib memiliki:

```
up()

down()
```

Rollback harus tersedia untuk setiap migration.

---

# 25.6 Backup Strategy

Sebelum migration dijalankan, Pipeline wajib membuat backup database.

Output backup:

```
mzt_pre_migrate_YYYYMMDD_HHMMSS.sql.gz
```

Beserta metadata:

```
mzt_pre_migrate_YYYYMMDD_HHMMSS.json
```

Metadata minimal berisi:

- created_at
- pipeline
- git_backend
- git_frontend
- reason
- database
- compressed

Backup wajib memenuhi validasi:

- File tersedia.
- Ukuran file lebih dari nol.
- gzip valid.
- Struktur database dapat diverifikasi.

Apabila backup gagal, Pipeline harus dihentikan.

---

# 25.7 Schema Verification

Setelah migration selesai, Pipeline melakukan verifikasi struktur database.

Verifikasi dilakukan menggunakan `information_schema`.

Contoh pemeriksaan:

- keberadaan tabel,
- keberadaan kolom,
- index,
- constraint,
- hasil migration.

Schema Verification tidak melakukan pengujian Business Logic.

Tahap ini hanya memastikan struktur database sesuai dengan versi aplikasi yang akan dijalankan.

---

# 25.8 Health Check

Health Check dilakukan setelah Deployment berhasil.

Health Check terdiri dari dua lapisan.

## Level 1 — Infrastructure

Meliputi:

- Docker Container Running
- HTTP Response
- Reverse Proxy
- Network

Semua layanan harus berada pada status Running.

---

## Level 2 — Application

Meliputi:

- API dapat diakses.
- Database terbaca.
- Response valid.
- Statistik dasar berhasil dimuat.

Contoh endpoint:

```
GET /api/public/stats
```

Deployment hanya dianggap berhasil apabila kedua level Health Check berhasil.

---

# 25.9 Rollback Strategy

Rollback dibagi menjadi dua tingkat.

## Level 1 — Application Rollback

Digunakan apabila masalah hanya berasal dari aplikasi.

Langkah:

```
Git Revert

↓

Push

↓

Pipeline

↓

Redeploy
```

Database tidak dipulihkan.

---

## Level 2 — Database Rollback

Digunakan apabila terjadi masalah pada data atau migration.

Langkah:

```
Restore Backup

↓

Redeploy

↓

Schema Verification

↓

Health Check
```

Backup yang digunakan berasal dari:

```
mzt_pre_migrate_*.sql.gz
```

---

# 25.10 Deployment Verification

Deployment dianggap valid apabila:

- seluruh container berjalan,
- migration berhasil,
- schema verification berhasil,
- health check berhasil,
- backup tersedia,
- metadata backup tersedia,
- tidak terdapat Failed Migration,
- seluruh service dapat saling berkomunikasi.

---

# 25.11 Disaster Recovery

Apabila terjadi kegagalan sistem:

1. Identifikasi penyebab.
2. Tentukan Level Rollback.
3. Pulihkan aplikasi atau database.
4. Jalankan kembali Pipeline.
5. Verifikasi Schema.
6. Jalankan Health Check.
7. Dokumentasikan insiden.

Recovery harus meminimalkan downtime.

---

# 25.12 Deployment Security

Deployment hanya dapat dilakukan melalui Pipeline resmi.

Tidak diperbolehkan:

- edit file production secara langsung,
- menjalankan migration manual tanpa prosedur,
- mengubah database melalui client SQL tanpa persetujuan.

Semua deployment harus dapat ditelusuri melalui Git Commit dan Jenkins Build.

---

# 25.13 Versioning

Deployment mengikuti Semantic Versioning.

Contoh:

```
v2.0.0

v2.1.0-alpha1

v2.1.0-beta1

v2.1.0-rc1

v2.1.0
```

Setiap deployment harus memiliki referensi:

- Git Commit Backend
- Git Commit Frontend
- Build Jenkins
- Migration Batch

---

# 25.14 Future Deployment Roadmap

Deployment Architecture dirancang agar mendukung:

- Blue-Green Deployment
- Rolling Update
- Zero Downtime Deployment
- Multi Server Deployment
- Horizontal Scaling
- Container Auto Recovery
- Multi Environment
- Disaster Recovery Site

Seluruh peningkatan tetap mengikuti prinsip Evolution First.

---

# 25.15 Acceptance Criteria

Deployment Architecture dianggap selesai apabila:

✓ CI/CD berjalan otomatis melalui Jenkins.

✓ Database dibackup sebelum migration.

✓ Migration bersifat additive dan idempotent.

✓ Schema Verification berhasil.

✓ Health Check Level 1 dan Level 2 berhasil.

✓ Rollback Level 1 dan Level 2 terdokumentasi.

✓ Deployment dapat ditelusuri melalui Git dan Jenkins.

✓ Backup tervalidasi.

✓ Seluruh deployment mengikuti prinsip Evolution First.

✓ Deployment aman untuk Production.

# 26. Monitoring & Observability

## 26.1 Overview

Monitoring & Observability memastikan seluruh komponen MZT Apps dapat diamati, diukur, dianalisis, dan dipulihkan secara cepat ketika terjadi gangguan.

Bab ini mendefinisikan standar operasional untuk:

- Monitoring Infrastruktur
- Monitoring Aplikasi
- Monitoring Database
- Monitoring Queue
- Monitoring Background Jobs
- Monitoring Payment
- Monitoring Ticket
- Monitoring Attendance
- Monitoring API
- Monitoring Security
- Monitoring Audit Trail

Tujuan utama Monitoring & Observability adalah:

- mendeteksi masalah sedini mungkin,
- mempermudah investigasi,
- mempercepat pemulihan,
- menjaga pengalaman pengguna,
- menyediakan data operasional bagi panitia.

Seluruh monitoring mengikuti prinsip:

- Production First
- Observable by Default
- Evolution First
- Low Operational Risk

---

# 26.2 Monitoring Architecture

Seluruh komponen sistem menghasilkan telemetry yang dikumpulkan menjadi satu alur observasi.

```
Users

        │

        ▼

Frontend

        │

        ▼

Laravel API

        │

 ┌──────────────┬──────────────┬──────────────┐

 ▼              ▼              ▼

Database      Queue         Storage

        │

        ▼

Application Logs

        │

        ▼

Metrics

        │

        ▼

Operational Dashboard

        │

        ▼

Administrator
```

Monitoring harus mampu memberikan gambaran kondisi sistem secara real-time.

---

# 26.3 Infrastructure Monitoring

Komponen yang dipantau:

- Docker Container
- CPU Usage
- Memory Usage
- Disk Usage
- Network
- Restart Count
- Container Health
- Storage Availability

Parameter minimal:

- CPU Utilization
- Memory Consumption
- Disk Remaining
- Container Restart
- Docker Health Status

Target:

- seluruh container dalam status Running,
- restart tidak melebihi ambang normal,
- ruang penyimpanan tetap tersedia.

---

# 26.4 Application Monitoring

Aplikasi harus memonitor:

- Request Rate
- Response Time
- Error Rate
- Active Session
- Login Success
- Login Failure
- Registration Success
- Payment Success
- Ticket Generation
- Check-in Success

Semua endpoint penting harus dapat diamati.

---

# 26.5 API Monitoring

Seluruh endpoint utama dipantau.

Minimal meliputi:

- Total Request
- Average Response Time
- Error Response
- HTTP Status Distribution
- Unauthorized Access
- Validation Error

Contoh endpoint prioritas:

- /api/login
- /api/me
- /api/events
- /api/events/{id}/register
- /api/orders
- /api/payments
- /api/tickets
- /api/checkin

API Monitoring harus mampu menunjukkan endpoint mana yang mengalami penurunan performa.

---

# 26.6 Database Monitoring

Database dipantau terhadap:

- Connection
- Slow Query
- Deadlock
- Lock Wait
- Table Growth
- Index Usage
- Migration Status
- Backup Status

Monitoring juga mencatat:

- jumlah Order,
- jumlah Payment,
- jumlah Ticket,
- jumlah Attendance.

Target:

- tidak ada migration gagal,
- backup berhasil,
- query tetap berada dalam batas performa.

---

# 26.7 Queue & Background Job Monitoring

Background Job dipantau terhadap:

- Queue Length
- Running Job
- Failed Job
- Retry Count
- Average Processing Time

Job yang diprioritaskan:

- Payment Verification
- Ticket Generation
- Email Notification
- WhatsApp Notification
- Certificate Generation
- Report Generation

Apabila jumlah Failed Job meningkat, administrator harus segera mendapatkan notifikasi.

---

# 26.8 Business Monitoring

Selain infrastruktur, sistem juga memonitor metrik bisnis.

Contoh:

Registrasi:

- Total Registrasi
- Registrasi Hari Ini
- Registrasi per Event

Payment:

- Pending
- Waiting Verification
- Paid
- Rejected
- Refund

Ticket:

- Generated
- Downloaded
- Revoked

Attendance:

- Checked In
- Belum Hadir

Business Monitoring menjadi dasar Dashboard Panitia.

---

# 26.9 Audit Trail

Seluruh aktivitas penting dicatat.

Minimal:

- Login
- Logout
- Generate Account
- Reset Password
- Register Event
- Verify Payment
- Generate Ticket
- Check-in
- Update Event
- Update Order

Audit Trail mencatat:

- waktu,
- pengguna,
- IP Address,
- User Agent,
- aksi,
- objek yang berubah.

Audit Trail bersifat immutable.

---

# 26.10 Security Monitoring

Sistem harus memonitor:

- Login gagal berulang
- Token tidak valid
- Permission Denied
- Suspicious Activity
- Brute Force Attempt
- Invalid Signature
- Unauthorized API Access

Administrator dapat melihat riwayat keamanan melalui Dashboard.

---

# 26.11 Alerting Strategy

Monitoring menghasilkan Alert apabila:

- Container mati
- Database tidak dapat diakses
- Queue gagal
- Health Check gagal
- Payment gagal diproses
- Ticket gagal dibuat
- Storage hampir penuh
- Backup gagal
- Migration gagal

Alert dikategorikan menjadi:

- Information
- Warning
- Critical

Alert Critical memerlukan tindakan segera.

---

# 26.12 Logging Strategy

Logging dibagi menjadi beberapa kategori.

Application Log

- Error
- Warning
- Information

Business Log

- Registration
- Payment
- Ticket
- Attendance

Security Log

- Authentication
- Authorization
- Permission

Infrastructure Log

- Deployment
- Backup
- Migration
- Health Check

Log harus memiliki timestamp, request identifier, dan tingkat keparahan (severity level).

---

# 26.13 Performance Metrics

Metrik utama yang dipantau:

Application

- Average Response Time
- P95 Response Time
- P99 Response Time

Database

- Query Time
- Slow Query Count

Queue

- Waiting Time
- Processing Time

Business

- Registration Rate
- Payment Rate
- Check-in Rate

Monitoring tidak hanya menunjukkan kondisi saat ini, tetapi juga tren pertumbuhan.

---

# 26.14 Dashboard Monitoring

Dashboard Monitoring minimal menampilkan:

Infrastructure

- CPU
- Memory
- Disk
- Docker

Application

- Active User
- API Request
- Error Rate

Business

- Registrasi
- Payment
- Ticket
- Attendance

Deployment

- Build Terakhir
- Migration Batch
- Health Status

Dashboard harus mampu digunakan oleh panitia teknis tanpa membuka server secara langsung.

---

# 26.15 Operational Procedures

Ketika terjadi gangguan:

1. Identifikasi Alert.
2. Periksa Dashboard.
3. Periksa Log.
4. Tentukan kategori masalah.
5. Lakukan mitigasi.
6. Jalankan Health Check.
7. Dokumentasikan hasil investigasi.

Seluruh insiden harus memiliki catatan penyelesaian.

---

# 26.16 Capacity Planning

Monitoring digunakan untuk memprediksi kebutuhan sumber daya.

Parameter yang diperhatikan:

- pertumbuhan alumni,
- jumlah event,
- transaksi payment,
- ticket,
- check-in,
- penyimpanan.

Capacity Planning menjadi dasar peningkatan infrastruktur sebelum Reuni Akbar.

---

# 26.17 Service Level Objectives (SLO)

Target operasional:

Availability

- ≥ 99,5%

Health Check

- 100% berhasil setelah deployment

Backup

- 100% berhasil sebelum migration

Migration

- 100% idempotent

Response API

- rata-rata < 300 ms

Critical Recovery

- < 30 menit

Target ini menjadi acuan evaluasi operasional.

---

# 26.18 Future Observability

Tahap berikutnya sistem dapat diintegrasikan dengan:

- Grafana
- Prometheus
- Loki
- OpenTelemetry
- Sentry
- Elastic Stack

Integrasi dilakukan tanpa mengubah arsitektur inti.

---

# 26.19 Acceptance Criteria

Monitoring & Observability dianggap selesai apabila:

✓ Infrastruktur dapat dipantau.

✓ API dapat dipantau.

✓ Database dapat dipantau.

✓ Queue dapat dipantau.

✓ Background Job dapat dipantau.

✓ Business Metrics tersedia.

✓ Audit Trail tersedia.

✓ Security Event tercatat.

✓ Alerting berjalan.

✓ Logging terstruktur.

✓ Dashboard Monitoring tersedia.

✓ Capacity Planning terdokumentasi.

✓ SLO terdokumentasi.

✓ Seluruh observability mengikuti prinsip Production First.

# 27. Acceptance Criteria

## 27.1 Overview

Bab ini mendefinisikan kriteria penerimaan (Acceptance Criteria) yang harus dipenuhi sebelum MZT Apps Event Management System dinyatakan siap digunakan pada lingkungan Production.

Acceptance Criteria menjadi acuan bersama bagi:

- Product Owner
- Tim Pengembang
- Tim QA
- Administrator
- Panitia Reuni Akbar

Sistem hanya dapat dinyatakan selesai apabila seluruh kriteria pada bab ini terpenuhi.

---

# 27.2 Functional Acceptance

## Authentication

Sistem harus mampu:

- Login menggunakan NIAM / Nomor Anggota.
- Logout dengan aman.
- Memuat profil pengguna.
- Memaksa perubahan password pertama.
- Mendukung reset password melalui administrator.

Status:

✓ Mandatory

---

## Event Management

Administrator harus mampu:

- Membuat Event.
- Mengubah Event.
- Menonaktifkan Event.
- Mengatur kuota.
- Mengatur venue.
- Mengatur visibility.
- Mengatur jadwal registrasi.
- Mengatur harga.

Status:

✓ Mandatory

---

## Registration

Alumni harus mampu:

- Melihat Event.
- Melakukan registrasi.
- Melihat riwayat registrasi.
- Tidak dapat mendaftar dua kali pada Event yang sama.

Sistem harus:

- memeriksa kuota,
- memeriksa waktu registrasi,
- memeriksa visibility,
- memeriksa status Event.

Status:

✓ Mandatory

---

## Payment

Peserta harus mampu:

- Melihat tagihan.
- Mengunggah bukti pembayaran.
- Melihat status pembayaran.

Administrator harus mampu:

- Memverifikasi pembayaran.
- Menolak pembayaran.
- Memberikan alasan penolakan.
- Melihat riwayat pembayaran.

Status:

✓ Mandatory (Phase 2B)

---

## Ticket

Sistem harus mampu:

- Menghasilkan Ticket.
- Menghasilkan QR Code.
- Mengunduh Ticket.
- Membatalkan Ticket.
- Menerbitkan ulang Ticket.

Status:

✓ Mandatory (Phase 2B)

---

## Check-in

Panitia harus mampu:

- Memindai QR Code.
- Melakukan Check-in.
- Menolak QR tidak valid.
- Menolak Ticket yang sudah digunakan.
- Melihat riwayat Check-in.

Status:

✓ Mandatory (Phase 2C)

---

## Attendance

Sistem harus mampu:

- Mencatat kehadiran.
- Menghubungkan Attendance dengan Ticket.
- Mencatat Gate.
- Mencatat waktu Check-in.

Status:

✓ Mandatory (Phase 2C)

---

# 27.3 Non Functional Acceptance

Seluruh halaman utama harus dapat diakses.

Target:

- tidak terdapat error JavaScript,
- tidak terdapat error PHP,
- tidak terdapat Migration Error.

Response API rata-rata:

< 300 ms.

Status:

✓ Mandatory

---

# 27.4 Security Acceptance

Sistem harus memenuhi:

- Authentication.
- Authorization.
- Ownership Validation.
- UUID Public Identifier.
- Audit Trail.
- Password Hashing.
- CSRF Protection.
- Sanctum Authentication.

Tidak boleh terdapat akses lintas pengguna.

Status:

✓ Mandatory

---

# 27.5 Database Acceptance

Migration harus:

- additive,
- idempotent,
- memiliki down(),
- backward compatible.

Seluruh migration harus dapat dijalankan lebih dari satu kali tanpa menghasilkan perubahan tambahan.

Status:

✓ Mandatory

---

# 27.6 Deployment Acceptance

Pipeline harus berhasil menjalankan:

- Build.
- Backup Database.
- Deploy.
- Migration.
- Verify Schema.
- Health Check.
- Docker Prune.

Backup wajib berhasil sebelum Migration.

Status:

✓ Mandatory

---

# 27.7 Monitoring Acceptance

Monitoring harus mampu menampilkan:

- Container.
- Database.
- API.
- Queue.
- Business Metrics.
- Health Status.
- Backup Status.

Status:

✓ Mandatory

---

# 27.8 User Acceptance Test (UAT)

UAT dilakukan bersama pengurus MZT.

Skenario minimal:

Administrator

- membuat Event,
- mengubah Event,
- memverifikasi Payment,
- menghasilkan Ticket,
- melihat Dashboard.

Alumni

- login,
- registrasi,
- pembayaran,
- menerima Ticket,
- Check-in.

Semua skenario harus berhasil.

Status:

✓ Mandatory

---

# 27.9 Regression Test

Perubahan pada Phase 2 tidak boleh merusak:

- Portal Alumni.
- Dashboard Administrator.
- Digital Identity.
- Authentication.
- User Management.
- Event lama.
- API lama.

Status:

✓ Mandatory

---

# 27.10 Performance Acceptance

Target minimum Production:

Availability

≥ 99.5%

Average API Response

< 300 ms

P95

< 800 ms

Backup

100%

Migration Success

100%

Health Check

100%

Deployment Success

100%

Status:

✓ Mandatory

---

# 27.11 Production Acceptance

Sistem hanya dapat dinyatakan Production Ready apabila:

- seluruh Acceptance Criteria terpenuhi,
- seluruh Migration berhasil,
- seluruh Pipeline berhasil,
- seluruh Health Check berhasil,
- seluruh UAT disetujui,
- seluruh Regression Test lulus,
- seluruh ADR telah dipenuhi,
- seluruh PRD telah diimplementasikan.

Status:

✓ Mandatory

---

# 27.12 Release Gates

## v2.1.0-alpha1

Harus memenuhi:

- Event Core.
- Registration.
- Order.

Status:

✅ Completed

---

## v2.1.0-beta1

Harus memenuhi:

- Payment Engine.
- Ticket Engine.
- Communication Engine.

Status:

🚧 Planned

---

## v2.1.0-rc1

Harus memenuhi:

- QR Check-in.
- Attendance.
- Dashboard Operasional.

Status:

🚧 Planned

---

## v2.1.0

Harus memenuhi seluruh Acceptance Criteria pada Bab ini.

Status:

🎯 Target Release

---

# 27.13 Definition of Done

Sebuah fitur dianggap selesai apabila:

- Kode telah direview.
- Build berhasil.
- Migration berhasil.
- Unit Test (jika tersedia) berhasil.
- Regression Test berhasil.
- UAT berhasil.
- Dokumentasi diperbarui.
- ADR diperbarui (bila diperlukan).
- PRD telah sesuai implementasi.
- Pipeline Production berhasil.
- Tidak terdapat Critical Bug.

Definition of Done berlaku untuk seluruh pengembangan MZT Apps.

---

# 27.14 Final Acceptance Checklist

Sistem Event Management System dinyatakan selesai apabila:

✓ Authentication berjalan.

✓ Event Management berjalan.

✓ Registration berjalan.

✓ Payment berjalan.

✓ Ticket berjalan.

✓ Check-in berjalan.

✓ Attendance berjalan.

✓ Communication berjalan.

✓ Dashboard berjalan.

✓ Reporting berjalan.

✓ Monitoring berjalan.

✓ Backup berjalan.

✓ Deployment berjalan.

✓ Rollback tersedia.

✓ Security tervalidasi.

✓ Audit Trail tersedia.

✓ UAT disetujui.

✓ Regression Test lulus.

✓ Production Deployment berhasil.

✓ Seluruh ADR (001–016) dipenuhi.

✓ Seluruh PRD telah diimplementasikan.

Dengan terpenuhinya seluruh kriteria di atas, MZT Apps Event Management System dinyatakan **Production Ready** dan siap digunakan untuk operasional Reuni Akbar Internasional Maziltu Tholiban.

# 28. Product Roadmap

## 28.1 Overview

Bab ini mendefinisikan roadmap pengembangan MZT Apps setelah implementasi Digital Identity Foundation dan Event Management System.

Roadmap disusun untuk memastikan setiap pengembangan dilakukan secara bertahap, terukur, dan tetap mengikuti prinsip:

- Evolution First
- Backward Compatible
- Production First
- Domain Driven Design
- Modular Architecture

Setiap milestone harus dapat dirilis secara independen tanpa mengganggu fitur yang telah berjalan.

---

# 28.2 Product Evolution

Roadmap pengembangan MZT Apps dibagi menjadi beberapa fase utama.

```
v2.0.0

Digital Identity Foundation

        │

        ▼

v2.1.0

Event Management System

        │

        ▼

v2.2.x

Community Platform

        │

        ▼

v3.0.0

Maziltu Digital Ecosystem
```

---

# 28.3 Phase 1 — Digital Identity Foundation

Status:

✅ Completed

Ruang Lingkup:

- Authentication
- Portal Alumni
- Dashboard Administrator
- Digital ID Card
- User Management
- Profile Management
- Role Management
- CI/CD
- Deployment Pipeline
- Backup & Rollback
- Health Check
- Audit Foundation

Hasil:

Seluruh alumni memiliki identitas digital sebagai fondasi seluruh layanan berikutnya.

---

# 28.4 Phase 2 — Event Management System

Status:

🚧 In Progress

Target:

Menyediakan platform end-to-end untuk penyelenggaraan seluruh kegiatan Maziltu Tholiban.

Phase 2 dibagi menjadi empat milestone.

---

## Phase 2A — Event Core + Registration + Order

Status:

✅ Completed

Fitur:

- Event Management
- Registration
- Order Aggregate
- Capacity Management
- Visibility
- Registration Window
- Order Snapshot
- UUID Public Identity

Deliverable:

v2.1.0-alpha1

---

## Phase 2B — Payment & Ticket Engine

Status:

🚧 Planned

Fitur:

- Payment Engine
- Payment Verification
- Payment History
- Ticket Generation
- QR Ticket
- Ticket Download
- Ticket Reissue
- Communication Engine
- Notification Queue

Deliverable:

v2.1.0-beta1

---

## Phase 2C — Attendance & Check-in

Status:

🚧 Planned

Fitur:

- QR Check-in
- Gate Management
- Attendance
- Operator Dashboard
- Duplicate Detection
- Manual Check-in
- Attendance Monitoring

Deliverable:

v2.1.0-rc1

---

## Phase 2D — Finance & Reporting

Status:

🚧 Planned

Fitur:

- Finance Dashboard
- Revenue Report
- Attendance Report
- Registration Report
- Export Data
- Operational Dashboard
- Analytics

Deliverable:

v2.1.0

---

# 28.5 Phase 3 — Community Platform

Status:

📋 Planned

Target:

Mengubah MZT Apps dari sistem event menjadi platform komunitas alumni.

Ruang Lingkup:

- Community News
- Discussion Forum
- Gallery
- Alumni Directory
- Organization Structure
- Volunteer Management
- Donation
- Membership Renewal
- Community Notification

Target Release:

v2.2.x

---

# 28.6 Phase 4 — Learning & Knowledge

Status:

📋 Planned

Target:

Mengembangkan platform pembelajaran dan dokumentasi organisasi.

Fitur:

- Digital Library
- Knowledge Base
- SOP Repository
- Organizational Archive
- Video Learning
- Document Versioning
- Search Engine

Target Release:

v2.3.x

---

# 28.7 Phase 5 — Organization Platform

Status:

📋 Planned

Target:

Mendukung operasional organisasi secara menyeluruh.

Fitur:

- Task Management
- Meeting Management
- Agenda Management
- Volunteer Assignment
- Inventory
- Asset Management
- Committee Workspace

Target Release:

v2.4.x

---

# 28.8 Phase 6 — Maziltu Digital Ecosystem

Status:

🎯 Vision

Target:

Menyatukan seluruh layanan Maziltu Tholiban dalam satu platform digital.

Domain utama:

- Identity
- Event
- Finance
- Community
- Learning
- Organization
- Communication
- Reporting

Semua modul menggunakan:

- Single Authentication
- Shared Identity
- Shared Notification
- Shared Audit Trail
- Shared Monitoring
- Shared Deployment Pipeline

Target Release:

v3.0.0

---

# 28.9 Technical Roadmap

Roadmap teknis mengikuti evolusi arsitektur.

## Foundation

✅ Authentication

✅ Deployment

✅ CI/CD

✅ Monitoring

---

## Event Platform

🚧 Payment

🚧 Ticket

🚧 Attendance

🚧 Reporting

---

## Platform Services

📋 Notification Service

📋 File Service

📋 Search Service

📋 Audit Service

📋 Scheduler

📋 Communication Service

---

## Infrastructure

📋 Horizontal Scaling

📋 Read Replica Database

📋 Redis Cache

📋 Queue Cluster

📋 Object Storage

📋 Disaster Recovery Site

---

# 28.10 Architectural Evolution

Arsitektur akan berkembang tanpa mengubah prinsip dasar yang telah ditetapkan melalui ADR.

Prinsip yang dipertahankan:

- Aggregate Root
- Immutable Snapshot
- UUID Public Identity
- Service Layer
- Evolution First
- Additive Migration
- Production Safety
- Modular Domain

Seluruh fitur baru harus mengikuti ADR yang telah disetujui.

---

# 28.11 Release Strategy

Setiap release mengikuti tahapan:

```
Planning

↓

PRD

↓

Audit Gap Analysis

↓

Architecture Review

↓

Implementation

↓

Deployment

↓

UAT

↓

Production Release
```

Tidak diperbolehkan melewati tahapan di atas.

---

# 28.12 Success Metrics

Keberhasilan roadmap diukur berdasarkan:

### Product

- Seluruh milestone selesai sesuai ruang lingkup.
- Tidak ada regresi pada fitur lama.

### Technical

- Deployment berhasil.
- Migration aman.
- Backup tervalidasi.
- Health Check berhasil.

### Operational

- UAT disetujui.
- Pengurus dapat mengoperasikan sistem.
- Dokumentasi selalu diperbarui.

### Business

- Registrasi alumni berjalan digital.
- Pembayaran terdigitalisasi.
- Check-in terdigitalisasi.
- Laporan tersedia secara real-time.

---

# 28.13 Long-Term Vision

MZT Apps ditargetkan menjadi platform digital resmi Maziltu Tholiban yang mendukung seluruh aktivitas organisasi, mulai dari identitas alumni, penyelenggaraan event, komunikasi, administrasi, hingga pengelolaan pengetahuan.

Setiap fase pengembangan harus memberikan nilai nyata bagi pengguna tanpa mengorbankan stabilitas sistem yang telah berjalan.

---

# 28.14 Acceptance Criteria

Roadmap dianggap berhasil apabila:

✓ Setiap milestone memiliki ruang lingkup yang jelas.

✓ Setiap fase dapat dirilis secara independen.

✓ Seluruh pengembangan mengikuti ADR.

✓ Tidak terjadi breaking change terhadap sistem yang sudah berjalan.

✓ Setiap release melewati proses PRD, Audit, Review, Implementasi, Deployment, dan UAT.

✓ Visi jangka panjang tetap konsisten dengan prinsip Evolution First dan Modular Architecture.

# 29. Appendices

## 29.1 Overview

Bab ini berisi seluruh referensi, standar, konvensi, dan dokumen pendukung yang digunakan selama pengembangan MZT Apps.

Appendices menjadi sumber rujukan resmi bagi:

- Product Owner
- Software Architect
- Backend Developer
- Frontend Developer
- QA Engineer
- DevOps Engineer
- Administrator
- Panitia Reuni Akbar

Seluruh dokumen pada bab ini merupakan bagian yang tidak terpisahkan dari PRD.

---

# 29.2 Project Documents

Dokumen utama proyek terdiri dari:

| Dokumen | Status | Fungsi |
|---------|--------|--------|
| PRD – Digital Identity Foundation | Final | Fondasi identitas digital alumni |
| PRD – Event Management System | Final | Event Core, Registration, Order |
| PRD – Payment & Ticket Engine | Final | Payment, Ticket, Communication |
| Audit-Gap-Analysis-EMS | Final | Analisis evolusi database & implementasi |
| ADR (Architecture Decision Record) | Active | Keputusan arsitektur proyek |
| Release Notes | Active | Riwayat perubahan setiap versi |

---

# 29.3 Architecture Decision Records (ADR)

Keputusan arsitektur yang berlaku:

| ADR | Judul | Status |
|------|--------|--------|
| ADR-001 | Order as Aggregate Root | Accepted |
| ADR-002 | Immutable Snapshot | Accepted |
| ADR-003 | Public Identity (UUID) | Accepted |
| ADR-004 | Business Logic in Service Layer | Accepted |
| ADR-005 | Evolution First Migration | Accepted |
| ADR-006 | Audit Columns | Accepted |
| ADR-007 | Global Order Number | Accepted |
| ADR-008 | Event Visibility | Accepted |
| ADR-009 | Registration Lifecycle | Accepted |
| ADR-010 | Payment Lifecycle | Accepted |
| ADR-011 | Ticket Lifecycle | Accepted |
| ADR-012 | Attendance Lifecycle | Accepted |
| ADR-013 | Backward Compatibility | Accepted |
| ADR-014 | Production Safety | Accepted |
| ADR-015 | Development Milestone | Accepted |
| ADR-016 | Payment & Ticket Aggregate | Planned / Next Phase |

Seluruh implementasi baru wajib mengikuti ADR yang telah disetujui.

---

# 29.4 Repository Structure

Repositori utama:

```
laravel-mzt/
```

Backend Laravel.

Berisi:

- API
- Migration
- Model
- Service
- Queue
- Scheduler

---

```
maziltu-design-studio/
```

Frontend React + TanStack Router.

Berisi:

- Portal Alumni
- Dashboard Admin
- Public Website
- Documentation
- Deployment Pipeline

---

# 29.5 Documentation Structure

```
docs/

├── PRD-Digital Identity Foundation.md
├── PRD-Event Management System.md
├── PRD-Payment & Ticket Engine.md
├── Audit-Gap-Analysis-EMS.md
├── ADR.md
├── RELEASE_NOTES_v2.1.0-alpha1.md
└── DEPLOYMENT-ROLLBACK.md
```

Seluruh dokumen harus menggunakan Markdown dan disimpan di dalam direktori `docs/`.

---

# 29.6 Naming Conventions

## Order Number

```
MZT-2026-000001
```

Global, berurutan, digunakan untuk kebutuhan administrasi.

---

## UUID

```
550e8400-e29b-41d4-a716-446655440000
```

Digunakan sebagai identitas publik untuk:

- Order
- Payment
- Ticket
- API
- QR Code

Integer ID tidak boleh diekspos kepada pengguna.

---

## Status

Status disimpan sebagai **VARCHAR**, bukan ENUM database.

Nilai didefinisikan melalui PHP Native Enum.

Contoh:

Order:

```
draft
registered
confirmed
checked_in
finished
cancelled
```

Payment:

```
pending
waiting_verification
paid
rejected
refund
```

---

# 29.7 Coding Standards

Backend:

- Laravel Coding Standard
- PSR-12
- Service Layer Pattern
- Thin Controller
- Fat Service
- UUID sebagai identitas publik

Frontend:

- TypeScript Strict Mode
- TanStack Router
- TanStack Query
- Component-based Architecture
- Reusable UI Components

---

# 29.8 Migration Standards

Migration wajib:

- additive,
- idempotent,
- memiliki `up()` dan `down()`,
- backward compatible.

Migration tidak boleh:

- menghapus data produksi,
- mengubah kontrak API lama,
- menyebabkan downtime yang tidak direncanakan.

---

# 29.9 Deployment Standards

Deployment mengikuti Pipeline resmi:

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

Deployment manual ke Production tidak diperbolehkan.

---

# 29.10 Security Standards

Standar keamanan yang digunakan:

- Laravel Sanctum
- Password Hashing (bcrypt)
- UUID Public Identity
- Ownership Validation
- Audit Trail
- HTTPS Only
- Authentication Required
- Authorization by Role

---

# 29.11 Monitoring Standards

Monitoring mencakup:

- Infrastructure
- Application
- Database
- Queue
- Business Metrics
- Audit Trail
- Deployment
- Backup
- Health Check

Seluruh deployment harus menghasilkan status yang dapat diverifikasi.

---

# 29.12 Release Strategy

Release mengikuti Semantic Versioning.

```
v2.0.0

↓

v2.1.0-alpha1

↓

v2.1.0-beta1

↓

v2.1.0-rc1

↓

v2.1.0
```

Setiap release wajib memiliki:

- Release Notes
- Git Commit Backend
- Git Commit Frontend
- Jenkins Build
- Migration Batch
- UAT Result

---

# 29.13 Future Documents

Dokumen yang akan ditambahkan pada fase berikutnya:

- PRD – QR Check-in & Attendance
- PRD – Finance & Reporting
- PRD – Community Platform
- PRD – Knowledge Platform
- PRD – Organization Platform

Dokumen tersebut mengikuti struktur yang sama dengan PRD saat ini.

---

# 29.14 Glossary

| Istilah | Definisi |
|----------|----------|
| Alumni | Anggota Maziltu Tholiban yang memiliki akun digital. |
| Order | Agregat utama yang merepresentasikan proses registrasi peserta pada suatu event. |
| Payment | Proses pembayaran yang terkait dengan Order. |
| Ticket | Bukti keikutsertaan peserta yang diterbitkan setelah pembayaran memenuhi ketentuan. |
| Attendance | Catatan kehadiran peserta saat mengikuti event. |
| Check-in | Proses validasi kehadiran menggunakan QR Code atau mekanisme lain yang ditentukan. |
| Aggregate Root | Entitas utama yang menjadi pusat konsistensi suatu domain. |
| Snapshot | Salinan data yang disimpan agar histori tetap konsisten walaupun data sumber berubah. |
| UUID | Identitas publik yang bersifat unik secara global dan aman untuk diekspos. |
| UAT | User Acceptance Test, yaitu pengujian akhir oleh pengguna sebelum sistem dinyatakan siap digunakan. |

---

# 29.15 Document Governance

Dokumen ini merupakan acuan resmi pengembangan MZT Apps.

Perubahan terhadap PRD hanya dapat dilakukan melalui proses berikut:

1. Analisis kebutuhan.
2. Revisi PRD.
3. Revisi Audit Gap Analysis (jika diperlukan).
4. Penambahan atau perubahan ADR (jika berdampak pada arsitektur).
5. Architecture Review.
6. Persetujuan Product Owner.
7. Implementasi.
8. Deployment.
9. UAT.
10. Pembaruan Release Notes.

Dengan mekanisme tersebut, dokumentasi akan selalu selaras dengan implementasi dan keputusan arsitektur.

---

# 29.16 Closing Statement

MZT Apps dikembangkan sebagai platform digital resmi Maziltu Tholiban yang berorientasi pada keberlanjutan, keamanan, dan kemudahan operasional.

Digital Identity Foundation, Event Management System, serta Payment & Ticket Engine merupakan fondasi menuju ekosistem digital organisasi yang terintegrasi.

Seluruh pengembangan dilakukan secara bertahap dengan prinsip:

- Evolution First
- Backward Compatible
- Production First
- Modular Architecture
- Documentation Driven Development

Dokumen ini menjadi referensi utama bagi seluruh proses analisis, implementasi, pengujian, deployment, dan pengembangan lanjutan MZT Apps.