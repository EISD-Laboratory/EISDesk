-- Perbaikan: UPDATE tanpa WHERE ditolak pg_safeupdate di Supabase ("UPDATE requires a WHERE clause"),
-- sehingga pengaturan tidak pernah tersimpan. Settings adalah singleton (id = true).
-- Sekalian validasi dengan pesan yang bisa dibaca admin, bukan pesan constraint mentah.

create or replace function public.update_settings(
  p_open_hour int, p_close_hour int, p_photo_retention_days int, p_admin_telegram_chat_id bigint
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_super_admin();
  if p_open_hour is null or p_open_hour not between 0 and 23 then
    raise exception 'Jam buka harus 0–23';
  end if;
  if p_close_hour is null or p_close_hour not between 1 and 24 then
    raise exception 'Jam tutup harus 1–24';
  end if;
  if p_close_hour <= p_open_hour then
    raise exception 'Jam tutup harus lebih besar dari jam buka';
  end if;
  if p_photo_retention_days is null or p_photo_retention_days < 1 then
    raise exception 'Masa simpan foto minimal 1 hari';
  end if;

  update public.settings
  set open_hour = p_open_hour, close_hour = p_close_hour,
      photo_retention_days = p_photo_retention_days, admin_telegram_chat_id = p_admin_telegram_chat_id
  where id;
end $$;
