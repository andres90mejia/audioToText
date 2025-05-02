# Voz a Texto con Historial y Traducción

**Voz a Texto con Historial y Traducción** es una aplicación web ligera que te permite transcribir tu voz en tiempo real, mantener un historial paralelo de lo dicho y su traducción automática entre español e inglés.

## 🚀 Características principales

- **Reconocimiento de voz continuo**  
  Utiliza la Web Speech API para capturar audio en directo y convertirlo en texto.
- **Historial bidireccional**  
  Guarda cada fragmento reconocido en dos columnas:  
  - Original (texto en el idioma de captura)  
  - Traducción (texto traducido al idioma opuesto)
- **Selector de idioma**  
  Botones para alternar entre reconocimiento en español (es‑ES) e inglés (en‑US).
- **Control de grabación y limpieza**  
  - 🎤 Iniciar/Detener: activa o pausa el reconocimiento  
  - 🗑️ Limpiar: borra la transcripción actual y todo el historial
- **Indicaciones de estado y animaciones**  
  Muestra mensajes (“Escuchando…”, “Listening…”, errores) y animaciones sutiles para feedback visual.

## 🛠 Tecnologías usadas

- **HTML5 & CSS3** con Flexbox y gradientes para un diseño responsive y moderno  
- **JavaScript** puro (ES6+)  
- **Web Speech API** (`SpeechRecognition`) para el reconocimiento de voz  
- **Fetch API** para traducción automática usando MyMemory (API pública de traducción)

## ⚙️ Cómo arrancar el proyecto

1. Clona este repositorio  
   ```bash
   git clone https://github.com/tuusuario/voz-texto-historial.git
   cd voz-texto-historial
2. Abre index.html en tu navegador (Chrome o Edge)
3. Concede permiso al micrófono cuando te lo solicite el navegador.
4. Selecciona el idioma, pulsa 🎤 Iniciar y comienza a hablar.
5. Para borrar todo, pulsa 🗑️ Limpiar.
