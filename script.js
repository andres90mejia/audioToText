// script.js (versión 2)
const startBtn           = document.getElementById('startBtn');
const clearBtn           = document.getElementById('clearBtn');
const toggleHistoryBtn   = document.getElementById('toggleHistoryBtn');
const langButtons        = document.querySelectorAll('.lang-btn');
const transcription      = document.getElementById('transcription');
const historyOriginal    = document.getElementById('history-original');
const historyTranslation = document.getElementById('history-translation');
const historyWrapper     = document.getElementById('historyWrapper');
const statusMessage      = document.getElementById('status');
const volumeLevel        = document.getElementById('volumeLevel');

let recognition   = null;
let isRecording   = false;
let currentLanguage = 'es-ES';
let sharedStream  = null;
let audioContext  = null;
let analyser      = null;

// —— Traducción ——
function getTranslationCodes(lang) {
  return lang === 'es-ES'
    ? { source: 'es', target: 'en' }
    : { source: 'en', target: 'es' };
}

async function translateText(text, lang) {
  const { source, target } = getTranslationCodes(lang);
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`
    );
    const data = await res.json();
    return data.responseData.translatedText || 'Error al traducir';
  } catch {
    return 'Error al traducir';
  }
}

// —— SpeechRecognition setup ——
function initializeRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    statusMessage.textContent = 'Navegador no compatible';
    startBtn.disabled = true;
    return;
  }
  recognition = new SR();
  recognition.continuous      = true;
  recognition.interimResults  = true;
  recognition.lang            = currentLanguage;

  recognition.onstart = () => {
    statusMessage.textContent =
      currentLanguage === 'es-ES' ? 'Escuchando...' : 'Listening...';
    startBtn.classList.add('recording');
    startBtn.textContent =
      currentLanguage === 'es-ES' ? '⏹️ Detener' : '⏹️ Stop';
    isRecording = true;
  };

  recognition.onresult = (e) => {
    let interim = '', finalT = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalT += r[0].transcript + ' ';
      else interim += r[0].transcript;
    }
    transcription.textContent = interim;
    if (finalT) addToHistory(finalT.trim());
  };

  recognition.onerror = (e) => {
    statusMessage.textContent = `Error: ${e.error}`;
    stopRecognition();
  };

  recognition.onend = () => {
    // Si estábamos grabando, lo dejamos corriendo (Chrome a veces lo para solo)
    if (isRecording) recognition.start();
  };
}

// —— Control de grabación ——
function toggleRecording() {
  if (!recognition) return;

  if (isRecording) {
    stopRecognition();
  } else {
    // Arrancamos *una sola vez* la recogida de audio
    recognition.lang = currentLanguage;
    recognition.start();
    // Volumen (usa el stream que ya pedimos)
    if (sharedStream) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const src = audioContext.createMediaStreamSource(sharedStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      function updateVolume() {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (const v of dataArray) {
          const norm = (v - 128) / 128;
          sum += norm * norm;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const pct = Math.min(rms * 150, 100);
        volumeLevel.style.width = `${pct}%`;
        if (isRecording) requestAnimationFrame(updateVolume);
      }
      requestAnimationFrame(updateVolume);
    }
  }
}

function stopRecognition() {
  isRecording = false;
  if (recognition) recognition.stop();
  resetUI();
  volumeLevel.style.width = '0';
  if (audioContext) audioContext.close();
}

function resetUI() {
  startBtn.classList.remove('recording');
  startBtn.textContent =
    `🎤 ${currentLanguage === 'es-ES' ? 'Iniciar' : 'Start'}`;
  statusMessage.textContent =
    currentLanguage === 'es-ES'
      ? 'Presiona Iniciar para comenzar'
      : 'Press Start to begin';
}

// —— Historial ——
function clearAll() {
  transcription.textContent = '';
  historyOriginal.innerHTML = '<h3>Original</h3>';
  historyTranslation.innerHTML = '<h3>Traducción</h3>';
}

async function addToHistory(text) {
  const ts = new Date();
  // Original
  const orig = document.createElement('div');
  orig.className = 'message-bubble';
  orig.innerHTML = `
    <div class="message-time">${ts.toLocaleTimeString()}</div>
    <div class="message-text">${text}</div>`;
  historyOriginal.insertBefore(orig, historyOriginal.firstChild);
  setTimeout(() => orig.classList.add('show'), 10);

  // Traducción
  const tr = await translateText(text, currentLanguage);
  const transEl = document.createElement('div');
  transEl.className = 'message-bubble';
  transEl.innerHTML = `
    <div class="message-time">${ts.toLocaleTimeString()}</div>
    <div class="message-text">${tr}</div>`;
  historyTranslation.insertBefore(transEl, historyTranslation.firstChild);
  setTimeout(() => transEl.classList.add('show'), 10);
}

// —— Cambio de idioma SIN detener ni reiniciar reconocimiento ——  
function handleLanguageChange(lang) {
  if (lang === currentLanguage) return;
  currentLanguage = lang;
  langButtons.forEach(btn =>
    btn.classList.toggle('active', btn.dataset.lang === lang)
  );

  // Actualizamos la propiedad lang de la misma instancia
  if (recognition) recognition.lang = currentLanguage;

  // Si estamos grabando, actualizamos el texto de UI inmediatamente
  if (isRecording) {
    statusMessage.textContent =
      currentLanguage === 'es-ES' ? 'Escuchando...' : 'Listening...';
    startBtn.textContent =
      currentLanguage === 'es-ES' ? '⏹️ Detener' : '⏹️ Stop';
  }

  // Limpiamos historial/transcripción (opcional)
  clearAll();
}

// —— Toggle historial en móvil ——
toggleHistoryBtn.addEventListener('click', () => {
  historyWrapper.style.display =
    historyWrapper.style.display === 'none' ? 'flex' : 'none';
});

// —— Sólo pedimos permiso la primera vez ——
async function initMedia() {
  const askedBefore = localStorage.getItem('micAsked');
  if (!askedBefore) {
    localStorage.setItem('micAsked', 'true');
    try {
      sharedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      statusMessage.textContent = 'Micrófono no disponible';
      startBtn.disabled = true;
      return;
    }
  } else {
    // ya preguntamos, intentamos sin prompt
    try {
      sharedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      statusMessage.textContent = 'Permiso de micrófono denegado';
      startBtn.disabled = true;
      return;
    }
  }

  initializeRecognition();
}

// —— Mantener historial visible al redimensionar ——
function adjustHistoryOnResize() {
  if (window.innerWidth > 600) {
    historyWrapper.style.display = 'flex';
  }
}

// —— Listeners generales ——
startBtn.addEventListener('click', toggleRecording);
clearBtn.addEventListener('click', clearAll);
langButtons.forEach(btn =>
  btn.addEventListener('click', () => handleLanguageChange(btn.dataset.lang))
);

window.addEventListener('load', initMedia);
window.addEventListener('resize', adjustHistoryOnResize);
adjustHistoryOnResize();
