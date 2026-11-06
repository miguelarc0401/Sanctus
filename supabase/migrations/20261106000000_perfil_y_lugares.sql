-- Perfil: teléfono y gustos de cada quien. Sólo los ven la persona y los coordinadores
-- (la regla de lectura de perfiles ya es «cada quien el suyo; el admin, todos»).

-- Una lista de gustos: hasta 15, cada uno de 1 a 40 letras.
create function public.etiquetas_validas(lista text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(lista) <= 15
    and coalesce((select bool_and(length(btrim(x)) between 1 and 40) from unnest(lista) x), true);
$$;

alter table public.perfiles
  add column telefono text check (telefono is null or length(btrim(telefono)) between 1 and 30),
  add column deportes text[] not null default '{}' check (public.etiquetas_validas(deportes)),
  add column musica text[] not null default '{}' check (public.etiquetas_validas(musica)),
  add column actividades text[] not null default '{}' check (public.etiquetas_validas(actividades));

grant update (telefono, deportes, musica, actividades) on public.perfiles to authenticated;

-- Lugares con enlace de Google Maps, para abrirlos con un toque.

-- Las charlas del temario: además de la fecha, la hora y el lugar.
alter table public.charlas
  add column hora time,
  add column lugar text,
  add column mapa text check (mapa is null or (mapa ~* '^https?://' and length(mapa) <= 500));

-- Los eventos ya tenían lugar; ahora también el enlace del mapa aparte.
alter table public.eventos
  add column mapa text check (mapa is null or (mapa ~* '^https?://' and length(mapa) <= 500));
