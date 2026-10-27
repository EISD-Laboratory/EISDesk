-- EISDesk: helper & RPC. Semua perubahan status sesi wajib lewat fungsi di sini.

-- ---------------------------------------------------------------------------
-- Helper (schema private, tidak terekspos lewat API)
-- ---------------------------------------------------------------------------

-- Jam "sekarang". Bisa di-override lewat setting `eisdesk.now` (hanya untuk test SQL;
-- klien API tidak bisa men-set GUC).
create function private.now() returns timestamptz
language sql stable set search_path = '' as $$
  select coalesce(nullif(current_setting('eisdesk.now', true), '')::timestamptz, now())
$$;

create function private.local(p_ts timestamptz) returns timestamp
language sql immutable set search_path = '' as $$
  select p_ts at time zone 'Asia/Jakarta'
$$;

create function private.fmt_range(p_start timestamptz, p_end timestamptz) returns text
language sql immutable set search_path = '' as $$
  select to_char(private.local(p_start), 'DD/MM HH24:MI') || '–' || to_char(private.local(p_end), 'HH24:MI')
$$;

create function private.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active)
$$;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role in ('admin', 'super_admin')
  )
$$;

create function private.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role = 'super_admin'
  )
$$;

create function private.require_active_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_active_user() then
    raise exception 'Akun tidak aktif atau belum login';
  end if;
  return auth.uid();
end $$;

create function private.require_admin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Hanya admin yang bisa melakukan aksi ini';
  end if;
  return auth.uid();
end $$;

create function private.require_super_admin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then
    raise exception 'Hanya super admin yang bisa melakukan aksi ini';
  end if;
  return auth.uid();
end $$;

create function private.display_name(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select full_name || ' (' || code || ')' from public.profiles where id = p_user
$$;

-- Foto harus sudah diunggah oleh admin yang sama ke bucket session-photos/<uid>/...
create function private.require_photo(p_user uuid, p_path text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_path is null or split_part(p_path, '/', 1) <> p_user::text
     or not exists (select 1 from storage.objects where bucket_id = 'session-photos' and name = p_path) then
    raise exception 'Foto wajib diunggah';
  end if;
end $$;

-- Validasi jam operasional, hari kerja, dan hari libur
create function private.validate_window(p_start timestamptz, p_end timestamptz) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_cfg public.settings;
  v_s timestamp := private.local(p_start);
  v_e timestamp := private.local(p_end);
  v_holiday text;
begin
  select * into v_cfg from public.settings;

  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'Jam selesai harus setelah jam mulai';
  end if;
  if date_trunc('hour', v_s) <> v_s or date_trunc('hour', v_e) <> v_e then
    raise exception 'Jam sesi harus kelipatan 1 jam';
  end if;
  if v_s::date <> v_e::date then
    raise exception 'Sesi harus selesai di hari yang sama';
  end if;
  if extract(isodow from v_s) = 7 then
    raise exception 'Hari Minggu lab tutup';
  end if;

  select name into v_holiday from public.holidays where date = v_s::date;
  if found then
    raise exception 'Lab tutup: %', v_holiday;
  end if;

  if v_s::time < make_time(v_cfg.open_hour, 0, 0) or v_e::time > make_time(v_cfg.close_hour, 0, 0) then
    raise exception 'Di luar jam operasional (%:00–%:00 WIB)',
      lpad(v_cfg.open_hour::text, 2, '0'), lpad(v_cfg.close_hour::text, 2, '0');
  end if;
end $$;

create function private.notify(p_user uuid, p_session uuid, p_type text, p_message text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, session_id, type, message)
  values (p_user, p_session, p_type, p_message)
$$;

-- user_id null = notifikasi grup admin
create function private.notify_admins(p_session uuid, p_type text, p_message text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, session_id, type, message)
  values (null, p_session, p_type, p_message)
$$;

create function private.insert_session(
  p_by uuid, p_title text, p_category public.session_category,
  p_start timestamptz, p_end timestamptz, p_description text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  perform private.validate_window(p_start, p_end);
  if p_start < date_trunc('hour', private.now()) then
    raise exception 'Jam mulai sudah lewat';
  end if;

  begin
    insert into public.lab_sessions (title, category, description, planned_start, planned_end, created_by, current_pic)
    values (btrim(p_title), p_category, nullif(btrim(p_description), ''), p_start, p_end, p_by, p_by)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Jadwal bentrok dengan sesi lain di jam tersebut';
  end;

  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- RPC sesi
-- ---------------------------------------------------------------------------

create function public.create_session(
  p_title text, p_category public.session_category,
  p_start timestamptz, p_end timestamptz, p_description text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_admin();
  v_id uuid;
begin
  v_id := private.insert_session(v_uid, p_title, p_category, p_start, p_end, p_description);
  perform private.notify_admins(v_id, 'session_created',
    format('Sesi baru: %s (%s), PJ %s', btrim(p_title), private.fmt_range(p_start, p_end), private.display_name(v_uid)));
  return v_id;
end $$;

create function public.open_session(
  p_session_id uuid, p_photo_path text, p_opened_at timestamptz default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_admin();
  v_now timestamptz := private.now();
  v_at timestamptz := coalesce(p_opened_at, v_now);
  s public.lab_sessions;
  v_msg text;
begin
  select * into s from public.lab_sessions where id = p_session_id for update;
  if not found then
    raise exception 'Sesi tidak ditemukan';
  end if;
  if s.status <> 'scheduled' then
    raise exception 'Sesi ini tidak bisa dibuka (status: %)', s.status;
  end if;
  if private.local(s.planned_start)::date <> private.local(v_now)::date then
    raise exception 'Sesi ini bukan untuk hari ini';
  end if;
  if v_at > v_now + interval '1 minute' or private.local(v_at)::date <> private.local(v_now)::date then
    raise exception 'Jam buka harus hari ini dan tidak boleh di masa depan';
  end if;
  perform private.require_photo(v_uid, p_photo_path);

  begin
    update public.lab_sessions
    set status = 'open', opened_by = v_uid, opened_at = v_at, open_photo_path = p_photo_path, current_pic = v_uid
    where id = s.id;
  exception when unique_violation then
    raise exception 'Masih ada sesi lain yang terbuka. Tutup sesi itu, atau perpanjang sesi itu untuk menggabungkan.';
  end;

  if v_uid <> s.current_pic then
    insert into public.session_pic_logs (session_id, from_admin, to_admin, type)
    values (s.id, s.current_pic, v_uid, 'take_over');
  end if;

  -- Pembuka otomatis tercatat hadir
  insert into public.session_participants (session_id, user_id, attended_at)
  values (s.id, v_uid, v_now)
  on conflict (session_id, user_id) do update
    set attended_at = coalesce(public.session_participants.attended_at, excluded.attended_at);

  v_msg := format('Lab dibuka: %s (%s), PJ %s', s.title, private.fmt_range(s.planned_start, s.planned_end), private.display_name(v_uid));

  insert into public.notifications (user_id, session_id, type, message)
  select id, s.id, 'session_opened', v_msg
  from public.profiles
  where is_active and role = 'staff' and notify_session_open;

  perform private.notify_admins(s.id, 'session_opened', v_msg);
end $$;

create function public.open_session_now(
  p_title text, p_category public.session_category, p_end timestamptz,
  p_photo_path text, p_description text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_admin();
  v_id uuid;
begin
  v_id := private.insert_session(v_uid, p_title, p_category, date_trunc('hour', private.now()), p_end, p_description);
  perform public.open_session(v_id, p_photo_path);
  return v_id;
end $$;

create function public.join_session(p_session_id uuid, p_purpose text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active_user();
  v_status public.session_status;
begin
  select status into v_status from public.lab_sessions where id = p_session_id for share;
  if not found then
    raise exception 'Sesi tidak ditemukan';
  end if;
  if v_status not in ('scheduled', 'open') then
    raise exception 'Sesi ini sudah tidak bisa diikuti';
  end if;

  insert into public.session_participants (session_id, user_id, purpose, attended_at)
  values (p_session_id, v_uid, nullif(btrim(p_purpose), ''), case when v_status = 'open' then private.now() end)
  on conflict (session_id, user_id) do update
    set purpose = coalesce(excluded.purpose, public.session_participants.purpose),
        attended_at = coalesce(public.session_participants.attended_at, excluded.attended_at);
end $$;

create function public.leave_session(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active_user();
  v_status public.session_status;
begin
  select status into v_status from public.lab_sessions where id = p_session_id for share;
  if v_status is null or v_status not in ('scheduled', 'open') then
    raise exception 'Sesi ini sudah selesai';
  end if;
  delete from public.session_participants where session_id = p_session_id and user_id = v_uid;
end $$;

create function public.transfer_pic(p_session_id uuid, p_to_admin uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_admin();
  s public.lab_sessions;
begin
  select * into s from public.lab_sessions where id = p_session_id for update;
  if not found or s.status not in ('scheduled', 'open') then
    raise exception 'Sesi tidak aktif';
  end if;
  if s.current_pic <> v_uid then
    raise exception 'Hanya PJ saat ini yang bisa mengalihkan PJ';
  end if;
  if p_to_admin = v_uid or not exists (
    select 1 from public.profiles where id = p_to_admin and is_active and role in ('admin', 'super_admin')
  ) then
    raise exception 'PJ tujuan harus admin aktif lain';
  end if;

  update public.lab_sessions set current_pic = p_to_admin where id = s.id;
  insert into public.session_pic_logs (session_id, from_admin, to_admin, type) values (s.id, v_uid, p_to_admin, 'transfer');

  perform private.notify(p_to_admin, s.id, 'pic_assigned',
    format('Kamu sekarang PJ sesi "%s" (dialihkan oleh %s)', s.title, private.display_name(v_uid)));
  perform private.notify_admins(s.id, 'pic_changed',
    format('PJ sesi "%s": %s → %s', s.title, private.display_name(v_uid), private.display_name(p_to_admin)));
end $$;

create function public.take_over_pic(p_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_admin();
  s public.lab_sessions;
begin
  select * into s from public.lab_sessions where id = p_session_id for update;
  if not found or s.status not in ('scheduled', 'open') then
    raise exception 'Sesi tidak aktif';
  end if;
  if s.current_pic = v_uid then
    raise exception 'Kamu sudah menjadi PJ sesi ini';
  end if;

  update public.lab_sessions set current_pic = v_uid where id = s.id;
  insert into public.session_pic_logs (session_id, from_admin, to_admin, type) values (s.id, s.current_pic, v_uid, 'take_over');

  perform private.notify(s.current_pic, s.id, 'pic_taken',
    format('PJ sesi "%s" diambil alih oleh %s', s.title, private.display_name(v_uid)));
  perform private.notify_admins(s.id, 'pic_changed',
    format('PJ sesi "%s" diambil alih: %s → %s', s.title, private.display_name(s.current_pic), private.display_name(v_uid)));
end $$;

-- Perpanjang sesi. Sesi terjadwal yang tertabrak digabung ke sesi ini (docs/PLANNING.md bagian 5).
create function public.extend_session(p_session_id uuid, p_new_end timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_admin();
  s public.lab_sessions;
  m public.lab_sessions;
  v_end timestamptz := p_new_end;
  v_new_pic uuid;
begin
  select * into s from public.lab_sessions where id = p_session_id for update;
  if not found or s.status not in ('scheduled', 'open') then
    raise exception 'Sesi tidak aktif';
  end if;
  if p_new_end <= s.planned_end then
    raise exception 'Jam selesai baru harus lebih lambat dari jam selesai sekarang';
  end if;
  perform private.validate_window(s.planned_start, p_new_end);

  for m in
    select * from public.lab_sessions
    where status = 'scheduled' and id <> s.id
      and tstzrange(planned_start, planned_end, '[)') && tstzrange(s.planned_end, p_new_end, '[)')
    order by planned_start
    for update
  loop
    insert into public.session_participants (session_id, user_id, purpose, joined_at)
    select s.id, p.user_id, coalesce(p.purpose, m.title), p.joined_at
    from public.session_participants p where p.session_id = m.id
    on conflict (session_id, user_id) do nothing;

    insert into public.session_participants (session_id, user_id, purpose)
    values (s.id, m.current_pic, m.title)
    on conflict (session_id, user_id) do nothing;

    update public.lab_sessions set status = 'merged', merged_into = s.id where id = m.id;

    insert into public.notifications (user_id, session_id, type, message)
    select p.user_id, s.id, 'session_merged',
      format('Sesi "%s" digabung ke sesi "%s" yang sedang berjalan', m.title, s.title)
    from public.session_participants p where p.session_id = m.id;

    v_end := greatest(v_end, m.planned_end);
    v_new_pic := m.current_pic;
  end loop;

  begin
    update public.lab_sessions
    set planned_end = v_end, current_pic = coalesce(v_new_pic, current_pic)
    where id = s.id;
  exception when exclusion_violation then
    raise exception 'Perpanjangan bentrok dengan sesi lain yang sedang terbuka';
  end;

  if v_new_pic is not null and v_new_pic <> s.current_pic then
    insert into public.session_pic_logs (session_id, from_admin, to_admin, type) values (s.id, s.current_pic, v_new_pic, 'merge');
    perform private.notify(v_new_pic, s.id, 'pic_assigned',
      format('Kamu sekarang PJ sesi "%s" (hasil penggabungan sesi)', s.title));
  end if;

  perform private.notify_admins(s.id, 'session_extended',
    format('Sesi "%s" diperpanjang sampai %s', s.title, to_char(private.local(v_end), 'HH24:MI')));
end $$;

create function public.close_session(
  p_session_id uuid, p_room_photo_path text, p_key_photo_path text, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_admin();
  s public.lab_sessions;
begin
  select * into s from public.lab_sessions where id = p_session_id for update;
  if not found or s.status <> 'open' then
    raise exception 'Sesi tidak sedang terbuka';
  end if;
  if s.current_pic <> v_uid then
    raise exception 'Hanya PJ saat ini yang bisa menutup sesi. Ambil alih PJ dulu.';
  end if;
  perform private.require_photo(v_uid, p_room_photo_path);
  perform private.require_photo(v_uid, p_key_photo_path);
  if p_room_photo_path = p_key_photo_path then
    raise exception 'Foto kondisi lab dan foto kunci harus berbeda';
  end if;

  update public.lab_sessions
  set status = 'closed', closed_by = v_uid, closed_at = private.now(),
      close_room_photo_path = p_room_photo_path, close_key_photo_path = p_key_photo_path,
      close_note = nullif(btrim(p_note), '')
  where id = s.id;

  perform private.notify_admins(s.id, 'session_closed',
    format('Lab ditutup: "%s" oleh %s, kunci sudah di brankas', s.title, private.display_name(v_uid)));
end $$;

create function public.cancel_session(p_session_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_admin();
  s public.lab_sessions;
begin
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Alasan pembatalan wajib diisi';
  end if;
  select * into s from public.lab_sessions where id = p_session_id for update;
  if not found or s.status <> 'scheduled' then
    raise exception 'Hanya sesi terjadwal yang bisa dibatalkan';
  end if;

  update public.lab_sessions
  set status = 'cancelled', cancelled_by = v_uid, cancelled_at = private.now(), cancel_reason = btrim(p_reason)
  where id = s.id;

  insert into public.notifications (user_id, session_id, type, message)
  select p.user_id, s.id, 'session_cancelled',
    format('Sesi "%s" (%s) dibatalkan: %s', s.title, private.fmt_range(s.planned_start, s.planned_end), btrim(p_reason))
  from public.session_participants p where p.session_id = s.id and p.user_id <> v_uid;
end $$;

-- ---------------------------------------------------------------------------
-- RPC profil & notifikasi
-- ---------------------------------------------------------------------------

create function public.get_my_profile() returns public.profiles
language sql stable security definer set search_path = '' as $$
  select * from public.profiles where id = auth.uid()
$$;

create function public.set_notify_session_open(p_enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set notify_session_open = p_enabled where id = private.require_active_user();
end $$;

create function public.mark_notifications_read(p_ids bigint[] default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active_user();
  v_admin boolean := private.is_admin();
begin
  update public.notifications
  set read_at = private.now()
  where read_at is null
    and (user_id = v_uid or (user_id is null and v_admin))
    and (p_ids is null or id = any (p_ids));
end $$;

-- ---------------------------------------------------------------------------
-- RPC super admin: pengaturan
-- ---------------------------------------------------------------------------

create function public.get_settings() returns public.settings
language sql stable security definer set search_path = '' as $$
  select s.* from public.settings s where private.is_super_admin()
$$;

create function public.update_settings(
  p_open_hour int, p_close_hour int, p_photo_retention_days int, p_admin_telegram_chat_id bigint
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_super_admin();
  update public.settings
  set open_hour = p_open_hour, close_hour = p_close_hour,
      photo_retention_days = p_photo_retention_days, admin_telegram_chat_id = p_admin_telegram_chat_id;
end $$;

-- ---------------------------------------------------------------------------
-- Login guard (hanya dipanggil server dengan service role)
-- ---------------------------------------------------------------------------

create function public.login_locked_until(p_nim text) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select locked_until from public.login_attempts where nim = p_nim and locked_until > private.now()
$$;

create function public.record_login_attempt(p_nim text, p_success boolean) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.login_attempts;
begin
  if p_success then
    delete from public.login_attempts where nim = p_nim;
    return null;
  end if;

  insert into public.login_attempts (nim, failed_count) values (p_nim, 1)
  on conflict (nim) do update
    set failed_count = public.login_attempts.failed_count + 1, updated_at = now()
  returning * into v_row;

  if v_row.failed_count >= 5 then
    update public.login_attempts
    set failed_count = 0, lock_count = lock_count + 1, locked_until = private.now() + interval '15 minutes'
    where nim = p_nim
    returning * into v_row;

    if v_row.lock_count >= 2 then
      perform private.notify_admins(null, 'login_locked',
        format('Login NIM %s terkunci %s kali karena salah PIN/password berulang', p_nim, v_row.lock_count));
    end if;
  end if;

  return v_row.locked_until;
end $$;
