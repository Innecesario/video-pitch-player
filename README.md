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
