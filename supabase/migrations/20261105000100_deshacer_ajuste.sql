-- Ajuste de «deshacer»: al terminar, lo que siga en la misma operación vuelve a anotarse en el historial
-- (antes quedaba sin anotar hasta el final de la transacción).

-- Deshace todo un lote: vuelve a poner lo borrado y deja lo cambiado como estaba.
create or replace function public.deshacer(cambio bigint)
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
  perform set_config('sanctus.deshaciendo', '', true);
end;
$$;
