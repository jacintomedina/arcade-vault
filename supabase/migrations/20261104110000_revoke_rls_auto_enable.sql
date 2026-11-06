-- rls_auto_enable() es la función del event trigger ensure_rls (activa RLS en tablas nuevas de public).
-- No debe poder llamarse por la API REST (/rest/v1/rpc/rls_auto_enable).
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
