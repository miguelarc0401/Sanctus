-- Varios administradores. Todos pueden hacer lo mismo, pero al administrador principal
-- (quien instaló la app) nadie más le puede quitar el permiso ni tocar su cuenta.

alter table public.perfiles add column es_principal boolean not null default false;

-- Sólo puede haber un administrador principal.
create unique index perfiles_un_principal on public.perfiles (es_principal) where es_principal;

-- El principal es el primer administrador.
update public.perfiles set es_principal = true
where id = (select id from public.perfiles where es_admin order by creado_en limit 1);

-- Un administrador siempre tiene la cuenta activa, y el principal siempre es administrador.
alter table public.perfiles
  add constraint admin_con_cuenta_activa check (not es_admin or estado = 'aprobado'),
  add constraint principal_es_admin check (not es_principal or es_admin);

-- Los administradores editan los perfiles de los demás, salvo el del principal.
drop policy "Cada quien edita su perfil; el admin edita todos" on public.perfiles;
create policy "Cada quien edita su perfil; el admin edita los demás salvo al principal"
  on public.perfiles for update
  to authenticated
  using (id = (select auth.uid()) or (public.es_admin() and not es_principal))
  with check (id = (select auth.uid()) or (public.es_admin() and not es_principal));

-- Nombrar o quitar a un administrador.
create function public.cambiar_admin(usuario uuid, hacer boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Sólo un administrador puede nombrar administradores.' using errcode = '42501';
  end if;
  if usuario = (select auth.uid()) then
    raise exception 'No puedes cambiar tu propio permiso de administrador.' using errcode = '42501';
  end if;
  if exists (select 1 from public.perfiles where id = usuario and es_principal) then
    raise exception 'Al administrador principal nadie le puede quitar el permiso.' using errcode = '42501';
  end if;
  if hacer and not exists (select 1 from public.perfiles where id = usuario and estado = 'aprobado') then
    raise exception 'Sólo una cuenta activa puede ser administradora.' using errcode = '42501';
  end if;
  update public.perfiles set es_admin = hacer where id = usuario;
end;
$$;

-- Activar o desactivar una cuenta. La del principal no; y quien se desactiva deja de ser administrador.
create or replace function public.cambiar_estado(usuario uuid, nuevo public.estado_cuenta)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Sólo el administrador puede cambiar el estado de una cuenta.' using errcode = '42501';
  end if;
  if usuario = (select auth.uid()) then
    raise exception 'No puedes cambiar el estado de tu propia cuenta.' using errcode = '42501';
  end if;
  if exists (select 1 from public.perfiles where id = usuario and es_principal) then
    raise exception 'La cuenta del administrador principal no se puede desactivar.' using errcode = '42501';
  end if;
  update public.perfiles set estado = nuevo, es_admin = es_admin and nuevo = 'aprobado' where id = usuario;
end;
$$;

revoke execute on function public.cambiar_admin(uuid, boolean) from public, anon;
grant execute on function public.cambiar_admin(uuid, boolean) to authenticated;
