# EISDesk

Sistem jadwal & sesi pemakaian Lab EISD. Rencana lengkap dan semua keputusan: [docs/PLANNING.md](docs/PLANNING.md).

Next.js 16 (App Router) + Supabase (Postgres, Auth, RLS, Storage, pg_cron, Edge Functions).
Tampilan mengikuti design system web EISD.

## Development lokal

Butuh Node 20+ dan Docker Desktop (menyala).

```bash
npm install
npm run db:start        # Supabase lokal; catat API URL, anon key, service_role key
cp .env.example .env.local   # isi dari output db:start
npm run db:types        # generate lib/database.types.ts
npm run dev
```

Akun uji lokal ada di `supabase/seed.sql` (login pakai NIM).

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm run db:reset` | Ulang database lokal dari migrasi + seed |
| `npm run db:test` | Test SQL (pgTAP) aturan inti di `supabase/tests` |
| `npm run typecheck` / `npm run lint` | Cek TypeScript / ESLint |

## Struktur

```
app/                 halaman (App Router)
  jadwal/            kalender minggu + status lab (publik)
  sesi/[id]/         detail sesi, join/hadir, aksi admin (buka/tutup/PJ/perpanjang)
  admin/             dashboard, buat sesi, pengguna, laporan, hari libur, pengaturan, audit
  api/telegram/      webhook bot (link akun via /start <token>)
lib/                 supabase client, auth helper, waktu WIB, label
proxy.ts             refresh sesi Supabase + redirect ke /login (Next 16: pengganti middleware)
supabase/
  migrations/        skema, RPC, RLS, akun, telegram + cron
  functions/         telegram-dispatch, cleanup-photos (Edge Functions)
  tests/             pgTAP
```

Aturan bisnis (hak akses, bentrok jadwal, foto wajib, hanya PJ yang menutup, dll) **ada di RPC
database**, bukan di frontend. Frontend hanya memanggil RPC.

## Deploy produksi

1. **Supabase:** buat project (free tier), lalu `npx supabase link --project-ref <ref>` dan
   `npx supabase db push`. Di dashboard Auth: matikan "Allow new users to sign up".
2. **Vault** (supaya pg_cron bisa memanggil Edge Functions), jalankan di SQL editor:
   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
   select vault.create_secret('<service_role key>', 'service_role_key');
   ```
3. **Edge Functions:**
   ```bash
   npx supabase functions deploy telegram-dispatch
   npx supabase functions deploy cleanup-photos
   npx supabase secrets set TELEGRAM_BOT_TOKEN=... APP_URL=https://<app>.vercel.app
   ```
4. **Super admin pertama:** buat lewat Supabase dashboard (Auth → Add user, email
   `<nim>-<acak>@eisdesk.local`, centang auto-confirm), lalu SQL editor:
   ```sql
   insert into public.profiles (id, nim, auth_email, full_name, code, role, must_change_secret)
   values ('<user id>', '<nim>', '<email tadi>', '<nama>', '<KODE>', 'super_admin', true);
   ```
   Akun lain dibuat dari halaman Admin → Pengguna.
5. **Vercel:** import repo, isi env dari `.env.example` (pakai key produksi), deploy.
6. **Bot Telegram:** buat bot via @BotFather, lalu daftarkan webhook:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<app>.vercel.app/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>`.
   Tambahkan bot ke grup admin, kirim `/chatid`, isi ID-nya di Admin → Pengaturan.
