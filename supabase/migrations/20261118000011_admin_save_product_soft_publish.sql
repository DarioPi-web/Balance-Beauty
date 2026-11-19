-- L2: al guardar un producto que se pide publicar sin cumplir los requisitos (precio, foto,
-- categoría) ya no se pierde lo cargado: se guarda todo y queda en el estado anterior (o
-- borrador), devolviendo qué falta. Los demás errores de validación siguen cortando.
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
  if v_stock is null or v_stock < 0 then
    raise exception 'Revisá el stock' using hint = 'admin';
  end if;
  if v_stock < v_old.reserved_stock then
    raise exception 'Hay % unidades reservadas en pedidos sin pagar: el stock no puede ser menor', v_old.reserved_stock
      using hint = 'admin';
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

  return jsonb_build_object('ok', true, 'slug', v_new.slug, 'status', v_new.status,
                            'missing', to_jsonb(v_missing));
end;
$$;
