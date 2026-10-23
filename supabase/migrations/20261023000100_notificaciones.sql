-- Fase 4: notificaciones en el teléfono (Web Push).
-- La clave privada VAPID vive en la bóveda de Supabase con el nombre 'vapid_privada'
-- (se guardó aparte con vault.create_secret; nunca va en el código).

create table public.suscripciones_push (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creada_en timestamptz not null default now()
);

create index on public.suscripciones_push (usuario_id);

alter table public.suscripciones_push enable row level security;
revoke all on public.suscripciones_push from anon, authenticated;
grant all on public.suscripciones_push to service_role;
grant select on public.suscripciones_push to authenticated;

create policy "Mis suscripciones" on public.suscripciones_push
  for select to authenticated using (usuario_id = (select auth.uid()));

-- Este teléfono quiere recibir notificaciones de la cuenta actual (si antes era de otra cuenta, cambia de dueño).
create function public.guardar_suscripcion(direccion text, clave_p256dh text, clave_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = '42501';
  end if;
  insert into public.suscripciones_push (usuario_id, endpoint, p256dh, auth)
  values ((select auth.uid()), direccion, clave_p256dh, clave_auth)
  on conflict (endpoint) do update
    set usuario_id = excluded.usuario_id, p256dh = excluded.p256dh, auth = excluded.auth, creada_en = now();
end;
$$;

create function public.borrar_suscripcion(direccion text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.suscripciones_push where endpoint = direccion and usuario_id = (select auth.uid());
$$;

-- Sólo la usa la función de envío (con la clave de servicio).
create function public.clave_vapid_privada()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_privada' limit 1;
$$;

revoke execute on function public.guardar_suscripcion(text, text, text) from public, anon;
revoke execute on function public.borrar_suscripcion(text) from public, anon;
revoke execute on function public.clave_vapid_privada() from public, anon, authenticated;
grant execute on function public.guardar_suscripcion(text, text, text) to authenticated;
grant execute on function public.borrar_suscripcion(text) to authenticated;
grant execute on function public.clave_vapid_privada() to service_role;
