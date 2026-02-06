const fs = require('fs');
const path = require('path');
const https = require('https');

const content = require('./content.json');
const outputDir = path.join(__dirname, 'public', 'audio');

if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir, { recursive: true });
}

function getGoogleTTSUrl(text, lang) {
    const encoded = encodeURIComponent(text);
    return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&total=1&idx=0&textlen=${text.length}&client=tw-ob&prev=input&ttsspeed=1`;
}

async function downloadAudio(filename, text, lang) {
  const filePath = path.join(outputDir, `${filename}.mp3`);
  
  // WICHTIG: Hier prüfen wir, ob die Datei schon da ist.
  // Wenn du einen Satz im JSON änderst, musst du die MP3 lokal löschen 
  // oder diesen Check kurz auskommentieren, damit er neu generiert wird.
  if (fs.existsSync(filePath)) {
      console.log(`Skipping (exists): ${filename}`);
      return;
  }

  const url = getGoogleTTSUrl(text, lang);
  const file = fs.createWriteStream(filePath);

  return new Promise((resolve, reject) => {
    https.get(url, function(response) {
      if (response.statusCode !== 200) {
          reject(new Error(`Google TTS Error: ${response.statusCode}`));
          return;
      }
      response.pipe(file);
      file.on('finish', function() {
        file.close(() => {
          console.log(`✅ Generated (${lang}): ${filename}.mp3`);
          resolve();
        });
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log("--- Starte Smart Audio-Pipeline ---");

  for (const course of content.courses) {
    for (const lesson of course.lessons) {
      for (const exercise of lesson.exercises) {
        
        // 1. HAUPT-AUDIO (Frage oder Lösung)
        if (exercise.audioText) {
          // NEU: Nutze die Sprache aus dem JSON, sonst Standard pt-PT
          const lang = exercise.audioLanguage || 'pt-PT';
          try {
            await downloadAudio(exercise.id, exercise.audioText, lang);
          } catch (e) {
            console.error(`❌ Fehler bei ${exercise.id}:`, e.message);
          }
        }
        
        // 2. OPTIONEN (Multiple Choice)
        if (exercise.options) {
             for (let index = 0; index < exercise.options.length; index++) {
                 const opt = exercise.options[index];
                 // NEU: Nutze optionsLanguage (wichtig für deutsche Antworten!)
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