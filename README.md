# Santa María

App web instalable (PWA) para los grupos de la parroquia: avisos, calendario, biblioteca de reflexión, votación de temas, temario de charlas, preguntas al coordinador y la virtud de la semana. El plan completo está en [PLAN.md](PLAN.md).

App publicada: https://sanctus.miguelarc-0401.workers.dev

## Tecnología

- React + TypeScript + Vite, Tailwind CSS y `vite-plugin-pwa`.
- Supabase para inicio de sesión, base de datos y archivos.
- Cloudflare Workers (archivos estáticos) para publicar la app.

## Desarrollo

1. Copia `.env.example` como `.env.local` y pon la URL y la clave *publishable* de Supabase.
2. Ejecuta las migraciones de `supabase/migrations/` en el SQL Editor de Supabase.
3. Instala y arranca:

```bash
npm install
npm run dev
```

Otros comandos: `npm run build` (compila), `npm run lint` (revisa el código) y `npm run iconos` (regenera los íconos a partir de `public/logo.svg`).

## Publicación en Cloudflare

El Worker `sanctus` está conectado a este repositorio: cada cambio en `main` se publica solo.

- Comando de compilación: `npm run build`
- Comando de publicación: `npx wrangler deploy` (usa `wrangler.jsonc`)
- No hace falta configurar variables: la URL y la clave *publishable* de Supabase están en `.env.production`.
