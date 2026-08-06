# PRD — MZT Apps v2.1
# Phase 2 — Event Management System (EMS)

**Version** : 2.1.0  
**Status** : Final Draft  
**Depends On** : Phase 1 — Digital Identity Foundation (Completed)

---

# 1. Latar Belakang

MZT Apps telah memiliki Digital Identity Foundation pada Phase 1.

Seluruh alumni kini memiliki akun, Portal Alumni, Digital ID Card, serta autentikasi yang terintegrasi.

Tahap berikutnya adalah membangun **Event Management System (EMS)** yang mampu mengelola seluruh kegiatan organisasi secara digital.

EMS dirancang sebagai sistem permanen yang dapat digunakan untuk seluruh kegiatan Maziltutholiban.

Implementasi pertama adalah **Reuni Akbar Internasional**.

---

# 2. Tujuan

Menyediakan platform terpadu untuk mengelola seluruh siklus kegiatan organisasi.

Mulai dari:

- Publikasi Event
- Registrasi Peserta
- Order
- Pembayaran
- Ticketing
- Check In
- Kehadiran
- Dashboard Panitia
- Laporan

---

# 3. Prinsip Pengembangan

## Single Identity

Semua peserta menggunakan akun Alumni MZT.

Tidak ada akun baru.

---

## Reusable

EMS harus dapat digunakan untuk seluruh event MZT.

Bukan hanya Reuni Akbar.

---

## Modular

Setiap modul dapat dikembangkan secara independen.

---

## Backward Compatible

Tidak mengubah modul Phase 1.

---

# 4. Scope

## In Scope

- Event Management
- Registration
- Order
- Payment
- Ticketing
- QR Check In
- Attendance
- Dashboard Panitia
- Dashboard Peserta
- Reporting

---

## Out of Scope

- Marketplace
- Donasi
- Forum
- Voting
- Live Streaming

---

# 5. Event Management

Admin dapat:

- Membuat Event
- Edit Event
- Publish Event
- Tutup Registrasi
- Arsip Event

Field:

- Nama Event
- Banner
- Deskripsi
- Lokasi
- Tanggal
- Kuota
- Biaya
- Registrasi Dibuka
- Registrasi Ditutup
- Status Event

---

# 6. Registration

Alumni login.

↓

Pilih Event.

↓

Klik Daftar.

↓

Order otomatis dibuat.

Tidak perlu mengisi ulang data profil.

Semua data diambil dari Portal Alumni.

---

# 7. Registration Workflow

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

Status registrasi tidak bergantung pada pembayaran.

---

# 8. Order

Order merupakan inti sistem.

Satu peserta dapat memiliki beberapa order pada event yang berbeda.

Order menyimpan:

- Nomor Order
- Event
- Peserta
- Total Tagihan
- Status
- Payment Status
- Ticket Status

---

# 9. Payment

EMS mendukung dua metode pembayaran.

## Online

- Transfer Bank
- QRIS

Flow

Daftar

↓

Upload Bukti

↓

Verifikasi Admin

↓

Lunas

---

## Offline

Pembayaran dilakukan pada hari acara.

Flow

Registrasi

↓

Datang

↓

Bayar di Meja Registrasi

↓

Panitia Konfirmasi

↓

Lunas

---

# 10. Payment Status

Belum Bayar

↓

Menunggu Verifikasi

↓

Lunas

↓

Ditolak

↓

Refund

---

# 11. Payment Method

Transfer

QRIS

Cash

Metode lain dapat ditambahkan tanpa mengubah arsitektur.

---

# 12. Ticket

Ticket dibuat setelah Order berhasil.

Ticket memiliki:

- Ticket Number
- QR Ticket
- Event
- Nama Peserta

QR Ticket menggunakan Ticket ID.

Bukan QR Digital ID Card.

---

# 13. Check In

Panitia membuka Scanner.

↓

Scan QR Ticket.

↓

Validasi.

↓

Status

Valid

Sudah Check In

Tidak Valid

↓

Attendance dibuat.

---

# 14. Attendance

Setiap Check In menyimpan:

- Event
- Peserta
- Waktu Masuk
- Petugas
- Gate

Tidak boleh Check In dua kali.

---

# 15. Dashboard Peserta

Portal Alumni mendapat menu baru.

- Event Saya
- Ticket Saya
- Pembayaran
- Kehadiran

---

# 16. Dashboard Panitia

Menampilkan:

- Total Registrasi
- Total Hadir
- Belum Hadir
- Pembayaran
- Pendapatan
- Kuota Tersisa

Realtime.

---

# 17. Reporting

Export:

- Excel
- PDF

Laporan:

- Peserta
- Kehadiran
- Pembayaran
- Statistik Event

---

# 18. Database

Prioritaskan menggunakan struktur database yang sudah tersedia.

Gunakan apabila memungkinkan:

- events
- tanggal_events
- transaksi_events
- prisensi_kehadiran
- event_status

Tabel baru hanya dibuat apabila benar-benar diperlukan.

---

# 19. API

GET /events

GET /events/{id}

POST /events/{id}/register

GET /my-events

GET /my-orders

GET /my-ticket/{id}

POST /payments

GET /payments

POST /check-in

GET /attendance

---

# 20. Security

Ticket hanya berlaku untuk satu event.

QR Ticket hanya dapat digunakan sekali untuk Check In.

Peserta hanya dapat melihat data miliknya sendiri.

Check In hanya dapat dilakukan oleh petugas.

---

# 21. Acceptance Criteria

Admin dapat membuat Event.

Alumni dapat mendaftar Event.

Order otomatis terbentuk.

Pembayaran Online berjalan.

Pembayaran Offline berjalan.

QR Ticket berhasil dibuat.

Check In berhasil.

Attendance tercatat.

Dashboard Panitia aktif.

Laporan dapat diekspor.

---

# 22. Definition of Done

Phase 2 dinyatakan selesai apabila:

- Event dapat dipublikasikan.
- Alumni dapat mendaftar.
- Order berhasil dibuat.
- Pembayaran Online berjalan.
- Pembayaran Offline berjalan.
- Ticket berhasil dibuat.
- Check In berjalan.
- Attendance tercatat.
- Dashboard Panitia aktif.
- Reporting berjalan.

---

# 23. Roadmap

Phase 3

- Digital Certificate
- Merchandise
- Konsumsi
- Volunteer
- Multi Gate Scanner
- Mobile Scanner
- WhatsApp Notification
- Dashboard Realtime