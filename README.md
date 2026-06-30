# 🎸 Video Pitch Player

Reproductor de vídeo ligero pensado para práctica musical: cambia el tono y la velocidad del audio sin tocar el otro parámetro, sin instalar nada — funciona directamente en el navegador.

![status](https://img.shields.io/badge/status-functional-39ff6a)

## ✨ Características

- Reproductor de vídeo completo: abrir archivo, play/pausa, stop, avance y retroceso (5s / 10s), barra de progreso con scrubbing
- Formatos soportados: mp4, avi, mkv, mov, wmv, webm
- **Pitch shifting**: ajusta el tono del audio en pasos de semitono, hasta ±2 tonos (±4 semitonos), sin afectar a la velocidad de reproducción — con botón de reinicio rápido
- **Control de velocidad**: 75% / 80% / 85% / 90% / 95% / 100%, preservando el pitch elegido — con botón de reinicio rápido y resaltado visual cuando está activo
- Nombre del archivo cargado visible junto al botón de apertura
- Drag & drop de archivos directamente sobre la ventana
- Atajos de teclado: `Espacio` (play/pausa), `←` `→` (±5s), `Shift + ←/→` (±10s)
- Sin instalación: es un `index.html` que se abre con doble clic

## 🚀 Uso

1. Clona o descarga el repositorio
2. Abre `index.html` con doble clic (recomendado: Chrome o Edge)
3. Arrastra un vídeo a la ventana, o pulsa **📂 Open**

No requiere servidor, ni Node.js, ni ninguna instalación.

## 🛠️ Tecnologías

| Pieza | Función |
|---|---|
| HTML / CSS / JavaScript | Interfaz y lógica del reproductor |
| [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | Pipeline de audio nativo del navegador |
| [SoundTouchJS](https://github.com/cutterbl/SoundTouchJS) | Motor de pitch shifting (port JS de la librería SoundTouch) |
| `playbackRate` (Chromium) | Control de velocidad con preservación de pitch nativa |

## 🎚️ Cómo funciona el audio

El elemento `<video>` se conecta a un `AudioContext` mediante `createMediaElementSource`. El audio pasa por SoundTouchJS, que aplica el cambio de tono manual elegido por el usuario. La velocidad de reproducción se controla con `video.playbackRate`, que Chromium ya gestiona internamente preservando el pitch — por eso SoundTouch solo necesita encargarse del ajuste de tono que pide el usuario, sin tocar el tempo.

```
<video> ─→ MediaElementSource ─→ SoundTouch (pitch) ─→ AudioContext.destination
              ↑
       playbackRate (velocidad, gestionada por Chromium)
```

## 📁 Estructura

```
video-pitch-player/
├── index.html       Estructura de la interfaz
├── style.css         Estilos
├── player.js          Lógica del reproductor y pipeline de audio
└── soundtouch.js     Librería de pitch shifting
```

## ⌨️ Atajos de teclado

| Tecla | Acción |
|---|---|
| `Espacio` | Play / Pausa |
| `←` | Retroceder 5s |
| `→` | Avanzar 5s |
| `Shift + ←` | Retroceder 10s |
| `Shift + →` | Avanzar 10s |

## 📝 Notas

- Compatible con navegadores basados en Chromium (Chrome, Edge, Brave). No probado en Firefox/Safari.
- El pitch tiene un rango de ±4 semitonos (dos tonos completos) en pasos de un semitono.
- Al cargar un nuevo vídeo se libera automáticamente la memoria del anterior (`URL.revokeObjectURL`).

## 📄 Licencia

MIT — uso libre para fines personales y educativos.
