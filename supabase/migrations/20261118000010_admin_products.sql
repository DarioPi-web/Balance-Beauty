-- L2 (docs/18): admin de productos mínimo.
-- * Bucket público "product-images" para fotos subidas desde el admin (variantes AVIF
--   generadas en el servidor: <slug>/<id>.avif + <slug>/<id>-<ancho>.avif + -share.jpg).
--   Escritura solo admin (is_admin) con la sesión del usuario: no hace falta service role.
-- * admin_create_product: alta en borrador con slug único.
-- * admin_save_product: guarda datos + categorías + preocupaciones en una transacción, valida
--   y deja auditoría con lo que cambió en precio/stock/estado.

-- ── Storage ───────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 10485760,
        array['image/avif', 'image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update
   set public = excluded.public,
       file_size_limit = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;

create policy "admin read product images" on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
create policy "admin upload product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "admin update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "admin delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- ── Slug ──────────────────────────────────────────────────────────────────────────────────
create or replace function public.slugify(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(lower(public.unaccent_immutable(coalesce(p, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

-- ── Alta ──────────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_create_product(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_base text;
  v_slug text;
  v_n int := 1;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if length(v_name) < 3 or length(v_name) > 120 then
    raise exception 'El nombre tiene que tener entre 3 y 120 caracteres' using hint = 'admin';
  end if;
  v_base := left(public.slugify(v_name), 80);
  if v_base = '' then
    raise exception 'El nombre tiene que tener letras o números' using hint = 'admin';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.products where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  insert into public.products (name, slug, price, status, stock)
  values (v_name, v_slug, 0, 'draft', 0)
  returning id into v_id;

  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), 'product.create', 'products', v_id::text,
          jsonb_build_object('name', v_name, 'slug', v_slug));
  return v_id;
end;
$$;

-- ── Guardar ───────────────────────────────────────────────────────────────────────────────
-- p_data: { name, tagline, description, how_to_use, price, compare_at_price, stock,
--           track_stock, status, is_featured, requires_prescription, brand_id, weight_g,
--           length_cm, width_cm, height_cm, seo_title, seo_description }
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
  v_stock int := (p_data->>'stock')::int;
  v_status public.product_status := (p_data->>'status')::public.product_status;
  v_images int;
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
  if v_stock is null or v_stock < 0 then
    raise exception 'Revisá el stock' using hint = 'admin';
  end if;
  if v_stock < v_old.reserved_stock then
    raise exception 'Hay % unidades reservadas en pedidos sin pagar: el stock no puede ser menor', v_old.reserved_stock
      using hint = 'admin';
  end if;
  if v_status = 'active' then
    if v_price = 0 then
      raise exception 'Para publicar, el producto necesita precio' using hint = 'admin';
    end if;
    select count(*) into v_images from public.product_images where product_id = p_id;
    if v_images = 0 then
      raise exception 'Para publicar, el producto necesita al menos una foto' using hint = 'admin';
    end if;
    if coalesce(array_length(p_category_ids, 1), 0) = 0 then
      raise exception 'Para publicar, elegí al menos una categoría' using hint = 'admin';
    end if;
  end if;
  if p_primary_concern is not null and not (p_primary_concern = any (p_concern_ids)) then
    raise exception 'La preocupación principal tiene que estar entre las elegidas' using hint = 'admin';
  end if;

  update public.products
     set name = trim(p_data->>'name'),
         tagline = nullif(trim(coalesce(p_data->>'tagline', '')), ''),
         description = nullif(trim(coalesce(p_data->>'description', '')), ''),
         how_to_use = nullif(trim(coalesce(p_data->>'how_to_use', '')), ''),
         price = v_price,
         compare_at_price = v_compare,
         stock = v_stock,
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
         price_without_national_taxes = case when v_price is distinct from v_old.price
                                             then round(v_price / 1.21)
                                             else price_without_national_taxes end,
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
            'stock', case when v_old.stock <> v_new.stock then jsonb_build_array(v_old.stock, v_new.stock) end,
            'status', case when v_old.status <> v_new.status then jsonb_build_array(v_old.status, v_new.status) end)));

  return jsonb_build_object('ok', true, 'slug', v_new.slug, 'status', v_new.status);
end;
$$;

revoke all on function public.admin_create_product(text) from public, anon;
revoke all on function public.admin_save_product(uuid, jsonb, uuid[], uuid[], uuid) from public, anon;
grant execute on function public.admin_create_product(text) to authenticated;
grant execute on function public.admin_save_product(uuid, jsonb, uuid[], uuid[], uuid) to authenticated;
