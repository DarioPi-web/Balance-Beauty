-- L7 (revisión de seguridad): request_withdrawal se podía llamar directo por /rest/v1/rpc
-- con la clave pública, salteando el honeypot del formulario y variando emails para llenar la
-- tabla. Ahora exige la clave de servidor (igual que place_order): solo la Server Action
-- puede registrar solicitudes. La validación y el límite por email siguen igual.

drop function if exists public.request_withdrawal(text, text, int, text);

create or replace function public.request_withdrawal(
  p_server_key text,
  p_full_name text,
  p_email text,
  p_order_number int default null,
  p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(coalesce(p_full_name, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_row public.withdrawal_requests;
begin
  if not private.check_server_key('checkout', p_server_key) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if char_length(v_name) < 3 or char_length(v_name) > 120 then
    raise exception 'Ingresá tu nombre y apellido' using hint = 'withdrawal';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'Revisá el email' using hint = 'withdrawal';
  end if;
  if p_order_number is not null and p_order_number <= 0 then
    raise exception 'Revisá el número de pedido' using hint = 'withdrawal';
  end if;
  if (select count(*) from public.withdrawal_requests
       where lower(email) = v_email and created_at > now() - interval '1 day') >= 3 then
    raise exception 'Ya recibimos tu pedido. Si necesitás algo más, respondé el email que te enviamos'
      using hint = 'withdrawal';
  end if;

  insert into public.withdrawal_requests (full_name, email, order_number, reason)
  values (v_name, v_email, p_order_number, nullif(left(trim(coalesce(p_reason, '')), 2000), ''))
  returning * into v_row;

  return jsonb_build_object('code', v_row.code, 'created_at', v_row.created_at);
end;
$$;

revoke all on function public.request_withdrawal(text, text, text, int, text) from public;
grant execute on function public.request_withdrawal(text, text, text, int, text) to anon, authenticated;
