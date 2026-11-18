-- pgTAP: gestión de pedidos desde /admin (admin_order_action).
begin;
select plan(10);

insert into private.server_keys (name, key_hash)
values ('checkout', encode(extensions.digest('clave-de-prueba-0123456789-0123456789', 'sha256'), 'hex'))
on conflict (name) do update set key_hash = excluded.key_hash;
insert into public.shipping_rates (zone, method, carrier, price, free_from)
select 'test', 'home_delivery', 'test', 7500, 150000
where not exists (select 1 from public.shipping_rates where method = 'home_delivery');

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '{}', now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cliente@test.local', '{}', now(), now());
update public.profiles set role = 'admin' where id = '11111111-1111-4111-8111-111111111111';

create temp table _o as
select public.place_order('{"email":"t@test.local","full_name":"Test Uno","shipping_method":"home_delivery","payment_method":"bank_transfer","address":{"postal_code":"1425"},"items":[{"slug":"agua-micelar","qty":2}]}',
                          'clave-de-prueba-0123456789-0123456789') as o;
grant select on _o to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select throws_ok($$ select public.admin_order_action((select (o->>'id')::uuid from _o), 'mark_paid') $$,
  '42501', 'No autorizado', 'un cliente no puede gestionar pedidos');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select throws_like($$ select public.admin_order_action((select (o->>'id')::uuid from _o), 'ship', 'Correo') $$,
  '%pagado%', 'no se despacha sin pago');
select is(public.admin_order_action((select (o->>'id')::uuid from _o), 'mark_paid')->>'to', 'paid', 'acredita transferencia');
select is((select status::text from public.orders where id = (select (o->>'id')::uuid from _o)), 'paid', 'pedido pagado');
select throws_like($$ select public.admin_order_action((select (o->>'id')::uuid from _o), 'ship', '') $$,
  '%transportista%', 'exige transportista');
select is(public.admin_order_action((select (o->>'id')::uuid from _o), 'ship', 'Correo Argentino', 'CA1')->>'to', 'shipped', 'despacha');
select is((select tracking_code from public.shipments where order_id = (select (o->>'id')::uuid from _o)), 'CA1', 'guarda tracking');
select is(public.admin_order_action((select (o->>'id')::uuid from _o), 'deliver')->>'to', 'delivered', 'entrega');
select throws_like($$ select public.admin_order_action((select (o->>'id')::uuid from _o), 'cancel') $$,
  '%no se puede cancelar%', 'no cancela entregados');
select cmp_ok((select count(*)::int from public.audit_log where entity_id = (select o->>'id' from _o)), '>=', 4, 'auditoría');

reset role;
select * from finish();
rollback;
