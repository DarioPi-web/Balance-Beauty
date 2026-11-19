-- pgTAP: inventario por lote (migración 9): recepción, FEFO al pagar, devolución al cancelar,
-- ajustes con motivo, cuarentena, conciliación, historial de precios, EAN y permisos.
begin;
select plan(26);

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

-- Punto de partida limpio para el producto de prueba.
create temp table _p as select id from public.products where slug = 'agua-micelar';
grant select on _p to authenticated, anon;
update public.products set stock = 0, reserved_stock = 0, track_stock = true, status = 'active'
 where id = (select id from _p);
update public.inventory_lots set qty_on_hand = 0, status = 'depleted' where product_id = (select id from _p);

select ok(public.is_valid_gtin('1234567890128'), 'EAN-13 válido');
select ok(not public.is_valid_gtin('1234567890123'), 'EAN-13 con dígito verificador incorrecto');
select is((select count(*)::int from public.inventory_discrepancies where product_id = (select id from _p)), 0,
  'saldo inicial conciliado');

-- Permisos
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select throws_ok($$ select public.admin_inventory_receive((select id from _p), 5, 'L-A') $$,
  '42501', 'No autorizado', 'un cliente no puede cargar stock');
select is((select count(*)::int from public.stock_movements), 0, 'un cliente no ve movimientos');

-- Recepción
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select throws_like($$ select public.admin_inventory_receive((select id from _p), 1, 'L-X', current_date - 1) $$,
  '%vencido%', 'no se recibe un lote vencido');
select throws_like($$ select public.admin_inventory_receive((select id from _p), 1, '  ') $$,
  '%lote%', 'exige número de lote');
select is((public.admin_inventory_receive((select id from _p), 5, 'l-a', current_date + 400, null, 9000)->>'stock')::int,
  5, 'recibe lote A (5 u.)');
select is((public.admin_inventory_receive((select id from _p), 1, 'L-B', current_date + 200)->>'stock')::int,
  6, 'recibe lote B (1 u., vence antes)');
select is((select lot_code from public.inventory_lots where product_id = (select id from _p) and qty_on_hand = 5),
  'L-A', 'normaliza el código de lote a mayúsculas');
select is((select unit_cost from public.products where id = (select id from _p)), 9000, 'guarda el último costo');

-- Venta: FEFO al pagar
reset role;
create temp table _o as
select public.place_order('{"email":"t@test.local","full_name":"Test Uno","shipping_method":"home_delivery","payment_method":"bank_transfer","address":{"postal_code":"1425"},"items":[{"slug":"agua-micelar","qty":2}]}',
                          'clave-de-prueba-0123456789-0123456789') as o;
grant select on _o to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is(public.admin_order_action((select (o->>'id')::uuid from _o), 'mark_paid')->>'to', 'paid', 'pedido pagado');
select is((select qty_on_hand from public.inventory_lots where product_id = (select id from _p) and lot_code = 'L-B'),
  0, 'FEFO: sale primero el lote que vence antes');
select is((select qty_on_hand from public.inventory_lots where product_id = (select id from _p) and lot_code = 'L-A'),
  4, 'FEFO: completa con el siguiente lote');
select is((select status::text from public.inventory_lots where product_id = (select id from _p) and lot_code = 'L-B'),
  'depleted', 'lote agotado');
select is((select count(*)::int from public.stock_movements where order_id = (select (o->>'id')::uuid from _o) and kind = 'sale'),
  2, 'dos movimientos de venta con lote (trazabilidad)');

-- Cancelación: vuelve a los mismos lotes
select is(public.admin_order_action((select (o->>'id')::uuid from _o), 'cancel')->>'to', 'cancelled', 'cancela pagado');
select is((select sum(qty_on_hand)::int from public.inventory_lots where product_id = (select id from _p) and status = 'available'),
  6, 'devuelve las unidades a sus lotes');
select is((select stock from public.products where id = (select id from _p)), 6, 'stock repuesto');

-- Ajustes
select throws_like($$ select public.admin_inventory_adjust((select id from _p), -1, 'waste', '') $$,
  '%motivo%', 'el ajuste exige motivo');
select throws_like($$ select public.admin_inventory_adjust((select id from _p), 2, 'count', 'sobrante en conteo') $$,
  '%lote%', 'sumar unidades exige lote');
select is((public.admin_inventory_adjust((select id from _p), -1, 'waste', 'frasco roto')->>'stock')::int,
  5, 'merma sale por FEFO');

-- Cuarentena
select is((public.admin_inventory_set_lot_status(
  (select id from public.inventory_lots where product_id = (select id from _p) and lot_code = 'L-A'),
  'quarantine', 'envase dañado por humedad')->>'stock')::int, 0, 'lote en cuarentena sale de la venta');
select is((select count(*)::int from public.inventory_discrepancies where product_id = (select id from _p)), 0,
  'stock y lotes conciliados después de todo');

-- Precios
update public.products set price = 12100 where id = (select id from _p);
select is((select price_without_national_taxes from public.products where id = (select id from _p)), 10000,
  'precio sin impuestos nacionales calculado (IVA 21 %)');
select is((select price from public.price_history where product_id = (select id from _p) order by id desc limit 1),
  12100, 'historial de precios');

reset role;
select * from finish();
rollback;
