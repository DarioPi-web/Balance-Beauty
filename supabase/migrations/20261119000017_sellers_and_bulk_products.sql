-- Vendedoras, cupones con comisión y edición masiva de productos por Excel (2026‑11‑19).
--
-- Vendedoras
-- * sellers: una por vendedora (email; se vincula a su usuario de Supabase al ingresar).
-- * coupons.seller_id: el código de descuento de cada vendedora. La clienta lo carga en el
--   checkout; place_order lo valida, aplica el descuento y atribuye el pedido (orders.seller_id).
-- * seller_commissions: una fila por producto vendido con código. Estados:
--     pending  → pedido pagado / en preparación / despachado
--     approved → pedido entregado (pasado el arrepentimiento se liquida)
--     paid     → incluido en una liquidación (seller_payouts)
--     void     → pedido cancelado antes de liquidarse
--   Comisión = % de la vendedora (o el % propio del producto) sobre el precio neto del
--   producto (después del descuento del cupón).
-- * seller_dashboard(): todo lo que ve la vendedora, solo de ella.
--
-- Excel
-- * admin_bulk_update_products(rows): aplica en una transacción lo que vino de la planilla
--   (nombre, precios, stock, umbral, peso/medidas, estado, comisión). El stock cambia por
--   las RPC de inventario (lote "PLANILLA" o FEFO), nunca directo.

-- ── Vendedoras ────────────────────────────────────────────────────────────────────────────
create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users on delete set null,
  email text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  full_name text not null check (char_length(full_name) between 3 and 120),
  phone text,
  commission_percent numeric(5, 2) not null default 10 check (commission_percent between 0 and 60),
  payout_info text,                  -- CBU/alias/titular para pagarle (solo admin y ella)
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coupons
  add column seller_id uuid references public.sellers on delete set null,
  add column created_at timestamptz not null default now();
create index coupons_seller_idx on public.coupons (seller_id);
create unique index coupons_code_ci on public.coupons (upper(code));

alter table public.products
  add column seller_commission_percent numeric(5, 2)
    check (seller_commission_percent is null or seller_commission_percent between 0 and 60);

alter table public.orders
  add column seller_id uuid references public.sellers on delete set null,
  add column coupon_discount int not null default 0 check (coupon_discount >= 0);
create index orders_seller_idx on public.orders (seller_id, created_at desc) where seller_id is not null;

create type public.commission_status as enum ('pending', 'approved', 'paid', 'void');

create table public.seller_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers on delete restrict,
  amount int not null check (amount > 0),
  commissions_count int not null,
  method text,
  reference text,
  notes text,
  paid_at timestamptz not null default now(),
  created_by uuid references auth.users on delete set null
);
create index seller_payouts_seller_idx on public.seller_payouts (seller_id, paid_at desc);

create table public.seller_commissions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers on delete restrict,
  order_id uuid not null references public.orders on delete cascade,
  order_item_id uuid not null unique references public.order_items on delete cascade,
  product_id uuid references public.products on delete set null,
  product_name text not null,
  quantity int not null,
  base_amount int not null check (base_amount >= 0),
  percent numeric(5, 2) not null,
  amount int not null check (amount >= 0),
  status public.commission_status not null default 'pending',
  payout_id uuid references public.seller_payouts on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index seller_commissions_seller_idx on public.seller_commissions (seller_id, status, created_at desc);
create index seller_commissions_order_idx on public.seller_commissions (order_id);

-- ── Helpers ───────────────────────────────────────────────────────────────────────────────
-- Vendedora del usuario actual. Si su fila todavía no está vinculada, la vincula por email.
create or replace function public.current_seller_id()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_email text;
begin
  if (select auth.uid()) is null then
    return null;
  end if;
  select id into v_id from public.sellers where user_id = (select auth.uid()) and is_active;
  if v_id is not null then
    return v_id;
  end if;
  select lower(email) into v_email from auth.users where id = (select auth.uid());
  update public.sellers set user_id = (select auth.uid()), updated_at = now()
   where email = v_email and user_id is null and is_active
  returning id into v_id;
  return v_id;
end;
$$;

-- ── Cupón en el checkout ──────────────────────────────────────────────────────────────────
-- Devuelve el cupón válido (o error para mostrar). Uso interno de place_order y de la
-- vista previa del checkout (check_coupon, con clave de servidor).
create or replace function private.valid_coupon(p_code text, p_subtotal int)
returns public.coupons
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_c public.coupons;
begin
  select * into v_c from public.coupons where upper(code) = upper(trim(p_code));
  if not found or not v_c.is_active
     or (v_c.starts_at is not null and v_c.starts_at > now())
     or (v_c.ends_at is not null and v_c.ends_at <= now())
     or (v_c.max_uses is not null and v_c.used_count >= v_c.max_uses)
     or (v_c.seller_id is not null and not exists (
           select 1 from public.sellers s where s.id = v_c.seller_id and s.is_active)) then
    raise exception 'El código "%" no es válido o ya venció', upper(trim(p_code)) using hint = 'checkout';
  end if;
  if p_subtotal < v_c.min_amount then
    raise exception 'El código "%" es para compras desde $ %', upper(trim(p_code)), v_c.min_amount
      using hint = 'checkout';
  end if;
  return v_c;
end;
$$;

create or replace function private.coupon_discount(p_c public.coupons, p_subtotal int)
returns int
language sql
immutable
set search_path = ''
as $$
  select least(p_subtotal,
               coalesce(floor(p_subtotal * p_c.percent / 100)::int, 0) + coalesce(p_c.amount, 0));
$$;

create or replace function public.check_coupon(p_server_key text, p_code text, p_subtotal int)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_c public.coupons;
begin
  if not private.check_server_key('checkout', p_server_key) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  v_c := private.valid_coupon(p_code, p_subtotal);
  return jsonb_build_object('code', upper(v_c.code), 'percent', v_c.percent, 'amount', v_c.amount,
                            'discount', private.coupon_discount(v_c, p_subtotal));
end;
$$;

-- place_order: igual que en la migración 6 + cupón opcional (p_checkout.coupon_code).
-- Orden de descuentos: primero el cupón sobre el subtotal; después el % por medio de pago
-- sobre lo que queda. El envío gratis se evalúa sobre el subtotal con descuentos.
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
  v_code text := nullif(trim(coalesce(p_checkout ->> 'coupon_code', '')), '');
  v_coupon public.coupons;
  v_coupon_discount int := 0;
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

  if v_code is not null then
    v_coupon := private.valid_coupon(v_code, v_subtotal);
    v_coupon_discount := private.coupon_discount(v_coupon, v_subtotal);
  end if;

  select coalesce(max(pr.percent), 0) into v_percent
    from public.promotions pr
   where pr.is_active and pr.kind = 'payment_method_discount' and pr.payment_method = v_payment
     and (pr.starts_at is null or pr.starts_at <= now()) and (pr.ends_at is null or pr.ends_at > now());
  v_discount := v_coupon_discount + floor((v_subtotal - v_coupon_discount) * v_percent / 100)::int;

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
    subtotal, discount_total, shipping_total, total, customer_note, reserved_until, client_ip_hash,
    coupon_id, coupon_discount, seller_id)
  values (
    (select auth.uid()), v_email, nullif(p_checkout ->> 'phone', ''), v_name, nullif(p_checkout ->> 'dni', ''),
    v_payment, v_method, v_addr,
    v_subtotal, v_discount, v_shipping, v_subtotal - v_discount + v_shipping,
    nullif(left(coalesce(p_checkout ->> 'customer_note', ''), 300), ''), now() + interval '30 minutes', v_ip,
    v_coupon.id, v_coupon_discount, v_coupon.seller_id)
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
    'coupon_discount', v_order.coupon_discount,
    'shipping_total', v_order.shipping_total, 'total', v_order.total,
    'payment_method', v_order.payment_method,
    'items', (select jsonb_agg(jsonb_build_object('sku', l->>'sku', 'slug', l->>'slug', 'name', l->>'name',
                                                  'unit_price', (l->>'unit_price')::int, 'qty', (l->>'qty')::int))
                from jsonb_array_elements(v_lines) l));
end;
$$;

revoke execute on function public.place_order(jsonb, text) from public;
grant execute on function public.place_order(jsonb, text) to anon, authenticated;
revoke all on function public.check_coupon(text, text, int) from public;
grant execute on function public.check_coupon(text, text, int) to anon, authenticated;
revoke all on function private.valid_coupon(text, int) from public, anon, authenticated;
revoke all on function private.coupon_discount(public.coupons, int) from public, anon, authenticated;

-- ── Comisiones: siguen el estado del pedido ───────────────────────────────────────────────
create or replace function private.orders_commission_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seller public.sellers;
begin
  if new.seller_id is null then
    return null;
  end if;

  if old.status = 'pending_payment' and new.status = 'paid' then
    select * into v_seller from public.sellers where id = new.seller_id;
    insert into public.seller_commissions
      (seller_id, order_id, order_item_id, product_id, product_name, quantity, base_amount, percent, amount)
    select new.seller_id, new.id, oi.id, oi.product_id, oi.name, oi.quantity, b.base,
           coalesce(p.seller_commission_percent, v_seller.commission_percent),
           round(b.base * coalesce(p.seller_commission_percent, v_seller.commission_percent) / 100)::int
      from public.order_items oi
      left join public.products p on p.id = oi.product_id
      cross join lateral (
        select greatest(oi.line_total - case when new.subtotal > 0
                                              then round(new.coupon_discount::numeric * oi.line_total / new.subtotal)::int
                                              else 0 end, 0) as base) b
     where oi.order_id = new.id
    on conflict (order_item_id) do nothing;
    if new.coupon_id is not null then
      update public.coupons set used_count = used_count + 1 where id = new.coupon_id;
    end if;
  elsif new.status = 'delivered' and old.status <> 'delivered' then
    update public.seller_commissions set status = 'approved', updated_at = now()
     where order_id = new.id and status = 'pending';
  elsif new.status in ('cancelled', 'refunded') and old.status <> new.status then
    update public.seller_commissions set status = 'void', updated_at = now()
     where order_id = new.id and status in ('pending', 'approved');
  end if;
  return null;
end;
$$;
create trigger orders_commission_sync
  after update of status on public.orders
  for each row execute function private.orders_commission_sync();

-- ── Panel de la vendedora ─────────────────────────────────────────────────────────────────
create or replace function public.seller_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := public.current_seller_id();
  v_s public.sellers;
  v_month timestamptz := date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires')
                         at time zone 'America/Argentina/Buenos_Aires';
begin
  if v_id is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select * into v_s from public.sellers where id = v_id;

  return jsonb_build_object(
    'seller', jsonb_build_object('full_name', v_s.full_name, 'email', v_s.email,
                                 'commission_percent', v_s.commission_percent,
                                 'payout_info', v_s.payout_info),
    'coupons', coalesce((select jsonb_agg(jsonb_build_object(
        'code', upper(c.code), 'percent', c.percent, 'amount', c.amount, 'min_amount', c.min_amount,
        'is_active', c.is_active, 'ends_at', c.ends_at, 'used_count', c.used_count) order by c.created_at)
        from public.coupons c where c.seller_id = v_id), '[]'::jsonb),
    'totals', (select jsonb_build_object(
        'pending', coalesce(sum(amount) filter (where status = 'pending'), 0),
        'approved', coalesce(sum(amount) filter (where status = 'approved'), 0),
        'paid', coalesce(sum(amount) filter (where status = 'paid'), 0),
        'month_commission', coalesce(sum(amount) filter (where status <> 'void' and created_at >= v_month), 0),
        'month_units', coalesce(sum(quantity) filter (where status <> 'void' and created_at >= v_month), 0))
        from public.seller_commissions where seller_id = v_id),
    'month_orders', (select count(*) from public.orders
                      where seller_id = v_id and created_at >= v_month
                        and status in ('paid', 'preparing', 'shipped', 'delivered')),
    'orders', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select o.number, o.created_at, o.status, o.subtotal, o.coupon_discount,
               split_part(o.full_name, ' ', 1) as customer_first_name,
               coalesce(sum(sc.amount) filter (where sc.status <> 'void'), 0) as commission,
               coalesce(string_agg(distinct sc.status::text, ','), '') as commission_status,
               (select jsonb_agg(jsonb_build_object('name', sc2.product_name, 'qty', sc2.quantity,
                                                    'amount', sc2.amount, 'status', sc2.status))
                  from public.seller_commissions sc2 where sc2.order_id = o.id) as items
          from public.orders o
          left join public.seller_commissions sc on sc.order_id = o.id
         where o.seller_id = v_id and o.status <> 'pending_payment'
         group by o.id
         order by o.created_at desc
         limit 50) x), '[]'::jsonb),
    'payouts', coalesce((select jsonb_agg(jsonb_build_object(
        'paid_at', p.paid_at, 'amount', p.amount, 'commissions_count', p.commissions_count,
        'method', p.method, 'reference', p.reference) order by p.paid_at desc)
        from public.seller_payouts p where p.seller_id = v_id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.seller_update_payout_info(p_payout_info text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := public.current_seller_id();
begin
  if v_id is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if char_length(coalesce(p_payout_info, '')) > 300 then
    raise exception 'Máximo 300 caracteres' using hint = 'seller';
  end if;
  update public.sellers set payout_info = nullif(trim(p_payout_info), ''), updated_at = now() where id = v_id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ── Admin de vendedoras ───────────────────────────────────────────────────────────────────
create or replace function public.admin_save_seller(
  p_id uuid,
  p_email text,
  p_full_name text,
  p_phone text,
  p_commission_percent numeric,
  p_is_active boolean,
  p_payout_info text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
  v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Revisá el email' using hint = 'admin';
  end if;
  if char_length(trim(coalesce(p_full_name, ''))) < 3 then
    raise exception 'Ingresá el nombre y apellido' using hint = 'admin';
  end if;
  if p_commission_percent is null or p_commission_percent < 0 or p_commission_percent > 60 then
    raise exception 'La comisión va de 0 a 60 %%' using hint = 'admin';
  end if;
  if exists (select 1 from public.sellers where email = v_email and id is distinct from p_id) then
    raise exception 'Ya hay una vendedora con ese email' using hint = 'admin';
  end if;
  select id into v_user from auth.users where lower(email) = v_email;

  if p_id is null then
    insert into public.sellers (email, full_name, phone, commission_percent, is_active, payout_info, user_id)
    values (v_email, trim(p_full_name), nullif(trim(coalesce(p_phone, '')), ''), p_commission_percent,
            coalesce(p_is_active, true), nullif(trim(coalesce(p_payout_info, '')), ''), v_user)
    returning id into v_id;
  else
    update public.sellers
       set email = v_email, full_name = trim(p_full_name), phone = nullif(trim(coalesce(p_phone, '')), ''),
           commission_percent = p_commission_percent, is_active = coalesce(p_is_active, true),
           payout_info = nullif(trim(coalesce(p_payout_info, '')), ''),
           user_id = case when email = v_email then coalesce(user_id, v_user) else v_user end,
           updated_at = now()
     where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Vendedora inexistente' using hint = 'admin';
    end if;
  end if;

  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), 'seller.save', 'sellers', v_id::text,
          jsonb_build_object('email', v_email, 'commission_percent', p_commission_percent, 'active', p_is_active));
  return v_id;
end;
$$;

create or replace function public.admin_save_seller_coupon(
  p_seller_id uuid,
  p_code text,
  p_percent numeric,
  p_min_amount int,
  p_ends_at timestamptz,
  p_is_active boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if v_code !~ '^[A-Z0-9-]{4,20}$' then
    raise exception 'El código lleva de 4 a 20 letras, números o guiones (sin espacios)' using hint = 'admin';
  end if;
  if p_percent is null or p_percent <= 0 or p_percent > 50 then
    raise exception 'El descuento va de 1 a 50 %%' using hint = 'admin';
  end if;
  if not exists (select 1 from public.sellers where id = p_seller_id) then
    raise exception 'Vendedora inexistente' using hint = 'admin';
  end if;

  select id into v_id from public.coupons where upper(code) = v_code;
  if v_id is not null and not exists (select 1 from public.coupons where id = v_id and seller_id = p_seller_id) then
    raise exception 'Ese código ya existe' using hint = 'admin';
  end if;

  insert into public.coupons (code, percent, min_amount, ends_at, is_active, seller_id)
  values (v_code, p_percent, greatest(coalesce(p_min_amount, 0), 0), p_ends_at, coalesce(p_is_active, true), p_seller_id)
  on conflict (code) do update
     set percent = excluded.percent, min_amount = excluded.min_amount, ends_at = excluded.ends_at,
         is_active = excluded.is_active
  returning id into v_id;

  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), 'coupon.save', 'coupons', v_id::text,
          jsonb_build_object('code', v_code, 'percent', p_percent, 'seller', p_seller_id, 'active', p_is_active));
  return v_id;
end;
$$;

-- Liquidación: paga todas las comisiones "approved" de la vendedora (o las elegidas).
create or replace function public.admin_create_payout(
  p_seller_id uuid,
  p_method text,
  p_reference text,
  p_notes text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_amount int;
  v_count int;
  v_payout uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  select coalesce(sum(amount), 0), count(*) into v_amount, v_count
    from public.seller_commissions where seller_id = p_seller_id and status = 'approved';
  if v_count = 0 or v_amount <= 0 then
    raise exception 'No hay comisiones para liquidar (se liquidan las de pedidos entregados)' using hint = 'admin';
  end if;

  insert into public.seller_payouts (seller_id, amount, commissions_count, method, reference, notes, created_by)
  values (p_seller_id, v_amount, v_count, nullif(trim(coalesce(p_method, '')), ''),
          nullif(trim(coalesce(p_reference, '')), ''), nullif(trim(coalesce(p_notes, '')), ''), (select auth.uid()))
  returning id into v_payout;

  update public.seller_commissions set status = 'paid', payout_id = v_payout, updated_at = now()
   where seller_id = p_seller_id and status = 'approved';

  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), 'seller.payout', 'seller_payouts', v_payout::text,
          jsonb_build_object('seller', p_seller_id, 'amount', v_amount, 'count', v_count));
  return jsonb_build_object('ok', true, 'payout_id', v_payout, 'amount', v_amount, 'count', v_count);
end;
$$;

create or replace function public.admin_sellers_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  return coalesce((select jsonb_agg(x order by x.full_name) from (
    select s.id, s.email, s.full_name, s.phone, s.commission_percent, s.is_active, s.payout_info,
           s.user_id is not null as linked,
           (select coalesce(jsonb_agg(jsonb_build_object('code', upper(c.code), 'percent', c.percent,
                     'min_amount', c.min_amount, 'is_active', c.is_active, 'used_count', c.used_count,
                     'ends_at', c.ends_at) order by c.created_at), '[]'::jsonb)
              from public.coupons c where c.seller_id = s.id) as coupons,
           (select count(distinct o.id) from public.orders o
             where o.seller_id = s.id and o.status in ('paid', 'preparing', 'shipped', 'delivered')) as orders,
           coalesce((select sum(amount) from public.seller_commissions sc where sc.seller_id = s.id and sc.status = 'pending'), 0) as pending,
           coalesce((select sum(amount) from public.seller_commissions sc where sc.seller_id = s.id and sc.status = 'approved'), 0) as approved,
           coalesce((select sum(amount) from public.seller_commissions sc where sc.seller_id = s.id and sc.status = 'paid'), 0) as paid
      from public.sellers s) x), '[]'::jsonb);
end;
$$;

-- ── Edición masiva (Excel) ────────────────────────────────────────────────────────────────
-- p_rows: [{ sku, name?, price?, compare_at_price? ("" = sin tachado), stock?, low_stock_threshold?,
--            weight_g?, length_cm?, width_cm?, height_cm?, status?, tagline?, seller_commission_percent? }]
-- Solo vienen los campos que cambiaron. Todo o nada: si una fila es inválida, no se aplica nada.
create or replace function public.admin_bulk_update_products(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_p public.products;
  v_n int := 0;
  v_stock_changes int := 0;
  v_skipped text[] := '{}';
  v_price int;
  v_compare int;
  v_target int;
  v_status public.product_status;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 2000 then
    raise exception 'Planilla inválida' using hint = 'admin';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    select * into v_p from public.products where sku = v_row->>'sku' for update;
    if not found then
      raise exception 'No existe el producto con código %', v_row->>'sku' using hint = 'admin';
    end if;

    v_price := coalesce((v_row->>'price')::int, v_p.price);
    v_compare := case when v_row ? 'compare_at_price' then nullif(v_row->>'compare_at_price', '')::int
                      else v_p.compare_at_price end;
    if v_price < 0 then
      raise exception '%: el precio no puede ser negativo', v_p.sku using hint = 'admin';
    end if;
    if v_compare is not null and v_compare <= v_price then
      raise exception '%: el precio anterior tiene que ser mayor al precio', v_p.sku using hint = 'admin';
    end if;
    if v_row ? 'name' and char_length(trim(v_row->>'name')) < 3 then
      raise exception '%: el nombre es muy corto', v_p.sku using hint = 'admin';
    end if;

    v_status := coalesce((v_row->>'status')::public.product_status, v_p.status);
    if v_status = 'active' and v_p.status <> 'active' and (
         v_price = 0
         or not exists (select 1 from public.product_images where product_id = v_p.id)
         or not exists (select 1 from public.product_categories where product_id = v_p.id)) then
      v_skipped := array_append(v_skipped, v_p.sku);
      v_status := v_p.status;
    end if;

    update public.products
       set name = coalesce(nullif(trim(v_row->>'name'), ''), name),
           tagline = case when v_row ? 'tagline' then nullif(trim(v_row->>'tagline'), '') else tagline end,
           price = v_price,
           compare_at_price = v_compare,
           low_stock_threshold = coalesce((v_row->>'low_stock_threshold')::int, low_stock_threshold),
           weight_g = case when v_row ? 'weight_g' then nullif(v_row->>'weight_g', '')::int else weight_g end,
           length_cm = case when v_row ? 'length_cm' then nullif(v_row->>'length_cm', '')::numeric else length_cm end,
           width_cm = case when v_row ? 'width_cm' then nullif(v_row->>'width_cm', '')::numeric else width_cm end,
           height_cm = case when v_row ? 'height_cm' then nullif(v_row->>'height_cm', '')::numeric else height_cm end,
           seller_commission_percent = case when v_row ? 'seller_commission_percent'
                                            then nullif(v_row->>'seller_commission_percent', '')::numeric
                                            else seller_commission_percent end,
           status = v_status,
           updated_at = now()
     where id = v_p.id;

    if v_row ? 'stock' and v_p.track_stock then
      v_target := (v_row->>'stock')::int;
      if v_target < 0 then
        raise exception '%: el stock no puede ser negativo', v_p.sku using hint = 'admin';
      end if;
      if v_target > v_p.stock then
        perform public.admin_inventory_receive(v_p.id, v_target - v_p.stock, 'PLANILLA', null, null, null, null,
                                               'Planilla Excel');
        v_stock_changes := v_stock_changes + 1;
      elsif v_target < v_p.stock then
        perform public.admin_inventory_adjust(v_p.id, v_target - v_p.stock, 'count', 'Planilla Excel');
        v_stock_changes := v_stock_changes + 1;
      end if;
    end if;
    v_n := v_n + 1;
  end loop;

  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), 'products.bulk_update', 'products', null,
          jsonb_build_object('rows', v_n, 'stock_changes', v_stock_changes, 'not_published', to_jsonb(v_skipped)));
  return jsonb_build_object('ok', true, 'updated', v_n, 'stock_changes', v_stock_changes,
                            'not_published', to_jsonb(v_skipped));
end;
$$;

-- ── RLS y permisos ────────────────────────────────────────────────────────────────────────
alter table public.sellers enable row level security;
alter table public.seller_commissions enable row level security;
alter table public.seller_payouts enable row level security;

create policy "admin all" on public.sellers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "seller reads own" on public.sellers for select to authenticated
  using (user_id = (select auth.uid()));
create policy "admin all" on public.seller_commissions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "seller reads own" on public.seller_commissions for select to authenticated
  using (seller_id in (select id from public.sellers where user_id = (select auth.uid())));
create policy "admin all" on public.seller_payouts for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "seller reads own" on public.seller_payouts for select to authenticated
  using (seller_id in (select id from public.sellers where user_id = (select auth.uid())));

revoke all on function public.current_seller_id() from public, anon;
grant execute on function public.current_seller_id() to authenticated;
revoke all on function public.seller_dashboard() from public, anon;
grant execute on function public.seller_dashboard() to authenticated;
revoke all on function public.seller_update_payout_info(text) from public, anon;
grant execute on function public.seller_update_payout_info(text) to authenticated;
revoke all on function public.admin_save_seller(uuid, text, text, text, numeric, boolean, text) from public, anon;
grant execute on function public.admin_save_seller(uuid, text, text, text, numeric, boolean, text) to authenticated;
revoke all on function public.admin_save_seller_coupon(uuid, text, numeric, int, timestamptz, boolean) from public, anon;
grant execute on function public.admin_save_seller_coupon(uuid, text, numeric, int, timestamptz, boolean) to authenticated;
revoke all on function public.admin_create_payout(uuid, text, text, text) from public, anon;
grant execute on function public.admin_create_payout(uuid, text, text, text) to authenticated;
revoke all on function public.admin_sellers_overview() from public, anon;
grant execute on function public.admin_sellers_overview() to authenticated;
revoke all on function public.admin_bulk_update_products(jsonb) from public, anon;
grant execute on function public.admin_bulk_update_products(jsonb) to authenticated;
revoke all on function private.orders_commission_sync() from public, anon, authenticated;
