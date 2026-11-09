# Video Pitch Player

Repositorio: [Innecesario/video-pitch-player](https://github.com/Innecesario/video-pitch-player) · Web: [innecesario.github.io/video-pitch-player](https://innecesario.github.io/video-pitch-player/)

Reproductor de vídeo web para practicar encima de una grabación: **transpone el audio en semitonos** y **ralentiza la reproducción** sin subir el archivo a ningún sitio. Pensado para canciones que están un poco por encima o por debajo de la afinación de tu instrumento.

Se puede usar en el navegador o **instalar como app en Android** desde Chrome. Una vez cargada, la interfaz funciona sin conexión; los vídeos se siguen eligiendo del dispositivo.

## Qué incluye

- **Transposición de −6 a +6 semitonos** (±3 tonos), en pasos de un semitono, con regla, botones −/+ y reinicio.
- **Velocidad 100 / 95 / 90 / 85 / 80 / 75 %**, con reinicio.
- **Bucle A–B**: marca A y B en la línea de tiempo, repite el fragmento y arrastra las marcas para ajustarlo. Ideal para un estribillo o un solo.
- **Dos temas, claro y oscuro**, conmutables desde la cabecera. Arranca con el tema del sistema y recuerda tu elección.
- **Volumen, silencio, pantalla completa** y controles de reproducción completos (play/pausa, stop, ±5 s y ±10 s).
- **Móvil**: objetivos táctiles de 44 px en los controles principales, disposición en vertical y horizontal, áreas seguras del sistema y selector de archivos nativo.
- **PWA instalable**: manifiesto, iconos 192/512 y maskable, service worker y funcionamiento sin conexión.
- **Sin subidas**: el vídeo se abre con `URL.createObjectURL` y no sale del dispositivo.
- **Formatos**: MP4 (H.264 + AAC) y WebM (VP8/VP9 + Opus). MOV funciona si lleva H.264/AAC.

## Uso

1. Abre `index.html` con doble clic, o la URL de GitHub Pages.
2. Pulsa **Abrir vídeo** y elige un archivo. En escritorio también puedes arrastrarlo a la ventana.
3. Ajusta la transposición con la regla (clic o arrastre), los botones −/+, o las teclas `−` y `+`.
4. Ajusta la velocidad con los botones 100…75.
5. Para un fragmento: pulsa **A–B** en el punto de inicio (queda A), vuelve a pulsarlo al final (queda B) y el bucle se activa. Un tercer clic lo desactiva.

No hace falta pausar para cambiar el pitch o la velocidad.

## Atajos de teclado

| Tecla | Acción |
|---|---|
| `Espacio` | Reproducir / pausar |
| `←` / `→` | Retroceder / avanzar 5 s |
| `Shift` + `←` / `→` | Retroceder / avanzar 10 s |
| `−` o `[` | Bajar un semitono |
| `+` o `]` | Subir un semitono |
| `M` | Silenciar |
| `F` | Pantalla completa |
| `T` | Cambiar de tema |

En teclados en español `[` y `]` requieren AltGr; usa `−` y `+`, o los botones de la pantalla. `Espacio` respeta el botón que tenga el foco.

## Cómo funciona el audio

```
<video> ─→ MediaElementSource ─┬→ ganancia seca ─────────────→ salida
                               └→ SoundTouch → ganancia húmeda → salida
```

- La **velocidad** se delega en `video.playbackRate`: Chromium hace el time-stretch y conserva el tono. No pasa por SoundTouch.
- La **transposición** la hace SoundTouchJS: `pitch = 2^(semitonos/12)` y `tempo = 1`.
- Con la transposición a **0** el audio va por la ruta seca: sin procesar, sin latencia añadida y con el sincronismo intacto. Es el modo normal para practicar solo con la velocidad.
- Con la transposición activa, SoundTouch y el bloque de audio introducen unos **0,15 s de latencia**. Es inherente al procesado por bloques: el vídeo no se retrasa. Si necesitas sincronía perfecta, deja el pitch en 0.
- Cambiar el pitch o la velocidad **no vacía el búfer**: no hay cortes de 90 ms como en la versión anterior. El pipeline solo se limpia al buscar, pausar, terminar o cargar otro archivo.
- El volumen se controla con una ganancia en el grafo, no con `video.volume`, para que no se aplique dos veces.

### Nota sobre `ScriptProcessorNode`

Se mantiene de momento. Chrome lo marca como obsoleto en la consola de desarrollo, pero funciona en los navegadores objetivo y es lo que permite abrir la app con doble clic sin servidor. `AudioWorklet` queda como mejora futura si aparecen cortes en móviles lentos o si el navegador retira la API; no cambia el sonido ni elimina por sí solo el retardo del pitch.

## Móvil

La interfaz se adapta a pantallas estrechas y a la orientación horizontal:

- Cabecera compacta, nombre del archivo con elipsis y acciones en iconos de 44 px.
- Consola en una columna; en horizontal, tres columnas compactas.
- En pantallas de menos de 440 px se ocultan los saltos de 10 s para que quepan los controles; los de 5 s y la barra de progreso siguen disponibles.
- Los sliders y la regla usan eventos de puntero, no solo ratón. La barra de progreso se puede arrastrar con el dedo.
- El volumen se ajusta con los botones del teléfono; el botón de silencio sigue en la cabecera.

### Tipografía

En Windows se usan **Bahnschrift + Cascadia Mono**, las mismas del diseño. En Android esas fuentes no existen, así que la app incluye **Barlow Semi Condensed + IBM Plex Mono** (licencia OFL) en `assets/fonts/`; no depende de Google Fonts y funciona sin red. La pila de fuentes es `Bahnschrift → Barlow → sistema`, así que en Windows no se descargan las Barlow.

Se ha comprobado con las fuentes Barlow reales a **360, 390 y 412 px**: cuerpo de 15 px, etiquetas de 12 px, tiempos de 13 px, sin desbordes en cabecera, transporte, regla ni velocidad. La prueba definitiva será el móvil físico, pero el texto y la métrica son los mismos ficheros WOFF2 que usará Android.

## Instalar en Android

1. Abre [la web](https://innecesario.github.io/video-pitch-player/) en Chrome para Android.
2. Menú **⋮ → Instalar aplicación** (o **Añadir a pantalla de inicio**, según la versión).
3. Se abre a pantalla completa, con su icono y su nombre corto. El shell queda cacheado: si te quedas sin conexión, la app sigue abriendo; los vídeos se eligen del dispositivo como siempre.

La instalación requiere **HTTPS** (GitHub Pages lo es). Con doble clic sobre `index.html` la app funciona, pero el navegador no registra el service worker ni ofrece instalarla. La instalabilidad se ha comprobado con Chrome DevTools: `installabilityErrors: []`, service worker activo y recarga correcta sin red.

## Conservar la versión actual y subir la nueva desde la web

El repositorio ya tiene Pages activado y la versión anterior en `main` (los cinco archivos antiguos). Para no perderla:

### 1. Etiquetar la versión actual

1. Abre [el repositorio](https://github.com/Innecesario/video-pitch-player).
2. Entra en **Releases** (barra derecha) → **Draft a new release**.
3. En **Choose a tag**, escribe `v1.0` y elige **Create new tag: v1.0 on publish**.
4. **Target:** `main`. Título: `Versión anterior (pre-PWA)`.
5. **Publish release**.

Ese tag/release queda apuntando al commit actual. Siempre podrás descargar el ZIP de esa versión desde **Releases → v1.0 → Source code (zip)**. Alternativa: crear una rama `version-anterior` desde `main` antes de subir nada.

### 2. Subir la nueva por la web

1. En el repositorio, **Add file → Upload files**.
2. Arrastra **el contenido** de esta carpeta, no la carpeta padre: `index.html`, `style.css`, `player.js`, `soundtouch.js`, `manifest.json`, `sw.js`, `README.md`, `LICENSE`, `.gitignore`, `.nojekyll` y la carpeta `assets` completa (con `fonts/` e `icons/`).
3. No subas `Favicon192.png` si sigue en tu carpeta: es el icono viejo, está bloqueado por Windows y ya no se usa.
4. Escribe un mensaje de commit, por ejemplo `Versión PWA con icono y fuentes incluidas`, y confirma en **main**.

Los archivos con el mismo nombre (`index.html`, `style.css`, `player.js`, `README.md`, `soundtouch.js`) se **reemplazan**; los nuevos (`manifest.json`, `sw.js`, `LICENSE`, `.gitignore`, `.nojekyll`, `assets/`) se añaden. El favicon viejo no está en el repositorio (iba incrustado en el `index.html` antiguo), así que no hay que borrar nada más.

Si el navegador no sube `.gitignore` o `.nojekyll`:

- `.nojekyll` es opcional para esta app; puedes crearlo con **Add file → Create new file**, nombre `.nojekyll`, contenido vacío.
- `.gitignore` tampoco es necesario para que la web funcione, pero evita subir vídeos o backups si algún día usas git. Puedes crearlo igual desde la web.

### 3. Esperar a Pages y probar

1. El commit dispara el despliegue de Pages. Espera un minuto y abre <https://innecesario.github.io/video-pitch-player/>.
2. Haz una recarga forzada (`Ctrl+F5`) para saltarte la caché del navegador.
3. En el móvil, abre la misma URL en Chrome e instálala desde el menú.
4. Para volver a la versión anterior, descarga el ZIP del release `v1.0` y súbelo igual, o usa el historial de commits.

Si más adelante cambias `style.css`, `player.js` o cualquier asset, **sube `CACHE_NAME` en `sw.js`** (`vpp-v1` → `vpp-v2`) para que el service worker invalide la caché anterior.

### Alternativa con git

Si prefieres git, lo más limpio es clonar el repositorio existente y copiar encima el contenido nuevo:

```bash
git clone https://github.com/Innecesario/video-pitch-player.git vpp-repo
# copia aquí el contenido de esta carpeta (sin el vídeo ni los archivos de trabajo)
cd vpp-repo
git add .
git commit -m "Versión PWA con icono y fuentes incluidas"
git push origin main
```

El `.gitignore` deja fuera el vídeo de prueba (209 MB), la carpeta antigua `Iconos/`, los mockups, las copias, las notas y el icono viejo. La carpeta del proyecto está limpia: solo contiene la app y los assets que se publican.

## Estructura

```
index.html          Estructura, textos, iconos SVG y manifiesto
style.css           Tokens, temas, fuentes y adaptación a móvil
player.js           Reproductor, audio, bucle A–B, tema, teclado y PWA
soundtouch.js       Motor de pitch shifting (SoundTouchJS)
manifest.json       Manifiesto PWA
sw.js               Service worker (shell offline)
assets/fonts/       Barlow Semi Condensed + IBM Plex Mono (WOFF2 + OFL)
assets/icons/       Icono SVG, favicon 16/32, 180, 192, 512 y maskable
.nojekyll           Evita el procesado de Jekyll en GitHub Pages
LICENSE             MIT
README.md
```

La versión Electron antigua se descartó: la app es solo web y no necesita empaquetado.

## Limitaciones

- **AVI, WMV, MKV y FLV no se pueden reproducir** en Chromium. Convierte a MP4 (H.264/AAC) o WebM.
- La transposición activa añade ~0,15 s de latencia de audio (ver arriba).
- El vídeo se abre desde el dispositivo: no hay subida, biblioteca ni historial.
- Vídeos 4K muy grandes dependen de la potencia del teléfono.
- El procesado de pitch usa `ScriptProcessorNode` de momento; ver la nota de audio. Sigue funcionando y es lo que permite el modo `file://`.
- Probado en Chrome/Edge de escritorio y con emulación de Chrome Android a 360, 390, 412 y 844×390. Falta la prueba en un teléfono físico; Firefox y Safari no se han probado a fondo.
- La PWA necesita HTTPS o localhost; sobre `file://` la app funciona pero no se instala.

## Licencia

El código es MIT; consulta [LICENSE](LICENSE). Las fuentes incluidas son SIL Open Font License 1.1; sus textos están en `assets/fonts/OFL-Barlow.txt` y `assets/fonts/OFL-IBM-Plex.txt`.
