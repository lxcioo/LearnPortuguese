const fs = require('fs');
const path = require('path');
const https = require('https');

// Pfad zur content.json
const contentPath = path.join(__dirname, 'content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

// Wir speichern im Ordner 'audio'
const AUDIO_DIR = path.join(__dirname, 'audio');

// --- ÄNDERUNG: Alten Ordner komplett löschen für sauberen Neustart ---
if (fs.existsSync(AUDIO_DIR)) {
    console.log("🗑️  Lösche alte Audio-Dateien...");
    fs.rmSync(AUDIO_DIR, { recursive: true, force: true });
}
// Neuen leeren Ordner erstellen
fs.mkdirSync(AUDIO_DIR, { recursive: true });


// Download Funktion
const downloadAudio = (text, filename) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(AUDIO_DIR, `${filename}.mp3`);
        
        // (Der Check auf Existenz ist hier eigentlich überflüssig geworden, 
        // da wir oben löschen, aber er schadet nicht als Sicherheit)
        if (fs.existsSync(filePath)) {
            resolve();
            return;
        }

        console.log(`Generiere: ${filename}`);
        // WICHTIG: tl=pt-PT erzwingt europäisches Portugiesisch
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=pt-PT&client=tw-ob`;

        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                console.error(`Fehler ${res.statusCode} bei: ${text}`);
                resolve(); 
                return;
            }
            const fileStream = fs.createWriteStream(filePath);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });
        }).on('error', (err) => {
            console.error(err);
            resolve();
        });
    });
};

const run = async () => {
    console.log("--- 🇵🇹 Audio Generierung gestartet (Alles neu) ---");
    const course = content.courses[0];

    if (course.units) {
        for (const unit of course.units) {
            if (unit.levels) {
                for (const level of unit.levels) {
                    if (level.exercises) {
                        for (const exercise of level.exercises) {
                            // 1. Übersetze PT -> DE (Antwort ist PT)
                            if (exercise.type === 'translate_to_pt') {
                                await downloadAudio(exercise.correctAnswer, exercise.id);
                            }
                            // 2. Übersetze DE -> PT (Frage ist PT)
                            else if (exercise.type === 'translate_to_de') {
                                await downloadAudio(exercise.question, exercise.id);
                            }
                            // 3. Multiple Choice
                            else if (exercise.type === 'multiple_choice') {
                                // Frage-Audio (wenn audioText gesetzt ist, sonst Frage selbst)
                                if (exercise.audioText) {
                                    await downloadAudio(exercise.audioText, exercise.id);
                                }
                                
                                // Antwort-Audio (wird oft nach dem Klick abgespielt)
                                await downloadAudio(exercise.correctAnswer, `${exercise.id}_answer`);
                                
                                // Optionen (falls man sie vorlesen lassen will)
                                if (exercise.options) {
                                    for (let i = 0; i < exercise.options.length; i++) {
                                        await downloadAudio(exercise.options[i], `${exercise.id}_opt_${i}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    console.log("--- ✅ Fertig! Alle Dateien wurden neu erstellt. ---");
};

run();