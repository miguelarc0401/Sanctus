-- Fase 1: santos, grupos, miembros, avisos, eventos y virtud de la semana.

-- Los niños entran con un usuario en lugar de correo. Por dentro, Supabase necesita un correo,
-- así que se usa usuario@usuarios.santamaria.invalid (dominio reservado: nunca recibe correos).
-- El mismo dominio está en src/lib/usuarios.ts y en supabase/functions/miembros/index.ts.

-- ─── Perfiles: con qué entra cada quien (correo o usuario) ───────────────────

alter table public.perfiles add column acceso text;

update public.perfiles p
set acceso = case
  when u.email like '%@usuarios.santamaria.invalid' then split_part(u.email, '@', 1)
  else u.email
end
from auth.users u
where u.id = p.id;

create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, debe_cambiar_contrasena, acceso)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'debe_cambiar_contrasena')::boolean, false),
    case
      when new.email like '%@usuarios.santamaria.invalid' then split_part(new.email, '@', 1)
      else new.email
    end
  );
  return new;
end;
$$;

-- ─── Santos (catálogo que el administrador puede editar) ─────────────────────

create table public.santos (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  fiesta text,
  descripcion text,
  creado_en timestamptz not null default now()
);

insert into public.santos (nombre) values
  ('San Pío de Pietrelcina'),
  ('San Antonio de Padua'),
  ('Santa Catalina de Siena'),
  ('San Francisco de Asís'),
  ('San Francisco Javier'),
  ('San Lorenzo, mártir'),
  ('San Luis Gonzaga'),
  ('San José Sánchez del Río'),
  ('San Felipe de Jesús'),
  ('San Cristóbal'),
  ('Santos Cosme y Damián'),
  ('Santa Clara de Asís'),
  ('San Juan Berchmans'),
  ('Santa María Goretti'),
  ('Santa Inés'),
  ('San Pascual Baylon'),
  ('San Antonio Abad'),
  ('San Agustín'),
  ('San Nicolás de Bari'),
  ('San Juan Nepomuceno'),
  ('San Bernardo'),
  ('San Antonio María Claret'),
  ('San Estanislao'),
  ('San Felipe Neri');

-- ─── Grupos y miembros ───────────────────────────────────────────────────────

create table public.grupos (
  id bigint generated always as identity primary key,
  nombre text not null,
  santo_id bigint not null references public.santos (id) on delete restrict,
  descripcion text,
  creado_en timestamptz not null default now()
);

create index on public.grupos (santo_id);

create table public.miembros (
  grupo_id bigint not null references public.grupos (id) on delete cascade,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  primary key (grupo_id, usuario_id)
);

create index on public.miembros (usuario_id);

-- ¿El usuario actual pertenece a este grupo?
create function public.es_miembro(grupo bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros where grupo_id = grupo and usuario_id = (select auth.uid())
  );
$$;

-- ─── Avisos, eventos y virtudes (grupo_id vacío = para toda la parroquia) ────

create table public.avisos (
  id bigint generated always as identity primary key,
  grupo_id bigint references public.grupos (id) on delete cascade,
  titulo text not null,
  texto text not null,
  fijado boolean not null default false,
  publicado_en timestamptz not null default now()
);

create index on public.avisos (grupo_id);

create type public.tipo_evento as enum ('actividad', 'campamento', 'excursion', 'misa', 'hora_santa', 'charla');

create table public.eventos (
  id bigint generated always as identity primary key,
  grupo_id bigint references public.grupos (id) on delete cascade,
  tipo public.tipo_evento not null,
  titulo text not null,
  descripcion text,
  lugar text,
  inicio timestamptz not null,
  fin timestamptz,
  todo_el_dia boolean not null default false,
  check (fin is null or fin >= inicio)
);

create index on public.eventos (grupo_id);
create index on public.eventos (inicio);

create table public.virtudes (
  id bigint generated always as identity primary key,
  semana date not null check (extract(isodow from semana) = 1), -- siempre un lunes
  grupo_id bigint references public.grupos (id) on delete cascade,
  virtud text not null,
  explicacion text,
  ejemplos text[] not null default '{}',
  unique nulls not distinct (semana, grupo_id)
);

create index on public.virtudes (grupo_id);

-- ─── Permisos ────────────────────────────────────────────────────────────────

alter table public.santos enable row level security;
alter table public.grupos enable row level security;
alter table public.miembros enable row level security;
alter table public.avisos enable row level security;
alter table public.eventos enable row level security;
alter table public.virtudes enable row level security;

revoke all on public.santos, public.grupos, public.miembros, public.avisos, public.eventos, public.virtudes
  from anon, authenticated;
grant select, insert, update, delete
  on public.santos, public.grupos, public.miembros, public.avisos, public.eventos, public.virtudes
  to authenticated;
grant all
  on public.perfiles, public.santos, public.grupos, public.miembros, public.avisos, public.eventos, public.virtudes
  to service_role;

-- Lectura
create policy "Todos ven los santos" on public.santos
  for select to authenticated using (true);

create policy "Cada quien ve sus grupos" on public.grupos
  for select to authenticated using (public.es_admin() or public.es_miembro(id));

create policy "Cada quien ve sus membresías" on public.miembros
  for select to authenticated using (public.es_admin() or usuario_id = (select auth.uid()));

create policy "Avisos de la parroquia y de mis grupos" on public.avisos
  for select to authenticated
  using (public.es_admin() or grupo_id is null or public.es_miembro(grupo_id));

create policy "Eventos de la parroquia y de mis grupos" on public.eventos
  for select to authenticated
  using (public.es_admin() or grupo_id is null or public.es_miembro(grupo_id));

create policy "Virtudes de la parroquia y de mis grupos" on public.virtudes
  for select to authenticated
  using (public.es_admin() or grupo_id is null or public.es_miembro(grupo_id));

-- Escritura: sólo el administrador
create policy "El admin crea santos" on public.santos for insert to authenticated with check (public.es_admin());
create policy "El admin edita santos" on public.santos for update to authenticated using (public.es_admin());
create policy "El admin borra santos" on public.santos for delete to authenticated using (public.es_admin());

create policy "El admin crea grupos" on public.grupos for insert to authenticated with check (public.es_admin());
create policy "El admin edita grupos" on public.grupos for update to authenticated using (public.es_admin());
create policy "El admin borra grupos" on public.grupos for delete to authenticated using (public.es_admin());

create policy "El admin agrega miembros" on public.miembros for insert to authenticated with check (public.es_admin());
create policy "El admin quita miembros" on public.miembros for delete to authenticated using (public.es_admin());

create policy "El admin crea avisos" on public.avisos for insert to authenticated with check (public.es_admin());
create policy "El admin edita avisos" on public.avisos for update to authenticated using (public.es_admin());
create policy "El admin borra avisos" on public.avisos for delete to authenticated using (public.es_admin());

create policy "El admin crea eventos" on public.eventos for insert to authenticated with check (public.es_admin());
create policy "El admin edita eventos" on public.eventos for update to authenticated using (public.es_admin());
create policy "El admin borra eventos" on public.eventos for delete to authenticated using (public.es_admin());

create policy "El admin crea virtudes" on public.virtudes for insert to authenticated with check (public.es_admin());
create policy "El admin edita virtudes" on public.virtudes for update to authenticated using (public.es_admin());
create policy "El admin borra virtudes" on public.virtudes for delete to authenticated using (public.es_admin());
