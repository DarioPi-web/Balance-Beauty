-- Etapa A del plan de inventario (docs/17 §3): proveedores, lotes con vencimiento, libro de
-- movimientos, órdenes de compra, historial de precios, EAN/contenido neto y datos regulatorios.
--
-- Diseño:
-- * products.stock sigue siendo el número que lee el catálogo y place_order (stock vendible).
--   Los lotes (inventory_lots) guardan de dónde sale cada unidad y cuándo vence.
-- * Cada cambio queda en stock_movements (inmutable): recepción, venta, devolución, ajuste,
--   merma, conteo, cuarentena, recall.
-- * Ventas: confirm_payment / admin_order_action no se tocan. Un trigger sobre orders asigna
--   lotes por FEFO (vence primero, sale primero) al pasar a "paid" y los devuelve a los mismos
--   lotes si un pedido pagado se cancela.
-- * Altas y ajustes manuales solo por RPC de admin (validan, auditan y mantienen el stock).
-- * El stock actual se migra a un lote "INICIAL" sin vencimiento por producto.

-- ── Tipos ─────────────────────────────────────────────────────────────────────────────────
create type public.lot_status as enum ('available', 'quarantine', 'expired', 'recalled', 'depleted');
create type public.stock_movement_kind as enum (
  'receipt', 'sale', 'return', 'adjustment', 'waste', 'count', 'quarantine', 'unquarantine', 'recall');
create type public.purchase_order_status as enum ('draft', 'sent', 'partial', 'received', 'cancelled');
create type public.product_grade as enum ('grade_1', 'grade_2', 'medicine', 'other');

-- EAN-8 / UPC-A / EAN-13 / GTIN-14 con dígito verificador (módulo 10, pesos 3-1 desde la derecha).
create or replace function public.is_valid_gtin(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p ~ '^([0-9]{8}|[0-9]{12,14})$'
     and (
       select (10 - (sum(substr(p, length(p) - i, 1)::int * case when i % 2 = 1 then 3 else 1 end) % 10)) % 10
         from generate_series(1, length(p) - 1) as i
     ) = substr(p, length(p), 1)::int;
$$;

-- ── Proveedores ───────────────────────────────────────────────────────────────────────────
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  cuit text check (cuit is null or cuit ~ '^[0-9]{2}-?[0-9]{8}-?[0-9]$'),
  contact_name text,
  email text,
  phone text,
  lead_time_days int not null default 7 check (lead_time_days between 0 and 180),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Producto: identificación, contenido neto, costo, punto de pedido ──────────────────────
alter table public.products
  add column gtin text unique check (gtin is null or public.is_valid_gtin(gtin)),
  add column net_content numeric(8, 2) check (net_content is null or net_content > 0),
  add column net_unit text check (net_unit is null or net_unit in ('ml', 'g', 'u')),
  add column supplier_id uuid references public.suppliers on delete set null,
  add column unit_cost int check (unit_cost is null or unit_cost >= 0),
  add column reorder_point int check (reorder_point is null or reorder_point >= 0);
create index products_supplier_idx on public.products (supplier_id);

-- ── Datos regulatorios (1-a-1, fuera de la fila del catálogo) ─────────────────────────────
create table public.product_regulatory (
  product_id uuid primary key references public.products on delete cascade,
  anmat_registration text,          -- Nº de inscripción / legajo / resolución
  product_grade public.product_grade,
  holder_name text,                 -- titular de la inscripción
  manufacturer_name text,           -- elaborador
  importer_name text,
  country_of_origin char(2) check (country_of_origin is null or country_of_origin ~ '^[A-Z]{2}$'),
  inci_list text,                   -- tal cual el rótulo, orden decreciente
  pao_months int check (pao_months is null or pao_months between 1 and 60),
  warnings text,                    -- precauciones del rótulo
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

-- ── Lotes ─────────────────────────────────────────────────────────────────────────────────
create table public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products on delete cascade,
  lot_code text not null check (length(trim(lot_code)) > 0),
  expires_on date,                  -- null = desconocido (sale último en FEFO)
  received_on date not null default current_date,
  supplier_id uuid references public.suppliers on delete set null,
  unit_cost int check (unit_cost is null or unit_cost >= 0),
  qty_received int not null default 0 check (qty_received >= 0),
  qty_on_hand int not null default 0 check (qty_on_hand >= 0),
  status public.lot_status not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users on delete set null,
  unique (product_id, lot_code)
);
create index inventory_lots_fefo_idx on public.inventory_lots (product_id, status, expires_on nulls last, received_on);
create index inventory_lots_expiry_idx on public.inventory_lots (expires_on) where status = 'available';

-- ── Órdenes de compra ─────────────────────────────────────────────────────────────────────
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  supplier_id uuid not null references public.suppliers on delete restrict,
  status public.purchase_order_status not null default 'draft',
  expected_on date,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders on delete cascade,
  product_id uuid not null references public.products on delete restrict,
  qty int not null check (qty > 0),
  qty_received int not null default 0 check (qty_received >= 0),
  unit_cost int check (unit_cost is null or unit_cost >= 0),
  unique (purchase_order_id, product_id)
);
create index purchase_order_items_product_idx on public.purchase_order_items (product_id);

-- ── Libro de movimientos (inmutable) ──────────────────────────────────────────────────────
create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products on delete cascade,
  lot_id uuid references public.inventory_lots on delete set null,
  qty int not null check (qty <> 0),
  kind public.stock_movement_kind not null,
  reason text,
  order_id uuid references public.orders on delete set null,
  purchase_order_id uuid references public.purchase_orders on delete set null,
  actor uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index stock_movements_order_idx on public.stock_movements (order_id) where order_id is not null;
create index stock_movements_lot_idx on public.stock_movements (lot_id) where lot_id is not null;

create or replace function private.forbid_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Permitido solo lo que hacen las claves foráneas: borrar en cascada con el producto y poner
  -- en null la referencia a un pedido/lote/OC/usuario borrado. Todo lo demás, con un ajuste.
  if tg_op = 'DELETE' then
    if not exists (select 1 from public.products where id = old.product_id) then
      return old;
    end if;
  elsif new.product_id = old.product_id and new.qty = old.qty and new.kind = old.kind
        and new.created_at = old.created_at and new.reason is not distinct from old.reason
        and (new.lot_id is not distinct from old.lot_id or new.lot_id is null)
        and (new.order_id is not distinct from old.order_id or new.order_id is null)
        and (new.purchase_order_id is not distinct from old.purchase_order_id or new.purchase_order_id is null)
        and (new.actor is not distinct from old.actor or new.actor is null) then
    return new;
  end if;
  raise exception 'El libro de movimientos no se modifica: registrá un ajuste' using errcode = '42501';
end;
$$;
create trigger stock_movements_immutable
  before update or delete on public.stock_movements
  for each row execute function private.forbid_change();

-- ── Historial de precios + precio sin impuestos nacionales automático ────────────────────
create table public.price_history (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products on delete cascade,
  price int not null,
  compare_at_price int,
  changed_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create index price_history_product_idx on public.price_history (product_id, created_at desc);

-- Ley 27.743 art. 99: "precio sin impuestos nacionales" = precio / (1 + IVA). IVA 21 %.
-- Se recalcula al cambiar el precio, salvo que la misma operación lo fije a mano.
create or replace function private.products_price_bookkeeping()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.price_without_national_taxes is null then
      new.price_without_national_taxes := round(new.price / 1.21);
    end if;
  elsif new.price is distinct from old.price
     and new.price_without_national_taxes is not distinct from old.price_without_national_taxes then
    new.price_without_national_taxes := round(new.price / 1.21);
  end if;
  return new;
end;
$$;
create trigger products_price_bookkeeping
  before insert or update of price on public.products
  for each row execute function private.products_price_bookkeeping();

create or replace function private.products_price_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.price is distinct from old.price
     or new.compare_at_price is distinct from old.compare_at_price then
    insert into public.price_history (product_id, price, compare_at_price, changed_by)
    values (new.id, new.price, new.compare_at_price, (select auth.uid()));
  end if;
  return null;
end;
$$;
create trigger products_price_history
  after insert or update of price, compare_at_price on public.products
  for each row execute function private.products_price_history();

-- ── Ventas y cancelaciones → lotes (FEFO) ─────────────────────────────────────────────────
create or replace function private.inventory_allocate_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_lot record;
  v_left int;
  v_take int;
begin
  -- Idempotente: si el pedido ya tiene ventas registradas, no se vuelve a asignar.
  if exists (select 1 from public.stock_movements where order_id = p_order_id and kind = 'sale') then
    return;
  end if;

  for v_item in
    select oi.product_id, sum(oi.quantity)::int as qty
      from public.order_items oi
      join public.products p on p.id = oi.product_id and p.track_stock
     where oi.order_id = p_order_id
     group by oi.product_id
  loop
    v_left := v_item.qty;
    for v_lot in
      select id, qty_on_hand
        from public.inventory_lots
       where product_id = v_item.product_id and status = 'available' and qty_on_hand > 0
         and (expires_on is null or expires_on >= current_date)
       order by expires_on nulls last, received_on, created_at
       for update
    loop
      exit when v_left = 0;
      v_take := least(v_left, v_lot.qty_on_hand);
      update public.inventory_lots
         set qty_on_hand = qty_on_hand - v_take,
             status = case when qty_on_hand - v_take = 0 then 'depleted'::public.lot_status else status end
       where id = v_lot.id;
      insert into public.stock_movements (product_id, lot_id, qty, kind, order_id, reason)
      values (v_item.product_id, v_lot.id, -v_take, 'sale', p_order_id, 'FEFO');
      v_left := v_left - v_take;
    end loop;

    if v_left > 0 then
      -- No había lotes suficientes cargados: queda registrado para conciliar (ver inventory_discrepancies).
      insert into public.stock_movements (product_id, lot_id, qty, kind, order_id, reason)
      values (v_item.product_id, null, -v_left, 'sale', p_order_id, 'sin lote disponible');
    end if;
  end loop;
end;
$$;

create or replace function private.inventory_return_order(p_order_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mv record;
begin
  if exists (select 1 from public.stock_movements where order_id = p_order_id and kind = 'return') then
    return;
  end if;
  for v_mv in
    select product_id, lot_id, sum(-qty)::int as qty
      from public.stock_movements
     where order_id = p_order_id and kind = 'sale'
     group by product_id, lot_id
  loop
    if v_mv.lot_id is not null then
      update public.inventory_lots
         set qty_on_hand = qty_on_hand + v_mv.qty,
             status = case when status = 'depleted' then 'available'::public.lot_status else status end
       where id = v_mv.lot_id;
    end if;
    insert into public.stock_movements (product_id, lot_id, qty, kind, order_id, reason, actor)
    values (v_mv.product_id, v_mv.lot_id, v_mv.qty, 'return', p_order_id, p_reason, (select auth.uid()));
  end loop;
end;
$$;

create or replace function private.orders_inventory_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'pending_payment' and new.status = 'paid' then
    perform private.inventory_allocate_order(new.id);
  elsif old.status in ('paid', 'preparing') and new.status = 'cancelled' then
    perform private.inventory_return_order(new.id, 'pedido cancelado');
  end if;
  return null;
end;
$$;
create trigger orders_inventory_sync
  after update of status on public.orders
  for each row execute function private.orders_inventory_sync();

-- ── RPC de admin ──────────────────────────────────────────────────────────────────────────
-- Recepción de mercadería: suma a un lote (lo crea si no existe) y al stock vendible.
create or replace function public.admin_inventory_receive(
  p_product_id uuid,
  p_qty int,
  p_lot_code text,
  p_expires_on date default null,
  p_supplier_id uuid default null,
  p_unit_cost int default null,
  p_purchase_order_id uuid default null,
  p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_lot public.inventory_lots;
  v_code text := upper(trim(coalesce(p_lot_code, '')));
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_qty is null or p_qty <= 0 or p_qty > 100000 then
    raise exception 'La cantidad tiene que ser mayor a cero' using hint = 'admin';
  end if;
  if v_code = '' then
    raise exception 'Indicá el número de lote (está en el envase)' using hint = 'admin';
  end if;
  if p_expires_on is not null and p_expires_on < current_date then
    raise exception 'Ese lote ya está vencido' using hint = 'admin';
  end if;
  if p_unit_cost is not null and p_unit_cost < 0 then
    raise exception 'El costo no puede ser negativo' using hint = 'admin';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto inexistente' using hint = 'admin';
  end if;

  insert into public.inventory_lots
    (product_id, lot_code, expires_on, supplier_id, unit_cost, qty_received, qty_on_hand, created_by)
  values
    (p_product_id, v_code, p_expires_on, coalesce(p_supplier_id, v_product.supplier_id), p_unit_cost,
     p_qty, p_qty, (select auth.uid()))
  on conflict (product_id, lot_code) do update
     set qty_received = public.inventory_lots.qty_received + excluded.qty_received,
         qty_on_hand = public.inventory_lots.qty_on_hand + excluded.qty_on_hand,
         expires_on = coalesce(excluded.expires_on, public.inventory_lots.expires_on),
         unit_cost = coalesce(excluded.unit_cost, public.inventory_lots.unit_cost),
         status = case when public.inventory_lots.status = 'depleted'
                       then 'available'::public.lot_status else public.inventory_lots.status end
  returning * into v_lot;

  insert into public.stock_movements (product_id, lot_id, qty, kind, reason, purchase_order_id, actor)
  values (p_product_id, v_lot.id, p_qty, 'receipt', nullif(trim(coalesce(p_note, '')), ''),
          p_purchase_order_id, (select auth.uid()));

  update public.products
     set stock = case when v_lot.status = 'available' then stock + p_qty else stock end,
         unit_cost = coalesce(p_unit_cost, unit_cost),
         supplier_id = coalesce(supplier_id, p_supplier_id),
         updated_at = now()
   where id = p_product_id;

  if p_purchase_order_id is not null then
    update public.purchase_order_items
       set qty_received = qty_received + p_qty
     where purchase_order_id = p_purchase_order_id and product_id = p_product_id;
  end if;

  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), 'inventory.receive', 'products', p_product_id::text,
          jsonb_build_object('lot', v_code, 'qty', p_qty, 'expires_on', p_expires_on));

  return jsonb_build_object('ok', true, 'lot_id', v_lot.id, 'lot_qty', v_lot.qty_on_hand,
                            'stock', (select stock from public.products where id = p_product_id));
end;
$$;

-- Ajuste manual: rotura/merma ('waste'), diferencia de conteo ('count') u otro ('adjustment').
-- Siempre con motivo. Las bajas sin lote salen por FEFO; las altas requieren lote.
create or replace function public.admin_inventory_adjust(
  p_product_id uuid,
  p_delta int,
  p_kind text,
  p_reason text,
  p_lot_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products;
  v_kind public.stock_movement_kind;
  v_lot record;
  v_left int;
  v_take int;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_kind not in ('adjustment', 'waste', 'count') then
    raise exception 'Tipo de ajuste inválido' using hint = 'admin';
  end if;
  v_kind := p_kind::public.stock_movement_kind;
  if p_delta is null or p_delta = 0 then
    raise exception 'El ajuste no puede ser cero' using hint = 'admin';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Contá el motivo del ajuste (ej.: "frasco roto")' using hint = 'admin';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto inexistente' using hint = 'admin';
  end if;
  if v_product.stock + p_delta < v_product.reserved_stock then
    raise exception 'No alcanza: hay % unidades reservadas en pedidos sin pagar', v_product.reserved_stock
      using hint = 'admin';
  end if;

  if p_lot_id is not null then
    select * into v_lot from public.inventory_lots where id = p_lot_id and product_id = p_product_id for update;
    if not found then
      raise exception 'El lote no corresponde a este producto' using hint = 'admin';
    end if;
    if v_lot.qty_on_hand + p_delta < 0 then
      raise exception 'El lote % tiene solo % unidades', v_lot.lot_code, v_lot.qty_on_hand using hint = 'admin';
    end if;
    update public.inventory_lots
       set qty_on_hand = qty_on_hand + p_delta,
           status = case when qty_on_hand + p_delta = 0 and status = 'available' then 'depleted'::public.lot_status
                         when qty_on_hand + p_delta > 0 and status = 'depleted' then 'available'::public.lot_status
                         else status end
     where id = p_lot_id;
    insert into public.stock_movements (product_id, lot_id, qty, kind, reason, actor)
    values (p_product_id, p_lot_id, p_delta, v_kind, trim(p_reason), (select auth.uid()));
    if v_lot.status in ('available', 'depleted') then
      update public.products set stock = stock + p_delta, updated_at = now() where id = p_product_id;
    end if;
  elsif p_delta > 0 then
    raise exception 'Para sumar unidades elegí el lote (o registrá una recepción)' using hint = 'admin';
  else
    v_left := -p_delta;
    for v_lot in
      select id, qty_on_hand from public.inventory_lots
       where product_id = p_product_id and status = 'available' and qty_on_hand > 0
       order by expires_on nulls last, received_on, created_at
       for update
    loop
      exit when v_left = 0;
      v_take := least(v_left, v_lot.qty_on_hand);
      update public.inventory_lots
         set qty_on_hand = qty_on_hand - v_take,
             status = case when qty_on_hand - v_take = 0 then 'depleted'::public.lot_status else status end
       where id = v_lot.id;
      insert into public.stock_movements (product_id, lot_id, qty, kind, reason, actor)
      values (p_product_id, v_lot.id, -v_take, v_kind, trim(p_reason), (select auth.uid()));
      v_left := v_left - v_take;
    end loop;
    if v_left > 0 then
      raise exception 'No hay tantas unidades en lotes disponibles' using hint = 'admin';
    end if;
    update public.products set stock = stock + p_delta, updated_at = now() where id = p_product_id;
  end if;

  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), 'inventory.' || p_kind, 'products', p_product_id::text,
          jsonb_build_object('delta', p_delta, 'lot_id', p_lot_id, 'reason', trim(p_reason)));

  return jsonb_build_object('ok', true, 'stock', (select stock from public.products where id = p_product_id));
end;
$$;

-- Cuarentena / recall / liberar un lote: sus unidades salen (o vuelven) del stock vendible.
create or replace function public.admin_inventory_set_lot_status(
  p_lot_id uuid,
  p_status text,
  p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lot public.inventory_lots;
  v_product public.products;
  v_new public.lot_status;
  v_was_sellable boolean;
  v_is_sellable boolean;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if p_status not in ('available', 'quarantine', 'recalled', 'expired') then
    raise exception 'Estado inválido' using hint = 'admin';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Contá el motivo' using hint = 'admin';
  end if;
  v_new := p_status::public.lot_status;

  select * into v_lot from public.inventory_lots where id = p_lot_id for update;
  if not found then
    raise exception 'Lote inexistente' using hint = 'admin';
  end if;
  if v_new = 'available' and v_lot.expires_on is not null and v_lot.expires_on < current_date then
    raise exception 'Un lote vencido no vuelve a la venta' using hint = 'admin';
  end if;
  select * into v_product from public.products where id = v_lot.product_id for update;

  v_was_sellable := v_lot.status = 'available';
  v_is_sellable := v_new = 'available';
  if v_was_sellable and not v_is_sellable
     and v_product.stock - v_lot.qty_on_hand < v_product.reserved_stock then
    raise exception 'Hay pedidos sin pagar que reservan estas unidades; esperá o cancelalos' using hint = 'admin';
  end if;

  update public.inventory_lots
     set status = case when v_is_sellable and qty_on_hand = 0 then 'depleted'::public.lot_status else v_new end,
         notes = concat_ws(E'\n', notes, to_char(now(), 'YYYY-MM-DD') || ' · ' || p_status || ': ' || trim(p_reason))
   where id = p_lot_id;

  if v_lot.qty_on_hand > 0 and v_was_sellable <> v_is_sellable then
    insert into public.stock_movements (product_id, lot_id, qty, kind, reason, actor)
    values (v_lot.product_id, p_lot_id,
            case when v_is_sellable then v_lot.qty_on_hand else -v_lot.qty_on_hand end,
            case when v_is_sellable then 'unquarantine'
                 when v_new = 'recalled' then 'recall'
                 else 'quarantine' end::public.stock_movement_kind,
            trim(p_reason), (select auth.uid()));
    update public.products
       set stock = stock + case when v_is_sellable then v_lot.qty_on_hand else -v_lot.qty_on_hand end,
           updated_at = now()
     where id = v_lot.product_id;
  end if;

  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), 'inventory.lot_status', 'inventory_lots', p_lot_id::text,
          jsonb_build_object('from', v_lot.status, 'to', v_new, 'reason', trim(p_reason)));

  return jsonb_build_object('ok', true, 'stock', (select stock from public.products where id = v_lot.product_id));
end;
$$;

-- Conciliación: stock vendible del producto vs. unidades en lotes disponibles.
create view public.inventory_discrepancies
with (security_invoker = true) as
select p.id as product_id, p.sku, p.name, p.stock,
       coalesce(sum(l.qty_on_hand) filter (where l.status = 'available'), 0)::int as lots_available,
       p.stock - coalesce(sum(l.qty_on_hand) filter (where l.status = 'available'), 0)::int as difference
  from public.products p
  left join public.inventory_lots l on l.product_id = p.id
 where p.track_stock
 group by p.id
having p.stock <> coalesce(sum(l.qty_on_hand) filter (where l.status = 'available'), 0);

-- ── RLS ───────────────────────────────────────────────────────────────────────────────────
alter table public.suppliers enable row level security;
alter table public.product_regulatory enable row level security;
alter table public.inventory_lots enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.price_history enable row level security;

create policy "admin all" on public.suppliers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all" on public.product_regulatory for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all" on public.purchase_orders for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin all" on public.purchase_order_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- Lotes, movimientos e historial: lectura para admin; escritura solo por las RPC de arriba.
create policy "admin read" on public.inventory_lots for select to authenticated
  using ((select public.is_admin()));
create policy "admin read" on public.stock_movements for select to authenticated
  using ((select public.is_admin()));
create policy "admin read" on public.price_history for select to authenticated
  using ((select public.is_admin()));
-- El INCI, el país y la inscripción se muestran en la ficha pública.
create policy "public read regulatory of active products" on public.product_regulatory
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));

revoke all on function public.admin_inventory_receive(uuid, int, text, date, uuid, int, uuid, text) from public, anon;
revoke all on function public.admin_inventory_adjust(uuid, int, text, text, uuid) from public, anon;
revoke all on function public.admin_inventory_set_lot_status(uuid, text, text) from public, anon;
grant execute on function public.admin_inventory_receive(uuid, int, text, date, uuid, int, uuid, text) to authenticated;
grant execute on function public.admin_inventory_adjust(uuid, int, text, text, uuid) to authenticated;
grant execute on function public.admin_inventory_set_lot_status(uuid, text, text) to authenticated;
revoke all on function private.inventory_allocate_order(uuid) from public, anon, authenticated;
revoke all on function private.inventory_return_order(uuid, text) from public, anon, authenticated;
revoke all on public.inventory_discrepancies from anon;

-- ── Saldo inicial: el stock actual pasa a un lote "INICIAL" sin vencimiento ───────────────
with lots as (
  insert into public.inventory_lots (product_id, lot_code, expires_on, qty_received, qty_on_hand, notes)
  select id, 'INICIAL', null, stock, stock,
         'Stock migrado el ' || to_char(current_date, 'DD/MM/YYYY') ||
         ' sin lote ni vencimiento: completar en la próxima recepción o conteo.'
    from public.products
   where track_stock and stock > 0
  returning id, product_id, qty_on_hand
)
insert into public.stock_movements (product_id, lot_id, qty, kind, reason)
select product_id, id, qty_on_hand, 'receipt', 'saldo inicial (migración)' from lots;

insert into public.price_history (product_id, price, compare_at_price)
select id, price, compare_at_price from public.products;

update public.products
   set price_without_national_taxes = round(price / 1.21)
 where price_without_national_taxes is null;
