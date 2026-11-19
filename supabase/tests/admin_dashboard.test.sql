-- pgTAP: tablero del admin y arrepentimientos (migración 14).
begin;
select plan(6);

insert into private.server_keys (name, key_hash)
values ('checkout', encode(extensions.digest('clave-de-prueba-0123456789-0123456789', 'sha256'), 'hex'))
on conflict (name) do update set key_hash = excluded.key_hash;
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '{}', now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cliente@test.local', '{}', now(), now());
update public.profiles set role = 'admin' where id = '11111111-1111-4111-8111-111111111111';

create temp table _w as
select (public.request_withdrawal('clave-de-prueba-0123456789-0123456789', 'Prueba Uno', 'uno@test.local', 1001)->>'code') as code;
grant select on _w to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select throws_ok($$ select public.admin_dashboard() $$, '42501', 'No autorizado', 'un cliente no ve el tablero');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select ok(public.admin_dashboard() ?& array['sales_today', 'sales_month', 'to_ship', 'pending_transfers', 'low_stock', 'withdrawals'],
  'el tablero trae todas las secciones');
select ok(exists (select 1 from jsonb_array_elements(public.admin_dashboard()->'withdrawals') w where w->>'code' = (select code from _w)),
  'muestra el arrepentimiento sin atender');
select is(public.admin_withdrawal_handle((select id from public.withdrawal_requests where code = (select code from _w)))->>'ok',
  'true', 'lo marca atendido');
select ok(not exists (select 1 from jsonb_array_elements(public.admin_dashboard()->'withdrawals') w where w->>'code' = (select code from _w)),
  'ya no aparece');
select throws_like($$ select public.admin_withdrawal_handle((select id from public.withdrawal_requests where code = (select code from _w))) $$,
  '%ya estaba atendida%', 'no se atiende dos veces');

reset role;
select * from finish();
rollback;
