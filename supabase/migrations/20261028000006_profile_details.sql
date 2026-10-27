-- Angkatan & divisi anggota (untuk import staff dari Excel). Tidak di-grant ke klien:
-- hanya admin yang membacanya lewat server.

alter table public.profiles
  add column angkatan smallint check (angkatan between 2000 and 2100),
  add column divisi text check (divisi in (
    'Competition', 'Content', 'Enabler', 'Event', 'Practicum', 'Research & Community', 'Study Group'
  ));

drop function public.admin_create_profile(uuid, text, text, text, text, public.user_role);
create function public.admin_create_profile(
  p_id uuid, p_nim text, p_auth_email text, p_full_name text, p_code text, p_role public.user_role,
  p_angkatan smallint default null, p_divisi text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if p_role <> 'staff' then
    perform private.require_super_admin();
  end if;
  insert into public.profiles (id, nim, auth_email, full_name, code, role, must_change_secret, angkatan, divisi)
  values (p_id, p_nim, p_auth_email, btrim(p_full_name), upper(btrim(p_code)), p_role, true,
          p_angkatan, nullif(btrim(p_divisi), ''));
exception
  when unique_violation then
    raise exception 'NIM atau kode sudah dipakai akun lain';
end $$;

drop function public.admin_update_profile(uuid, text, text);
create function public.admin_update_profile(
  p_user uuid, p_full_name text, p_code text, p_angkatan smallint default null, p_divisi text default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_manage(p_user);
  update public.profiles
  set full_name = btrim(p_full_name), code = upper(btrim(p_code)),
      angkatan = p_angkatan, divisi = nullif(btrim(p_divisi), '')
  where id = p_user;
exception
  when unique_violation then
    raise exception 'Kode sudah dipakai akun lain';
end $$;

grant execute on function
  public.admin_create_profile(uuid, text, text, text, text, public.user_role, smallint, text),
  public.admin_update_profile(uuid, text, text, smallint, text)
to authenticated;
