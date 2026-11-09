(() => {
  'use strict';

  // ── Referencias ───────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  const video = $('video');
  const stage = $('stage');
  const overlay = $('overlay');
  const overlayTitle = $('overlayTitle');
  const overlayText = $('overlayText');
  const overlayFormats = $('overlayFormats');
  const btnOverlayOpen = $('btnOverlayOpen');
  const btnOpen = $('btnOpen');
  const fileInput = $('fileInput');
  const fileInfo = $('fileInfo');
  const fileName = $('fileName');
  const fileMeta = $('fileMeta');
  const panel = $('console');

  const track = $('track');
  const buffered = $('buffered');
  const played = $('played');
  const playhead = $('playhead');
  const loopBand = $('loopBand');
  const markA = $('markA');
  const markB = $('markB');
  const timeCurrent = $('timeCurrent');
  const timeTotal = $('timeTotal');

  const btnPlay = $('btnPlay');
  const btnStop = $('btnStop');
  const btnLoop = $('btnLoop');
  const btnMute = $('btnMute');
  const volume = $('volume');
  const btnTheme = $('btnTheme');
  const btnFullscreen = $('btnFullscreen');
  const metaThemeColor = $('metaThemeColor');

  const ruler = $('ruler');
  const pitchTick = $('pitchTick');
  const pitchNumber = $('pitchNumber');
  const pitchUnit = $('pitchUnit');
  const btnPitchDown = $('btnPitchDown');
  const btnPitchUp = $('btnPitchUp');
  const btnPitchReset = $('btnPitchReset');

  const speedNumber = $('speedNumber');
  const speedGroup = $('speedGroup');
  const btnSpeedReset = $('btnSpeedReset');

  const toast = $('toast');

  // ── Constantes ────────────────────────────────────────────
  const PITCH_MIN = -6;
  const PITCH_MAX = 6;
  const SPEEDS = [1, 0.95, 0.9, 0.85, 0.8, 0.75];
  const VIDEO_EXTENSIONS = ['MP4', 'M4V', 'WEBM', 'MOV', 'OGV', 'OGG'];
  const UNSUPPORTED_EXTENSIONS = ['AVI', 'WMV', 'MKV', 'FLV'];
  const STORAGE_THEME = 'vpp-theme';
  const STORAGE_VOLUME = 'vpp-volume';
  const SEEK_STEP = 5;

  // ── Estado ────────────────────────────────────────────────
  const state = {
    pitch: 0,
    speed: 1,
    volume: 0.8,
    muted: false,
    loopA: null,
    loopB: null,
    loopActive: false,
    duration: 0,
    file: null,
    url: null,
    ext: '',
    scrubbing: false,
    scrubTime: 0,
    dragMark: null,
    raf: 0,
    toastTimer: 0,
    overlayError: false,
    autoplayTried: false
  };

  // Nodos de audio (se crean en el primer gesto de usuario).
  let audioCtx = null;
  let sourceNode = null;
  let dryGain = null;
  let wetGain = null;
  let masterGain = null;
  let processor = null;
  let soundtouch = null;
  let audioIn = null;
  let audioOut = null;
  let pipelineTimer = 0;

  // ── Utilidades ────────────────────────────────────────────
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pad2 = (n) => String(n).padStart(2, '0');
  const pct = (value) => (clamp(value, 0, 1) * 100).toFixed(3) + '%';

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
  }

  function formatPitch(value) {
    if (value === 0) return '0';
    return (value > 0 ? '+' : '−') + Math.abs(value);
  }

  function extensionOf(name) {
    const parts = String(name).split('.');
    return parts.length > 1 ? parts.pop().toUpperCase() : '';
  }

  function readStored(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function store(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) {}
  }

  function showToast(message, ms = 4200) {
    clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    state.toastTimer = setTimeout(() => { toast.hidden = true; }, ms);
  }

  // ── Tema ──────────────────────────────────────────────────
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    metaThemeColor.setAttribute('content', theme === 'light' ? '#f7f4ee' : '#161513');
    const target = theme === 'light' ? 'oscuro' : 'claro';
    btnTheme.setAttribute('aria-label', `Cambiar a tema ${target}`);
    btnTheme.setAttribute('title', `Cambiar a tema ${target}`);
    if (persist) store(STORAGE_THEME, theme);
  }

  function toggleTheme() {
    applyTheme(currentTheme() === 'light' ? 'dark' : 'light', true);
  }

  function initTheme() {
    applyTheme(currentTheme(), false);
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handle = (event) => {
      if (!readStored(STORAGE_THEME)) applyTheme(event.matches ? 'light' : 'dark', false);
    };
    if (media.addEventListener) media.addEventListener('change', handle);
    else if (media.addListener) media.addListener(handle);
  }

  // ── Volumen ───────────────────────────────────────────────
  function applyVolume(persist) {
    const value = state.muted ? 0 : clamp(state.volume, 0, 1);
    if (masterGain) {
      masterGain.gain.value = value;
      video.volume = 1;
    } else {
      video.volume = value;
    }
    volume.value = Math.round(clamp(state.volume, 0, 1) * 100);
    volume.style.setProperty('--vol', String(Math.round(clamp(state.volume, 0, 1) * 100)));
    btnMute.setAttribute('aria-pressed', String(state.muted));
    btnMute.setAttribute('aria-label', state.muted ? 'Quitar silencio' : 'Silenciar');
    btnMute.setAttribute('title', state.muted ? 'Quitar silencio' : 'Silenciar');
    if (persist) store(STORAGE_VOLUME, state.volume);
  }

  function toggleMute() {
    if (!state.muted && state.volume === 0) state.volume = 0.8;
    state.muted = !state.muted;
    applyVolume(true);
  }

  // ── Audio ─────────────────────────────────────────────────
  function ensureAudio() {
    if (audioCtx) return;
    initAudio();
  }

  function initAudio() {
    if (audioCtx) return;
    if (typeof SoundTouch === 'undefined') return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!AudioContextClass.prototype.createScriptProcessor) return;

    try {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = state.muted ? 0 : state.volume;
      masterGain.connect(audioCtx.destination);

      dryGain = audioCtx.createGain();
      wetGain = audioCtx.createGain();
      const wet = state.pitch !== 0;
      dryGain.gain.value = wet ? 0 : 1;
      wetGain.gain.value = wet ? 1 : 0;
      dryGain.connect(masterGain);
      wetGain.connect(masterGain);

      // SoundTouch antes de desviar el audio del elemento, para no dejar
      // el vídeo mudo si algo falla al construirlo.
      soundtouch = new SoundTouch();
      soundtouch.stretch.setParameters(audioCtx.sampleRate, 82, 28, 8);
      applyPitchToSoundTouch();

      sourceNode = audioCtx.createMediaElementSource(video);
      sourceNode.connect(dryGain);

      processor = audioCtx.createScriptProcessor(2048, 2, 2);
      processor.onaudioprocess = processAudio;
      sourceNode.connect(processor);
      processor.connect(wetGain);

      audioIn = new Float32Array(2048 * 2);
      audioOut = new Float32Array(2048 * 2);

      // El volumen se controla en el grafo, no en el elemento.
      video.volume = 1;
    } catch (error) {
      console.warn('No se pudo inicializar el audio', error);
      try { if (audioCtx) audioCtx.close(); } catch (closeError) {}
      audioCtx = null;
      soundtouch = null;
      processor = null;
    }
  }

  function applyPitchToSoundTouch() {
    if (!soundtouch) return;
    soundtouch.tempo = 1;
    soundtouch.pitch = Math.pow(2, state.pitch / 12);
  }

  function clearPipeline() {
    if (!soundtouch) return;
    try { soundtouch.clear(); } catch (error) {}
  }

  function fade(node, target, seconds) {
    if (!audioCtx || !node) return;
    const now = audioCtx.currentTime;
    const param = node.gain;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(target, now + seconds);
  }

  function processAudio(event) {
    const outL = event.outputBuffer.getChannelData(0);
    const outR = event.outputBuffer.getChannelData(1);

    if (!soundtouch || state.pitch === 0 || video.paused || video.ended) {
      outL.fill(0);
      outR.fill(0);
      return;
    }

    const frames = event.inputBuffer.length;
    const inL = event.inputBuffer.getChannelData(0);
    const inR = event.inputBuffer.numberOfChannels > 1
      ? event.inputBuffer.getChannelData(1)
      : inL;

    if (!audioIn || audioIn.length !== frames * 2) {
      audioIn = new Float32Array(frames * 2);
      audioOut = new Float32Array(frames * 2);
    }

    for (let i = 0; i < frames; i++) {
      audioIn[i * 2] = inL[i];
      audioIn[i * 2 + 1] = inR[i];
    }

    soundtouch.inputBuffer.putSamples(audioIn, 0, frames);
    soundtouch.process();

    const available = soundtouch.outputBuffer.frameCount;
    const toExtract = Math.min(available, frames);

    if (toExtract > 0) {
      soundtouch.outputBuffer.receiveSamples(audioOut.subarray(0, toExtract * 2), toExtract);
      for (let i = 0; i < frames; i++) {
        if (i < toExtract) {
          outL[i] = audioOut[i * 2];
          outR[i] = audioOut[i * 2 + 1];
        } else {
          outL[i] = 0;
          outR[i] = 0;
        }
      }
    } else {
      outL.fill(0);
      outR.fill(0);
    }
  }

  // ── Pitch ─────────────────────────────────────────────────
  function setPitch(value) {
    const next = clamp(Math.round(Number(value) || 0), PITCH_MIN, PITCH_MAX);
    if (next === state.pitch) {
      renderPitch();
      return;
    }

    const previous = state.pitch;
    state.pitch = next;
    renderPitch();

    if (!soundtouch) return;

    if (previous === 0 && next !== 0) {
      clearPipeline();
      applyPitchToSoundTouch();
      fade(dryGain, 0, 0.05);
      fade(wetGain, 1, 0.05);
    } else if (previous !== 0 && next === 0) {
      fade(dryGain, 1, 0.05);
      fade(wetGain, 0, 0.05);
      clearTimeout(pipelineTimer);
      pipelineTimer = setTimeout(() => {
        if (state.pitch === 0) clearPipeline();
      }, 160);
    } else {
      applyPitchToSoundTouch();
    }
  }

  function renderPitch() {
    pitchNumber.textContent = formatPitch(state.pitch);
    pitchUnit.textContent = Math.abs(state.pitch) === 1 ? 'semitono' : 'semitonos';
    pitchTick.style.left = pct((state.pitch - PITCH_MIN) / (PITCH_MAX - PITCH_MIN));
    ruler.setAttribute('aria-valuenow', String(state.pitch));
    ruler.setAttribute('aria-valuetext', `${state.pitch} ${Math.abs(state.pitch) === 1 ? 'semitono' : 'semitonos'}`);
    btnPitchReset.hidden = state.pitch === 0;
    btnPitchDown.disabled = state.pitch <= PITCH_MIN;
    btnPitchUp.disabled = state.pitch >= PITCH_MAX;
  }

  function pitchFromClientX(clientX) {
    const scale = ruler.querySelector('.scale');
    const rect = scale.getBoundingClientRect();
    const fraction = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0.5;
    return PITCH_MIN + Math.round(fraction * (PITCH_MAX - PITCH_MIN));
  }

  // ── Velocidad ─────────────────────────────────────────────
  function setSpeed(value) {
    const next = Number(value);
    if (!SPEEDS.includes(next)) return;
    state.speed = next;
    video.defaultPlaybackRate = next;
    try { video.playbackRate = next; } catch (error) {}
    renderSpeed();
  }

  function renderSpeed() {
    speedNumber.textContent = String(Math.round(state.speed * 100));
    Array.from(speedGroup.querySelectorAll('button[data-speed]')).forEach((button) => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === state.speed));
    });
    btnSpeedReset.hidden = state.speed === 1;
  }

  // ── Línea de tiempo ───────────────────────────────────────
  function timeFromClientX(clientX) {
    const rect = track.getBoundingClientRect();
    const fraction = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0;
    return fraction * state.duration;
  }

  function seekTo(seconds) {
    if (!state.duration) return;
    const target = clamp(Number(seconds) || 0, 0, state.duration);
    video.currentTime = target;
    clearPipeline();
    render();
  }

  function skip(seconds) {
    if (!state.duration) return;
    seekTo(video.currentTime + seconds);
  }

  function render() {
    const duration = state.duration;
    const time = state.scrubbing ? state.scrubTime : (video.currentTime || 0);
    const fraction = duration > 0 ? clamp(time / duration, 0, 1) : 0;

    played.style.width = pct(fraction);
    playhead.style.left = pct(fraction);
    timeCurrent.textContent = formatTime(time);
    timeTotal.textContent = formatTime(duration);
    track.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
    track.setAttribute('aria-valuetext', formatTime(time));
  }

  function renderBuffered() {
    if (!state.duration || !video.buffered || !video.buffered.length) {
      buffered.style.width = '0%';
      return;
    }
    let end = 0;
    for (let i = 0; i < video.buffered.length; i++) {
      end = Math.max(end, video.buffered.end(i));
    }
    buffered.style.width = pct(end / state.duration);
  }

  function resetTimeline() {
    state.duration = 0;
    state.scrubbing = false;
    state.scrubTime = 0;
    played.style.width = '0%';
    playhead.style.left = '0%';
    buffered.style.width = '0%';
    timeCurrent.textContent = '00:00';
    timeTotal.textContent = '00:00';
    track.setAttribute('aria-valuenow', '0');
    track.setAttribute('aria-valuetext', '00:00');
    track.tabIndex = -1;
    track.setAttribute('aria-disabled', 'true');
  }

  // ── Bucle A–B ─────────────────────────────────────────────
  function renderLoop() {
    const duration = state.duration;
    const hasA = state.loopA !== null && duration > 0;
    const hasB = state.loopB !== null && duration > 0;

    markA.hidden = !hasA;
    markB.hidden = !hasB;
    loopBand.hidden = !(hasA && hasB);

    if (hasA) markA.style.left = pct(state.loopA / duration);
    if (hasB) markB.style.left = pct(state.loopB / duration);
    if (hasA && hasB) {
      loopBand.style.left = pct(state.loopA / duration);
      loopBand.style.width = pct((state.loopB - state.loopA) / duration);
    }

    btnLoop.classList.toggle('active', state.loopActive);
    btnLoop.classList.toggle('pending', hasA && !state.loopActive);
    btnLoop.setAttribute('aria-pressed', String(state.loopActive));

    if (state.loopActive) {
      btnLoop.title = 'Desactivar bucle A–B';
    } else if (hasA) {
      btnLoop.title = 'Marcar el punto B';
    } else {
      btnLoop.title = 'Bucle A–B: marca el punto A';
    }
  }

  function clearLoop(withToast) {
    state.loopA = null;
    state.loopB = null;
    state.loopActive = false;
    renderLoop();
    if (withToast) showToast('Bucle A–B desactivado');
  }

  function toggleLoopPoint() {
    if (!state.duration) return;

    if (state.loopActive) {
      clearLoop(true);
      return;
    }

    if (state.loopA === null) {
      state.loopA = video.currentTime;
      renderLoop();
      showToast(`A en ${formatTime(state.loopA)}. Pulsa otra vez para marcar B.`);
      return;
    }

    if (state.loopB === null) {
      const point = video.currentTime;
      if (point <= state.loopA + 0.25) {
        showToast('Mueve el vídeo después de A y vuelve a pulsar.');
        return;
      }
      state.loopB = point;
      state.loopActive = true;
      renderLoop();
      if (video.currentTime < state.loopA || video.currentTime > state.loopB) {
        seekTo(state.loopA);
      }
      showToast(`Bucle ${formatTime(state.loopA)}–${formatTime(state.loopB)} activo.`);
      return;
    }

    state.loopActive = true;
    renderLoop();
  }

  function checkLoop() {
    if (state.scrubbing || video.paused || video.ended) return;
    if (!state.loopActive || state.loopA === null || state.loopB === null) return;
    if (video.currentTime >= state.loopB - 0.03) {
      video.currentTime = state.loopA;
      clearPipeline();
    }
  }

  // ── Reproducción ──────────────────────────────────────────
  function setPlayingUI(isPlaying) {
    btnPlay.dataset.playing = String(isPlaying);
    btnPlay.setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reproducir');
    btnPlay.setAttribute('title', isPlaying ? 'Pausar' : 'Reproducir');
    document.body.classList.toggle('is-playing', isPlaying);
  }

  function play() {
    if (!state.file) return;
    ensureAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    if (video.ended) {
      video.currentTime = state.loopActive && state.loopA !== null ? state.loopA : 0;
    }
    const promise = video.play();
    if (promise && promise.catch) promise.catch(() => {});
  }

  function pause() {
    video.pause();
  }

  function togglePlay() {
    if (!state.file) return;
    if (video.paused || video.ended) play();
    else pause();
  }

  function stopPlayback() {
    video.pause();
    video.currentTime = 0;
    clearPipeline();
    render();
  }

  function startRaf() {
    if (state.raf) return;
    const tick = () => {
      state.raf = 0;
      if (video.paused || video.ended) return;
      checkLoop();
      render();
      state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
  }

  function stopRaf() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
  }

  // ── Archivo ───────────────────────────────────────────────
  function showOverlay(title, text, actionLabel, options) {
    const opts = options || {};
    overlay.hidden = false;
    overlay.classList.toggle('is-error', Boolean(opts.error));
    overlayTitle.textContent = title;
    overlayText.textContent = text || '';
    overlayText.hidden = !text;
    btnOverlayOpen.textContent = actionLabel || '';
    btnOverlayOpen.hidden = !actionLabel;
    overlayFormats.hidden = !opts.formats;
    state.overlayError = Boolean(opts.error);
  }

  function hideOverlay() {
    overlay.hidden = true;
    state.overlayError = false;
  }

  function showVideoError(title, text) {
    showOverlay(title, text, 'Abrir otro vídeo', { error: true, formats: true });
    updateTransportEnabled(false);
  }

  function updateTransportEnabled(enabled) {
    btnPlay.disabled = !enabled;
    btnStop.disabled = !enabled;
    btnLoop.disabled = !enabled;
    Array.from(document.querySelectorAll('[data-skip]')).forEach((button) => {
      button.disabled = !enabled;
    });
    track.setAttribute('aria-disabled', String(!enabled));
    track.tabIndex = enabled ? 0 : -1;
    panel.classList.toggle('is-idle', !enabled);
  }

  function resetForNewFile(file, url) {
    state.file = file;
    state.url = url;
    state.ext = extensionOf(file.name) || 'VÍDEO';
    state.duration = 0;
    state.autoplayTried = false;
    state.overlayError = false;
    state.scrubbing = false;
    state.dragMark = null;
    clearLoop(false);
    resetTimeline();

    fileInfo.hidden = false;
    fileName.textContent = file.name;
    fileName.title = file.name;
    fileMeta.textContent = `${state.ext} · —`;
    document.body.classList.add('has-file');
    document.title = `${file.name} · Video Pitch Player`;
  }

  function openFile(file) {
    if (!file) return;

    const ext = extensionOf(file.name);
    if (UNSUPPORTED_EXTENSIONS.includes(ext)) {
      showToast(`Este navegador no reproduce ${ext}. Usa MP4 (H.264) o WebM.`);
      return;
    }
    const looksLikeVideo = (file.type && file.type.indexOf('video/') === 0) || VIDEO_EXTENSIONS.includes(ext);
    if (!looksLikeVideo) {
      showToast('Ese archivo no parece un vídeo.');
      return;
    }

    ensureAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    video.pause();
    stopRaf();
    clearPipeline();

    let url;
    try {
      url = URL.createObjectURL(file);
    } catch (error) {
      showToast('No se pudo abrir el archivo.');
      return;
    }

    const previousUrl = state.url;
    resetForNewFile(file, url);
    updateTransportEnabled(false);
    showOverlay('Cargando vídeo…', '', null, { formats: false });

    // defaultPlaybackRate evita que load() devuelva la velocidad a 1.
    video.defaultPlaybackRate = state.speed;
    video.src = url;
    video.load();

    if (previousUrl) setTimeout(() => URL.revokeObjectURL(previousUrl), 1000);
    updateMediaMetadata();
  }

  function onLoadedMetadata() {
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    state.duration = duration;

    try { video.playbackRate = state.speed; } catch (error) {}

    if (duration > 0) {
      fileMeta.textContent = `${state.ext} · ${formatTime(duration)}`;
      updateTransportEnabled(true);
      if (state.loopA !== null && state.loopA > duration) state.loopA = null;
      if (state.loopB !== null && state.loopB > duration) state.loopB = null;
      if (state.loopA === null) state.loopActive = false;
      if (state.loopB === null) state.loopActive = false;
    }

    renderLoop();
    render();
    renderBuffered();
  }

  function onCanPlay() {
    if (!state.overlayError) hideOverlay();
    if (state.duration > 0) updateTransportEnabled(true);

    if (!state.autoplayTried) {
      state.autoplayTried = true;
      play();
    }
  }

  function onVideoError() {
    stopRaf();
    clearLoop(false);
    resetTimeline();
    updateTransportEnabled(false);

    const code = video.error ? video.error.code : 0;
    if (code === 4) {
      showVideoError('Formato no compatible', 'Este navegador no puede abrir el archivo. Prueba con un MP4 (H.264) o un WebM.');
    } else if (code === 3) {
      showVideoError('No se pudo decodificar el vídeo', 'Puede que el códec no esté disponible. Prueba con un MP4 (H.264) o un WebM.');
    } else {
      showVideoError('No se pudo reproducir el vídeo', 'El archivo puede estar dañado o incompleto.');
    }
  }

  // ── Media Session ─────────────────────────────────────────
  function updateMediaMetadata() {
    if (!('mediaSession' in navigator) || !state.file) return;
    try {
      if ('MediaMetadata' in window) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: state.file.name,
          artist: 'Video Pitch Player'
        });
      }
    } catch (error) {}
  }

  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const handlers = {
      play: () => play(),
      pause: () => pause(),
      stop: () => stopPlayback(),
      seekbackward: (details) => skip(-((details && details.seekOffset) || SEEK_STEP)),
      seekforward: (details) => skip((details && details.seekOffset) || SEEK_STEP),
      seekto: (details) => {
        if (details && typeof details.seekTime === 'number') seekTo(details.seekTime);
      }
    };
    Object.keys(handlers).forEach((action) => {
      try { navigator.mediaSession.setActionHandler(action, handlers[action]); } catch (error) {}
    });
  }

  function updateMediaPlaybackState() {
    if (!('mediaSession' in navigator)) return;
    try { navigator.mediaSession.playbackState = video.paused ? 'paused' : 'playing'; } catch (error) {}
  }

  // ── Pantalla completa ─────────────────────────────────────
  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    const element = document.documentElement;
    const request = element.requestFullscreen || element.webkitRequestFullscreen;
    if (request) {
      const result = request.call(element);
      if (result && result.catch) {
        result.catch(() => {
          if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
          else showToast('Este navegador no permite pantalla completa.');
        });
      }
      return;
    }
    if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    else showToast('Este navegador no permite pantalla completa.');
  }

  function syncFullscreenUI() {
    const active = Boolean(document.fullscreenElement);
    document.body.classList.toggle('is-fullscreen', active);
    btnFullscreen.setAttribute('aria-label', active ? 'Salir de pantalla completa' : 'Pantalla completa');
    btnFullscreen.setAttribute('title', active ? 'Salir de pantalla completa' : 'Pantalla completa');
  }

  // ── Eventos de puntero ────────────────────────────────────
  function onTrackPointerDown(event) {
    if (!state.duration) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const mark = event.target.closest ? event.target.closest('.mark') : null;
    if (mark) {
      event.preventDefault();
      state.dragMark = mark.id === 'markA' ? 'A' : 'B';
    } else {
      event.preventDefault();
      state.scrubbing = true;
      state.scrubTime = timeFromClientX(event.clientX);
      render();
    }

    try { track.setPointerCapture(event.pointerId); } catch (error) {}
  }

  function onTrackPointerMove(event) {
    if (state.dragMark) {
      const time = timeFromClientX(event.clientX);
      if (state.dragMark === 'A') {
        const max = state.loopB !== null ? state.loopB - 0.2 : state.duration;
        state.loopA = clamp(time, 0, Math.max(0, max));
      } else {
        const min = state.loopA !== null ? state.loopA + 0.2 : 0;
        state.loopB = clamp(time, min, state.duration);
      }
      renderLoop();
      return;
    }

    if (!state.scrubbing) return;
    state.scrubTime = timeFromClientX(event.clientX);
    render();
  }

  function endTrackPointer(event) {
    if (state.scrubbing) {
      state.scrubbing = false;
      seekTo(state.scrubTime);
    }
    if (state.dragMark) {
      state.dragMark = null;
      renderLoop();
    }
    try {
      if (track.hasPointerCapture && track.hasPointerCapture(event.pointerId)) {
        track.releasePointerCapture(event.pointerId);
      }
    } catch (error) {}
  }

  function onTrackKeyDown(event) {
    if (!state.duration) return;
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        skip(event.shiftKey ? -10 : -SEEK_STEP);
        break;
      case 'ArrowRight':
        event.preventDefault();
        skip(event.shiftKey ? 10 : SEEK_STEP);
        break;
      case 'Home':
        event.preventDefault();
        seekTo(0);
        break;
      case 'End':
        event.preventDefault();
        seekTo(state.duration);
        break;
      case ' ':
        if (event.repeat) return;
        event.preventDefault();
        togglePlay();
        break;
      default:
        break;
    }
  }

  function onRulerPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    try { ruler.setPointerCapture(event.pointerId); } catch (error) {}
    setPitch(pitchFromClientX(event.clientX));
  }

  function onRulerPointerMove(event) {
    if (!ruler.hasPointerCapture || !ruler.hasPointerCapture(event.pointerId)) return;
    setPitch(pitchFromClientX(event.clientX));
  }

  function onRulerKeyDown(event) {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        setPitch(state.pitch - 1);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        setPitch(state.pitch + 1);
        break;
      case 'Home':
        event.preventDefault();
        setPitch(PITCH_MIN);
        break;
      case 'End':
        event.preventDefault();
        setPitch(PITCH_MAX);
        break;
      default:
        break;
    }
  }

  // ── Teclado global ────────────────────────────────────────
  function onGlobalKeyDown(event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

    if (event.code === 'Space') {
      if (event.repeat) return;
      if (target && target.closest && target.closest('button, a')) return;
      event.preventDefault();
      togglePlay();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      skip(event.shiftKey ? -10 : -SEEK_STEP);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      skip(event.shiftKey ? 10 : SEEK_STEP);
      return;
    }

    // Minus/Equal funcionan en teclados donde [ y ] necesitan AltGr.
    if (event.code === 'Minus' || event.key === '-') {
      event.preventDefault();
      setPitch(state.pitch - 1);
      return;
    }
    if (event.code === 'Equal' || event.key === '+' || event.key === '=') {
      event.preventDefault();
      setPitch(state.pitch + 1);
      return;
    }
    if (event.code === 'BracketLeft' || event.key === '[') {
      event.preventDefault();
      setPitch(state.pitch - 1);
      return;
    }
    if (event.code === 'BracketRight' || event.key === ']') {
      event.preventDefault();
      setPitch(state.pitch + 1);
      return;
    }

    const key = String(event.key).toLowerCase();
    if (key === 'm') { event.preventDefault(); if (!event.repeat) toggleMute(); }
    else if (key === 'f') { event.preventDefault(); if (!event.repeat) toggleFullscreen(); }
    else if (key === 't') { event.preventDefault(); if (!event.repeat) toggleTheme(); }
  }

  // ── Arrastrar y soltar ────────────────────────────────────
  function hasFiles(event) {
    if (!event.dataTransfer) return false;
    const types = event.dataTransfer.types;
    if (!types) return false;
    return Array.prototype.indexOf.call(types, 'Files') !== -1;
  }

  function onDragOver(event) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    stage.classList.add('is-dragover');
  }

  function onDragLeave(event) {
    if (event.relatedTarget && stage.contains(event.relatedTarget)) return;
    stage.classList.remove('is-dragover');
  }

  function onDrop(event) {
    event.preventDefault();
    stage.classList.remove('is-dragover');
    const file = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
    if (file) openFile(file);
  }

  // ── Eventos de vídeo ──────────────────────────────────────
  function bindVideoEvents() {
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('durationchange', onLoadedMetadata);
    video.addEventListener('loadeddata', () => {
      if (!state.overlayError) hideOverlay();
      renderBuffered();
    });
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('play', () => {
      setPlayingUI(true);
      startRaf();
      updateMediaPlaybackState();
    });
    video.addEventListener('playing', () => {
      if (!state.overlayError) hideOverlay();
      setPlayingUI(true);
      startRaf();
    });
    video.addEventListener('pause', () => {
      setPlayingUI(false);
      stopRaf();
      clearPipeline();
      updateMediaPlaybackState();
    });
    video.addEventListener('ended', () => {
      setPlayingUI(false);
      stopRaf();
      if (state.loopActive && state.loopA !== null) {
        video.currentTime = state.loopA;
        play();
      } else {
        clearPipeline();
        updateMediaPlaybackState();
      }
    });
    video.addEventListener('timeupdate', () => {
      render();
      checkLoop();
    });
    video.addEventListener('seeked', () => {
      clearPipeline();
      render();
    });
    video.addEventListener('progress', renderBuffered);
    video.addEventListener('error', onVideoError);
    video.addEventListener('click', () => {
      if (state.file) togglePlay();
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !video.paused) startRaf();
    });
  }

  // ── PWA ───────────────────────────────────────────────────
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const secure = location.protocol === 'https:' ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1';
    if (!secure) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // ── Inicio ────────────────────────────────────────────────
  function init() {
    initTheme();

    const storedVolume = parseFloat(readStored(STORAGE_VOLUME));
    if (Number.isFinite(storedVolume)) {
      state.volume = clamp(storedVolume, 0, 1);
      state.muted = state.volume === 0;
    }
    applyVolume(false);

    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    overlayTitle.textContent = coarse ? 'Elige un vídeo para practicar' : 'Arrastra un vídeo aquí';

    renderPitch();
    renderSpeed();
    renderLoop();
    render();
    setPlayingUI(false);
    updateTransportEnabled(false);

    btnOpen.addEventListener('click', () => fileInput.click());
    btnOverlayOpen.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (file) openFile(file);
    });

    btnPlay.addEventListener('click', togglePlay);
    btnStop.addEventListener('click', stopPlayback);
    btnLoop.addEventListener('click', toggleLoopPoint);

    Array.from(document.querySelectorAll('[data-skip]')).forEach((button) => {
      button.addEventListener('click', () => skip(Number(button.dataset.skip)));
    });

    btnPitchDown.addEventListener('click', () => setPitch(state.pitch - 1));
    btnPitchUp.addEventListener('click', () => setPitch(state.pitch + 1));
    btnPitchReset.addEventListener('click', () => setPitch(0));

    ruler.addEventListener('pointerdown', onRulerPointerDown);
    ruler.addEventListener('pointermove', onRulerPointerMove);
    ruler.addEventListener('pointerup', (event) => {
      try { ruler.releasePointerCapture(event.pointerId); } catch (error) {}
    });
    ruler.addEventListener('pointercancel', (event) => {
      try { ruler.releasePointerCapture(event.pointerId); } catch (error) {}
    });
    ruler.addEventListener('keydown', onRulerKeyDown);

    speedGroup.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-speed]');
      if (button) setSpeed(parseFloat(button.dataset.speed));
    });
    btnSpeedReset.addEventListener('click', () => setSpeed(1));

    track.addEventListener('pointerdown', onTrackPointerDown);
    track.addEventListener('pointermove', onTrackPointerMove);
    track.addEventListener('pointerup', endTrackPointer);
    track.addEventListener('pointercancel', endTrackPointer);
    track.addEventListener('keydown', onTrackKeyDown);

    volume.addEventListener('input', () => {
      state.volume = clamp(Number(volume.value) / 100, 0, 1);
      state.muted = state.volume === 0;
      applyVolume(true);
    });
    btnMute.addEventListener('click', toggleMute);

    btnTheme.addEventListener('click', toggleTheme);
    btnFullscreen.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', syncFullscreenUI);
    document.addEventListener('webkitfullscreenchange', syncFullscreenUI);

    document.addEventListener('dragover', onDragOver);
    document.addEventListener('dragenter', onDragOver);
    document.addEventListener('dragleave', onDragLeave);
    document.addEventListener('drop', onDrop);
    document.addEventListener('keydown', onGlobalKeyDown);

    window.addEventListener('beforeunload', () => {
      if (state.url) URL.revokeObjectURL(state.url);
    });

    bindVideoEvents();
    setupMediaSession();
    syncFullscreenUI();
    registerServiceWorker();

    // Marca de vida para comprobaciones automatizadas.
    document.documentElement.dataset.ready = '1';
  }

  init();
})();
