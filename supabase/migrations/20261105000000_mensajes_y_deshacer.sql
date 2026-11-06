-- Chat personal entre cada miembro y el coordinador que elija, e historial para deshacer cambios.

-- ─── Mensajes ────────────────────────────────────────────────────────────────
-- Cada conversación es entre dos personas y al menos una de ellas es coordinador.
-- Sólo la ven esas dos personas: los demás coordinadores no.

create table public.mensajes (
  id bigint generated always as identity primary key,
  de uuid not null default auth.uid() references public.perfiles (id) on delete cascade,
  para uuid not null references public.perfiles (id) on delete cascade,
  texto text not null check (length(btrim(texto)) between 1 and 4000),
  creado_en timestamptz not null default now(),
  leido_en timestamptz,
  check (de <> para)
);

create index on public.mensajes (de, para, creado_en);
create index on public.mensajes (para, de, creado_en);

-- ¿La persona actual le puede escribir a «usuario»? Las dos cuentas activas y al menos una coordinadora.
create function public.puede_escribirle(usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.es_aprobado()
    and usuario <> (select auth.uid())
    and exists (
      select 1 from public.perfiles p
      where p.id = usuario and p.estado = 'aprobado' and (p.es_admin or public.es_admin())
    );
$$;

-- Mis conversaciones: con quién, el último mensaje y cuántos no he leído.
create function public.mis_conversaciones()
returns table (
  persona uuid,
  nombre text,
  es_coordinador boolean,
  ultimo text,
  ultimo_mio boolean,
  ultimo_en timestamptz,
  sin_leer integer,
  puede_escribir boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with mios as (
    select m.id, m.de, m.para, m.texto, m.creado_en, m.leido_en,
      case when m.de = (select auth.uid()) then m.para else m.de end as otro
    from public.mensajes m
    where m.de = (select auth.uid()) or m.para = (select auth.uid())
  ),
  ultimos as (
    select distinct on (otro) otro, texto, de, creado_en
    from mios
    order by otro, creado_en desc, id desc
  )
  select u.otro, p.nombre, p.es_admin, u.texto, u.de = (select auth.uid()), u.creado_en,
    (select count(*)::integer from mios x where x.otro = u.otro and x.para = (select auth.uid()) and x.leido_en is null),
    public.puede_escribirle(u.otro)
  from ultimos u
  join public.perfiles p on p.id = u.otro
  order by u.creado_en desc;
$$;

-- Nombre de con quién se abre una conversación: sólo si se le puede escribir o ya hay mensajes.
create function public.contacto(usuario uuid)
returns table (persona uuid, nombre text, es_coordinador boolean, puede_escribir boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nombre, p.es_admin, public.puede_escribirle(p.id)
  from public.perfiles p
  where p.id = usuario
    and (
      public.puede_escribirle(p.id)
      or exists (
        select 1 from public.mensajes m
        where (m.de = (select auth.uid()) and m.para = p.id) or (m.para = (select auth.uid()) and m.de = p.id)
      )
    );
$$;

-- Los coordinadores a quienes un miembro puede escribir (el principal primero).
create function public.coordinadores()
returns table (persona uuid, nombre text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nombre
  from public.perfiles p
  where public.es_aprobado() and p.es_admin and p.estado = 'aprobado' and p.id <> (select auth.uid())
  order by p.es_principal desc, p.nombre;
$$;

-- Al abrir una conversación, lo que me escribió esa persona queda como leído.
create function public.marcar_leidos(persona uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.mensajes
  set leido_en = now()
  where para = (select auth.uid()) and de = persona and leido_en is null;
$$;

alter table public.mensajes enable row level security;
revoke all on public.mensajes from anon, authenticated;
grant all on public.mensajes to service_role;
grant select on public.mensajes to authenticated;
grant insert (para, texto) on public.mensajes to authenticated;

create policy "Cada quien ve sus conversaciones" on public.mensajes
  for select to authenticated using (de = (select auth.uid()) or para = (select auth.uid()));
create policy "Escribirle a un coordinador, o el coordinador a cualquiera" on public.mensajes
  for insert to authenticated
  with check (de = (select auth.uid()) and public.puede_escribirle(para));

-- Los mensajes nuevos llegan al momento (Supabase Realtime respeta las reglas de arriba).
alter publication supabase_realtime add table public.mensajes;

-- El chat reemplaza «Pregúntale al coordinador». Si hubiera preguntas, pasan al chat con el
-- coordinador principal (al crear este cambio no había ninguna).
insert into public.mensajes (de, para, texto, creado_en, leido_en)
select q.autor_id, pr.id, left(q.texto, 4000), q.creada_en, q.respondida_en
from public.preguntas q
cross join (select id from public.perfiles where es_principal) pr
where q.autor_id <> pr.id;

insert into public.mensajes (de, para, texto, creado_en, leido_en)
select pr.id, q.autor_id, left(q.respuesta, 4000), q.respondida_en, case when q.respuesta_vista then q.respondida_en end
from public.preguntas q
cross join (select id from public.perfiles where es_principal) pr
where q.autor_id <> pr.id and q.respuesta is not null and btrim(q.respuesta) <> '';

drop function public.marcar_respuestas_vistas();
drop table public.preguntas;

-- ─── Historial para deshacer ─────────────────────────────────────────────────
-- Cada vez que un coordinador borra o cambia algo, se guarda cómo estaba durante 30 días.
-- Lo que se borra «en cadena» (los temas y votos de una encuesta, las notas de un libro) queda en
-- el mismo lote, para recuperarlo todo junto. Nadie lee esta tabla directamente: las notas de los
-- libros son privadas, así que la app sólo recibe una descripción (historial_reciente).

create table public.historial (
  id bigint generated always as identity primary key,
  -- Todo lo que pasó en una misma operación (una transacción) se deshace junto.
  lote bigint not null default txid_current(),
  tabla text not null,
  accion text not null check (accion in ('borrado', 'edicion')),
  -- false: se borró o cambió en cadena, al borrar otra cosa.
  directo boolean not null,
  -- La fila como estaba antes.
  datos jsonb not null,
  -- En una edición: qué columnas cambiaron y sus valores nuevos.
  cambios text[],
  nuevos jsonb,
  hecho_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  hecho_en timestamptz not null default now(),
  deshecho_por uuid references public.perfiles (id) on delete set null,
  deshecho_en timestamptz
);

create index on public.historial (lote);
create index on public.historial (hecho_en);
create index on public.historial (tabla, (datos ->> 'id'));
create index on public.historial (hecho_por);
create index on public.historial (deshecho_por);

alter table public.historial enable row level security;
revoke all on public.historial from anon, authenticated;
grant all on public.historial to service_role;

-- Anota en el historial lo que borra o cambia un coordinador.
-- Con el argumento 'en_cadena', la tabla sólo se anota cuando el cambio viene de borrar otra cosa
-- (los votos, las notas y los miembros que se van con su encuesta, su libro o su grupo).
create function public.anotar_historial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  directo boolean := pg_trigger_depth() = 1;
  columnas text[];
  valores jsonb;
begin
  if coalesce(current_setting('sanctus.deshaciendo', true), '') = 'si'
     or not public.es_admin()
     or (coalesce(tg_argv[0], '') = 'en_cadena' and directo) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.historial (tabla, accion, directo, datos)
    values (tg_table_name, 'borrado', directo, to_jsonb(old));
    return old;
  end if;

  select array_agg(n.key order by n.key), jsonb_object_agg(n.key, n.value)
  into columnas, valores
  from jsonb_each(to_jsonb(new)) n
  where n.value is distinct from (to_jsonb(old) -> n.key);

  if columnas is not null then
    insert into public.historial (tabla, accion, directo, datos, cambios, nuevos)
    values (tg_table_name, 'edicion', directo, to_jsonb(old), columnas, valores);
  end if;
  return new;
end;
$$;

-- Antes de borrar o cambiar (así lo principal queda anotado antes que lo que se va en cadena).
create trigger historial before update or delete on public.avisos for each row execute function public.anotar_historial();
create trigger historial before update or delete on public.eventos for each row execute function public.anotar_historial();
create trigger historial before update or delete on public.virtudes for each row execute function public.anotar_historial();
create trigger historial before update or delete on public.encuestas for each row execute function public.anotar_historial();
create trigger historial before update or delete on public.temas for each row execute function public.anotar_historial();
create trigger historial before update or delete on public.charlas for each row execute function public.anotar_historial();
create trigger historial before update or delete on public.grupos for each row execute function public.anotar_historial();
create trigger historial before update or delete on public.santos for each row execute function public.anotar_historial();
create trigger historial before update or delete on public.libros for each row execute function public.anotar_historial();

create trigger historial before delete on public.votos for each row execute function public.anotar_historial('en_cadena');
create trigger historial before delete on public.miembros for each row execute function public.anotar_historial('en_cadena');
create trigger historial before delete on public.libros_grupos for each row execute function public.anotar_historial('en_cadena');
create trigger historial before delete on public.anotaciones for each row execute function public.anotar_historial('en_cadena');
create trigger historial before delete on public.progreso for each row execute function public.anotar_historial('en_cadena');
-- Al borrar un grupo, a quien lo había pedido en su solicitud se le quita (y al deshacer, vuelve).
create trigger historial before update on public.perfiles for each row execute function public.anotar_historial('en_cadena');

-- La encuesta apunta a su tema ganador y el tema a su encuesta: al recuperar las dos cosas juntas,
-- esa revisión se hace al final.
alter table public.encuestas alter constraint encuestas_tema_ganador_fkey deferrable initially immediate;

-- El nombre de lo que se borró o cambió, para los mensajes.
create function public.nombre_en_historial(datos jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(datos ->> 'titulo', datos ->> 'nombre', datos ->> 'virtud', 'esto');
$$;

-- Deshace todo un lote: vuelve a poner lo borrado y deja lo cambiado como estaba.
create function public.deshacer(cambio bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.historial;
  pendientes bigint[];
  quedan bigint[] := '{}';
  avanzo boolean;
  filas integer;
  columnas text;
begin
  if not public.es_admin() then
    raise exception 'Sólo un coordinador puede deshacer cambios.' using errcode = '42501';
  end if;
  perform 1 from public.historial h where h.lote = cambio for update;
  if not exists (select 1 from public.historial h where h.lote = cambio and h.deshecho_en is null) then
    raise exception 'Esto ya se deshizo.' using errcode = 'P0001';
  end if;

  -- Como Ctrl+Z: si después se volvió a cambiar lo mismo, primero hay que deshacer eso.
  for e in select * from public.historial h where h.lote = cambio and h.accion = 'edicion' and h.directo loop
    if exists (
      select 1 from public.historial x
      where x.tabla = e.tabla and x.datos ->> 'id' = e.datos ->> 'id' and x.id > e.id and x.lote <> cambio
        and x.deshecho_en is null and (x.accion = 'borrado' or x.cambios && e.cambios)
    ) then
      raise exception 'Después de este cambio, «%» se volvió a cambiar o se borró. Deshaz primero lo más reciente.',
        public.nombre_en_historial(e.datos) using errcode = 'P0001';
    end if;
  end loop;

  -- Lo que se haga desde aquí no se anota en el historial.
  perform set_config('sanctus.deshaciendo', 'si', true);
  set constraints public.encuestas_tema_ganador_fkey deferred;

  -- Volver a poner lo borrado. Se intenta en varias vueltas porque el orden importa
  -- (un tema necesita su encuesta) y no siempre se borró de arriba hacia abajo.
  select array_agg(h.id order by h.id) into pendientes
  from public.historial h where h.lote = cambio and h.accion = 'borrado';
  while coalesce(cardinality(pendientes), 0) > 0 loop
    quedan := '{}';
    avanzo := false;
    for e in select * from public.historial h where h.id = any (pendientes) order by h.id loop
      begin
        execute format(
          'insert into public.%I overriding system value select * from jsonb_populate_record(null::public.%I, $1) on conflict do nothing',
          e.tabla, e.tabla
        ) using e.datos;
        get diagnostics filas = row_count;
        if filas = 0 and e.directo then
          raise exception 'Ya existe otro «%» igual. Cámbiale el nombre al nuevo e inténtalo de nuevo.',
            public.nombre_en_historial(e.datos) using errcode = 'P0001';
        end if;
        avanzo := true;
      exception when foreign_key_violation then
        quedan := quedan || e.id;
      end;
    end loop;
    exit when not avanzo;
    pendientes := quedan;
  end loop;

  -- Lo que iba en cadena y ya no tiene dónde ir (por ejemplo, el voto de una cuenta eliminada) se queda fuera.
  select h.* into e from public.historial h where h.id = any (quedan) and h.directo order by h.id limit 1;
  if found then
    raise exception '«%» no se puede recuperar porque ya no existe aquello a lo que pertenecía (su encuesta, su grupo o su santo). Recupera eso primero.',
      public.nombre_en_historial(e.datos) using errcode = 'P0001';
  end if;

  -- Dejar lo cambiado como estaba, del último cambio al primero.
  for e in select * from public.historial h where h.lote = cambio and h.accion = 'edicion' order by h.id desc loop
    select string_agg(format('%I', c), ', ') into columnas from unnest(e.cambios) c;
    begin
      execute format(
        'update public.%I t set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where t.id::text = $1 ->> ''id''',
        e.tabla, columnas, columnas, e.tabla
      ) using e.datos;
      get diagnostics filas = row_count;
    exception when foreign_key_violation or unique_violation then
      filas := -1;
    end;
    if filas = -1 and e.directo then
      raise exception '«%» no se puede dejar como estaba: choca con algo que se cambió después.',
        public.nombre_en_historial(e.datos) using errcode = 'P0001';
    end if;
    if filas = 0 and e.directo then
      raise exception '«%» ya no existe, así que no se puede dejar como estaba. Si se borró, recupéralo primero.',
        public.nombre_en_historial(e.datos) using errcode = 'P0001';
    end if;
  end loop;

  begin
    set constraints public.encuestas_tema_ganador_fkey immediate;
  exception when foreign_key_violation then
    raise exception 'No se pudo recuperar la encuesta porque su tema ganador ya no existe.' using errcode = 'P0001';
  end;

  update public.historial h set deshecho_en = now(), deshecho_por = (select auth.uid()) where h.lote = cambio;
end;
$$;

-- El botón «Deshacer» que aparece justo después de borrar algo.
create function public.deshacer_borrado(nombre_tabla text, fila bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cual bigint;
begin
  select h.lote into cual
  from public.historial h
  where h.tabla = nombre_tabla and h.datos ->> 'id' = fila::text and h.accion = 'borrado' and h.directo
    and h.deshecho_en is null and h.hecho_por = (select auth.uid())
  order by h.id desc
  limit 1;
  if cual is null then
    raise exception 'No encontré lo que se borró. Búscalo en «Deshacer cambios», en el panel.' using errcode = 'P0001';
  end if;
  perform public.deshacer(cual);
end;
$$;

-- Lo que se borró o cambió en los últimos 30 días, un renglón por lote, sin los datos privados.
create function public.historial_reciente()
returns table (
  lote bigint,
  hecho_en timestamptz,
  hecho_por text,
  deshecho_en timestamptz,
  deshecho_por text,
  tabla text,
  accion text,
  titulo text,
  contexto text,
  cambios text[],
  antes jsonb,
  despues jsonb,
  directos integer,
  en_cadena jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with raiz as (
    select distinct on (h.lote) h.*
    from public.historial h
    where h.directo and h.hecho_en > now() - interval '30 days' and public.es_admin()
    order by h.lote, h.id
  )
  select r.lote, r.hecho_en, a.nombre, r.deshecho_en, d.nombre,
    r.tabla, r.accion, public.nombre_en_historial(r.datos),
    case r.tabla
      when 'temas' then (select e.titulo from public.encuestas e where e.id = (r.datos ->> 'encuesta_id')::bigint)
      when 'virtudes' then r.datos ->> 'semana'
      when 'eventos' then r.datos ->> 'inicio'
      else null
    end,
    r.cambios,
    (select jsonb_object_agg(c, r.datos -> c) from unnest(r.cambios) c),
    r.nuevos,
    (select count(*)::integer from public.historial x where x.lote = r.lote and x.directo),
    (
      select jsonb_object_agg(t.tabla, t.cuantos)
      from (
        select x.tabla, count(*) as cuantos
        from public.historial x
        where x.lote = r.lote and not x.directo and x.accion = 'borrado'
        group by x.tabla
      ) t
    )
  from raiz r
  left join public.perfiles a on a.id = r.hecho_por
  left join public.perfiles d on d.id = r.deshecho_por
  order by r.hecho_en desc, r.lote desc
  limit 200;
$$;

-- Borra lo de hace más de 30 días. Devuelve los archivos de los libros borrados que ya no se pueden
-- recuperar, para que la app los quite del almacenamiento (hasta entonces se guardan por si acaso).
create function public.limpiar_historial()
returns table (carpeta text, ruta text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Sólo un coordinador puede limpiar el historial.' using errcode = '42501';
  end if;
  return query
    with viejos as (
      delete from public.historial h where h.hecho_en < now() - interval '30 days' returning h.*
    ),
    borrados as (
      select v.datos from viejos v where v.tabla = 'libros' and v.accion = 'borrado' and v.deshecho_en is null
    )
    select 'libros'::text, l.datos ->> 'archivo'
    from borrados l
    where not exists (select 1 from public.libros x where x.archivo = l.datos ->> 'archivo')
    union all
    select 'portadas'::text, l.datos ->> 'portada'
    from borrados l
    where l.datos ->> 'portada' is not null
      and not exists (select 1 from public.libros x where x.portada = l.datos ->> 'portada');
end;
$$;

revoke execute on function public.puede_escribirle(uuid) from public, anon;
revoke execute on function public.mis_conversaciones() from public, anon;
revoke execute on function public.contacto(uuid) from public, anon;
revoke execute on function public.coordinadores() from public, anon;
revoke execute on function public.marcar_leidos(uuid) from public, anon;
revoke execute on function public.anotar_historial() from public, anon, authenticated;
revoke execute on function public.nombre_en_historial(jsonb) from public, anon;
revoke execute on function public.deshacer(bigint) from public, anon;
revoke execute on function public.deshacer_borrado(text, bigint) from public, anon;
revoke execute on function public.historial_reciente() from public, anon;
revoke execute on function public.limpiar_historial() from public, anon;
grant execute on function public.puede_escribirle(uuid) to authenticated;
grant execute on function public.mis_conversaciones() to authenticated;
grant execute on function public.contacto(uuid) to authenticated;
grant execute on function public.coordinadores() to authenticated;
grant execute on function public.marcar_leidos(uuid) to authenticated;
grant execute on function public.nombre_en_historial(jsonb) to authenticated;
grant execute on function public.deshacer(bigint) to authenticated;
grant execute on function public.deshacer_borrado(text, bigint) to authenticated;
grant execute on function public.historial_reciente() to authenticated;
grant execute on function public.limpiar_historial() to authenticated;
