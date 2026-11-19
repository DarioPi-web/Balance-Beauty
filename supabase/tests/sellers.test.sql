-- pgTAP: vendedoras, cupones con comisión, liquidaciones y edición masiva (migración 17).
begin;
select plan(14);

insert into private.server_keys (name, key_hash)
values ('checkout', encode(extensions.digest('clave-de-prueba-0123456789-0123456789', 'sha256'), 'hex'))
on conflict (name) do update set key_hash = excluded.key_hash;
insert into public.shipping_rates (zone, method, carrier, price, free_from)
select 'test', 'home_delivery', 'test', 7500, 150000
where not exists (select 1 from public.shipping_rates where method = 'home_delivery');
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '{}', now(), now()),
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'vero@test.local', '{}', now(), now()),
  ('44444444-4444-4444-8444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'otra@test.local', '{}', now(), now());
update public.profiles set role = 'admin' where id = '11111111-1111-4111-8111-111111111111';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
select throws_ok($$ select public.admin_save_seller(null, 'x@test.local', 'Hack Hack', null, 50, true, null) $$,
  '42501', 'No autorizado', 'una usuaria común no crea vendedoras');
select throws_ok($$ select public.seller_dashboard() $$, '42501', 'No autorizado', 'sin ser vendedora no hay panel');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
create temp table _s as select public.admin_save_seller(null, 'Vero@Test.local', 'Verónica Prueba', null, 10, true, null) as id;
grant select on _s to authenticated;
select lives_ok($$ select public.admin_save_seller_coupon((select id from _s), 'vero10', 10, 0, null, true) $$, 'crea el código');
select throws_like($$ select public.admin_save_seller_coupon((select id from _s), 'con espacio', 10, 0, null, true) $$,
  '%4 a 20%', 'valida el formato del código');
reset role;

select is((public.check_coupon('clave-de-prueba-0123456789-0123456789', 'Vero10', 50000)->>'discount')::int, 5000,
  'vista previa del descuento');
create temp table _o as
select public.place_order('{"email":"c@test.local","full_name":"Clara Compradora","shipping_method":"home_delivery","payment_method":"bank_transfer","address":{"postal_code":"1425"},"coupon_code":"VERO10","items":[{"slug":"agua-micelar","qty":2}]}',
                          'clave-de-prueba-0123456789-0123456789') as o;
grant select on _o to authenticated;
select is((select (o->>'coupon_discount')::int from _o), (select (o->>'subtotal')::int / 10 from _o), 'aplica el 10 %');
select is((select seller_id from public.orders where id = (select (o->>'id')::uuid from _o)), (select id from _s),
  'el pedido queda a nombre de la vendedora');
select throws_like($$ select public.place_order('{"email":"d@test.local","full_name":"Otra Persona","shipping_method":"home_delivery","payment_method":"bank_transfer","address":{"postal_code":"1425"},"coupon_code":"NOEXISTE","items":[{"slug":"agua-micelar","qty":1}]}', 'clave-de-prueba-0123456789-0123456789') $$,
  '%no es válido%', 'un código inexistente no se aplica');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select lives_ok($$ select public.admin_order_action((select (o->>'id')::uuid from _o), 'mark_paid') $$, 'pago acreditado');
select is((select sum(amount)::int from public.seller_commissions where order_id = (select (o->>'id')::uuid from _o)),
  (select round(((o->>'subtotal')::int - (o->>'coupon_discount')::int) * 0.10)::int from _o),
  'comisión del 10 % sobre el neto');
select lives_ok($$ select public.admin_order_action((select (o->>'id')::uuid from _o), 'ship', 'Correo', 'X1') $$, 'despachado');
select lives_ok($$ select public.admin_order_action((select (o->>'id')::uuid from _o), 'deliver') $$, 'entregado');

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
select is((public.seller_dashboard()->'totals'->>'approved')::int,
  (select sum(amount)::int from public.seller_commissions where seller_id = (select id from _s)),
  'la vendedora ve su comisión a cobrar');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is((public.admin_bulk_update_products(jsonb_build_array(jsonb_build_object(
  'sku', (select sku from public.products where slug = 'espuma-limpieza'), 'weight_g', 180)))->>'updated')::int,
  1, 'edición masiva por planilla');

reset role;
select * from finish();
rollback;
