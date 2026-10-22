-- Las funciones auxiliares no deben poder llamarse sin iniciar sesión.
-- es_admin y es_miembro sí las necesita el rol authenticated: las usan las reglas de RLS.
revoke execute on function public.crear_perfil() from public, anon, authenticated;
revoke execute on function public.es_admin() from public, anon;
revoke execute on function public.es_miembro(bigint) from public, anon;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.es_miembro(bigint) to authenticated;
