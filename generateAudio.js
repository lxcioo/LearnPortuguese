// WICHTIG: Hier holen wir die Funktion direkt aus dem Paket (Destructuring)
const { getAudioUrl } = require('google-tts-api'); 
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

async function downloadAudio(filename, text, lang) {
  const filePath = path.join(outputDir, `${filename}.mp3`);
  
  // Wenn Datei schon da ist, überspringen
  if (fs.existsSync(filePath)) {
      console.log(`Skipping (exists): ${filename}`);
      return;
  }

  try {
    // FEHLERBEHEBUNG: Wir rufen jetzt direkt getAudioUrl() auf, ohne "googleTTS." davor
    const url = getAudioUrl(text, {
      lang: lang,
      slow: false,
      host: 'https://translate.google.com',
    });

    const file = fs.createWriteStream(filePath);
    return new Promise((resolve, reject) => {
      https.get(url, function(response) {
        if (response.statusCode !== 200) {
            reject(new Error(`Google TTS Request Failed: ${response.statusCode}`));
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
  } catch (e) {
      console.error(`Fehler bei ${filename}:`, e.message);
  }
}

async function run() {
  console.log("--- Starte Audio-Pipeline für LearnPortuguese ---");

  for (const course of content.courses) {
    for (const lesson of course.lessons) {
      for (const exercise of lesson.exercises) {
        
        // 1. Audio für die Lösung/Frage
        if (exercise.audioText) {
          // Wir nutzen pt-PT (Portugal)
          await downloadAudio(exercise.id, exercise.audioText, 'pt-PT');
        }
        
        // 2. Audio für Multiple Choice Optionen
        if (exercise.options) {
             // WICHTIG: forEach funktioniert nicht gut mit await. Wir nutzen eine normale Schleife.
             for (let index = 0; index < exercise.options.length; index++) {
                 const opt = exercise.options[index];
                 const lang = exercise.optionsLanguage || 'pt-PT';
                 await downloadAudio(`${exercise.id}_opt_${index}`, opt, lang);
             }
        }
      }
    }
  }
  console.log("--- Fertig! ---");
}

run();