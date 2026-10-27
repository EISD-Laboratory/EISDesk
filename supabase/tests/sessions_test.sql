-- Test aturan inti sesi lab. Jalankan: npm run db:test
-- Memakai akun dari supabase/seed.sql dan waktu tetap Senin 2 Nov 2026 10:00 WIB.
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

set local eisdesk.now = '2026-11-02 10:00+07';

-- id akun seed
-- 001 super admin, 002 admin satu, 003 admin dua, 004 staff satu, 005 staff dua

-- foto uji (diunggah "oleh" admin satu & admin dua)
insert into storage.objects (bucket_id, name) values
  ('session-photos', '00000000-0000-4000-a000-000000000002/open.jpg'),
  ('session-photos', '00000000-0000-4000-a000-000000000002/room.jpg'),
  ('session-photos', '00000000-0000-4000-a000-000000000003/open.jpg'),
  ('session-photos', '00000000-0000-4000-a000-000000000003/room.jpg'),
  ('session-photos', '00000000-0000-4000-a000-000000000003/key.jpg');

insert into public.holidays (date, name, type) values ('2026-11-03', 'Libur Uji', 'nasional');

-- ===== staff =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';

select throws_ok(
  $$ select public.create_session('Belajar', 'belajar', '2026-11-02 13:00+07', '2026-11-02 17:00+07') $$,
  'P0001', 'Hanya admin yang bisa melakukan aksi ini', 'staff tidak bisa membuat sesi');

select throws_ok(
  $$ select nim from public.profiles $$,
  '42501', null, 'staff tidak bisa membaca NIM orang lain');

select is((select count(*)::int from public.audit_logs), 0, 'staff tidak bisa melihat audit log');

select throws_ok(
  $$ select public.record_login_attempt('1000000004', false) $$,
  '42501', null, 'klien tidak bisa memanipulasi lockout login');

-- ===== admin satu: validasi jadwal =====
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select lives_ok(
  $$ select public.create_session('Belajar bareng', 'belajar', '2026-11-02 13:00+07', '2026-11-02 17:00+07') $$,
  'admin bisa membuat sesi');

select throws_ok(
  $$ select public.create_session('Rapat', 'rapat', '2026-11-02 15:00+07', '2026-11-02 18:00+07') $$,
  'P0001', 'Jadwal bentrok dengan sesi lain di jam tersebut', 'sesi overlap ditolak');

select throws_ok(
  $$ select public.create_session('Minggu', 'lainnya', '2026-11-08 10:00+07', '2026-11-08 12:00+07') $$,
  'P0001', 'Hari Minggu lab tutup', 'hari Minggu ditolak');

select throws_ok(
  $$ select public.create_session('Libur', 'lainnya', '2026-11-03 10:00+07', '2026-11-03 12:00+07') $$,
  'P0001', 'Lab tutup: Libur Uji', 'tanggal merah ditolak');

select throws_ok(
  $$ select public.create_session('Malam', 'lainnya', '2026-11-04 20:00+07', '2026-11-04 22:00+07') $$,
  'P0001', 'Di luar jam operasional (08:00–21:00 WIB)', 'di luar jam operasional ditolak');

select throws_ok(
  $$ select public.create_session('Setengah', 'lainnya', '2026-11-04 10:30+07', '2026-11-04 12:00+07') $$,
  'P0001', 'Jam sesi harus kelipatan 1 jam', 'jam tidak bulat ditolak');

select throws_ok(
  $$ select public.create_session('Lewat', 'lainnya', '2026-11-02 08:00+07', '2026-11-02 09:00+07') $$,
  'P0001', 'Jam mulai sudah lewat', 'jam yang sudah lewat ditolak');

-- ===== staff join (rencana hadir) =====
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}';
select lives_ok(
  $$ select public.join_session((select id from public.lab_sessions where title = 'Belajar bareng'), 'Belajar SQL') $$,
  'staff bisa join sesi terjadwal');
select is(
  (select attended_at from public.session_participants where user_id = '00000000-0000-4000-a000-000000000004'),
  null, 'join sebelum dibuka = rencana hadir');

-- ===== admin satu buka sesi =====
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}';

select throws_ok(
  $$ select public.open_session((select id from public.lab_sessions where title = 'Belajar bareng'), null) $$,
  'P0001', 'Foto wajib diunggah', 'buka sesi tanpa foto ditolak');

select throws_ok(
  $$ select public.open_session((select id from public.lab_sessions where title = 'Belajar bareng'),
       '00000000-0000-4000-a000-000000000003/open.jpg') $$,
  'P0001', 'Foto wajib diunggah', 'foto milik admin lain ditolak');

select lives_ok(
  $$ select public.open_session((select id from public.lab_sessions where title = 'Belajar bareng'),
       '00000000-0000-4000-a000-000000000002/open.jpg') $$,
  'admin bisa membuka sesi dengan foto');

select is(
  (select status::text from public.lab_sessions where title = 'Belajar bareng'), 'open', 'status jadi open');

-- ===== admin dua: sesi lanjutan & konflik =====
set local request.jwt.claims = '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';

select lives_ok(
  $$ select public.create_session('Radiv Data', 'radiv', '2026-11-02 18:00+07', '2026-11-02 20:00+07') $$,
  'admin dua menjadwalkan sesi berikutnya');

select throws_ok(
  $$ select public.open_session((select id from public.lab_sessions where title = 'Radiv Data'),
       '00000000-0000-4000-a000-000000000003/open.jpg') $$,
  'P0001', 'Masih ada sesi lain yang terbuka. Tutup sesi itu, atau perpanjang sesi itu untuk menggabungkan.',
  'tidak bisa ada dua sesi terbuka');

select throws_ok(
  $$ select public.close_session((select id from public.lab_sessions where title = 'Belajar bareng'),
       '00000000-0000-4000-a000-000000000003/room.jpg', '00000000-0000-4000-a000-000000000003/key.jpg') $$,
  'P0001', 'Hanya PJ saat ini yang bisa menutup sesi. Ambil alih PJ dulu.', 'bukan PJ tidak bisa menutup');

-- perpanjang sampai 19:00 -> Radiv Data (18–20) digabung, PJ pindah ke admin dua
select lives_ok(
  $$ select public.extend_session((select id from public.lab_sessions where title = 'Belajar bareng'), '2026-11-02 19:00+07') $$,
  'perpanjang sesi yang menabrak sesi terjadwal');

select is(
  (select status::text from public.lab_sessions where title = 'Radiv Data'), 'merged', 'sesi tertabrak jadi merged');

select results_eq(
  $$ select planned_end, current_pic from public.lab_sessions where title = 'Belajar bareng' $$,
  $$ values ('2026-11-02 20:00+07'::timestamptz, '00000000-0000-4000-a000-000000000003'::uuid) $$,
  'jam selesai ikut sesi yang digabung & PJ pindah ke pembuatnya');

select throws_ok(
  $$ select public.close_session((select id from public.lab_sessions where title = 'Belajar bareng'),
       '00000000-0000-4000-a000-000000000003/room.jpg', '00000000-0000-4000-a000-000000000003/room.jpg') $$,
  'P0001', 'Foto kondisi lab dan foto kunci harus berbeda', 'dua foto tutup harus berbeda');

select lives_ok(
  $$ select public.close_session((select id from public.lab_sessions where title = 'Belajar bareng'),
       '00000000-0000-4000-a000-000000000003/room.jpg', '00000000-0000-4000-a000-000000000003/key.jpg') $$,
  'PJ baru menutup sesi dengan dua foto');

-- ===== anon: jadwal publik =====
reset role;
set local role anon;
select is((select count(*)::int from public.public_schedule), 1, 'anon bisa melihat jadwal publik');

-- ===== pengaman akun & lockout (service/postgres) =====
reset role;
select throws_ok(
  $$ update public.profiles set is_active = false where id = '00000000-0000-4000-a000-000000000001' $$,
  'P0001', 'Harus ada minimal satu super admin aktif', 'super admin terakhir tidak bisa dinonaktifkan');

do $$ begin perform public.record_login_attempt('1000000004', false) from generate_series(1, 5); end $$;
select ok(public.login_locked_until('1000000004') is not null, '5 kali salah -> akun terkunci');

select * from finish();
rollback;
