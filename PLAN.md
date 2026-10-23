# Santa María — Plan técnico

## 1. Qué es

Una app web instalable (PWA) para los grupos de la parroquia: jóvenes, adultos, niños, etc. Cada grupo lleva el nombre de un santo. Un único administrador gestiona todo; los miembros consultan y participan.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Notas en los libros | Privadas: sólo las ve quien las escribe (ni siquiera el administrador). |
| Votación de temas | Por encuesta. Cada encuesta nueva empieza de cero: un voto por persona en cada encuesta. |
| Preguntas al administrador | Con nombre. Sólo las ven quien pregunta y el administrador. |
| Alta de miembros | Cada quien se registra desde la app y el administrador aprueba la solicitud (y asigna grupos). Mientras tanto, la cuenta no ve nada. El administrador también puede crear cuentas, cambiar usuario, desactivarlas o eliminarlas. |
| Administradores | Uno solo. |
| Formato de los libros | Mayormente PDF; también Word o sólo imágenes. |
| Santos | Catálogo editable por el administrador (empezó con 24 santos). Al crear un grupo se elige su santo. |
| Cuentas de niños | A nombre de los niños, sin importar la edad. Entran con un usuario (no necesitan correo). |

## 3. Supuestos (se pueden cambiar)

- Un miembro puede pertenecer a más de un grupo (por ejemplo, un joven que ayuda en el grupo de niños). Si pertenece a varios, elige el grupo desde un selector.
- La virtud de la semana es la misma para todos los grupos, con la opción de poner otra distinta en un grupo concreto.
- Avisos y eventos pueden ser de un grupo o de toda la parroquia (los ven todos los grupos).
- Cada encuesta pasa por tres fases: **propuestas → votación → cerrada**.
  - Los miembros ven los temas propuestos sin el nombre de quien los propuso; el administrador sí lo ve.
  - El voto no se puede cambiar una vez emitido.
  - Los resultados se muestran al cerrar la encuesta.
  - El administrador puede editar o quitar temas propuestos.

## 4. Arquitectura

```
Celular / PC (app instalada desde el navegador)
   │
   ├── Cloudflare ......... sirve la app (gratis, se publica sola con cada cambio)
   │
   └── Supabase ........... inicio de sesión, base de datos, archivos de libros, funciones
```

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, PWA (`vite-plugin-pwa`).
- **Backend:** Supabase
  - **Auth:** correo + contraseña.
  - **Postgres con RLS:** las reglas de quién ve qué viven en la base de datos, no sólo en la pantalla.
  - **Storage:** bucket privado para los libros; se accede con enlaces firmados que caducan en minutos.
  - **Edge Functions:** alta de usuarios (usa la clave de servicio, que nunca va al navegador) y, más adelante, notificaciones.
- **Código** en GitHub ([miguelarc0401/Sanctus](https://github.com/miguelarc0401/Sanctus)); Cloudflare (Worker `sanctus`) publica automáticamente cada cambio en `https://sanctus.miguelarc-0401.workers.dev`.
- **Por qué no Netlify:** su plan gratis da 300 créditos al mes y cada publicación gasta 15, así que se acaba con unas 20 publicaciones. Como la app son sólo archivos estáticos y todo lo demás vive en Supabase, cambiar de servicio más adelante es sencillo.

### Alta de miembros

El administrador crea la cuenta desde el panel con correo, nombre, grupos y una contraseña temporal, y se la entrega en persona. Al entrar por primera vez, la app obliga a cambiarla. Así no dependemos del correo de Supabase, que en el plan gratis sólo envía unos pocos mensajes por hora. Para «olvidé mi contraseña» conviene configurar un servicio de correo propio (por ejemplo Resend, gratis hasta 3 000 correos al mes).

## 5. Modelo de datos

```
perfiles        id, nombre, foto, es_admin, debe_cambiar_contrasena
grupos          id, nombre, santo, descripcion, imagen
miembros        grupo_id, usuario_id
avisos          id, grupo_id (vacío = todos), titulo, texto, fijado, publicado_en
eventos         id, grupo_id (vacío = todos), tipo, titulo, descripcion, lugar, inicio, fin
                  tipo: actividad | campamento | excursion | misa | hora_santa | charla
virtudes        id, semana (lunes), grupo_id (vacío = todos), virtud, explicacion, ejemplos[]
libros          id, titulo, autor, descripcion, portada, archivo, num_paginas
libros_grupos   libro_id, grupo_id
anotaciones     id, usuario_id, libro_id, pagina, tipo, texto, posicion, nota, color
                  tipo: subrayado | nota | frase
progreso        usuario_id, libro_id, ultima_pagina
encuestas       id, grupo_id, titulo, fase, tema_ganador_id
                  fase: propuestas | votacion | cerrada
temas           id, encuesta_id, autor_id, titulo, descripcion
votos           encuesta_id, usuario_id, tema_id      ← único por (encuesta, usuario)
charlas         id, grupo_id, orden, fecha, titulo, objetivo, tema_votado_id
preguntas       id, grupo_id, autor_id, texto, creada, respuesta, respondida
```

Cada charla del temario tiene tres partes: el tema fijo, un espacio para el tema votado y un tiempo de preguntas y comentarios.

## 6. Permisos (RLS)

| Contenido | Miembro | Administrador |
|---|---|---|
| Avisos, eventos, virtud, temario | Lee los de sus grupos y los de toda la parroquia | Todo |
| Libros | Lee los compartidos con sus grupos | Todo |
| Anotaciones y progreso de lectura | Sólo los suyos | Sólo los suyos |
| Temas propuestos | Propone en fase de propuestas; ve los temas sin autor | Todo, con autor |
| Votos | Un voto en fase de votación; ve sólo el suyo | Ve los conteos |
| Preguntas | Crea y ve las suyas con su respuesta | Ve y responde todas |

Para ocultar el autor de los temas a los miembros se usa una vista sin esa columna.

## 7. Biblioteca

**Subida (administrador):**
- **PDF:** se sube tal cual.
- **Imágenes:** la app las une en un PDF dentro del navegador (`pdf-lib`), en el orden elegido.
- **Word:** en la primera versión se guarda como PDF desde Word (Archivo → Guardar como → PDF). La conversión automática queda para la fase 4.

**Lectura:**
- Visor propio con PDF.js, página por página, sin botón de descargar ni de imprimir y sin menú contextual.
- El archivo se pide con un enlace firmado que caduca en minutos.
- Marca de agua con el nombre del lector en cada página.
- Recuerda la última página leída.

**Anotaciones (privadas):**
- Subrayar texto, poner una nota a un fragmento o a una página, y guardar frases («rescatar») en «Mis frases».
- Las páginas escaneadas son imágenes, sin texto seleccionable: en ellas sólo se permiten notas por página y marcadores.

**Límite:** todo esto dificulta la descarga, pero no la impide; una captura de pantalla siempre es posible. La marca de agua es lo que más disuade.

## 8. Pantallas

**Miembro** (barra inferior: Inicio · Calendario · Biblioteca · Temas · Más)
- **Inicio:** virtud de la semana con ejemplos, próximos eventos y últimos avisos.
- **Calendario:** vista de mes y lista, con filtro por tipo de evento.
- **Biblioteca:** libros del grupo, lector, «Mis notas» y «Mis frases».
- **Temas:** encuesta actual (proponer o votar) y resultados anteriores.
- **Más:** avisos, temario de charlas, mis preguntas, perfil.

**Administrador** (panel aparte)
- Grupos, miembros (alta y asignación a grupos), avisos, eventos, virtudes, libros, encuestas, temario y bandeja de preguntas.

## 9. Fases

| Fase | Contenido |
|---|---|
| 0. Base ✅ | Cuentas, proyecto, inicio de sesión, app instalable, identidad visual «Santa María». |
| 1. Lo esencial ✅ | Grupos, alta de miembros, inicio con la virtud de la semana, avisos, calendario. |
| 2. Participación ✅ | Preguntas privadas, encuestas de temas, temario de charlas. |
| 3. Biblioteca | Subida de libros, lector protegido, anotaciones privadas. |
| 4. Extras | Notificaciones push, añadir eventos al calendario del teléfono, conversión automática de Word, búsqueda en mis notas. |

Las notificaciones push en iPhone sólo funcionan si la app está instalada en la pantalla de inicio (iOS 16.4 o posterior).

## 10. Costos

- **Cloudflare Workers:** gratis y sin créditos; las visitas a la app (archivos estáticos) no se cobran.
- **Supabase (plan gratis):** 500 MB de base de datos, 1 GB de archivos y hasta 50 000 usuarios activos al mes. Un proyecto gratis se pausa si pasa una semana sin uso; con uso semanal no debería ocurrir, y si ocurre se reactiva desde el panel. El plan Pro cuesta 25 USD al mes, por si algún día hace falta.
- **Dominio propio (opcional):** unos 10–15 USD al año. Sin él, la dirección es `sanctus.miguelarc-0401.workers.dev`.

## 11. Pendiente del administrador

- ~~Crear las cuentas de GitHub, Supabase y Cloudflare.~~ Hecho.
- En Supabase, **Authentication → URL Configuration → Site URL**: poner `https://sanctus.miguelarc-0401.workers.dev` (hace falta para los correos de «olvidé mi contraseña»).
- Logo o imagen y colores preferidos (opcional).
- Lista inicial de grupos y el santo de cada uno.
- Grupo de niños: decidir si las cuentas van a nombre de los padres (recomendado con menores).
