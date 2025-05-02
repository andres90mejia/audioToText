const startBtn = document.getElementById('startBtn');
const clearBtn = document.getElementById('clearBtn');
const langButtons = document.querySelectorAll('.lang-btn');
const transcription = document.getElementById('transcription');
const historyOriginal = document.getElementById('history-original');
const historyTranslation = document.getElementById('history-translation');
const statusMessage = document.getElementById('status');

let recognition = null;
let isRecording = false;
let currentLanguage = 'es-ES'; // Idioma de reconocimiento
let historyData = [];

// Mapea el idioma de reconocimiento al código de traducción
function getTranslationCodes(lang) {
  // Si se reconoce en español, se traduce de 'es' a 'en', y viceversa.
  if (lang === 'es-ES') {
    return { source: 'es', target: 'en' };
  } else if (lang === 'en-US') {
    return { source: 'en', target: 'es' };
  }
  // Por defecto, asume español a inglés
  return { source: 'es', target: 'en' };
}

// Función para traducir texto usando LibreTranslate API
async function translateText(text, lang) {
    const { source, target } = getTranslationCodes(lang);
  
    if (!text || typeof text !== 'string') {
      console.error('Texto a traducir no válido:', text);
      statusMessage.textContent = 'Error: Texto a traducir no válido';
      return 'Error al traducir';
    }
  
    try {
      const endpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`;
      
      const response = await fetch(endpoint);
  
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
  
      const data = await response.json();
      if (!data.responseData || !data.responseData.translatedText) {
        throw new Error('No translatedText in response');
      }
  
      return data.responseData.translatedText;
    } catch (error) {
      console.error('Error en la traducción:', error);
      statusMessage.textContent = `Error en la traducción: ${error.message}`;
      return 'Error al traducir';
    }
}


// Inicializa el reconocimiento de voz
function initializeRecognition() {
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = currentLanguage;

    recognition.onstart = () => {
      statusMessage.textContent = currentLanguage === 'es-ES' ? "Escuchando..." : "Listening...";
      startBtn.classList.add('recording');
      startBtn.textContent = currentLanguage === 'es-ES' ? "⏹️ Detener" : "⏹️ Stop";
    };

    recognition.onerror = (event) => {
      console.error('Error:', event.error);
      statusMessage.textContent = `Error: ${event.error}`;
      stopRecognition();
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalTranscript = '';
      // Procesa solo los resultados nuevos usando event.resultIndex
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      
      transcription.textContent = interim;
      if (finalTranscript) {
        // Agrega mensaje original y traduce de forma asíncrona
        addToHistory(finalTranscript.trim());
        transcription.textContent = '';
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        recognition.start(); // Reinicia si aún está grabando
      }
    };
  } else {
    startBtn.disabled = true;
    statusMessage.textContent = "Navegador no compatible";
  }
}

// Inicia o detiene la grabación de voz
async function toggleRecording() {
  if (!isRecording) {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      isRecording = true;
      if (!recognition) initializeRecognition();
      recognition.lang = currentLanguage; // Asegura que siempre tenga el idioma actualizado
      recognition.start();
    } catch (err) {
      statusMessage.textContent = "Acceso al micrófono denegado";
      console.error(err);
    }
  } else {
    stopRecognition();
  }
}

// Detiene la grabación y reinicia la UI
function stopRecognition() {
  if (recognition) {
    recognition.stop();
  }
  isRecording = false;
  resetUI();
}

// Restablece la UI cuando se detiene la grabación
function resetUI() {
  startBtn.classList.remove('recording');
  startBtn.textContent = "🎤 " + (currentLanguage === 'es-ES' ? "Iniciar" : "Start");
  statusMessage.textContent = currentLanguage === 'es-ES' ? "Presiona Iniciar para comenzar" : "Press Start to begin";
}

// Limpia la transcripción y ambos historiales
function clearAll() {
  transcription.textContent = '';
  historyOriginal.innerHTML = '<h3>Original</h3>';
  historyTranslation.innerHTML = '<h3>Traducción</h3>';
  historyData = [];
}

// Agrega el mensaje al historial original y solicita su traducción
async function addToHistory(text) {
  const timestamp = new Date();
  historyData.unshift({ text, timestamp });

  // Crea la burbuja del mensaje original
  const entryOriginal = document.createElement('div');
  entryOriginal.className = 'message-bubble';
  entryOriginal.innerHTML = `
    <div class="message-time">${timestamp.toLocaleTimeString()}</div>
    <div class="message-text">${text}</div>
  `;
  historyOriginal.insertBefore(entryOriginal, historyOriginal.firstChild);

  // Traduce el texto y agrega la traducción al historial correspondiente
  const translatedText = await translateText(text, currentLanguage);
  const entryTranslation = document.createElement('div');
  entryTranslation.className = 'message-bubble';
  entryTranslation.innerHTML = `
    <div class="message-time">${timestamp.toLocaleTimeString()}</div>
    <div class="message-text">${translatedText}</div>
  `;
  historyTranslation.insertBefore(entryTranslation, historyTranslation.firstChild);
}

// Maneja el cambio de idioma
function handleLanguageChange(lang) {
  if (currentLanguage !== lang) {
    currentLanguage = lang;
    langButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    stopRecognition(); // Detiene la grabación antes de cambiar el idioma
    clearAll();
  }
}

// Eventos para los botones
startBtn.addEventListener('click', toggleRecording);
clearBtn.addEventListener('click', clearAll);
langButtons.forEach(btn => {
  btn.addEventListener('click', () => handleLanguageChange(btn.dataset.lang));
});

// Inicializa el reconocimiento de voz al cargar la página
initializeRecognition();
