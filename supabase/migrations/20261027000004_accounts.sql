-- EISDesk: kelola akun. Bagian Auth (password, ban) dikerjakan server dengan service role;
-- bagian profil lewat RPC ini supaya cek hak akses & audit log (actor) tetap di database.

-- Admin mengelola staff; super admin mengelola semua akun
create function private.can_manage(p_target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_super_admin()
    or (private.is_admin() and exists (select 1 from public.profiles where id = p_target and role = 'staff'))
$$;

create function private.require_manage(p_target uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.can_manage(p_target) then
    raise exception 'Kamu tidak punya hak mengelola akun ini';
  end if;
  return auth.uid();
end $$;

create function public.admin_create_profile(
  p_id uuid, p_nim text, p_auth_email text, p_full_name text, p_code text, p_role public.user_role
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if p_role <> 'staff' then
    perform private.require_super_admin();
  end if;
  insert into public.profiles (id, nim, auth_email, full_name, code, role, must_change_secret)
  values (p_id, p_nim, p_auth_email, btrim(p_full_name), upper(btrim(p_code)), p_role, true);
exception
  when unique_violation then
    raise exception 'NIM atau kode sudah dipakai akun lain';
end $$;

create function public.admin_update_profile(p_user uuid, p_full_name text, p_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_manage(p_user);
  update public.profiles set full_name = btrim(p_full_name), code = upper(btrim(p_code)) where id = p_user;
exception
  when unique_violation then
    raise exception 'Kode sudah dipakai akun lain';
end $$;

create function public.admin_set_active(p_user uuid, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_user = auth.uid() and not p_active then
    raise exception 'Tidak bisa menonaktifkan akun sendiri';
  end if;
  perform private.require_manage(p_user);
  update public.profiles set is_active = p_active where id = p_user;
end $$;

-- Ganti role selalu memaksa ganti PIN/password di login berikutnya
create function public.admin_set_role(p_user uuid, p_role public.user_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_super_admin();
  update public.profiles set role = p_role, must_change_secret = true where id = p_user;
end $$;

create function public.admin_require_secret_change(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_manage(p_user);
  update public.profiles set must_change_secret = true where id = p_user;
end $$;

-- Dipanggil user sendiri setelah berhasil mengganti PIN/password
create function public.mark_secret_changed() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set must_change_secret = false where id = private.require_active_user();
end $$;

grant execute on function
  public.admin_create_profile(uuid, text, text, text, text, public.user_role),
  public.admin_update_profile(uuid, text, text),
  public.admin_set_active(uuid, boolean),
  public.admin_set_role(uuid, public.user_role),
  public.admin_require_secret_change(uuid),
  public.mark_secret_changed()
to authenticated;
