-- v1.2 (docs/18): integra el inventario por lote (migración 15) con el admin.
-- * admin_save_product ya no toca el stock: se cambia solo con recepción/ajuste (con lote,
--   motivo y movimiento). Así stock y lotes no se desincronizan.
-- * admin_dashboard suma lotes por vencer (≤ 90 días) y diferencias stock/lotes.
-- * Job diario: los lotes vencidos salen del stock vendible (movimiento "quarantine").

create or replace function public.admin_save_product(
  p_id uuid,
  p_data jsonb,
  p_category_ids uuid[] default '{}',
  p_concern_ids uuid[] default '{}',
  p_primary_concern uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.products;
  v_new public.products;
  v_price int := (p_data->>'price')::int;
  v_compare int := nullif(p_data->>'compare_at_price', '')::int;
  v_status public.product_status := (p_data->>'status')::public.product_status;
  v_missing text[] := '{}';
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_old from public.products where id = p_id for update;
  if not found then
    raise exception 'Producto inexistente' using hint = 'admin';
  end if;

  if length(trim(coalesce(p_data->>'name', ''))) < 3 then
    raise exception 'El nombre es obligatorio' using hint = 'admin';
  end if;
  if v_price is null or v_price < 0 then
    raise exception 'Revisá el precio' using hint = 'admin';
  end if;
  if v_compare is not null and v_compare <= v_price then
    raise exception 'El precio tachado tiene que ser mayor al precio de venta' using hint = 'admin';
  end if;
  if p_primary_concern is not null and not (p_primary_concern = any (p_concern_ids)) then
    raise exception 'La preocupación principal tiene que estar entre las elegidas' using hint = 'admin';
  end if;

  if v_status = 'active' then
    if v_price = 0 then
      v_missing := array_append(v_missing, 'precio');
    end if;
    if not exists (select 1 from public.product_images where product_id = p_id) then
      v_missing := array_append(v_missing, 'una foto');
    end if;
    if coalesce(array_length(p_category_ids, 1), 0) = 0 then
      v_missing := array_append(v_missing, 'una categoría');
    end if;
    if cardinality(v_missing) > 0 then
      v_status := case when v_old.status = 'active' then 'draft'::public.product_status else v_old.status end;
    end if;
  end if;

  update public.products
     set name = trim(p_data->>'name'),
         tagline = nullif(trim(coalesce(p_data->>'tagline', '')), ''),
         description = nullif(trim(coalesce(p_data->>'description', '')), ''),
         how_to_use = nullif(trim(coalesce(p_data->>'how_to_use', '')), ''),
         price = v_price,
         compare_at_price = v_compare,
         track_stock = coalesce((p_data->>'track_stock')::boolean, true),
         status = v_status,
         is_featured = coalesce((p_data->>'is_featured')::boolean, false),
         requires_prescription = coalesce((p_data->>'requires_prescription')::boolean, false),
         brand_id = nullif(p_data->>'brand_id', '')::uuid,
         weight_g = nullif(p_data->>'weight_g', '')::int,
         length_cm = nullif(p_data->>'length_cm', '')::numeric,
         width_cm = nullif(p_data->>'width_cm', '')::numeric,
         height_cm = nullif(p_data->>'height_cm', '')::numeric,
         seo_title = nullif(trim(coalesce(p_data->>'seo_title', '')), ''),
         seo_description = nullif(trim(coalesce(p_data->>'seo_description', '')), ''),
         low_stock_threshold = coalesce(nullif(p_data->>'low_stock_threshold', '')::int, low_stock_threshold),
         updated_at = now()
   where id = p_id
  returning * into v_new;

  delete from public.product_categories where product_id = p_id;
  insert into public.product_categories (product_id, category_id)
  select p_id, c from unnest(coalesce(p_category_ids, '{}')) as c group by c;

  delete from public.product_concerns where product_id = p_id;
  insert into public.product_concerns (product_id, concern_id, is_primary)
  select p_id, c, c = p_primary_concern from unnest(coalesce(p_concern_ids, '{}')) as c group by c;

  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), 'product.save', 'products', p_id::text,
          jsonb_strip_nulls(jsonb_build_object(
            'price', case when v_old.price <> v_new.price then jsonb_build_array(v_old.price, v_new.price) end,
            'status', case when v_old.status <> v_new.status then jsonb_build_array(v_old.status, v_new.status) end)));

  return jsonb_build_object('ok', true, 'slug', v_new.slug, 'status', v_new.status,
                            'missing', to_jsonb(v_missing));
end;
$$;

-- ── Tablero: + lotes por vencer y diferencias ─────────────────────────────────────────────
create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_paid public.order_status[] := array['paid', 'preparing', 'shipped', 'delivered']::public.order_status[];
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'sales_today', (
      select jsonb_build_object('count', count(*), 'total', coalesce(sum(total), 0))
        from public.orders
       where status = any (v_paid)
         and (created_at at time zone 'America/Argentina/Buenos_Aires')::date = v_today),
    'sales_month', (
      select jsonb_build_object('count', count(*), 'total', coalesce(sum(total), 0))
        from public.orders
       where status = any (v_paid)
         and created_at >= date_trunc('month', v_today::timestamp) at time zone 'America/Argentina/Buenos_Aires'),
    'to_ship', coalesce((
      select jsonb_agg(o order by o.created_at)
        from (select id, number, full_name, total, status, created_at
                from public.orders
               where status in ('paid', 'preparing')
               order by created_at
               limit 8) o), '[]'::jsonb),
    'to_ship_count', (select count(*) from public.orders where status in ('paid', 'preparing')),
    'pending_transfers', coalesce((
      select jsonb_agg(o order by o.created_at desc)
        from (select id, number, full_name, total, created_at
                from public.orders
               where status = 'pending_payment' and payment_method = 'bank_transfer'
                 and created_at > now() - interval '7 days'
               order by created_at desc
               limit 8) o), '[]'::jsonb),
    'low_stock', coalesce((
      select jsonb_agg(p order by p.available, p.name)
        from (select id, name, sku, stock - reserved_stock as available
                from public.products
               where status = 'active' and track_stock
                 and stock - reserved_stock <= low_stock_threshold
               order by stock - reserved_stock, name
               limit 10) p), '[]'::jsonb),
    'no_photo_count', (
      select count(*) from public.products p
       where p.status <> 'archived'
         and not exists (select 1 from public.product_images i where i.product_id = p.id)),
    'withdrawals', coalesce((
      select jsonb_agg(w order by w.created_at)
        from (select id, code, full_name, email, order_number, reason, created_at
                from public.withdrawal_requests
               where handled_at is null
               order by created_at
               limit 20) w), '[]'::jsonb),
    'expiring_lots', coalesce((
      select jsonb_agg(l order by l.expires_on)
        from (select l.id, l.product_id, p.name, l.lot_code, l.expires_on, l.qty_on_hand,
                     l.qty_on_hand * coalesce(l.unit_cost, p.unit_cost, 0) as cost_value
                from public.inventory_lots l
                join public.products p on p.id = l.product_id
               where l.status = 'available' and l.qty_on_hand > 0
                 and l.expires_on is not null and l.expires_on <= v_today + 90
               order by l.expires_on
               limit 12) l), '[]'::jsonb),
    'lots_without_expiry', (
      select count(*) from public.inventory_lots
       where status = 'available' and qty_on_hand > 0 and expires_on is null),
    'discrepancies', (select count(*) from public.inventory_discrepancies)
  );
end;
$$;

-- ── Vencimientos: job diario ──────────────────────────────────────────────────────────────
create or replace function private.inventory_expire_lots()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_lot record;
  v_n int := 0;
begin
  for v_lot in
    select l.id, l.product_id, l.qty_on_hand
      from public.inventory_lots l
     where l.status = 'available' and l.expires_on < v_today
     order by l.product_id
       for update
  loop
    -- Si hay pedidos sin pagar reservando esas unidades, se espera al próximo día (la reserva
    -- vence sola en 30 min) para no dejar el stock por debajo de lo reservado.
    if v_lot.qty_on_hand > 0 and exists (
         select 1 from public.products p
          where p.id = v_lot.product_id and p.stock - v_lot.qty_on_hand < p.reserved_stock) then
      continue;
    end if;
    update public.inventory_lots set status = 'expired',
           notes = concat_ws(E'\n', notes, to_char(v_today, 'YYYY-MM-DD') || ' · vencido (automático)')
     where id = v_lot.id;
    if v_lot.qty_on_hand > 0 then
      insert into public.stock_movements (product_id, lot_id, qty, kind, reason)
      values (v_lot.product_id, v_lot.id, -v_lot.qty_on_hand, 'quarantine', 'vencido (automático)');
      update public.products set stock = stock - v_lot.qty_on_hand, updated_at = now()
       where id = v_lot.product_id;
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke all on function private.inventory_expire_lots() from public, anon, authenticated;

-- 06:05 UTC = 03:05 en Argentina.
select cron.schedule('expire-inventory-lots', '5 6 * * *', $cron$ select private.inventory_expire_lots(); $cron$);
