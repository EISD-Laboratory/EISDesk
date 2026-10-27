-- EISDesk: skema inti. Lihat docs/PLANNING.md bagian 8.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Tipe
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('staff', 'admin', 'super_admin');
create type public.session_status as enum ('scheduled', 'open', 'closed', 'cancelled', 'merged');
create type public.session_category as enum ('belajar', 'radiv', 'rapat', 'kegiatan', 'lainnya');
create type public.holiday_type as enum ('nasional', 'cuti_bersama', 'manual');
create type public.pic_log_type as enum ('transfer', 'take_over', 'merge');

-- ---------------------------------------------------------------------------
-- Tabel
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nim text not null unique check (nim ~ '^[0-9]{5,20}$'),
  -- Email Supabase Auth acak (<nim>-<random>@eisdesk.local). Tidak di-grant ke klien supaya
  -- endpoint login Supabase tidak bisa di-brute-force langsung tanpa lewat lockout server.
  auth_email text not null unique,
  full_name text not null check (length(btrim(full_name)) between 1 and 100),
  code text not null unique check (code ~ '^[A-Z]{2,10}$'),
  role public.user_role not null default 'staff',
  is_active boolean not null default true,
  must_change_secret boolean not null default true,
  telegram_chat_id bigint unique,
  notify_session_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.login_attempts (
  nim text primary key,
  failed_count int not null default 0,
  locked_until timestamptz,
  lock_count int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.settings (
  id boolean primary key default true check (id),
  open_hour int not null default 8 check (open_hour between 0 and 23),
  close_hour int not null default 21 check (close_hour between 1 and 24),
  photo_retention_days int not null default 90 check (photo_retention_days >= 1),
  admin_telegram_chat_id bigint,
  updated_at timestamptz not null default now(),
  check (close_hour > open_hour)
);
insert into public.settings default values;

create table public.holidays (
  date date primary key,
  name text not null check (length(btrim(name)) between 1 and 100),
  type public.holiday_type not null default 'manual',
  source text not null default 'manual' check (source in ('api', 'manual')),
  created_at timestamptz not null default now()
);

create table public.lab_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 100),
  category public.session_category not null default 'lainnya',
  description text check (length(description) <= 1000),
  planned_start timestamptz not null,
  planned_end timestamptz not null,
  status public.session_status not null default 'scheduled',
  created_by uuid not null references public.profiles (id),
  current_pic uuid not null references public.profiles (id),
  opened_by uuid references public.profiles (id),
  opened_at timestamptz,
  open_photo_path text,
  closed_by uuid references public.profiles (id),
  closed_at timestamptz,
  close_room_photo_path text,
  close_key_photo_path text,
  close_note text check (length(close_note) <= 500),
  cancelled_by uuid references public.profiles (id),
  cancelled_at timestamptz,
  cancel_reason text check (length(cancel_reason) <= 500),
  merged_into uuid references public.lab_sessions (id),
  photos_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (planned_end > planned_start),
  -- WIB = UTC+7 (offset jam bulat), jadi kelipatan jam di UTC = kelipatan jam di WIB
  check (date_trunc('hour', planned_start) = planned_start and date_trunc('hour', planned_end) = planned_end),
  check (status not in ('open', 'closed') or (opened_by is not null and opened_at is not null and open_photo_path is not null)),
  check (status <> 'closed' or (closed_by is not null and closed_at is not null
                                and close_room_photo_path is not null and close_key_photo_path is not null)),
  check (status <> 'cancelled' or (cancelled_by is not null and cancelled_at is not null and cancel_reason is not null)),
  check (status <> 'merged' or merged_into is not null),

  -- Satu lab, satu kunci: jadwal sesi aktif tidak boleh overlap
  constraint lab_sessions_no_overlap exclude using gist (
    tstzrange(planned_start, planned_end, '[)') with &&
  ) where (status in ('scheduled', 'open'))
);

-- Maksimal satu sesi terbuka pada satu waktu
create unique index lab_sessions_one_open on public.lab_sessions ((true)) where status = 'open';
create index lab_sessions_planned_start_idx on public.lab_sessions (planned_start);

create table public.session_participants (
  session_id uuid not null references public.lab_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  purpose text check (length(purpose) <= 100),
  joined_at timestamptz not null default now(),
  -- null = rencana hadir; terisi = hadir (join/konfirmasi saat sesi terbuka)
  attended_at timestamptz,
  primary key (session_id, user_id)
);
create index session_participants_user_idx on public.session_participants (user_id);

create table public.session_pic_logs (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.lab_sessions (id) on delete cascade,
  from_admin uuid references public.profiles (id),
  to_admin uuid not null references public.profiles (id),
  type public.pic_log_type not null,
  created_at timestamptz not null default now()
);
create index session_pic_logs_session_idx on public.session_pic_logs (session_id);

create table public.notifications (
  id bigint generated always as identity primary key,
  -- null = untuk grup admin
  user_id uuid references public.profiles (id),
  session_id uuid references public.lab_sessions (id) on delete set null,
  type text not null,
  message text not null,
  read_at timestamptz,
  telegram_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.telegram_link_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  entity text not null,
  entity_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Trigger umum
-- ---------------------------------------------------------------------------
create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger lab_sessions_touch before update on public.lab_sessions
  for each row execute function private.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function private.touch_updated_at();

create function private.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  insert into public.audit_logs (actor_id, entity, entity_id, action, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'date', v_old ->> 'date'),
    lower(tg_op),
    v_old,
    v_new
  );
  return coalesce(new, old);
end $$;

create trigger profiles_audit after insert or update or delete on public.profiles
  for each row execute function private.audit_row();
create trigger lab_sessions_audit after insert or update or delete on public.lab_sessions
  for each row execute function private.audit_row();
create trigger holidays_audit after insert or update or delete on public.holidays
  for each row execute function private.audit_row();
create trigger settings_audit after update on public.settings
  for each row execute function private.audit_row();

-- Pengaman akun: super admin terakhir & PJ sesi terbuka
create function private.guard_profile_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'super_admin' and old.is_active
     and (new.role <> 'super_admin' or not new.is_active)
     and not exists (
       select 1 from public.profiles
       where id <> old.id and role = 'super_admin' and is_active
     ) then
    raise exception 'Harus ada minimal satu super admin aktif';
  end if;

  if (not new.is_active or new.role = 'staff')
     and exists (select 1 from public.lab_sessions where current_pic = old.id and status in ('scheduled', 'open')) then
    raise exception 'Akun ini masih menjadi PJ sesi. Alihkan PJ dulu.';
  end if;

  return new;
end $$;

create trigger profiles_guard before update of role, is_active on public.profiles
  for each row execute function private.guard_profile_change();
