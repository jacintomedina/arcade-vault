-- rls_auto_enable() es la función del event trigger ensure_rls (activa RLS en tablas nuevas de public).
-- No debe poder llamarse por la API REST (/rest/v1/rpc/rls_auto_enable).
-- La crea Supabase (opción «auto-enable RLS»), no una migración: en un proyecto
-- que no la tenga, el revoke se omite en vez de fallar.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
