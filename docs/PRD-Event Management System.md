# PRD — MZT Apps v2.1
# Event Management System (EMS)

**Project** : MZT Apps (Maziltutholiban Members Platform)
**Version** : 2.1.0
**Status** : Final PRD
**Depends On** : Phase 1 — Digital Identity Foundation (Completed)
**Primary Use Case** : Reuni Akbar Internasional Maziltutholiban

---

# 1. Executive Summary

Event Management System (EMS) merupakan modul inti MZT Apps yang digunakan untuk mengelola seluruh kegiatan Maziltutholiban secara terintegrasi.

Modul ini dibangun di atas Digital Identity Foundation (Phase 1), sehingga seluruh peserta menggunakan akun alumni yang telah dimiliki tanpa perlu registrasi ulang.

Implementasi pertama EMS adalah **Reuni Akbar Internasional**, namun arsitektur dirancang agar dapat digunakan kembali untuk seluruh kegiatan MZT di masa depan.

---

# 2. Background

Saat ini proses penyelenggaraan kegiatan masih melibatkan banyak pekerjaan manual, seperti:

- Registrasi peserta
- Verifikasi pembayaran
- Presensi
- Check-in
- Rekap kehadiran
- Rekap pembayaran

Selain itu, data kegiatan sebelumnya telah tersimpan di database MZT dan perlu dipertahankan sebagai aset organisasi.

Oleh karena itu EMS dikembangkan menggunakan prinsip **evolusi sistem**, bukan membangun ulang.

---

# 3. Objectives

EMS harus mampu mengelola seluruh siklus event mulai dari publikasi hingga pelaporan.

Target utama:

- Digital Registration
- Order Management
- Payment Management
- Ticketing
- QR Check-In
- Attendance
- Finance
- Reporting

---

# 4. Design Principles

## Single Identity

Seluruh peserta menggunakan akun alumni.

Tidak ada akun baru.

---

## Event Agnostic

EMS tidak dibuat khusus untuk Reuni Akbar.

Harus dapat digunakan untuk:

- Reuni
- Seminar
- Pelatihan
- Kajian
- Musyawarah
- Halal Bihalal
- Event lainnya

---

## Evolution First

Menggunakan struktur database yang sudah ada.

Prioritas:

Reuse

↓

Migrate

↓

Add

↓

Retire

---

## Backward Compatible

Tidak merusak modul yang sudah berjalan.

---

## Modular

Setiap modul dapat dikembangkan secara terpisah.

---

# 5. Scope

## In Scope

- Event Management
- Registration
- Order
- Payment
- Ticket
- QR Check-In
- Attendance
- Dashboard Panitia
- Dashboard Peserta
- Finance
- Reporting

---

## Out of Scope

- Live Streaming
- Marketplace
- Donasi
- Voting
- Forum
- Mobile Apps

---

# 6. Business Flow

```
Event Diterbitkan

↓

Registrasi

↓

Order Dibuat

↓

Pembayaran

↓

Pembayaran Terverifikasi

↓

Ticket Dibuat

↓

Check-In

↓

Kehadiran

↓

Event Selesai
```

---

# 7. Core Modules

## 7.1 Event Management

Admin dapat:

- Membuat Event
- Mengubah Event
- Publish
- Unpublish
- Menutup Registrasi
- Membatalkan Event
- Mengarsipkan Event

Field:

- Nama
- Banner
- Deskripsi
- Lokasi
- Venue
- Tanggal
- Kuota
- Harga
- Registrasi Dibuka
- Registrasi Ditutup
- Status

---

## 7.2 Registration

Peserta login menggunakan akun alumni.

↓

Pilih Event.

↓

Klik Daftar.

↓

Order otomatis dibuat.

Profil peserta otomatis diambil dari Portal Alumni.

Tidak ada input data ulang.

---

## 7.3 Order Management

Order merupakan pusat seluruh transaksi.

Satu alumni dapat memiliki banyak Order.

Satu Order hanya dimiliki satu Event.

Order menyimpan:

- Order Number
- Event
- Alumni
- Total
- Registration Status
- Ticket Status

---

## 7.4 Registration Status

Status Registrasi

Draft

↓

Registered

↓

Confirmed

↓

Checked In

↓

Finished

↓

Cancelled

Status registrasi terpisah dari status pembayaran.

---

# 8. Payment

EMS mendukung pembayaran:

## Online

- Transfer Bank
- QRIS

Flow

Daftar

↓

Upload Bukti

↓

Verifikasi

↓

Lunas

---

## Offline

Pembayaran dilakukan saat hari acara.

Flow

Registrasi

↓

Bayar

↓

Panitia Verifikasi

↓

Lunas

---

## Walk-In

Peserta datang langsung.

↓

Panitia membuat Order.

↓

Dibayarkan.

↓

Ticket dibuat.

↓

Check-In.

---

# 9. Payment Status

Pending

↓

Waiting Verification

↓

Paid

↓

Rejected

↓

Refund

---

# 10. Payment Method

- Transfer
- QRIS
- Cash

Mudah ditambahkan tanpa mengubah arsitektur.

---

# 11. Ticketing

Ticket dibuat setelah Order valid.

Ticket memiliki:

- Ticket Number
- QR Ticket
- Event
- Peserta
- Status

QR Ticket menggunakan Ticket ID.

Bukan QR Digital ID Card.

---

# 12. QR Check-In

Petugas membuka Scanner.

↓

Scan Ticket.

↓

Validasi.

↓

Status

Valid

Sudah Check-In

Tidak Valid

↓

Kehadiran dibuat.

---

# 13. Attendance

Kehadiran menyimpan:

- Event
- Ticket
- Alumni
- Gate
- Petugas
- Waktu Check-In

Satu Ticket hanya dapat check-in satu kali.

---

# 14. Dashboard Peserta

Menu baru Portal Alumni:

- Event Saya
- Order Saya
- Ticket Saya
- Pembayaran
- Kehadiran

---

# 15. Dashboard Panitia

Statistik realtime:

- Total Registrasi
- Total Hadir
- Belum Hadir
- Pendapatan
- Pembayaran Pending
- Pembayaran Lunas
- Kuota Tersisa

---

# 16. Finance

Laporan:

- Total Pendapatan
- Pendapatan Online
- Pendapatan Offline
- Refund
- Outstanding

---

# 17. Reporting

Export:

- Excel
- PDF

Laporan:

- Peserta
- Kehadiran
- Pembayaran
- Keuangan
- Statistik Event

---

# 18. Notification

Notifikasi:

- Registrasi Berhasil

- Pembayaran Diterima

- Pembayaran Ditolak

- Ticket Aktif

- Pengingat Event

Media:

- Email

- WhatsApp (fase berikutnya)

---

# 19. Existing Database Strategy

## REUSE

- users
- data_users
- tanggal_events
- hak_akses_role
- role_user

---

## MIGRATE

- events
- prisensi_kehadiran
- event_status

---

## ADD

- orders
- payments
- tickets

---

## RETIRE

Jalur lama penulisan transaksi.

Tetap dipertahankan sebagai histori.

---

# 20. Domain Model

```
Alumni
↓
Orders
↓
Payments
↓
Tickets
↓
Attendance
↓
Events
```

Relationship

Event

↓

hasMany Orders

Order

↓

belongsTo Event

↓

belongsTo Alumni

↓

hasMany Payments

↓

hasOne Ticket

Ticket

↓

belongsTo Order

↓

hasMany Attendance

Attendance

↓

belongsTo Ticket

↓

belongsTo Event

Payment

↓

belongsTo Order

---

Order adalah **root aggregate** dari seluruh modul berikutnya (Payment, Ticket, Attendance, Certificate pada Phase 3). Semua modul mengacu ke Order, bukan ke Event.

---

# 21. API

Event

GET /events

GET /events/{id}

POST /events

PUT /events/{id}

DELETE /events/{id}

Registration

POST /events/{id}/register

Order

GET /my-orders

GET /orders/{uuid}

Payment

POST /payments

GET /payments

PUT /payments/{id}/verify

Ticket

GET /tickets/{id}

Attendance

POST /check-in

GET /attendance

Dashboard

GET /dashboard/event-summary

---

# 22. Security

- Semua endpoint menggunakan Sanctum.
- Peserta hanya dapat melihat data miliknya.
- QR Ticket hanya berlaku satu event.
- Ticket hanya dapat digunakan satu kali.
- Check-In hanya dapat dilakukan petugas.
- Semua aktivitas tercatat pada audit log.

---

# 23. Acceptance Criteria (Phase 2A)

- Admin dapat mempublikasikan event (kapasitas / venue / visibility).
- Admin dapat mengubah event.
- Alumni dapat mendaftar event yang terbuka.
- Order otomatis dibuat saat pendaftaran.
- Registrasi ganda, event penuh/tertutup menolak.

---

# 24. Definition of Done — Phase 2A

EMD dinyatakan selesai (Phase 2A) apabila:

- Event dapat dipublikasikan.
- Registrasi berjalan.
- Order terbentuk otomatis.
- Status registrasi tersimpan.
- Tidak ada perubahan yang bersifat destructive terhadap fase sebelumnya.

Fase 2B+ menanggani pembayaran/tiket — dimulai setelah 2A selesai dan direview.

---

# 25. Roadmap

## Phase 2A (v2.1.0-alpha1)

Event Core

Registration

Order

## Phase 2B (v2.1.0-beta1)

Payment Tunai

Ticket

## Phase 2C (v2.1.0-rc1)

QR Check-in

Attendance

## Phase 2D (v2.1.0)

Dashboard

Finance

Reporting

## Phase 3

- Digital Certificate
- Volunteer
- Merchandise
- Konsumsi
- Mobile Scanner
- Multi Gate Check-In
- WhatsApp Notification
- Real-Time Monitoring
- Multi Event Analytics