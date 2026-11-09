# EISDesk — Rencana Final

Sistem sesi & monitoring pemakaian Lab EISD (Enterprise Intelligence System Development).
Dokumen ini adalah acuan hasil discovery. Kalau ada keputusan berubah, update di sini dulu.

## 1. Konsep

- **Sesi Lab** = satu kali lab dibuka secara fisik (kunci diambil dari brankas). Semua kegiatan
  (radiv, belajar bareng, rapat, dll) berlangsung di dalam sesi.
- Hanya **admin** (inti/koor) yang membuat, membuka, mengalihkan PJ, dan menutup sesi, karena
  hanya mereka yang tahu kode brankas.
- **Staff** (anggota lab) hanya bisa **join** / batal join sesi, dengan keperluan opsional.
- Staff yang butuh lab saat tidak ada sesi → chat admin di luar aplikasi → admin membuka sesi.
- Satu lab, satu kunci → **sesi tidak boleh overlap**, maksimal **satu sesi terbuka**.
- Kode brankas **tidak pernah** disimpan di aplikasi.

## 2. Role

| Aksi | Staff | Admin | Super Admin |
|---|---|---|---|
| Lihat jadwal & sesi, join/batal join | ✅ | ✅ | ✅ |
| Buat / buka / alihkan PJ / perpanjang / tutup / batalkan sesi | ❌ | ✅ | ✅ |
| Lihat foto, laporan, export CSV | ❌ | ✅ | ✅ |
| Buat akun staff, reset PIN staff, nonaktifkan staff | ❌ | ✅ | ✅ |
| Kelola hari libur & pengaturan | ❌ | ❌ | ✅ |
| Promosi/turunkan admin, reset password admin, nonaktifkan admin | ❌ | ❌ | ✅ |
| Lihat audit log | ❌ | ❌ | ✅ |

Super admin: ketua lab + koor pembuat sistem. Minimal harus ada 1 super admin aktif.

## 3. Akun & login

- Tidak ada self-register dan tidak ada email. Akun dibuat admin.
- Email Supabase sintetis **acak**: `<nim>-<random>@eisdesk.local` (tidak pernah dikirimi email,
  tidak bisa dibaca klien). Login hanya lewat server action, jadi lockout tidak bisa di-bypass
  dengan memanggil endpoint auth Supabase langsung.
- **Staff:** NIM + **PIN 6 digit**. **Admin/super admin:** NIM + password minimal 8 karakter.
- Akun baru / hasil reset memakai rahasia sementara → wajib diganti saat login pertama
  (`must_change_secret`). Ganti role staff↔admin juga memaksa ganti rahasia.
- PIN lemah ditolak (`123456`, `000000`, digit sama semua, berurutan, 6 digit terakhir NIM).
- **Lockout:** 5 kali salah → NIM dikunci 15 menit (tabel `login_attempts`).
- Kode 4 huruf besar (mis. `ZIKRI`/`DEZA`) hanya **identitas tampilan** — kode ini publik di eisd.site.
- Akun bisa dinonaktifkan (`is_active = false`), riwayat tetap utuh.

## 4. Aturan waktu

- Jam operasional **08:00–21:00 WIB**, **Senin–Sabtu**. Granularitas **1 jam**, minimal 1 jam.
- **Minggu, tanggal merah, cuti bersama** diblok total (tanpa override). UI menampilkan peringatan.
- Data hari libur: sinkron dari API + koreksi manual super admin.
- Timezone: simpan `timestamptz`, tampilkan & validasi dalam `Asia/Jakarta`.

## 5. Siklus sesi

```
[scheduled] --open (foto kondisi lab)--> [open] --close oleh PJ (foto kondisi lab + foto kunci di brankas)--> [closed]
     |                                     |
     +--cancel--> [cancelled]              +-- transfer PJ / ambil alih PJ / perpanjang jam
     +--digabung ke sesi lain--> [merged]
```

- "Buka Lab Sekarang" = buat + buka sesi sekaligus.
- Jam sesi habis **tidak** menutup otomatis; PJ diingatkan.
- **Hanya PJ saat ini** yang boleh menutup sesi.
- Pengalihan PJ: "Alihkan ke…" (oleh PJ) atau "Ambil alih" (oleh admin lain). Semua tercatat.
- **Perpanjang** sesi yang menabrak sesi terjadwal berikutnya → sesi berikutnya **digabung**:
  pesertanya pindah ke sesi ini (keperluan = judul sesi lama), PJ dialihkan ke pembuat sesi
  berikutnya, sesi itu ditandai `merged`.
- Join sebelum sesi dibuka = "rencana hadir"; join saat sesi terbuka = "hadir".
- Staff boleh batal join selama sesi belum ditutup.

## 6. Notifikasi (in-app + Telegram)

| Kejadian | Penerima |
|---|---|
| Sesi dibuat (terjadwal) | Grup Telegram admin |
| Sesi dibuka | Semua staff aktif (bisa dimatikan di profil) + grup admin |
| Sesi dibatalkan | Peserta yang sudah join |
| PJ dialihkan / diambil alih | Admin baru + grup admin |
| Sesi digabung | Peserta sesi yang digabung + pembuatnya |
| Jam sesi habis, belum ditutup | PJ saat ini |
| 21:00 lab masih terbuka | Grup admin |
| Akun terkunci berulang | Grup admin |

Hubungkan Telegram: `/profil` → deep link `t.me/<bot>?start=<token sekali pakai>` → webhook menyimpan `chat_id`.
Pengiriman: insert `notifications` → database webhook → Edge Function `telegram-send`.

## 7. Halaman

| Route | Akses |
|---|---|
| `/jadwal` | Publik (judul & jam) / login (detail) |
| `/sesi/[id]` | Login |
| `/login`, `/ganti-rahasia` | Publik / login |
| `/profil`, `/notifikasi` | Login |
| `/admin`, `/admin/sesi`, `/admin/pengguna`, `/admin/laporan` | Admin |
| `/admin/hari-libur`, `/admin/pengaturan`, `/admin/audit` | Super admin |
| `/api/telegram/webhook`, `/api/keep-alive` | Sistem |

## 8. Skema

- `profiles`: `id → auth.users`, `nim` unik, `full_name`, `code` (4+ huruf besar), `role`
  (`staff|admin|super_admin`), `is_active`, `must_change_secret`, `telegram_chat_id`,
  `notify_session_open`, timestamps.
- `login_attempts`: `nim`, `failed_count`, `locked_until`.
- `settings` (1 baris): `open_hour`, `close_hour`, `photo_retention_days`, `admin_telegram_chat_id`.
- `holidays`: `date` PK, `name`, `type` (`nasional|cuti_bersama|manual`), `source` (`api|manual`).
- `lab_sessions`: `title`, `category`, `description`, `planned_start`, `planned_end`, `status`,
  `created_by`, `current_pic`, `opened_by/at`, `open_photo_path`, `closed_by/at`,
  `close_room_photo_path`, `close_key_photo_path`, `close_note`, `merged_into`, `photos_deleted_at`.
  - Exclusion constraint: rentang `planned_start..planned_end` sesi `scheduled|open` tidak boleh overlap.
  - Partial unique index: maksimal satu sesi `open`.
- `session_participants`: `session_id`, `user_id`, `purpose`, `joined_at`, `attended_at`
  (null = rencana hadir, terisi = hadir).
- `session_pic_logs`: `session_id`, `from_admin`, `to_admin`, `type` (`transfer|take_over|merge`).
- `notifications`: `user_id` (null = grup admin), `session_id`, `type`, `message`, `read_at`, `telegram_sent_at`.
- `telegram_link_tokens`: `token`, `user_id`, `expires_at`, `used_at`.
- `audit_logs`: `actor_id`, `entity`, `entity_id`, `action`, `old_data`, `new_data` (via trigger).

Semua perubahan status lewat RPC Postgres (`security definer`) — client tidak boleh update langsung.

## 9. RLS

- **Anon:** view `public_schedule` (judul, kategori, jam, status) + status lab.
- **Staff:** baca sesi & peserta; join/batal join diri sendiri via RPC; tidak bisa lihat foto.
- **Admin:** semua aksi sesi via RPC, baca foto (bucket private `session-photos`), laporan.
- **Super admin:** + hari libur, pengaturan, audit log, kelola admin.

## 10. Job otomatis (pg_cron)

Pengingat jam sesi habis (tiap 5 menit), pengingat 21:00, hapus foto > 90 hari (Edge Function),
sinkron hari libur bulanan, keep-alive harian (Vercel cron) supaya free tier tidak di-pause.

## 11. Design system

Mengikuti web EISD (`WEB-EISD/DESIGN.md`):
- Warna: `primary #494CA0` (dark `#3A3D80`, light `#6366B8`), `accent-green #00D97A`, abu Tailwind,
  latar gradien `#FAFBFF → #FFFFFF → #FFFAFC`, footer `#1C1629`.
- Font Inter. Kartu `rounded-2xl` + `shadow-card`, tombol/pill selalu `rounded-full`.
- Badge eyebrow `glass-card` + titik hijau + teks uppercase; judul dua warna.
- Ikon `lucide-react` `strokeWidth={1.8}` dalam chip `bg-primary/10`.
- Toast `react-hot-toast`. Animasi `framer-motion` hanya di halaman publik; halaman admin tanpa animasi.
- Tidak dipakai: ScrollProgressBar, WelcomePopup, AnnouncementBar, BackToTop.

## 12. Stack & deploy

Next.js 16 (App Router) + TypeScript, Tailwind 3, `@supabase/ssr`, `zod`, `date-fns` + `@date-fns/tz`.
Supabase lokal (Docker) untuk dev, Supabase free tier + Vercel (`*.vercel.app`) untuk produksi.
Bahasa UI: Indonesia. Responsif, mobile-first untuk jadwal & sesi.

## 13. Fase

0. Setup project + Supabase lokal
1. Fondasi database (skema, constraint, RLS, RPC, audit) + test SQL
2. Auth & pengguna
3. Jadwal & sesi
4. Notifikasi (in-app + Telegram)
5. Fitur admin lain (hari libur, laporan, audit, pengaturan)
6. Otomasi & rilis
