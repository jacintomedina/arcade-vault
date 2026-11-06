-- SPEC 12: perfiles de usuario con username público y único.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text check (username ~ '^[A-Za-z0-9_ ]{1,10}$'),  -- null hasta elegirlo (OAuth)
  created_at timestamptz not null default now()
);

create unique index profiles_username_lower_idx
  on public.profiles (lower(username)) where username is not null;

alter table public.profiles enable row level security;

create policy "profiles lectura pública" on public.profiles for select using (true);
create policy "profiles actualiza el propio" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- Sin política de INSERT/DELETE: el perfil lo crea el trigger y se borra en cascada.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, nullif(new.raw_user_meta_data ->> 'username', ''));
  return new;
exception when unique_violation or check_violation then
  insert into public.profiles (id, username) values (new.id, null);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
