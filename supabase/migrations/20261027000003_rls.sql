-- EISDesk: RLS, grant, view publik, storage. Lihat docs/PLANNING.md bagian 9.

alter table public.profiles enable row level security;
alter table public.login_attempts enable row level security;
alter table public.settings enable row level security;
alter table public.holidays enable row level security;
alter table public.lab_sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.session_pic_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.telegram_link_tokens enable row level security;
alter table public.audit_logs enable row level security;

-- Mulai dari nol: cabut grant default Supabase, lalu buka seperlunya
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- profiles: NIM, telegram, dll tidak terlihat user lain (pakai get_my_profile untuk data sendiri)
grant select (id, full_name, code, role, is_active) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (private.is_active_user());

-- settings: semua orang boleh tahu jam operasional
grant select (open_hour, close_hour) on public.settings to anon, authenticated;
create policy settings_select on public.settings for select to anon, authenticated using (true);

-- holidays: publik baca, super admin kelola
grant select on public.holidays to anon, authenticated;
grant insert, update, delete on public.holidays to authenticated;
create policy holidays_select on public.holidays for select to anon, authenticated using (true);
create policy holidays_write on public.holidays for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

-- sesi & turunannya: baca untuk user aktif, tulis hanya via RPC
grant select on public.lab_sessions, public.session_participants, public.session_pic_logs to authenticated;
create policy lab_sessions_select on public.lab_sessions for select to authenticated
  using (private.is_active_user());
create policy session_participants_select on public.session_participants for select to authenticated
  using (private.is_active_user());
create policy session_pic_logs_select on public.session_pic_logs for select to authenticated
  using (private.is_active_user());

-- notifikasi: milik sendiri, + notifikasi grup untuk admin
grant select on public.notifications to authenticated;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid() or (user_id is null and private.is_admin()));

-- audit: super admin saja
grant select on public.audit_logs to authenticated;
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (private.is_super_admin());

-- login_attempts & telegram_link_tokens: tanpa policy = tertutup untuk anon/authenticated

-- Jadwal publik (tanpa login): judul, kategori, jam, status
create view public.public_schedule as
select
  s.id,
  s.title,
  s.category,
  s.planned_start,
  s.planned_end,
  s.status,
  s.opened_at,
  (select count(*) from public.session_participants p where p.session_id = s.id)::int as participant_count
from public.lab_sessions s
where s.status in ('scheduled', 'open', 'closed');

grant select on public.public_schedule to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fungsi: tutup default, buka seperlunya
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon, authenticated;

grant usage on schema private to anon, authenticated;
grant execute on function private.is_active_user(), private.is_admin(), private.is_super_admin() to anon, authenticated;

grant execute on all functions in schema public to authenticated;
revoke execute on function public.login_locked_until(text), public.record_login_attempt(text, boolean) from authenticated;
grant execute on function public.login_locked_until(text), public.record_login_attempt(text, boolean) to service_role;

alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- Storage: foto sesi (private, admin saja)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('session-photos', 'session-photos', false, 2097152, array['image/jpeg', 'image/webp', 'image/png']);

create policy session_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'session-photos' and private.is_admin());

create policy session_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'session-photos'
    and private.is_admin()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
