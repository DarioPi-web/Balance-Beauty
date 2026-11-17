-- pgTAP: pedidos y pagos (place_order / confirm_payment / get_order_summary).
-- Requiere el seed del catálogo (supabase/staging-sync-catalogo.sql) y tarifas de envío.
begin;
select plan(14);

insert into public.shipping_rates (zone, method, carrier, price, free_from)
select 'test', 'home_delivery', 'test', 7500, 150000
where not exists (select 1 from public.shipping_rates where method = 'home_delivery');

create temp table _o as select null::jsonb as o;
grant all on _o to anon;

set local role anon;

update _o set o = public.place_order('{"email":"ana@example.com","full_name":"Ana Perez","shipping_method":"home_delivery","payment_method":"bank_transfer","address":{"postal_code":"C1425ABC"},"items":[{"slug":"agua-micelar","qty":2},{"slug":"rosatopis-serum","qty":1}]}');

select is((select (o->>'subtotal')::int from _o), 82000, 'subtotal con precios de la base');
select is((select (o->>'discount_total')::int from _o), 8200, '10 % off por transferencia');
select is((select (o->>'total')::int from _o), 81300, 'total = subtotal - descuento + envío');
select is((select reserved_stock from public.products where slug = 'agua-micelar'), 2, 'reserva stock');

select throws_like(
  $$ select public.place_order('{"email":"a@b.co","full_name":"Ana Perez","shipping_method":"home_delivery","payment_method":"card","address":{"postal_code":"1425"},"items":[{"slug":"protector-via-oral","qty":1}]}') $$,
  '%no está disponible%', 'rechaza productos que requieren receta');
select throws_like(
  $$ select public.place_order('{"email":"a@b.co","full_name":"Ana Perez","shipping_method":"home_delivery","payment_method":"card","address":{"postal_code":"1425"},"items":[{"slug":"protector-exel-sin-color","qty":2}]}') $$,
  '%stock%', 'rechaza cantidades sin stock');
select throws_like(
  $$ select public.place_order('{"email":"a@b.co","full_name":"Ana Perez","shipping_method":"home_delivery","payment_method":"card","address":{"postal_code":"1425"},"items":[]}') $$,
  '%vacío%', 'rechaza carrito vacío');
select throws_like(
  $$ select public.place_order('{"email":"a@b.co","full_name":"Ana Perez","shipping_method":"home_delivery","payment_method":"cash_pickup","address":{"postal_code":"1425"},"items":[{"slug":"agua-micelar","qty":1}]}') $$,
  '%válidos%', 'rechaza medios no habilitados');
select throws_like(
  $$ select public.confirm_payment((select (o->>'id')::uuid from _o), 'mercadopago', 'x', 'approved', 1) $$,
  '%permission denied%', 'anon no puede confirmar pagos');
select is((select count(*)::int from public.orders), 0, 'anon no ve pedidos por RLS');
select is((select public.get_order_summary((o->>'id')::uuid)->>'status' from _o), 'pending_payment', 'resumen por uuid');

reset role;

select is((select public.confirm_payment((o->>'id')::uuid, 'mercadopago', 'p1', 'approved', 81299)->>'reason' from _o),
  'amount_mismatch', 'un pago menor al total no marca pagado');
select is((select public.confirm_payment((o->>'id')::uuid, 'mercadopago', 'p2', 'approved', 81300)->>'order_status' from _o),
  'paid', 'pago aprobado marca pagado');
select is((select public.confirm_payment((o->>'id')::uuid, 'mercadopago', 'p2', 'approved', 81300)->>'changed' from _o),
  'false', 'idempotente: el reintento del webhook no cambia nada');

select * from finish();
rollback;
