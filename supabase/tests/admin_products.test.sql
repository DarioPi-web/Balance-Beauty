-- pgTAP: admin de productos (migración 10): alta con slug único, reglas para publicar,
-- precio sin impuestos nacionales, categorías/preocupaciones y permisos.
begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '{}', now(), now()),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cliente@test.local', '{}', now(), now());
update public.profiles set role = 'admin' where id = '11111111-1111-4111-8111-111111111111';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select throws_ok($$ select public.admin_create_product('Hack') $$, '42501', 'No autorizado', 'un cliente no crea productos');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
create temp table _p as select public.admin_create_product('Sérum Prueba Ácido Hialurónico') as id;
select is((select slug from public.products where id = (select id from _p)), 'serum-prueba-acido-hialuronico', 'slug sin tildes');
select isnt((select slug from public.products where id = public.admin_create_product('Sérum Prueba Ácido Hialurónico')),
  'serum-prueba-acido-hialuronico', 'slug único');
select is((select status::text from public.products where id = (select id from _p)), 'draft', 'nace en borrador');

select is(public.admin_save_product((select id from _p), '{"name":"Sérum","price":"12100","stock":"5","status":"active"}')->'missing',
  '["una foto", "una categoría"]'::jsonb, 'sin foto ni categoría: guarda y avisa qué falta');
select is((select status::text from public.products where id = (select id from _p)), 'draft', 'y queda en borrador');
select is((select price from public.products where id = (select id from _p)), 12100, 'sin perder lo cargado');
insert into public.product_images (product_id, storage_path, alt) values ((select id from _p), 'x/y.avif', 'x');
select throws_like($$ select public.admin_save_product((select id from _p), '{"name":"Sérum","price":"12100","compare_at_price":"100","stock":"5","status":"draft"}') $$,
  '%tachado%', 'el tachado tiene que ser mayor');
select is(public.admin_save_product((select id from _p),
  '{"name":"Sérum","price":"12100","stock":"5","status":"active","track_stock":true}',
  array[(select id from public.categories limit 1)], array[(select id from public.concerns limit 1)],
  (select id from public.concerns limit 1))->>'status', 'active', 'publica con foto, precio y categoría');
select is((select price_without_national_taxes from public.products where id = (select id from _p)), 10000,
  'precio sin impuestos nacionales');
select is((select is_primary from public.product_concerns where product_id = (select id from _p)), true,
  'preocupación principal');

reset role;
select * from finish();
rollback;
