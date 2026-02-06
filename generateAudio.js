const fs = require('fs');
const path = require('path');
const https = require('https');

// Deine Inhalts-Datei laden
const content = require('./content.json');

// Das Zielverzeichnis für den Upload
const outputDir = path.join(__dirname, 'public', 'audio');

// Verzeichnis erstellen
if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

// --- HILFSFUNKTION: URL SELBST BAUEN (Ohne Bibliothek) ---
function getGoogleTTSUrl(text, lang) {
    const encoded = encodeURIComponent(text);
    // Das ist die offizielle Google Translate TTS API Schnittstelle
    return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&total=1&idx=0&textlen=${text.length}&client=tw-ob&prev=input&ttsspeed=1`;
}

async function downloadAudio(filename, text, lang) {
  const filePath = path.join(outputDir, `${filename}.mp3`);
  
  // Überspringen, wenn Datei schon da
  if (fs.existsSync(filePath)) {
      console.log(`Skipping (exists): ${filename}`);
      return;
  }

  // URL generieren
  const url = getGoogleTTSUrl(text, lang);

  const file = fs.createWriteStream(filePath);
  return new Promise((resolve, reject) => {
    https.get(url, function(response) {
      if (response.statusCode !== 200) {
          reject(new Error(`Google TTS Blocked or Error: ${response.statusCode}`));
          return;
      }
      response.pipe(file);
      file.on('finish', function() {
        file.close(() => {
          console.log(`✅ Generated: ${filename}.mp3`);
          resolve();
        });
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log("--- Starte Audio-Pipeline (Manual Mode) ---");

  for (const course of content.courses) {
    for (const lesson of course.lessons) {
      for (const exercise of lesson.exercises) {
        
        // 1. Audio für Lösung/Frage
        if (exercise.audioText) {
          try {
            await downloadAudio(exercise.id, exercise.audioText, 'pt-PT');
          } catch (e) {
            console.error(`❌ Fehler bei ${exercise.id}:`, e.message);
          }
        }
        
        // 2. Audio für Optionen
        if (exercise.options) {
             for (let index = 0; index < exercise.options.length; index++) {
                 const opt = exercise.options[index];
                 const lang = exercise.optionsLanguage || 'pt-PT';
                 try {
                    await downloadAudio(`${exercise.id}_opt_${index}`, opt, lang);
                 } catch (e) {
                    console.error(`❌ Fehler bei Option ${index}:`, e.message);
                 }
             }
        }
      }
    }
  }
  console.log("--- Fertig! ---");
}

run();