-- Tests de RLS (pgTAP). Ejecutar: pnpm db:test
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(6);

-- 1. RLS habilitado en todas las tablas de public
select is(
  (select count(*)::int from pg_tables t
     join pg_class c on c.relname = t.tablename
     join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
   where t.schemaname = 'public' and not c.relrowsecurity),
  0,
  'todas las tablas de public tienen RLS'
);

-- Datos de prueba
insert into public.products (sku, name, slug, price, status) values
  ('T-ACT', 'Test activo', 'test-activo', 1000, 'active'),
  ('T-DRF', 'Test borrador', 'test-borrador', 1000, 'draft');

-- 2-3. anon ve activos y no ve borradores
set local role anon;
select ok((select count(*) from public.products where slug = 'test-activo') = 1, 'anon ve productos activos');
select ok((select count(*) from public.products where slug = 'test-borrador') = 0, 'anon NO ve borradores');

-- 4. anon no puede escribir el catálogo
select throws_ok(
  $$ insert into public.products (sku, name, slug, price) values ('T-X', 'x', 'x', 1) $$,
  '42501',
  null,
  'anon no puede insertar productos'
);

-- 5. anon no ve pedidos
select is((select count(*)::int from public.orders), 0, 'anon no ve pedidos');

-- 6. anon puede enviar el botón de arrepentimiento
select lives_ok(
  $$ insert into public.withdrawal_requests (email, full_name) values ('test@example.com', 'Test') $$,
  'anon puede crear solicitud de arrepentimiento'
);

reset role;
select * from finish();
rollback;
