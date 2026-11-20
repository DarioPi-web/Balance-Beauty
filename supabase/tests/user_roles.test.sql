-- pgTAP: usuarios y roles desde el admin (migración 18).
begin;
select plan(10);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('a1111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jefa@test.local', '{}', now(), now()),
  ('a2222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'equipo@test.local', '{}', now(), now()),
  ('a3333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'clienta@test.local', '{}', now(), now());
-- Escenario aislado: una sola persona con Administración (el resto se revierte con el rollback).
update public.profiles set role = 'customer' where role = 'admin';
update public.profiles set role = 'admin' where id = 'a1111111-1111-4111-8111-111111111111';
update public.profiles set role = 'staff' where id = 'a2222222-2222-4222-8222-222222222222';

set local role authenticated;

-- Una clienta no ve ni cambia roles.
select set_config('request.jwt.claims', '{"sub":"a3333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select throws_ok($$ select public.admin_list_users() $$, '42501', 'No autorizado', 'una clienta no lista usuarios');
select throws_ok($$ select public.admin_set_user_role('a3333333-3333-4333-8333-333333333333', 'admin') $$,
  '42501', 'No autorizado', 'una clienta no se da permisos');

-- Administración: lista, busca y cambia roles.
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select ok((public.admin_list_users('clienta@test')->>'total')::int = 1, 'busca por email');
select ok((public.admin_list_users(null, 'staff')->'users') @> '[{"email":"equipo@test.local"}]', 'filtra por rol');
select throws_like($$ select public.admin_set_user_role('a3333333-3333-4333-8333-333333333333', 'superadmin') $$,
  '%Rol inválido%', 'rechaza roles inexistentes');
select is(public.admin_set_user_role('a3333333-3333-4333-8333-333333333333', 'wholesale')->>'role', 'wholesale',
  'pasa a mayorista');
select throws_like($$ select public.admin_set_user_role('a1111111-1111-4111-8111-111111111111', 'customer') $$,
  '%quitarte a vos mismo%', 'nadie se quita a sí mismo el acceso');

-- El equipo (staff) entra al admin, pero no puede dejar la tienda sin Administración.
select set_config('request.jwt.claims', '{"sub":"a2222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select throws_like($$ select public.admin_set_user_role('a1111111-1111-4111-8111-111111111111', 'staff') $$,
  '%al menos un administrador%', 'siempre queda una persona con Administración');
reset role;

select is((select wholesale_approved_at is not null from public.profiles where id = 'a3333333-3333-4333-8333-333333333333'),
  true, 'la mayorista queda aprobada');
select ok(exists (select 1 from public.audit_log where action = 'profile.role'
                   and entity_id = 'a3333333-3333-4333-8333-333333333333'), 'el cambio queda auditado');

select * from finish();
rollback;
