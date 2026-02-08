const fs = require('fs');
const path = require('path');
const https = require('https');

// Pfad zur content.json
const contentPath = path.join(__dirname, 'content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

// Wir speichern im Ordner 'audio'
const AUDIO_DIR = path.join(__dirname, 'audio');

// Alten Ordner löschen für sauberen Neustart
if (fs.existsSync(AUDIO_DIR)) {
    console.log("🗑️  Lösche alte Audio-Dateien...");
    fs.rmSync(AUDIO_DIR, { recursive: true, force: true });
}
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Download Funktion mit Sprach-Parameter (Standard: pt-PT)
const downloadAudio = (text, filename, lang = 'pt-PT') => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(AUDIO_DIR, `${filename}.mp3`);
        
        if (fs.existsSync(filePath)) {
            resolve();
            return;
        }

        console.log(`Generiere (${lang}): ${filename} -> "${text}"`);
        
        // URL mit dynamischer Sprache (tl=...)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

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
    console.log("--- 🎧 Audio Generierung gestartet ---");
    const course = content.courses[0];

    if (course.units) {
        for (const unit of course.units) {
            if (unit.levels) {
                for (const level of unit.levels) {
                    if (level.exercises) {
                        for (const exercise of level.exercises) {
                            
                            // 1. Übersetze PT -> DE (Antwort ist PT -> Audio PT)
                            if (exercise.type === 'translate_to_pt') {
                                await downloadAudio(exercise.correctAnswer, exercise.id, 'pt-PT');
                            }
                            
                            // 2. Übersetze DE -> PT (Frage ist PT -> Audio PT)
                            else if (exercise.type === 'translate_to_de') {
                                await downloadAudio(exercise.question, exercise.id, 'pt-PT');
                            }
                            
                            // 3. Multiple Choice
                            else if (exercise.type === 'multiple_choice') {
                                // Frage-Audio (PT) - nur wenn audioText existiert
                                if (exercise.audioText) {
                                    await downloadAudio(exercise.audioText, exercise.id, 'pt-PT');
                                }
                                
                                // Bestimme Sprache für Optionen und Antwort
                                // Standard ist Portugiesisch, außer es steht explizit "de" in der content.json
                                const optionsLang = exercise.optionsLanguage === 'de' ? 'de' : 'pt-PT';
                                
                                // Antwort-Audio
                                await downloadAudio(exercise.correctAnswer, `${exercise.id}_answer`, optionsLang);
                                
                                // Optionen-Audio
                                if (exercise.options) {
                                    for (let i = 0; i < exercise.options.length; i++) {
                                        await downloadAudio(exercise.options[i], `${exercise.id}_opt_${i}`, optionsLang);
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