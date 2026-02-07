const fs = require('fs');
const path = require('path');
const https = require('https');

// Pfad zur content.json
const contentPath = path.join(__dirname, 'content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

// WICHTIG: Speicherort für GitHub Pages
// Wir speichern es direkt im Ordner 'audio' im Hauptverzeichnis.
// Wenn du das auf GitHub pushst, ist es unter .../LearnPortuguese/audio/ erreichbar.
const AUDIO_DIR = path.join(__dirname, 'audio');

// Stelle sicher, dass der Ordner existiert
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Hilfsfunktion: Download (Google TTS)
const downloadAudio = (text, filename) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(AUDIO_DIR, `${filename}.mp3`);
        
        // Wenn Datei schon existiert, überspringen (spart Zeit & API-Calls)
        if (fs.existsSync(filePath)) {
            resolve();
            return;
        }

        console.log(`Erstelle Audio: ${filename}.mp3 -> "${text}"`);

        // URL für Google TTS (Portugiesisch)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=pt&client=tw-ob`;

        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                console.error(`Fehler bei ${text}: Status ${res.statusCode}`);
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
            console.error(`Download-Fehler ${filename}:`, err.message);
            resolve();
        });
    });
};

const run = async () => {
    console.log("--- Starte Audio-Generierung für GitHub Pages ---");
    
    const course = content.courses[0];

    // Hier liegt der Fix: Wir gehen durch die UNITS -> LEVELS -> EXERCISES
    if (course.units) {
        for (const unit of course.units) {
            console.log(`Verarbeite Kapitel: ${unit.title}`);
            
            if (unit.levels) {
                for (const level of unit.levels) {
                    if (level.exercises) {
                        for (const exercise of level.exercises) {
                            
                            // 1. Frage vorlesen (wenn Portugiesisch)
                            if (exercise.type === 'translate_to_de') {
                                await downloadAudio(exercise.question, exercise.id);
                            }
                            
                            // 2. Antwort vorlesen (wenn Portugiesisch)
                            if (exercise.type === 'translate_to_pt') {
                                await downloadAudio(exercise.correctAnswer, exercise.id);
                            }

                            // 3. Multiple Choice & AudioText
                            if (exercise.type === 'multiple_choice') {
                                // Wenn ein spezieller Audio-Text da ist (z.B. ohne "Was heißt...")
                                if (exercise.audioText) {
                                     await downloadAudio(exercise.audioText, exercise.id);
                                } 
                                // Die richtige Antwort auch generieren (als Feedback nach dem Klick)
                                await downloadAudio(exercise.correctAnswer, `${exercise.id}_answer`);

                                // Optionen vorlesen (z.B. u1_l1_e4_opt_0)
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
    
    console.log("--- Fertig! Bitte jetzt 'git push' machen! ---");
};

run();