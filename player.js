// ── DOM elements ──────────────────────────────────────────────────
const video      = document.getElementById('video');
const progress   = document.getElementById('progressBar');
const timeCur    = document.getElementById('timeCurrent');
const timeTot    = document.getElementById('timeTotal');
const btnPlay    = document.getElementById('btnPlay');
const btnStop    = document.getElementById('btnStop');
const btnOpen    = document.getElementById('btnOpen');
const fileInput  = document.getElementById('fileInput');
const btnBack10  = document.getElementById('btnBack10');
const btnBack5   = document.getElementById('btnBack5');
const btnFwd5    = document.getElementById('btnFwd5');
const btnFwd10   = document.getElementById('btnFwd10');
const btnPitchDn = document.getElementById('btnPitchDn');
const btnPitchUp = document.getElementById('btnPitchUp');
const btnPitchReset = document.getElementById('btnPitchReset');
const lblPitch   = document.getElementById('lblPitch');
const speedSel   = document.getElementById('speedSelect');
const btnSpeedReset = document.getElementById('btnSpeedReset');
const fileNameLbl = document.getElementById('fileName');

// ── State ─────────────────────────────────────────────────────────
let audioCtx         = null;
let soundtouch       = null;
let sourceNode       = null;
let processorNode    = null;
let audioInitialised = false;

let currentFile    = null;   // nombre del archivo cargado (solo informativo)
let currentObjectURL = null; // URL temporal del blob, hay que liberarla al cambiar de vídeo
let pitchSemitones  = 0;
let currentSpeed    = 1.0;
let scrubbing       = false;

const PITCH_MIN = -4;
const PITCH_MAX = 4;

// ── Flush SoundTouch buffers ──────────────────────────────────────
function flushSoundTouch() {
  if (!soundtouch) return;
  try { soundtouch.clear(); } catch(e) {}
  const remaining = soundtouch.outputBuffer.frameCount;
  if (remaining > 0) {
    const dump = new Float32Array(remaining * 2);
    soundtouch.outputBuffer.receiveSamples(dump, remaining);
  }
}

// ── Audio pipeline setup (once) ───────────────────────────────────
function initAudio() {
  if (audioInitialised) return;
  audioInitialised = true;

  audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
  soundtouch = new SoundTouch();
  soundtouch.stretch.setParameters(audioCtx.sampleRate, 82, 28, 8);

  sourceNode    = audioCtx.createMediaElementSource(video);
  processorNode = audioCtx.createScriptProcessor(2048, 2, 2);

  processorNode.onaudioprocess = function (event) {
    if (video.paused || video.ended) {
      event.outputBuffer.getChannelData(0).fill(0);
      event.outputBuffer.getChannelData(1).fill(0);
      return;
    }

    const inL    = event.inputBuffer.getChannelData(0);
    const inR    = event.inputBuffer.getChannelData(1);
    const outL   = event.outputBuffer.getChannelData(0);
    const outR   = event.outputBuffer.getChannelData(1);
    const frames = event.inputBuffer.length;

    const inputSamples = new Float32Array(frames * 2);
    for (let i = 0; i < frames; i++) {
      inputSamples[i * 2]     = inL[i];
      inputSamples[i * 2 + 1] = inR[i];
    }

    soundtouch.inputBuffer.putSamples(inputSamples, 0, frames);
    soundtouch.process();

    const available = soundtouch.outputBuffer.frameCount;
    const toExtract = Math.min(available, frames);

    if (toExtract > 0) {
      const outputSamples = new Float32Array(toExtract * 2);
      soundtouch.outputBuffer.receiveSamples(outputSamples, toExtract);
      for (let i = 0; i < frames; i++) {
        outL[i] = i < toExtract ? outputSamples[i * 2]     : 0;
        outR[i] = i < toExtract ? outputSamples[i * 2 + 1] : 0;
      }
    } else {
      outL.fill(0);
      outR.fill(0);
    }
  };

  sourceNode.connect(processorNode);
  processorNode.connect(audioCtx.destination);

  applyAudioParams();
}

// ── Apply pitch and speed ─────────────────────────────────────────
function applyAudioParams() {
  if (!soundtouch) return;

  // Chromium ya preserva el pitch al cambiar playbackRate internamente
  // con time-stretching. SoundTouch solo gestiona el pitch manual
  // del usuario; tempo siempre a 1.0.
  video.playbackRate = currentSpeed;
  soundtouch.tempo = 1.0;
  soundtouch.pitch = Math.pow(2, pitchSemitones / 12);
}

// ── Cargar un archivo (File object) ────────────────────────────────
function loadVideoFile(file) {
  if (!file) return;

  initAudio();
  flushSoundTouch();

  // Liberar la URL del vídeo anterior para no acumular memoria
  if (currentObjectURL) {
    URL.revokeObjectURL(currentObjectURL);
  }

  currentObjectURL = URL.createObjectURL(file);
  currentFile = file.name;
  document.title = file.name;
  fileNameLbl.textContent = file.name;

  video.src = currentObjectURL;
  btnPlay.textContent = 'Pause';
  video.addEventListener('canplay', autoPlayOnReady, { once: true });
  video.load();
}

function autoPlayOnReady() {
  video.removeEventListener('canplay', autoPlayOnReady);
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  video.play().then(() => {
    btnPlay.textContent = 'Pause';
  }).catch(() => {});
}

// ── Open file (botón + input nativo del navegador) ─────────────────
btnOpen.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  loadVideoFile(file);
  fileInput.value = ''; // permite volver a abrir el mismo archivo
});

// ── Play / Pause ──────────────────────────────────────────────────
function togglePlay() {
  if (!currentFile) return;
  initAudio();

  if (video.paused) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    video.play();
    btnPlay.textContent = 'Pause';
  } else {
    video.pause();
    flushSoundTouch();
    btnPlay.textContent = 'Play';
  }
}

// ── Stop ──────────────────────────────────────────────────────────
function doStop() {
  video.pause();
  video.currentTime = 0;
  flushSoundTouch();
  btnPlay.textContent = 'Play';
}

// ── Skip ──────────────────────────────────────────────────────────
function skip(seconds) {
  if (!currentFile || isNaN(video.duration)) return;
  flushSoundTouch();
  video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration));
}

// ── Pitch ─────────────────────────────────────────────────────────
function changePitch(delta) {
  const next = pitchSemitones + delta;
  if (next < PITCH_MIN || next > PITCH_MAX) return;
  pitchSemitones = next;
  lblPitch.textContent = (next >= 0 ? '+' : '') + next;
  flushSoundTouch();
  applyAudioParams();
}

function resetPitch() {
  pitchSemitones = 0;
  lblPitch.textContent = '0';
  flushSoundTouch();
  applyAudioParams();
}

// ── Speed ─────────────────────────────────────────────────────────
function changeSpeed() {
  currentSpeed = parseFloat(speedSel.value);
  flushSoundTouch();
  applyAudioParams();
  updateSpeedHighlight();
}

function resetSpeed() {
  speedSel.value = '1.00';
  changeSpeed();
}

function updateSpeedHighlight() {
  speedSel.classList.toggle('active', currentSpeed !== 1.0);
}

// ── Progress / scrub ──────────────────────────────────────────────
progress.addEventListener('input', () => {
  if (!currentFile || isNaN(video.duration)) return;
  scrubbing = true;
  const t = (progress.value / 10000) * video.duration;
  timeCur.textContent = fmtTime(t * 1000);
});

progress.addEventListener('change', () => {
  if (!currentFile || isNaN(video.duration)) return;
  flushSoundTouch();
  video.currentTime = (progress.value / 10000) * video.duration;
  scrubbing = false;
});

video.addEventListener('timeupdate', () => {
  if (scrubbing) return;
  if (!isNaN(video.duration)) {
    progress.value      = (video.currentTime / video.duration) * 10000;
    timeCur.textContent = fmtTime(video.currentTime * 1000);
    timeTot.textContent = '/ ' + fmtTime(video.duration * 1000);
  }
});

video.addEventListener('loadedmetadata', () => {
  progress.value      = 0;
  timeTot.textContent = '/ ' + fmtTime(video.duration * 1000);
});

video.addEventListener('ended', () => {
  flushSoundTouch();
  btnPlay.textContent = 'Play';
});

// ── Helpers ───────────────────────────────────────────────────────
function fmtTime(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

// ── Button wiring ─────────────────────────────────────────────────
btnPlay.addEventListener('click', togglePlay);
btnStop.addEventListener('click', doStop);
btnBack10.addEventListener('click', () => skip(-10));
btnBack5.addEventListener('click',  () => skip(-5));
btnFwd5.addEventListener('click',   () => skip(5));
btnFwd10.addEventListener('click',  () => skip(10));
btnPitchDn.addEventListener('click', () => changePitch(-1));
btnPitchUp.addEventListener('click', () => changePitch(1));
btnPitchReset.addEventListener('click', resetPitch);
speedSel.addEventListener('change', changeSpeed);
btnSpeedReset.addEventListener('click', resetSpeed);

// ── Keyboard shortcuts ────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  }
  if (e.code === 'ArrowLeft') {
    e.preventDefault();
    skip(e.shiftKey ? -10 : -5);
  }
  if (e.code === 'ArrowRight') {
    e.preventDefault();
    skip(e.shiftKey ? 10 : 5);
  }
});

// ── Drag & drop ───────────────────────────────────────────────────
// Mucho más simple que en Electron: el navegador entrega el File
// directamente, sin necesidad de resolver rutas del sistema.
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  loadVideoFile(file);
});

// ── Init ──────────────────────────────────────────────────────────
applyAudioParams();
