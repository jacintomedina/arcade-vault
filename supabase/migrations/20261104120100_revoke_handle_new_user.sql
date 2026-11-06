-- handle_new_user() es la función del trigger on_auth_user_created (SECURITY DEFINER).
-- No debe poder llamarse por la API REST (/rest/v1/rpc/handle_new_user).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
