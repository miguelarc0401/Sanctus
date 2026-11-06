# Santa María — Plan técnico

## 1. Qué es

Una app web instalable (PWA) para los grupos de la parroquia: jóvenes, adultos, niños, etc. Cada grupo lleva el nombre de un santo. Los administradores gestionan todo; los miembros consultan y participan.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Notas en los libros | Privadas: sólo las ve quien las escribe (ni siquiera el administrador). |
| Votación de temas | Por encuesta. Cada encuesta nueva empieza de cero: un voto por persona en cada encuesta. |
| Perfil | Cada quien llena en «Mi perfil» su teléfono y sus gustos (deportes, música, actividades), eligiendo ideas o agregando las suyas. Sólo lo ven la persona y los coordinadores; en la ficha del miembro aparecen con botones para llamar o escribir por WhatsApp, y en Miembros se puede buscar por gusto. |
| Lugares | Los eventos y las charlas del temario tienen fecha, hora y lugar, con un enlace de Google Maps opcional que se abre con un toque («Ver en el mapa»). |
| Mensajes | Chat privado entre cada persona y el coordinador que elija: sólo lo ven esas dos personas (ni los demás coordinadores). Un miembro sólo puede escribirle a un coordinador; un coordinador, a cualquier cuenta activa. Reemplazó a «Pregúntale al coordinador». |
| Deshacer | Todo lo que un coordinador borra o cambia en el panel se guarda 30 días. Justo después de borrar aparece «Deshacer»; después, en el panel, «Deshacer cambios» lo recupera con todo lo que se fue con ello (los temas y votos de una encuesta, las notas de un libro…). Como Ctrl+Z: si algo se volvió a cambiar, primero se deshace lo más reciente. Las cuentas de los miembros no entran: para quitar el acceso sin perder nada, se desactiva la cuenta. |
| Alta de miembros | Cada quien se registra desde la app y el administrador aprueba la solicitud (y asigna grupos). Mientras tanto, la cuenta no ve nada. El administrador también puede crear cuentas, cambiar usuario, desactivarlas o eliminarlas. |
| Administradores | Puede haber varios y todos pueden hacer lo mismo (también nombrar o quitar a otros). El administrador principal, quien instaló la app, no puede perder el permiso, y nadie más puede desactivar, borrar ni cambiar su cuenta. |
| Formato de los libros | Mayormente PDF; también Word o sólo imágenes. |
| Santos | Catálogo editable por el administrador (empezó con 24 santos). Al crear un grupo se elige su santo. |
| Cuentas de niños | A nombre de los niños, sin importar la edad. Entran con un usuario (no necesitan correo). |
| Sin internet | La app abre y muestra lo último que se descargó (se guarda en el teléfono tres semanas). Los libros ya abiertos (los últimos 10) se pueden leer y anotar: las anotaciones y la página en que se va se guardan en el teléfono y se suben solas al volver la conexión. Todo se borra al cerrar sesión (si hay notas sin subir, se pregunta antes). Lo demás (preguntas, votos, panel) necesita conexión. |

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
perfiles        id, nombre, foto, es_admin, debe_cambiar_contrasena, telefono, deportes[], musica[], actividades[]
grupos          id, nombre, santo, descripcion, imagen
miembros        grupo_id, usuario_id
avisos          id, grupo_id (vacío = todos), titulo, texto, fijado, publicado_en
eventos         id, grupo_id (vacío = todos), tipo, titulo, descripcion, lugar, mapa, inicio, fin
                  tipo: actividad | campamento | excursion | misa | hora_santa | charla
virtudes        id, semana (lunes), grupo_id (vacío = todos), virtud, explicacion, ejemplos[]
libros          id, titulo, autor, descripcion, portada, archivo, num_paginas
libros_grupos   libro_id, grupo_id
anotaciones     id, usuario_id, libro_id, pagina, tipo, texto, posicion, nota, color
                  tipo: subrayado | nota | frase | marcador
                  color: amarillo | verde | rosa | azul (sólo subrayados)
progreso        usuario_id, libro_id, ultima_pagina
encuestas       id, grupo_id, titulo, fase, tema_ganador_id
                  fase: propuestas | votacion | cerrada
temas           id, encuesta_id, autor_id, titulo, descripcion
votos           encuesta_id, usuario_id, tema_id      ← único por (encuesta, usuario)
charlas         id, grupo_id, orden, fecha, hora, lugar, mapa, titulo, objetivo, tema_votado_id
mensajes        id, de, para, texto, creado_en, leido_en      ← de y para: al menos uno es coordinador
historial       id, lote, tabla, accion, directo, datos, cambios, nuevos, hecho_por, hecho_en, deshecho_por, deshecho_en
                  accion: borrado | edicion · lote: todo lo de una misma operación (se deshace junto)
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
| Mensajes | Ve sus conversaciones; le escribe a un coordinador | Ve sólo sus propias conversaciones; le escribe a cualquier cuenta activa |
| Historial para deshacer | — | Ve una descripción de lo borrado o cambiado (nunca las notas privadas) y lo deshace |

Para ocultar el autor de los temas a los miembros se usa una vista sin esa columna.

## 7. Biblioteca

**Subida (administrador):**
- **PDF:** se sube tal cual.
- **Imágenes:** la app las une en un PDF dentro del navegador (`pdf-lib`), en el orden elegido.
- **Word:** en la primera versión se guarda como PDF desde Word (Archivo → Guardar como → PDF). La conversión automática queda para la fase 4.

**Lectura:**
- Visor propio con PDF.js, página por página, sin botón de descargar ni de imprimir y sin menú contextual.
- El archivo se pide con un enlace firmado que caduca en minutos. Mientras se descarga se ve la portada con el porcentaje; los últimos 10 libros abiertos se guardan en el teléfono (para leerlos sin internet) y se borran al cerrar sesión.
- Sin marca de agua (se quitó a pedido del administrador).
- Recuerda la última página leída; la biblioteca muestra «Seguir leyendo» con el último libro.
- Se pasa de página con botones, flechas del teclado, deslizando el dedo o con el deslizador de abajo (que muestra el capítulo). Las páginas vecinas se dibujan por adelantado.
- Fondos Claro, Sepia y Noche; tamaño de la página; en pantallas anchas, dos páginas como libro abierto; tocar la página esconde las barras. Las preferencias se guardan en cada teléfono.
- «Cuaderno»: índice del PDF (si lo trae), páginas marcadas, ir a una página, todas mis notas del libro con filtros y búsqueda en el texto del libro (sin importar acentos), que queda resaltada en la página.

**Anotaciones (privadas):**
- Subrayar texto en cuatro colores con un toque, poner una nota a un fragmento o a una página, y guardar frases («rescatar») en «Mis frases».
- Tocar un subrayado abre su tarjeta: cambiar color, volverlo frase, escribir la nota (se guarda también al cerrar) o borrarlo con opción de deshacer.
- En la página se ven las notas al margen, los papelitos de las notas de página y una cinta dorada en las páginas marcadas.
- Las páginas escaneadas son imágenes, sin texto seleccionable: en ellas sólo se permiten notas por página y marcadores.

**Límite:** todo esto dificulta la descarga, pero no la impide; una captura de pantalla siempre es posible.

## 8. Pantallas

**Miembro** (barra inferior: Inicio · Calendario · Biblioteca · Temas · Más)
- **Inicio:** virtud de la semana con ejemplos, próximos eventos y últimos avisos.
- **Calendario:** vista de mes y lista, con filtro por tipo de evento.
- **Biblioteca:** libros del grupo, lector, «Mis notas» y «Mis frases».
- **Temas:** encuesta actual (proponer o votar) y resultados anteriores.
- **Más:** mi perfil (teléfono y gustos), mensajes (chat con los coordinadores), avisos, temario de charlas. En la computadora, «Mensajes» también está en el menú lateral.
- **Conversación:** burbujas por día, «visto» con doble palomita, enlaces que se pueden tocar; en el teléfono el campo para escribir reemplaza al menú de abajo. Los mensajes llegan al momento (Supabase Realtime) y con notificación al teléfono.

**Administrador** (panel aparte)
- Grupos, miembros (alta y asignación a grupos, y «Enviarle un mensaje»), avisos, eventos, virtudes, libros, encuestas, temario, mensajes y «Deshacer cambios».

## 9. Fases

| Fase | Contenido |
|---|---|
| 0. Base ✅ | Cuentas, proyecto, inicio de sesión, app instalable, identidad visual «Santa María». |
| 1. Lo esencial ✅ | Grupos, alta de miembros, inicio con la virtud de la semana, avisos, calendario. |
| 2. Participación ✅ | Preguntas privadas, encuestas de temas, temario de charlas. |
| 3. Biblioteca ✅ | Subida de libros, lector protegido, anotaciones privadas. |
| 4. Extras ✅ | Notificaciones push, añadir eventos al calendario del teléfono y búsqueda en mis notas. La conversión automática de Word se descartó: necesita un servicio externo de pago y guardar como PDF desde Word basta. |
| 5. Lector renovado ✅ | Subrayado en colores, tarjeta para editar, notas al margen, cinta de marcador, fondos Claro/Sepia/Noche, libro abierto en pantallas anchas, gestos, cuaderno con índice, notas y búsqueda en el libro, y biblioteca con «Seguir leyendo». |
| 6. Interfaz renovada ✅ | Encabezados con el «manto» azul estrellado, menú lateral en computadora, saludo según la hora, ejemplos de la virtud para ir marcando, vista de mes en el calendario, temario como línea de tiempo, preguntas como conversación, panel agrupado (Comunidad · Comunicar · Formación), tamaño de letra ajustable, mejor contraste, botones más grandes y uso con teclado. |
| 7. Mensajes y deshacer ✅ | Chat privado con el coordinador que cada quien elija (reemplaza las preguntas), con notificaciones y mensajes en vivo. Historial de 30 días para recuperar lo borrado y deshacer cambios del panel, con aviso «Deshacer» justo después de borrar. Los archivos de un libro borrado se guardan esos 30 días y luego se quitan solos. |
| 8. Perfil y lugares ✅ | «Mi perfil» con teléfono y gustos (con recordatorio en Inicio para quien no lo ha llenado), ficha del miembro con llamar y WhatsApp, búsqueda por gusto, y hora, lugar y enlace de Google Maps en las charlas y los eventos. |

Las notificaciones push en iPhone sólo funcionan si la app está instalada en la pantalla de inicio (iOS 16.4 o posterior).

Notificaciones (ajuste del 2026-11-06): los coordinadores reciben una al llegar una solicitud nueva (desde la función `registro`); todas salen con prioridad alta para que Android no las retrase con el ahorro de batería; y al abrir la app el teléfono vuelve a guardar su dirección en el servidor (si el navegador la cambió, antes dejaban de llegar sin aviso). El envío está en `supabase/functions/_shared/push.ts` y deja en los registros de Supabase cuántas salieron.

¿APK? En Android, «Instalar» desde Chrome ya crea una app de verdad (WebAPK) con sus propias notificaciones. Un APK como el de Liturgicum (Capacitor) correría en el WebView, que no tiene notificaciones web: habría que montar Firebase y un segundo sistema de envío. Si algún día se quiere un APK para repartir por WhatsApp, la opción que conserva estas notificaciones es una TWA (la web dentro de Chrome, con `/.well-known/assetlinks.json` en el sitio).

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
