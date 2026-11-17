-- RLS en TODAS las tablas. Patrón performante: (select auth.uid()) / (select public.is_admin()).
-- Escrituras de clientes (carrito, pedidos) pasan por Server Actions/RPC; acá no se habilitan inserts directos.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','addresses','brands','categories','concerns','ingredients','products',
    'product_categories','product_concerns','product_ingredients','product_images','related_products',
    'price_lists','product_prices','carts','cart_items','promotions','coupons',
    'shipping_rates','shipping_rate_matrix','pickup_branches',
    'orders','order_items','payments','shipments',
    'banners','faqs','pages','store_settings','withdrawal_requests','contact_messages','audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- admin/staff: acceso total
    execute format(
      'create policy "admin all" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      t);
  end loop;
end $$;

-- ── Catálogo público (lectura anónima) ──
create policy "public read active products" on public.products
  for select to anon, authenticated using (status = 'active');

create policy "public read brands" on public.brands for select to anon, authenticated using (true);
create policy "public read categories" on public.categories for select to anon, authenticated using (is_visible);
create policy "public read concerns" on public.concerns for select to anon, authenticated using (is_visible);
create policy "public read ingredients" on public.ingredients for select to anon, authenticated using (true);

create policy "public read product_categories" on public.product_categories
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "public read product_concerns" on public.product_concerns
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "public read product_ingredients" on public.product_ingredients
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "public read product_images" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "public read related" on public.related_products
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = related_id and p.status = 'active'));

create policy "public read active promotions" on public.promotions
  for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "public read active banners" on public.banners
  for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "public read faqs" on public.faqs for select to anon, authenticated using (is_visible);
create policy "public read pages" on public.pages for select to anon, authenticated using (true);
create policy "public read settings" on public.store_settings for select to anon, authenticated using (is_public);
create policy "public read shipping_rates" on public.shipping_rates for select to anon, authenticated using (is_active);
create policy "public read rate matrix" on public.shipping_rate_matrix for select to anon, authenticated using (true);
create policy "public read branches" on public.pickup_branches for select to anon, authenticated using (true);

-- ── Mayoristas: precios de lista solo si están aprobados ──
create policy "wholesale read prices" on public.product_prices
  for select to authenticated
  using (exists (
    select 1 from public.profiles pr
    where pr.id = (select auth.uid()) and pr.role = 'wholesale' and pr.wholesale_approved_at is not null
  ));

-- ── Hook de Auth: el rol supabase_auth_admin lee el rol del perfil ──
create policy "auth hook reads roles" on public.profiles
  for select to supabase_auth_admin using (true);

-- ── Datos propios del cliente ──
create policy "own profile read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select p.role from public.profiles p where p.id = (select auth.uid())));

create policy "own addresses" on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own carts read" on public.carts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own cart items read" on public.cart_items
  for select to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));

create policy "own orders read" on public.orders
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own order items read" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "own payments read" on public.payments
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
create policy "own shipments read" on public.shipments
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));

-- ── Formularios públicos (Turnstile se valida en la Server Action) ──
create policy "anyone can request withdrawal" on public.withdrawal_requests
  for insert to anon, authenticated with check (true);
create policy "anyone can send contact" on public.contact_messages
  for insert to anon, authenticated with check (true);
