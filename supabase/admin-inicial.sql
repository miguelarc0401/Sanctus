-- Ejecutar UNA sola vez, después de crear tu cuenta en Authentication → Users.
-- Cambia el correo y el nombre por los tuyos.
insert into public.perfiles (id, nombre, es_admin)
select id, 'Tu nombre', true from auth.users where email = 'tu-correo@ejemplo.com'
on conflict (id) do update set es_admin = true, nombre = excluded.nombre;
