-- Seed DEV LOKAL saja (dijalankan oleh `supabase db reset`). Jangan dipakai di produksi.
-- Akun uji (login lewat NIM):
--   1000000001  super_admin  password: superadmin123
--   1000000002  admin        password: adminsatu123
--   1000000003  admin        password: admindua123
--   1000000004  staff        PIN: 482915
--   1000000005  staff        PIN: 739164

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, '1000000001', 'Super Admin Dev', 'SUPR', 'super_admin'::public.user_role, 'superadmin123'),
      ('00000000-0000-4000-a000-000000000002'::uuid, '1000000002', 'Admin Satu', 'ADMA', 'admin'::public.user_role, 'adminsatu123'),
      ('00000000-0000-4000-a000-000000000003'::uuid, '1000000003', 'Admin Dua', 'ADMB', 'admin'::public.user_role, 'admindua123'),
      ('00000000-0000-4000-a000-000000000004'::uuid, '1000000004', 'Staff Satu', 'STFA', 'staff'::public.user_role, '482915'),
      ('00000000-0000-4000-a000-000000000005'::uuid, '1000000005', 'Staff Dua', 'STFB', 'staff'::public.user_role, '739164')
    ) as t(id, nim, full_name, code, role, secret)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated',
      r.nim || '-dev@eisdesk.local', extensions.crypt(r.secret, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), r.id, r.id::text,
      jsonb_build_object('sub', r.id::text, 'email', r.nim || '-dev@eisdesk.local', 'email_verified', true),
      'email', now(), now(), now()
    );

    insert into public.profiles (id, nim, auth_email, full_name, code, role, must_change_secret)
    values (r.id, r.nim, r.nim || '-dev@eisdesk.local', r.full_name, r.code, r.role, false);
  end loop;
end $$;
