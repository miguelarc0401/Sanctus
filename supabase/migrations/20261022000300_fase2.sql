-- Fase 2: preguntas privadas, encuestas de temas y temario de charlas.

-- ─── Preguntas al coordinador (sólo las ven quien pregunta y el administrador) ─

create table public.preguntas (
  id bigint generated always as identity primary key,
  autor_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  grupo_id bigint references public.grupos (id) on delete set null,
  texto text not null check (length(btrim(texto)) > 0),
  creada_en timestamptz not null default now(),
  respuesta text,
  respondida_en timestamptz,
  respuesta_vista boolean not null default false
);

create index on public.preguntas (autor_id);
create index on public.preguntas (grupo_id);

-- ─── Encuestas: propuestas → votación → cerrada ──────────────────────────────

create type public.fase_encuesta as enum ('propuestas', 'votacion', 'cerrada');

create table public.encuestas (
  id bigint generated always as identity primary key,
  grupo_id bigint not null references public.grupos (id) on delete cascade,
  titulo text not null,
  fase public.fase_encuesta not null default 'propuestas',
  tema_ganador_id bigint,
  creada_en timestamptz not null default now()
);

create index on public.encuestas (grupo_id);

-- Los miembros no pueden leer autor_id (las propuestas son anónimas para ellos).
create table public.temas (
  id bigint generated always as identity primary key,
  encuesta_id bigint not null references public.encuestas (id) on delete cascade,
  autor_id uuid default auth.uid() references public.perfiles (id) on delete set null,
  titulo text not null check (length(btrim(titulo)) > 0),
  descripcion text,
  creado_en timestamptz not null default now(),
  unique (id, encuesta_id)
);

create index on public.temas (encuesta_id);
create index on public.temas (autor_id);

alter table public.encuestas
  add constraint encuestas_tema_ganador_fkey
  foreign key (tema_ganador_id) references public.temas (id) on delete set null;

create index on public.encuestas (tema_ganador_id);

-- Un voto por persona en cada encuesta, y el tema tiene que ser de esa encuesta.
create table public.votos (
  encuesta_id bigint not null references public.encuestas (id) on delete cascade,
  usuario_id uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  tema_id bigint not null,
  votado_en timestamptz not null default now(),
  primary key (encuesta_id, usuario_id),
  foreign key (tema_id, encuesta_id) references public.temas (id, encuesta_id) on delete cascade
);

create index on public.votos (tema_id, encuesta_id);
create index on public.votos (usuario_id);

-- ─── Temario: el plan de charlas de cada grupo ───────────────────────────────

create table public.charlas (
  id bigint generated always as identity primary key,
  grupo_id bigint not null references public.grupos (id) on delete cascade,
  orden integer not null default 0,
  fecha date,
  titulo text not null,
  objetivo text,
  tema_votado_id bigint references public.temas (id) on delete set null,
  creada_en timestamptz not null default now()
);

create index on public.charlas (grupo_id);
create index on public.charlas (tema_votado_id);

-- ─── Funciones auxiliares ────────────────────────────────────────────────────

create function public.puede_ver_encuesta(encuesta bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.encuestas e
    where e.id = encuesta and (public.es_admin() or public.es_miembro(e.grupo_id))
  );
$$;

create function public.encuesta_en_fase(encuesta bigint, buscada public.fase_encuesta)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.encuestas e
    where e.id = encuesta and e.fase = buscada and (public.es_admin() or public.es_miembro(e.grupo_id))
  );
$$;

-- Cuántos temas ha propuesto el usuario actual en una encuesta (máximo 3).
create function public.mis_propuestas(encuesta bigint)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.temas where encuesta_id = encuesta and autor_id = (select auth.uid());
$$;

-- Votos por tema: el administrador los ve siempre; los miembros, al cerrar la encuesta.
create function public.resultados_encuesta(encuesta bigint)
returns table (tema_id bigint, votos integer)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, count(v.usuario_id)::integer
  from public.temas t
  join public.encuestas e on e.id = t.encuesta_id
  left join public.votos v on v.tema_id = t.id
  where t.encuesta_id = encuesta
    and (public.es_admin() or (e.fase = 'cerrada' and public.es_miembro(e.grupo_id)))
  group by t.id;
$$;

-- Quién propuso cada tema (sólo el administrador).
create function public.autores_de_temas(encuesta bigint)
returns table (tema_id bigint, autor text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, p.nombre
  from public.temas t
  left join public.perfiles p on p.id = t.autor_id
  where t.encuesta_id = encuesta and public.es_admin();
$$;

-- Cierra la votación y marca como ganador el tema con más votos (en empate, el más antiguo).
create function public.cerrar_encuesta(encuesta bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Sólo el administrador puede cerrar encuestas.' using errcode = '42501';
  end if;
  update public.encuestas
  set fase = 'cerrada',
      tema_ganador_id = (
        select t.id
        from public.temas t
        left join public.votos v on v.tema_id = t.id
        where t.encuesta_id = encuesta
        group by t.id
        order by count(v.usuario_id) desc, t.creado_en
        limit 1
      )
  where id = encuesta;
end;
$$;

-- El miembro marca como leídas las respuestas a sus preguntas.
create function public.marcar_respuestas_vistas()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.preguntas
  set respuesta_vista = true
  where autor_id = (select auth.uid()) and respuesta is not null and not respuesta_vista;
$$;

revoke execute on function public.puede_ver_encuesta(bigint) from public, anon;
revoke execute on function public.encuesta_en_fase(bigint, public.fase_encuesta) from public, anon;
revoke execute on function public.mis_propuestas(bigint) from public, anon;
revoke execute on function public.resultados_encuesta(bigint) from public, anon;
revoke execute on function public.autores_de_temas(bigint) from public, anon;
revoke execute on function public.cerrar_encuesta(bigint) from public, anon;
revoke execute on function public.marcar_respuestas_vistas() from public, anon;
grant execute on function public.puede_ver_encuesta(bigint) to authenticated;
grant execute on function public.encuesta_en_fase(bigint, public.fase_encuesta) to authenticated;
grant execute on function public.mis_propuestas(bigint) to authenticated;
grant execute on function public.resultados_encuesta(bigint) to authenticated;
grant execute on function public.autores_de_temas(bigint) to authenticated;
grant execute on function public.cerrar_encuesta(bigint) to authenticated;
grant execute on function public.marcar_respuestas_vistas() to authenticated;

-- ─── Permisos ────────────────────────────────────────────────────────────────

alter table public.preguntas enable row level security;
alter table public.encuestas enable row level security;
alter table public.temas enable row level security;
alter table public.votos enable row level security;
alter table public.charlas enable row level security;

revoke all on public.preguntas, public.encuestas, public.temas, public.votos, public.charlas from anon, authenticated;
grant all on public.preguntas, public.encuestas, public.temas, public.votos, public.charlas to service_role;

-- Preguntas
grant select, delete on public.preguntas to authenticated;
grant insert (grupo_id, texto) on public.preguntas to authenticated;
grant update (respuesta, respondida_en, respuesta_vista) on public.preguntas to authenticated;

create policy "Cada quien ve sus preguntas; el admin, todas" on public.preguntas
  for select to authenticated using (autor_id = (select auth.uid()) or public.es_admin());
create policy "Cada quien pregunta a su nombre" on public.preguntas
  for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and public.es_aprobado()
    and (grupo_id is null or public.es_miembro(grupo_id) or public.es_admin())
  );
create policy "El admin responde" on public.preguntas for update to authenticated using (public.es_admin());
create policy "El admin borra preguntas" on public.preguntas for delete to authenticated using (public.es_admin());

-- Encuestas
grant select, insert, update, delete on public.encuestas to authenticated;

create policy "Encuestas de mis grupos" on public.encuestas
  for select to authenticated using (public.es_admin() or public.es_miembro(grupo_id));
create policy "El admin crea encuestas" on public.encuestas for insert to authenticated with check (public.es_admin());
create policy "El admin edita encuestas" on public.encuestas for update to authenticated using (public.es_admin());
create policy "El admin borra encuestas" on public.encuestas for delete to authenticated using (public.es_admin());

-- Temas propuestos
grant select (id, encuesta_id, titulo, descripcion, creado_en) on public.temas to authenticated;
grant insert (encuesta_id, titulo, descripcion) on public.temas to authenticated;
grant update (titulo, descripcion) on public.temas to authenticated;
grant delete on public.temas to authenticated;

create policy "Temas de las encuestas que veo" on public.temas
  for select to authenticated using (public.puede_ver_encuesta(encuesta_id));
create policy "Proponer hasta 3 temas mientras haya propuestas" on public.temas
  for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and (
      public.es_admin()
      or (public.encuesta_en_fase(encuesta_id, 'propuestas') and public.mis_propuestas(encuesta_id) < 3)
    )
  );
create policy "El admin edita temas" on public.temas for update to authenticated using (public.es_admin());
create policy "El admin borra temas" on public.temas for delete to authenticated using (public.es_admin());

-- Votos
grant select on public.votos to authenticated;
grant insert (encuesta_id, tema_id) on public.votos to authenticated;

create policy "Cada quien ve su voto" on public.votos
  for select to authenticated using (usuario_id = (select auth.uid()) or public.es_admin());
create policy "Votar una vez mientras la votación está abierta" on public.votos
  for insert to authenticated
  with check (usuario_id = (select auth.uid()) and public.encuesta_en_fase(encuesta_id, 'votacion'));

-- Temario
grant select, insert, update, delete on public.charlas to authenticated;

create policy "Temario de mis grupos" on public.charlas
  for select to authenticated using (public.es_admin() or public.es_miembro(grupo_id));
create policy "El admin crea charlas" on public.charlas for insert to authenticated with check (public.es_admin());
create policy "El admin edita charlas" on public.charlas for update to authenticated using (public.es_admin());
create policy "El admin borra charlas" on public.charlas for delete to authenticated using (public.es_admin());
