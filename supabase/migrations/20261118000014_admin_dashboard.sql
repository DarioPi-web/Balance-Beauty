-- v1.1 (docs/18): operación diaria.
-- * admin_dashboard(): todo lo que el inicio del admin necesita en UNA llamada.
-- * admin_withdrawal_handle(): marcar atendida una solicitud de arrepentimiento (F6-12).
-- * pg_cron: libera cada 5 min las reservas de stock de pedidos sin pagar vencidos (F4-12).
--   Antes solo se liberaban al crear otro pedido.

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
               limit 20) w), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_withdrawal_handle(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  update public.withdrawal_requests set handled_at = now()
   where id = p_id and handled_at is null
  returning code into v_code;
  if v_code is null then
    raise exception 'La solicitud no existe o ya estaba atendida' using hint = 'admin';
  end if;
  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), 'withdrawal.handled', 'withdrawal_requests', p_id::text,
          jsonb_build_object('code', v_code));
  return jsonb_build_object('ok', true, 'code', v_code);
end;
$$;

revoke all on function public.admin_dashboard() from public, anon;
revoke all on function public.admin_withdrawal_handle(uuid) from public, anon;
grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.admin_withdrawal_handle(uuid) to authenticated;

-- ── Reservas vencidas: cada 5 minutos ─────────────────────────────────────────────────────
create extension if not exists pg_cron;
select cron.schedule(
  'release-expired-reservations',
  '*/5 * * * *',
  $cron$ select public.release_expired_reservations(); $cron$
);
