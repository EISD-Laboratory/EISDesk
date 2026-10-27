-- EISDesk: Telegram link + job otomatis (pg_cron). Lihat docs/PLANNING.md bagian 6 & 10.

create extension if not exists pg_cron;
create extension if not exists pg_net;

alter table public.lab_sessions add column overdue_notified_at timestamptz;

-- ---------------------------------------------------------------------------
-- Telegram link
-- ---------------------------------------------------------------------------

create function public.create_telegram_link_token() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_active_user();
  v_token text := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
begin
  delete from public.telegram_link_tokens where user_id = v_uid;
  insert into public.telegram_link_tokens (token, user_id, expires_at)
  values (v_token, v_uid, private.now() + interval '10 minutes');
  return v_token;
end $$;

create function public.unlink_telegram() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set telegram_chat_id = null where id = private.require_active_user();
end $$;

-- Dipanggil webhook bot (service role). Mengembalikan nama user kalau berhasil.
create function public.link_telegram(p_token text, p_chat_id bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_name text;
begin
  update public.telegram_link_tokens
  set used_at = private.now()
  where token = p_token and used_at is null and expires_at > private.now()
  returning user_id into v_user;
  if v_user is null then
    return null;
  end if;

  -- satu chat Telegram hanya untuk satu akun
  update public.profiles set telegram_chat_id = null where telegram_chat_id = p_chat_id and id <> v_user;
  update public.profiles set telegram_chat_id = p_chat_id where id = v_user and is_active
  returning full_name into v_name;
  return v_name;
end $$;

grant execute on function public.create_telegram_link_token(), public.unlink_telegram() to authenticated;
revoke execute on function public.link_telegram(text, bigint) from authenticated;
grant execute on function public.link_telegram(text, bigint) to service_role;

-- ---------------------------------------------------------------------------
-- Pengingat
-- ---------------------------------------------------------------------------

-- Jam sesi habis tapi lab belum ditutup -> ingatkan PJ (sekali)
create function private.remind_overdue_sessions() returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.lab_sessions;
begin
  for s in
    update public.lab_sessions
    set overdue_notified_at = private.now()
    where status = 'open' and planned_end <= private.now() and overdue_notified_at is null
    returning *
  loop
    perform private.notify(s.current_pic, s.id, 'session_overdue',
      format('Jam sesi "%s" sudah habis. Tutup lab (foto kondisi + kunci) atau alihkan PJ.', s.title));
  end loop;
end $$;

-- Jam tutup lab tapi masih ada sesi terbuka -> ingatkan grup admin
create function private.remind_lab_still_open() returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.lab_sessions;
begin
  select * into s from public.lab_sessions where status = 'open';
  if found then
    perform private.notify_admins(s.id, 'lab_still_open',
      format('Sudah jam tutup tapi lab masih tercatat terbuka ("%s", PJ %s). Pastikan kunci kembali ke brankas.',
        s.title, private.display_name(s.current_pic)));
  end if;
end $$;

-- Panggil Edge Function. URL & key disimpan di Vault (lihat README); kalau belum diset, dilewati.
create function private.invoke_edge_function(p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
  v_key text := (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key');
begin
  if v_url is null or v_key is null then
    return;
  end if;
  perform net.http_post(
    url := v_url || '/functions/v1/' || p_name,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := '{}'::jsonb
  );
end $$;

-- Jadwal (UTC). 21:00 WIB = 14:00 UTC.
select cron.schedule('eisdesk-remind-overdue', '*/5 * * * *', 'select private.remind_overdue_sessions()');
select cron.schedule('eisdesk-remind-still-open', '0 14 * * *', 'select private.remind_lab_still_open()');
select cron.schedule('eisdesk-telegram-dispatch', '* * * * *', $$select private.invoke_edge_function('telegram-dispatch')$$);
-- 03:00 WIB = 20:00 UTC
select cron.schedule('eisdesk-cleanup-photos', '0 20 * * *', $$select private.invoke_edge_function('cleanup-photos')$$);
