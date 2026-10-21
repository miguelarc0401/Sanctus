-- Perfiles de usuario: uno por cada cuenta de Supabase Auth.
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  foto text,
  es_admin boolean not null default false,
  debe_cambiar_contrasena boolean not null default false,
  creado_en timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- ¿El usuario actual es administrador? (security definer evita que RLS se llame a sí misma)
create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select es_admin from public.perfiles where id = (select auth.uid())), false);
$$;

create policy "Cada quien ve su perfil; el admin ve todos"
  on public.perfiles for select
  to authenticated
  using (id = (select auth.uid()) or public.es_admin());

create policy "Cada quien edita su perfil; el admin edita todos"
  on public.perfiles for update
  to authenticated
  using (id = (select auth.uid()) or public.es_admin())
  with check (id = (select auth.uid()) or public.es_admin());

-- Desde la app sólo se pueden editar nombre y foto; es_admin nunca.
revoke all on public.perfiles from anon, authenticated;
grant select on public.perfiles to authenticated;
grant update (nombre, foto) on public.perfiles to authenticated;

-- Crea el perfil automáticamente al crear la cuenta.
create function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, debe_cambiar_contrasena)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'debe_cambiar_contrasena')::boolean, false)
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Quita la marca de contraseña temporal del usuario actual.
create function public.marcar_contrasena_cambiada()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.perfiles set debe_cambiar_contrasena = false where id = (select auth.uid());
$$;

revoke execute on function public.marcar_contrasena_cambiada() from public, anon;
grant execute on function public.marcar_contrasena_cambiada() to authenticated;
