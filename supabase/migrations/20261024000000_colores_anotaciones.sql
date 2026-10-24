-- Lector renovado: los subrayados tienen color y se pueden convertir en «frase» (y al revés).
-- Sin color se dibujan en amarillo, como antes.

alter table public.anotaciones
  add column color text check (color in ('amarillo', 'verde', 'rosa', 'azul'));

grant insert (color) on public.anotaciones to authenticated;
grant update (color, tipo) on public.anotaciones to authenticated;
