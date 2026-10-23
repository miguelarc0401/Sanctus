-- Fase 3: biblioteca. Los libros viven en un bucket privado; sólo los leen los grupos con los
-- que se compartieron. Las anotaciones son privadas: ni el administrador las ve.

create table public.libros (
  id bigint generated always as identity primary key,
  titulo text not null,
  autor text,
  descripcion text,
  archivo text not null unique,
  portada text,
  num_paginas integer not null default 0,
  creado_en timestamptz not null default now()
);

create table public.libros_grupos (
  libro_id bigint not null references public.libros (id) on delete cascade,
  grupo_id bigint not null references public.grupos (id) on delete cascade,
  primary key (libro_id, grupo_id)
);

create index on public.libros_grupos (grupo_id);

create type public.tipo_anotacion as enum ('subrayado', 'frase', 'nota', 'marcador');

-- posicion: rectángulos del fragmento en proporción de la página (0 a 1), para dibujarlos a cualquier tamaño.
create table public.anotaciones (
  id bigint generated always as identity primary key,
  usuario_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  libro_id bigint not null references public.libros (id) on delete cascade,
  pagina integer not null check (pagina > 0),
  tipo public.tipo_anotacion not null,
  texto text,
  posicion jsonb,
  nota text,
  creada_en timestamptz not null default now()
);

create index on public.anotaciones (usuario_id, libro_id);
create index on public.anotaciones (libro_id);

create table public.progreso (
  usuario_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  libro_id bigint not null references public.libros (id) on delete cascade,
  pagina integer not null default 1,
  actualizado_en timestamptz not null default now(),
  primary key (usuario_id, libro_id)
);

create index on public.progreso (libro_id);

-- ─── Funciones auxiliares ────────────────────────────────────────────────────

create function public.puede_leer_libro(libro bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.es_admin() or (
    public.es_aprobado() and exists (
      select 1 from public.libros_grupos lg where lg.libro_id = libro and public.es_miembro(lg.grupo_id)
    )
  );
$$;

create function public.puede_leer_archivo(ruta text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.libros l where l.archivo = ruta and public.puede_leer_libro(l.id));
$$;

-- Guarda en qué página se quedó la persona.
create function public.guardar_progreso(libro bigint, pagina integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.puede_leer_libro(libro) then
    raise exception 'No puedes leer este libro.' using errcode = '42501';
  end if;
  insert into public.progreso (usuario_id, libro_id, pagina, actualizado_en)
  values ((select auth.uid()), libro, greatest(pagina, 1), now())
  on conflict (usuario_id, libro_id) do update set pagina = excluded.pagina, actualizado_en = excluded.actualizado_en;
end;
$$;

revoke execute on function public.puede_leer_libro(bigint) from public, anon;
revoke execute on function public.puede_leer_archivo(text) from public, anon;
revoke execute on function public.guardar_progreso(bigint, integer) from public, anon;
grant execute on function public.puede_leer_libro(bigint) to authenticated;
grant execute on function public.puede_leer_archivo(text) to authenticated;
grant execute on function public.guardar_progreso(bigint, integer) to authenticated;

-- ─── Permisos de tablas ──────────────────────────────────────────────────────

alter table public.libros enable row level security;
alter table public.libros_grupos enable row level security;
alter table public.anotaciones enable row level security;
alter table public.progreso enable row level security;

revoke all on public.libros, public.libros_grupos, public.anotaciones, public.progreso from anon, authenticated;
grant all on public.libros, public.libros_grupos, public.anotaciones, public.progreso to service_role;

grant select, insert, update, delete on public.libros, public.libros_grupos to authenticated;
grant select, delete on public.anotaciones to authenticated;
grant insert (libro_id, pagina, tipo, texto, posicion, nota) on public.anotaciones to authenticated;
grant update (nota) on public.anotaciones to authenticated;
grant select on public.progreso to authenticated;

create policy "Libros compartidos con mis grupos" on public.libros
  for select to authenticated using (public.puede_leer_libro(id));
create policy "El admin crea libros" on public.libros for insert to authenticated with check (public.es_admin());
create policy "El admin edita libros" on public.libros for update to authenticated using (public.es_admin());
create policy "El admin borra libros" on public.libros for delete to authenticated using (public.es_admin());

create policy "Con qué grupos se compartió" on public.libros_grupos
  for select to authenticated using (public.es_admin() or public.es_miembro(grupo_id));
create policy "El admin comparte libros" on public.libros_grupos for insert to authenticated with check (public.es_admin());
create policy "El admin deja de compartir libros" on public.libros_grupos for delete to authenticated using (public.es_admin());

create policy "Mis anotaciones" on public.anotaciones
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "Anotar libros que puedo leer" on public.anotaciones
  for insert to authenticated
  with check (usuario_id = (select auth.uid()) and public.puede_leer_libro(libro_id));
create policy "Editar mis anotaciones" on public.anotaciones
  for update to authenticated using (usuario_id = (select auth.uid()));
create policy "Borrar mis anotaciones" on public.anotaciones
  for delete to authenticated using (usuario_id = (select auth.uid()));

create policy "Mi progreso" on public.progreso
  for select to authenticated using (usuario_id = (select auth.uid()));

-- ─── Almacenamiento ──────────────────────────────────────────────────────────

-- libros: privado, sólo PDF, hasta 50 MB. portadas: públicas (no son sensibles), hasta 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('libros', 'libros', false, 52428800, array['application/pdf']),
  ('portadas', 'portadas', true, 5242880, array['image/webp', 'image/png', 'image/jpeg']);

create policy "Leer libros compartidos conmigo" on storage.objects
  for select to authenticated
  using (
    (bucket_id = 'libros' and public.puede_leer_archivo(name))
    or (bucket_id in ('libros', 'portadas') and public.es_admin())
  );
create policy "El admin sube libros y portadas" on storage.objects
  for insert to authenticated with check (bucket_id in ('libros', 'portadas') and public.es_admin());
create policy "El admin reemplaza libros y portadas" on storage.objects
  for update to authenticated using (bucket_id in ('libros', 'portadas') and public.es_admin());
create policy "El admin borra libros y portadas" on storage.objects
  for delete to authenticated using (bucket_id in ('libros', 'portadas') and public.es_admin());
