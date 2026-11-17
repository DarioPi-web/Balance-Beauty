-- Protección del checkout contra spam / reserva abusiva de stock.
-- 1) place_order exige una clave de servidor: solo la conoce la Server Action (env CHECKOUT_SERVER_KEY).
--    En la base se guarda SOLO su hash SHA-256, en un esquema que la API no expone.
-- 2) Límites: máx. 5 pedidos por hora por IP (hash) y máx. 3 pedidos con stock reservado por email.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.server_keys (
  name text primary key,
  key_hash text not null,               -- encode(sha256(clave), 'hex')
  updated_at timestamptz not null default now()
);
revoke all on private.server_keys from public, anon, authenticated;

alter table public.orders add column if not exists client_ip_hash text;
create index if not exists orders_ip_recent_idx on public.orders (client_ip_hash, created_at desc)
  where client_ip_hash is not null;
create index if not exists orders_email_pending_idx on public.orders (email)
  where status = 'pending_payment' and reserved_until is not null;

-- Verifica la clave (comparación de hashes; la clave nunca se guarda en texto plano).
create or replace function private.check_server_key(p_name text, p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.server_keys k
     where k.name = p_name
       and p_key is not null and length(p_key) >= 32
       and k.key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex')
  );
$$;
revoke all on function private.check_server_key(text, text) from public, anon, authenticated;

-- La versión anterior (sin clave) deja de existir: nadie puede llamarla directo por REST.
drop function if exists public.place_order(jsonb);

create or replace function public.place_order(p_checkout jsonb, p_server_key text)
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
  v_ip text := nullif(p_checkout ->> 'client_ip_hash', '');
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
  if not private.check_server_key('checkout', p_server_key) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

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

  -- Límites anti-abuso.
  if v_ip is not null and (
       select count(*) from public.orders o
        where o.client_ip_hash = v_ip and o.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Hiciste muchos pedidos seguidos. Probá de nuevo en un rato o escribinos.' using hint = 'checkout';
  end if;
  if (select count(*) from public.orders o
       where o.email = v_email and o.status = 'pending_payment' and o.reserved_until > now()) >= 3 then
    raise exception 'Ya tenés pedidos pendientes de pago. Completá alguno o esperá 30 minutos.' using hint = 'checkout';
  end if;

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

  select coalesce(max(pr.percent), 0) into v_percent
    from public.promotions pr
   where pr.is_active and pr.kind = 'payment_method_discount' and pr.payment_method = v_payment
     and (pr.starts_at is null or pr.starts_at <= now()) and (pr.ends_at is null or pr.ends_at > now());
  v_discount := floor(v_subtotal * v_percent / 100);

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
    subtotal, discount_total, shipping_total, total, customer_note, reserved_until, client_ip_hash)
  values (
    (select auth.uid()), v_email, nullif(p_checkout ->> 'phone', ''), v_name, nullif(p_checkout ->> 'dni', ''),
    v_payment, v_method, v_addr,
    v_subtotal, v_discount, v_shipping, v_subtotal - v_discount + v_shipping,
    nullif(left(coalesce(p_checkout ->> 'customer_note', ''), 300), ''), now() + interval '30 minutes', v_ip)
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

revoke execute on function public.place_order(jsonb, text) from public;
grant execute on function public.place_order(jsonb, text) to anon, authenticated;
