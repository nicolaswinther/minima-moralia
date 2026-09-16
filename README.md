[README.md](https://github.com/user-attachments/files/32270173/README.md)
# Minima Moralia

Blog personal de Nicolás Winther. Sitio estático (GitHub Pages) con un panel de
administración propio: escribes, subes imágenes y publicas directamente desde
el navegador, sin pasar por nadie más — el sitio escribe los cambios
directamente en este mismo repositorio de GitHub.

## Qué hay en esta carpeta

```
index.html          → el blog público (lo que ve cualquier visitante)
admin.html          → el panel de edición (solo para ti)
css/style.css        → todos los estilos
js/site.js            → lógica del blog público
js/admin.js           → lógica del panel de edición
js/github-api.js      → conexión con la API de GitHub (usada solo por admin.js)
data/posts.json       → tus publicaciones (empieza vacío)
data/taxonomy.json    → temas y etiquetas disponibles
data/settings.json    → título del sitio, "acerca de mí", redes sociales
images/               → imágenes que subas desde el panel (y la ilustración de fondo)
```

Todo el contenido (publicaciones, temas, etiquetas, configuración) vive en los
archivos `.json` de `data/`. El panel de administración los lee y los
reescribe por ti; nunca necesitas tocarlos a mano, pero puedes hacerlo si
quieres (son texto plano).

## Paso 1 — Crear el repositorio en GitHub

1. Entra a github.com y crea un repositorio nuevo (por ejemplo `minima-moralia`).
   Para que GitHub Pages gratuito funcione, el repositorio debe ser **público**
   (ver la nota de privacidad más abajo).
2. Sube todos los archivos de esta carpeta a ese repositorio, manteniendo la
   misma estructura de carpetas.

## Paso 2 — Activar GitHub Pages

1. En el repositorio, ve a **Settings → Pages**.
2. En "Build and deployment", elige **Deploy from a branch**.
3. Elige la rama `main` y la carpeta `/ (root)`.
4. Guarda. En uno o dos minutos tu sitio va a estar disponible en
   `https://<tu-usuario>.github.io/<nombre-del-repo>/`.

Cada vez que el panel de administración guarde un cambio, GitHub Pages
reconstruye el sitio automáticamente — normalmente demora entre 30 segundos y
2 minutos en verse reflejado.

## Paso 3 — Crear tu token de acceso personal

El panel de administración necesita un token para poder escribir en tu
repositorio en tu nombre. Créalo así:

1. En GitHub, ve a **Settings (de tu cuenta) → Developer settings → Personal
   access tokens → Fine-grained tokens → Generate new token**.
2. En "Repository access", elige **Only select repositories** y selecciona
   `minima-moralia`.
3. En "Permissions", busca **Contents** y ponlo en **Read and write**.
4. Ponle una fecha de expiración (recomendado: 90 días o 1 año — GitHub te
   avisa antes de que expire, y puedes generar uno nuevo en dos minutos).
5. Genera el token y **cópialo de inmediato** (GitHub solo lo muestra una vez).

Este token es equivalente a una llave de tu casa: dale el mismo cuidado.
Vive únicamente en el navegador donde lo pegues (en `localStorage`, nunca en
el código del sitio) y solo se usa para hablar con `api.github.com`. Si algo
te preocupa, puedes revocarlo en cualquier momento desde la misma página de
GitHub y crear uno nuevo.

## Paso 4 — Conectar el panel

1. Abre `https://<tu-usuario>.github.io/<nombre-del-repo>/admin.html`.
2. Completa usuario de GitHub, nombre del repositorio, rama (`main`) y pega
   el token.
3. Presiona **Conectar**. Si todo está bien, pasas directo al panel.

## Paso 5 — Publicar

Desde el panel puedes:

- **Publicaciones**: crear, editar y eliminar ensayos, cuentos o poemas —
  título, subtítulo, autor, fecha, tema, etiquetas, imagen (se sube al
  repositorio), referencia de la imagen, resumen, cuerpo y bibliografía. El
  cuerpo se edita con una barra de herramientas (fuente, negrita, cursiva,
  subrayado y sangría), igual que en un editor de texto normal: seleccionas
  el texto y aplicas el formato. Las publicaciones que ya existían antes de
  este cambio (escritas en Markdown) se siguen viendo igual en el sitio, y
  al abrirlas en el panel se convierten automáticamente al nuevo editor.
- **Temas y etiquetas**: agregar nuevos a medida que los necesites. Los que
  ya existen (Ensayos, Cuentos, Poemas / Estética, Crítica Cultural,
  Existencialismo, Ética, Eudaimonía, Antigüedad) son solo un punto de
  partida tomado de tu boceto — bórralos o agrega los que quieras editando
  este panel.
- **Configuración del sitio**: el título y subtítulo del sitio, tu texto de
  "acerca de mí", los links de TikTok / Substack / LinkedIn (si dejas uno
  vacío, ese ícono simplemente no aparece) y el identificador del contador
  de visitas.

## Sobre la privacidad del sitio

Pediste poder compartir el link "solo con quien tú quieras". Con GitHub Pages
gratuito, eso funciona igual que un video "no listado": cualquiera con el
link exacto puede verlo, pero no aparece indexado ni es fácil de encontrar
por alguien que no lo tiene. El repositorio de código sí queda público (para
que Pages funcione sin costo), aunque nada en `data/` es información sensible
por sí sola.

Si en algún momento quieres que el sitio sea realmente privado (que solo
pueda verlo gente de tu organización de GitHub), esa función existe pero
requiere GitHub Pro, Team o Enterprise. Si llegas a ese punto, avísame y
ajustamos la configuración.

## Sobre "me gusta" y "compartir"

Cada publicación tiene un corazón y un botón de compartir, al estilo Substack.
El corazón es un contador real (mismo servicio que el de visitas): cada clic
suma o resta de verdad, y el navegador de cada visitante recuerda si ya lo
presionó. A propósito no hay contadores de comentarios ni de "reposts":
como el sitio no tiene un sistema de comentarios detrás, inventar esos
números mostraría una popularidad falsa. Si más adelante quieres comentarios
de verdad, herramientas como [giscus](https://giscus.app) (que usa las
Discusiones de tu propio repositorio de GitHub) encajan bien con esta
arquitectura — es un paso natural para después, no algo que haya construido
ahora.

## Sobre el contador de visitas

Uso [CounterAPI](https://counterapi.dev), un servicio gratuito de terceros
que no requiere cuenta para empezar. El identificador que pusiste en
"Configuración del sitio" (`counterNamespace`) es lo que separa tu contador
del de cualquier otro sitio que use el mismo servicio — no lo cambies una vez
que empieces a recibir visitas, porque el conteo se reinicia. Si el servicio
alguna vez deja de funcionar, el sitio no se rompe: el contador simplemente
muestra un guion (—), y se puede reemplazar por otro servicio similar
editando `js/site.js`.

## Sobre las fuentes y librerías

El sitio carga Google Fonts (Cinzel para el título, Lora para el cuerpo,
Work Sans para las etiquetas de la interfaz) y `marked.js` (para interpretar
el Markdown de tus publicaciones) desde internet. Si alguna vez las visitas
no tienen conexión a esos servicios, el sitio sigue funcionando con
tipografías de reemplazo — solo se ve menos cuidado.

## Si más adelante quieres cambiar de proveedor de hosting

Todo el contenido real está en tres archivos JSON dentro de `data/`. Puedes
llevarlos a cualquier otro sitio estático (Netlify, Vercel, tu propio
servidor) sin perder nada — el panel de administración seguiría funcionando
igual mientras el repositorio de GitHub siga siendo la fuente de datos.
