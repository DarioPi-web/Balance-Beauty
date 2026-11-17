-- Pedidos y pagos (docs/03 §Funciones). El carrito vive en una cookie firmada (ADR-019),
-- por eso place_order recibe las líneas (slug + cantidad) en el JSON del checkout.
-- Precios, descuentos, envío y stock se calculan SOLO acá, nunca en el cliente.

-- Libera reservas de stock vencidas (pedidos sin pagar > 30 min). El pedido sigue en
-- pending_payment: si el pago llega tarde, confirm_payment lo marca pagado igual.
create or replace function public.release_expired_reservations()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  with expired as (
    update public.orders o
       set reserved_until = null
     where o.status = 'pending_payment'
       and o.reserved_until is not null
       and o.reserved_until < now()
    returning o.id
  ), qty as (
    select oi.product_id, sum(oi.quantity)::int as q
      from public.order_items oi
      join expired e on e.id = oi.order_id
     where oi.product_id is not null
     group by oi.product_id
  )
  update public.products p
     set reserved_stock = greatest(p.reserved_stock - qty.q, 0)
    from qty
   where p.id = qty.product_id and p.track_stock;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Crea un pedido de forma transaccional. Errores para mostrar al cliente: hint = 'checkout'.
create or replace function public.place_order(p_checkout jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_items jsonb := p_checkout -> 'items';
  v_method public.shipping_method;
  v_payment public.payment_method;
  v_addr jsonb := coalesce(p_checkout -> 'address', '{}'::jsonb);
  v_email text := lower(trim(coalesce(p_checkout ->> 'email', '')));
  v_name text := trim(coalesce(p_checkout ->> 'full_name', ''));
  v_cp int;
  v_subtotal int := 0;
  v_discount int := 0;
  v_shipping int := 0;
  v_percent numeric := 0;
  v_rate record;
  v_line record;
  v_lines jsonb := '[]'::jsonb;
  v_wanted int;
  v_found int := 0;
  v_order public.orders;
begin
  perform public.release_expired_reservations();

  begin
    v_method := (p_checkout ->> 'shipping_method')::public.shipping_method;
    v_payment := (p_checkout ->> 'payment_method')::public.payment_method;
  exception when others then
    raise exception 'Elegí un medio de envío y de pago válidos' using hint = 'checkout';
  end;
  if v_method is null or v_payment is null or v_method = 'store_pickup' or v_payment = 'cash_pickup' then
    raise exception 'Elegí un medio de envío y de pago válidos' using hint = 'checkout';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_name) < 3 then
    raise exception 'Revisá tu nombre y email' using hint = 'checkout';
  end if;
  if jsonb_typeof(v_items) is distinct from 'array' or jsonb_array_length(v_items) not between 1 and 30 then
    raise exception 'Tu carrito está vacío' using hint = 'checkout';
  end if;

  -- Bloquea las filas de producto (orden estable por id) antes de validar stock.
  perform 1 from public.products
   where slug in (select x.slug from jsonb_to_recordset(v_items) as x(slug text, qty int))
   order by id
   for update;

  select count(distinct x.slug) into v_wanted from jsonb_to_recordset(v_items) as x(slug text, qty int);

  for v_line in
    select p.id, p.sku, p.slug, p.name, p.price, p.track_stock, p.stock, p.reserved_stock,
           p.status, p.requires_prescription, i.qty
      from (select x.slug, sum(x.qty)::int as qty
              from jsonb_to_recordset(v_items) as x(slug text, qty int)
             group by x.slug) i
      join public.products p on p.slug = i.slug
     order by p.id
  loop
    v_found := v_found + 1;
    if v_line.status <> 'active' or v_line.requires_prescription then
      raise exception '"%" no está disponible para compra online', v_line.name using hint = 'checkout';
    end if;
    if v_line.qty is null or v_line.qty < 1 or v_line.qty > 10 then
      raise exception 'Cantidad inválida para "%"', v_line.name using hint = 'checkout';
    end if;
    if v_line.track_stock and v_line.stock - v_line.reserved_stock < v_line.qty then
      raise exception 'No hay stock suficiente de "%"', v_line.name using hint = 'checkout';
    end if;
    v_subtotal := v_subtotal + v_line.price * v_line.qty;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_line.id, 'sku', v_line.sku, 'slug', v_line.slug, 'name', v_line.name,
      'unit_price', v_line.price, 'qty', v_line.qty, 'track_stock', v_line.track_stock);
  end loop;

  if v_found <> v_wanted then
    raise exception 'Algún producto del carrito ya no está disponible' using hint = 'checkout';
  end if;

  -- Descuento por medio de pago (10 % transferencia / QR), desde promotions activas.
  select coalesce(max(pr.percent), 0) into v_percent
    from public.promotions pr
   where pr.is_active and pr.kind = 'payment_method_discount' and pr.payment_method = v_payment
     and (pr.starts_at is null or pr.starts_at <= now()) and (pr.ends_at is null or pr.ends_at > now());
  v_discount := floor(v_subtotal * v_percent / 100);

  -- Envío: tarifa activa del método para el CP (la más específica primero).
  v_cp := nullif(regexp_replace(coalesce(v_addr ->> 'postal_code', ''), '\D', '', 'g'), '')::int;
  if v_cp is null then
    raise exception 'Ingresá un código postal válido' using hint = 'checkout';
  end if;
  select sr.price, sr.free_from into v_rate
    from public.shipping_rates sr
   where sr.is_active and sr.method = v_method
     and (sr.postal_code_from is null or v_cp >= sr.postal_code_from)
     and (sr.postal_code_to is null or v_cp <= sr.postal_code_to)
   order by (sr.postal_code_from is null), sr.price
   limit 1;
  if not found then
    raise exception 'Todavía no hacemos envíos a ese código postal' using hint = 'checkout';
  end if;
  v_shipping := case when v_rate.free_from is not null and v_subtotal - v_discount >= v_rate.free_from
                     then 0 else v_rate.price end;

  insert into public.orders (
    user_id, email, phone, full_name, dni, payment_method, shipping_method, shipping_address,
    subtotal, discount_total, shipping_total, total, customer_note, reserved_until)
  values (
    (select auth.uid()), v_email, nullif(p_checkout ->> 'phone', ''), v_name, nullif(p_checkout ->> 'dni', ''),
    v_payment, v_method, v_addr,
    v_subtotal, v_discount, v_shipping, v_subtotal - v_discount + v_shipping,
    nullif(left(coalesce(p_checkout ->> 'customer_note', ''), 300), ''), now() + interval '30 minutes')
  returning * into v_order;

  insert into public.order_items (order_id, product_id, sku, name, unit_price, quantity, line_total)
  select v_order.id, l.product_id, l.sku, l.name, l.unit_price, l.qty, l.unit_price * l.qty
    from jsonb_to_recordset(v_lines) as l(product_id uuid, sku text, name text, unit_price int, qty int);

  update public.products p
     set reserved_stock = p.reserved_stock + l.qty
    from jsonb_to_recordset(v_lines) as l(product_id uuid, qty int, track_stock boolean)
   where p.id = l.product_id and l.track_stock;

  return jsonb_build_object(
    'id', v_order.id, 'number', v_order.number,
    'subtotal', v_order.subtotal, 'discount_total', v_order.discount_total,
    'shipping_total', v_order.shipping_total, 'total', v_order.total,
    'payment_method', v_order.payment_method,
    'items', (select jsonb_agg(jsonb_build_object('sku', l->>'sku', 'slug', l->>'slug', 'name', l->>'name',
                                                  'unit_price', (l->>'unit_price')::int, 'qty', (l->>'qty')::int))
                from jsonb_array_elements(v_lines) l));
end;
$$;

-- Registra un pago verificado (webhook). Idempotente por (provider, provider_payment_id).
-- Solo marca "paid" si el pago está aprobado y cubre el total del pedido.
create or replace function public.confirm_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_status public.payment_status,
  p_amount int,
  p_installments int default null,
  p_raw jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'order_not_found');
  end if;

  insert into public.payments (order_id, provider, provider_payment_id, status, amount, installments, raw)
  values (p_order_id, p_provider, p_provider_payment_id, p_status, p_amount, p_installments, p_raw)
  on conflict (provider, provider_payment_id) do update
     set status = excluded.status, amount = excluded.amount,
         installments = excluded.installments, raw = excluded.raw;

  if p_status = 'approved' and v_order.status = 'pending_payment' then
    if p_amount < v_order.total then
      return jsonb_build_object('ok', false, 'reason', 'amount_mismatch', 'order_status', v_order.status);
    end if;

    with qty as (
      select product_id, sum(quantity)::int as q
        from public.order_items
       where order_id = p_order_id and product_id is not null
       group by product_id
    )
    update public.products p
       set stock = greatest(p.stock - qty.q, 0),
           reserved_stock = least(
             greatest(p.reserved_stock - case when v_order.reserved_until is not null then qty.q else 0 end, 0),
             greatest(p.stock - qty.q, 0))
      from qty
     where p.id = qty.product_id and p.track_stock;

    update public.orders set status = 'paid', reserved_until = null where id = p_order_id;
    return jsonb_build_object('ok', true, 'order_status', 'paid', 'changed', true);
  end if;

  return jsonb_build_object('ok', true, 'order_status', v_order.status, 'changed', false);
end;
$$;

-- Resumen de un pedido para /checkout/resultado. El uuid funciona como capacidad
-- (no es adivinable); no expone email, teléfono, DNI ni dirección.
create or replace function public.get_order_summary(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'number', o.number, 'status', o.status, 'payment_method', o.payment_method,
    'shipping_method', o.shipping_method, 'subtotal', o.subtotal, 'discount_total', o.discount_total,
    'shipping_total', o.shipping_total, 'total', o.total, 'first_name', split_part(o.full_name, ' ', 1),
    'created_at', o.created_at, 'reserved_until', o.reserved_until,
    'items', coalesce((select jsonb_agg(jsonb_build_object('sku', oi.sku, 'name', oi.name,
                                         'unit_price', oi.unit_price, 'qty', oi.quantity) order by oi.name)
                         from public.order_items oi where oi.order_id = o.id), '[]'::jsonb))
    from public.orders o
   where o.id = p_order_id;
$$;

revoke execute on function public.release_expired_reservations() from public, anon, authenticated;
revoke execute on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;
revoke execute on function public.confirm_payment(uuid, text, text, public.payment_status, int, int, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_payment(uuid, text, text, public.payment_status, int, int, jsonb) to service_role;
revoke execute on function public.get_order_summary(uuid) from public;
grant execute on function public.get_order_summary(uuid) to anon, authenticated;

-- Índices de claves foráneas usadas por pedidos (advisor 0001).
create index if not exists order_items_product_idx on public.order_items (product_id);
create index if not exists orders_coupon_idx on public.orders (coupon_id);
create index if not exists cart_items_product_idx on public.cart_items (product_id);
create index if not exists product_prices_product_idx on public.product_prices (product_id);
create index if not exists related_products_related_idx on public.related_products (related_id);
create index if not exists categories_parent_idx on public.categories (parent_id);
