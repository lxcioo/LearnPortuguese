const googleTTS = require('google-tts-api');
const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Lade die JSON Datei
const content = require('./content.json');

// Ordner für GitHub Pages (public/audio)
const outputDir = path.join(__dirname, 'public', 'audio');

if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

async function downloadAudio(filename, text, lang) {
  // Nur herunterladen, wenn Datei noch nicht existiert (spart Zeit)
  const filePath = path.join(outputDir, `${filename}.mp3`);
  if (fs.existsSync(filePath)) {
      console.log(`Skipping (exists): ${filename}`);
      return;
  }

  const url = googleTTS.getAudioUrl(text, {
    lang: lang,
    slow: false,
    host: 'https://translate.google.com',
  });

  const file = fs.createWriteStream(filePath);
  return new Promise((resolve, reject) => {
    https.get(url, function(response) {
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
  console.log("--- Starte Audio-Pipeline ---");

  // Durchlaufe alle Lektionen und Übungen aus content.json
  for (const course of content.courses) {
    for (const lesson of course.lessons) {
      for (const exercise of lesson.exercises) {
        
        // Audio für die Lösung (Portugiesisch)
        if (exercise.audioText) {
          // Wir nutzen die ID als Dateiname
          await downloadAudio(exercise.id, exercise.audioText, 'pt-PT');
        }
        
        // Audio für Optionen (bei Multiple Choice)
        if (exercise.options) {
             exercise.options.forEach(async (opt, index) => {
                 // Einfacher Trick: Dateiname = exID_optIndex
                 // Sprache: Hängt davon ab. Wir nehmen mal pt-PT an, außer wir erweitern das JSON.
                 await downloadAudio(`${exercise.id}_opt_${index}`, opt, 'pt-PT');
             });
        }
      }
    }
  }
  console.log("--- Fertig! ---");
}

run();