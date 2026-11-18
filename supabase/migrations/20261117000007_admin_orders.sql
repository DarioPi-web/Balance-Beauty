-- Gestión de pedidos desde /admin (F6-07). Una sola RPC con las transiciones permitidas:
--   mark_paid  pending_payment → paid        (transferencia acreditada; descuenta stock vía confirm_payment)
--   prepare    paid → preparing
--   ship       paid | preparing → shipped     (crea shipments con transportista y código de seguimiento)
--   deliver    shipped → delivered
--   cancel     pending_payment | paid | preparing → cancelled (libera reserva o devuelve stock)
-- Solo admin/staff (is_admin). Cada cambio queda en audit_log.

create or replace function public.admin_order_action(
  p_order_id uuid,
  p_action text,
  p_carrier text default null,
  p_tracking_code text default null,
  p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_new public.order_status;
  v_pay jsonb;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido inexistente' using hint = 'admin';
  end if;

  case p_action
    when 'mark_paid' then
      if v_order.status <> 'pending_payment' then
        raise exception 'Solo se puede acreditar un pedido pendiente de pago' using hint = 'admin';
      end if;
      v_pay := public.confirm_payment(p_order_id, 'manual', 'manual-' || p_order_id, 'approved', v_order.total,
                                      null, jsonb_build_object('by', (select auth.uid()), 'note', p_note));
      if not coalesce((v_pay ->> 'ok')::boolean, false) then
        raise exception 'No se pudo acreditar: %', v_pay ->> 'reason' using hint = 'admin';
      end if;
      v_new := 'paid';

    when 'prepare' then
      if v_order.status <> 'paid' then
        raise exception 'Solo se prepara un pedido pagado' using hint = 'admin';
      end if;
      v_new := 'preparing';

    when 'ship' then
      if v_order.status not in ('paid', 'preparing') then
        raise exception 'Solo se despacha un pedido pagado o en preparación' using hint = 'admin';
      end if;
      if coalesce(trim(p_carrier), '') = '' then
        raise exception 'Indicá el transportista' using hint = 'admin';
      end if;
      insert into public.shipments (order_id, carrier, tracking_code, status, shipped_at)
      values (p_order_id, trim(p_carrier), nullif(trim(coalesce(p_tracking_code, '')), ''), 'shipped', now());
      v_new := 'shipped';

    when 'deliver' then
      if v_order.status <> 'shipped' then
        raise exception 'Solo se entrega un pedido despachado' using hint = 'admin';
      end if;
      update public.shipments set status = 'delivered', delivered_at = now(), updated_at = now()
       where order_id = p_order_id and delivered_at is null;
      v_new := 'delivered';

    when 'cancel' then
      if v_order.status not in ('pending_payment', 'paid', 'preparing') then
        raise exception 'Este pedido ya no se puede cancelar' using hint = 'admin';
      end if;
      with qty as (
        select product_id, sum(quantity)::int as q from public.order_items
         where order_id = p_order_id and product_id is not null group by product_id)
      update public.products p
         set reserved_stock = case when v_order.status = 'pending_payment' and v_order.reserved_until is not null
                                   then greatest(p.reserved_stock - qty.q, 0) else p.reserved_stock end,
             stock = case when v_order.status in ('paid', 'preparing') then p.stock + qty.q else p.stock end
        from qty
       where p.id = qty.product_id and p.track_stock;
      v_new := 'cancelled';

    else
      raise exception 'Acción desconocida' using hint = 'admin';
  end case;

  update public.orders
     set status = v_new, reserved_until = null,
         admin_note = case when coalesce(p_note, '') <> ''
                           then concat_ws(E'\n', admin_note, to_char(now(), 'YYYY-MM-DD HH24:MI') || ' · ' || p_note)
                           else admin_note end
   where id = p_order_id;

  insert into public.audit_log (actor, action, entity, entity_id, diff)
  values ((select auth.uid()), 'order.' || p_action, 'orders', p_order_id::text,
          jsonb_build_object('from', v_order.status, 'to', v_new, 'carrier', p_carrier, 'tracking', p_tracking_code));

  return jsonb_build_object('ok', true, 'number', v_order.number, 'from', v_order.status, 'to', v_new);
end;
$$;

revoke execute on function public.admin_order_action(uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_order_action(uuid, text, text, text, text) to authenticated;
