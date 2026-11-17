-- Endurecer funciones SECURITY DEFINER (Supabase advisors 0028/0029).
-- handle_new_user solo la usa el trigger de auth.users: nadie la llama por la API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- is_admin la evalúan las políticas "admin all" (rol authenticated). Anónimos no la necesitan.
-- Para authenticated se mantiene a propósito: solo informa si el propio usuario es admin/staff.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
