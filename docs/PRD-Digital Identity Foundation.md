# PRD — MZT Apps v2.0
# Phase 1 — Digital Identity Foundation

**Version** : 2.0.0  
**Status** : Draft  
**Target** : Sebelum Reuni Akbar Internasional Maziltutholiban  
**Project** : MZT Apps (Maziltutholiban Members Platform)

---

# 1. Latar Belakang

MZT Apps saat ini telah berjalan sebagai platform administrasi Himpunan Alumni Pondok Pesantren Darussadah Al Islamy (Maziltutholiban).

Saat ini sistem telah digunakan secara aktif dan memiliki sekitar **950 data alumni**.

Modul yang sudah tersedia meliputi:

- Dashboard
- Anggota
- Event
- Presensi
- Berita
- Aktivitas User
- ID Card

Seluruh modul tersebut sudah berjalan dengan baik dan digunakan oleh admin setiap hari.

Namun sampai saat ini alumni belum memiliki akun pribadi untuk mengakses sistem.

Phase 1 difokuskan untuk membangun **Digital Identity** bagi seluruh alumni tanpa mengubah alur kerja maupun arsitektur aplikasi yang sudah berjalan.

---

# 2. Tujuan

Menyediakan portal alumni sehingga setiap alumni memiliki akun pribadi untuk:

- Login ke MZT Apps
- Melihat profil pribadi
- Melihat ID Card Digital
- Mengakses informasi organisasi
- Menjadi fondasi seluruh layanan MZT Apps di masa depan

---

# 3. Prinsip Pengembangan

Phase 1 wajib mengikuti prinsip berikut:

## Backward Compatible

Seluruh fitur lama harus tetap berjalan tanpa perubahan perilaku.

Workflow admin yang sudah digunakan tidak boleh terganggu.

---

## Incremental Enhancement

Seluruh fitur baru merupakan penambahan.

Tidak mengganti sistem yang sudah berjalan.

---

## Single Identity

Satu alumni memiliki satu akun.

Akun tersebut akan digunakan untuk seluruh layanan MZT Apps di masa depan.

---

## Reusable

Semua fitur pada Phase 1 harus dapat digunakan kembali oleh Phase berikutnya.

---

# 4. Scope

## In Scope

- Login Alumni
- Dashboard Alumni
- Profil Alumni
- Digital ID Card
- Change Password
- Forgot Password (Admin Reset)
- User Management
- Authentication Foundation

---

## Out of Scope

- Registrasi Reuni
- QR Ticket
- QR Check-in
- Dashboard Panitia
- Pembayaran
- Donasi
- Voting
- Direktori Alumni
- Alumni Map
- Forum
- Marketplace

Semua akan dikembangkan pada phase berikutnya.

---

# 5. Existing System

Phase ini tidak mengubah sistem yang sudah ada.

Tetap menggunakan:

- Struktur Laravel
- Struktur Frontend
- Middleware checkrole
- Permission role_user
- Dashboard Admin
- Struktur Event
- Struktur Berita
- Struktur Presensi

---

# 6. Authentication

## Login

Halaman login tetap menggunakan halaman yang sudah ada.

User terdiri dari:

- Admin
- Alumni

Setelah login sistem menentukan dashboard berdasarkan hak akses.

---

## Logout

Menggunakan mekanisme Laravel Authentication yang sudah berjalan.

---

## Change Password

User dapat mengganti password.

Password default dapat dipaksa untuk diganti pada login pertama melalui konfigurasi sistem.

---

## Forgot Password

Pada Phase 1 reset password dilakukan oleh Admin.

Self-service recovery akan dikembangkan pada phase berikutnya.

---

# 7. Dashboard Alumni

Dashboard Alumni dibuat sebagai halaman baru.

Menu yang tersedia:

- Beranda
- Profil Saya
- ID Card
- Berita
- Event
- Ubah Password

Dashboard Admin tetap menggunakan dashboard lama.

---

# 8. Profil Alumni

Menampilkan data alumni yang sudah tersedia pada database.

Field yang dapat ditampilkan antara lain:

- Nama
- Foto
- NIAM
- Nomor HP
- Email
- Alamat
- Angkatan
- Tahun Mondok
- Domisili

Field yang dapat diedit mengikuti kebijakan organisasi.

Tidak dilakukan perubahan besar pada struktur database.

---

# 9. Digital ID Card

Setiap alumni memiliki halaman ID Card Digital.

Informasi yang ditampilkan:

- Foto
- Nama
- NIAM
- Status Keanggotaan
- QR Code

QR menggunakan format yang sudah digunakan oleh sistem.

Tidak membuat format QR baru.

---

# 10. User Management

Admin mendapatkan tambahan fungsi:

- Generate Account
- Reset Password
- Aktifkan Akun
- Nonaktifkan Akun

Menu anggota yang sudah ada tidak mengalami perubahan.

---

# 11. Permission

Tetap menggunakan sistem permission yang sudah berjalan.

Tidak dilakukan refactor.

Tetap menggunakan:

- role_user
- middleware checkrole

Tidak dilakukan perubahan nama maupun struktur.

---

# 12. Database

Perubahan seminimal mungkin.

## users

Apabila diperlukan ditambahkan:

- last_login
- password_changed_at

## anggota

Apabila diperlukan ditambahkan:

- user_id

Selain itu struktur database tetap dipertahankan.

---

# 13. API

Endpoint baru:

POST /login

POST /logout

GET /me

GET /profile

PUT /profile

PUT /password

GET /id-card

Endpoint lama tetap berjalan tanpa perubahan.

---

# 14. UI

Halaman baru:

- Dashboard Alumni
- Profil Saya
- ID Card
- Change Password

Halaman Admin tidak mengalami perubahan.

---

# 15. Security

- Password menggunakan Laravel Hash
- Session menggunakan Laravel Authentication
- Middleware tetap menggunakan sistem lama
- Audit Login disimpan apabila fitur tersedia

---

# 16. Acceptance Criteria

## Authentication

- Alumni dapat login menggunakan akun yang diberikan admin.
- Alumni diarahkan ke Dashboard Alumni.
- Admin tetap masuk ke Dashboard Admin.

---

## Dashboard Alumni

- Menu tampil sesuai hak akses.
- Dashboard Admin tidak mengalami perubahan.

---

## Profil

- Alumni dapat melihat profil sendiri.
- Alumni hanya dapat mengubah field yang diizinkan.

---

## ID Card

- ID Card dapat ditampilkan.
- QR Code valid.
- Informasi anggota sesuai database.

---

## User Management

- Admin dapat membuat akun.
- Admin dapat mereset password.
- Admin dapat mengaktifkan dan menonaktifkan akun.

---

# 17. Definition of Done

Phase 1 dinyatakan selesai apabila:

- Admin tetap dapat menggunakan sistem tanpa perubahan workflow.
- Seluruh modul lama tetap berjalan normal.
- Seluruh alumni dapat dibuatkan akun.
- Alumni dapat login.
- Alumni memiliki Dashboard Alumni.
- Alumni dapat melihat Profil.
- Alumni dapat melihat Digital ID Card.
- Alumni dapat mengganti password.
- Admin dapat mengelola akun alumni.

---

# 18. Catatan Implementasi

Phase 1 **bukan** merupakan refactor sistem.

Phase ini hanya menambahkan **Portal Alumni** di atas sistem yang sudah berjalan.

Seluruh modul yang sudah ada tetap menjadi fondasi aplikasi.

Dengan demikian Phase 2 dapat langsung memanfaatkan autentikasi dan Digital Identity tanpa perlu mengubah kembali arsitektur inti MZT Apps.