-- Registro con aprobación: cada quien crea su cuenta y el administrador la aprueba.
-- Mientras una cuenta no esté aprobada, no ve nada de la parroquia.

create type public.estado_cuenta as enum ('pendiente', 'aprobado', 'suspendido');

alter table public.perfiles
  add column estado public.estado_cuenta not null default 'pendiente',
  add column grupo_solicitado bigint references public.grupos (id) on delete set null,
  add column nota_registro text;

create index on public.perfiles (grupo_solicitado);

-- Las cuentas que ya existen quedan aprobadas.
update public.perfiles set estado = 'aprobado';

-- ¿La cuenta actual está aprobada?
create function public.es_aprobado()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select estado = 'aprobado' from public.perfiles where id = (select auth.uid())), false);
$$;

-- Ser miembro de un grupo sólo cuenta si la cuenta está aprobada (así se puede desactivar a alguien).
create or replace function public.es_miembro(grupo bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.miembros m
    join public.perfiles p on p.id = m.usuario_id
    where m.grupo_id = grupo and m.usuario_id = (select auth.uid()) and p.estado = 'aprobado'
  );
$$;

-- Lo de toda la parroquia (sin grupo) sólo lo ven cuentas aprobadas.
drop policy "Todos ven los santos" on public.santos;
create policy "Las cuentas aprobadas ven los santos" on public.santos
  for select to authenticated using (public.es_aprobado());

drop policy "Avisos de la parroquia y de mis grupos" on public.avisos;
create policy "Avisos de la parroquia y de mis grupos" on public.avisos
  for select to authenticated
  using (public.es_admin() or (grupo_id is null and public.es_aprobado()) or public.es_miembro(grupo_id));

drop policy "Eventos de la parroquia y de mis grupos" on public.eventos;
create policy "Eventos de la parroquia y de mis grupos" on public.eventos
  for select to authenticated
  using (public.es_admin() or (grupo_id is null and public.es_aprobado()) or public.es_miembro(grupo_id));

drop policy "Virtudes de la parroquia y de mis grupos" on public.virtudes;
create policy "Virtudes de la parroquia y de mis grupos" on public.virtudes
  for select to authenticated
  using (public.es_admin() or (grupo_id is null and public.es_aprobado()) or public.es_miembro(grupo_id));

-- Aprobar una solicitud y asignarle sus grupos.
create function public.aprobar_miembro(usuario uuid, grupos bigint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Sólo el administrador puede aprobar cuentas.' using errcode = '42501';
  end if;
  update public.perfiles set estado = 'aprobado' where id = usuario;
  insert into public.miembros (grupo_id, usuario_id)
  select unnest(grupos), usuario
  on conflict do nothing;
end;
$$;

-- Activar o desactivar una cuenta.
create function public.cambiar_estado(usuario uuid, nuevo public.estado_cuenta)
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
  update public.perfiles set estado = nuevo where id = usuario;
end;
$$;

revoke execute on function public.es_aprobado() from public, anon;
revoke execute on function public.aprobar_miembro(uuid, bigint[]) from public, anon;
revoke execute on function public.cambiar_estado(uuid, public.estado_cuenta) from public, anon;
grant execute on function public.es_aprobado() to authenticated;
grant execute on function public.aprobar_miembro(uuid, bigint[]) to authenticated;
grant execute on function public.cambiar_estado(uuid, public.estado_cuenta) to authenticated;
