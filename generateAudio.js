const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Lade die Content-Datei
const contentPath = path.join(__dirname, 'content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

const AUDIO_DIR = path.join(__dirname, 'assets', 'audio');

// Stelle sicher, dass der Ordner existiert
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Funktion zum Herunterladen (Google TTS)
const downloadAudio = (text, filename) => {
    return new Promise((resolve, reject) => {
        const filePath = path.join(AUDIO_DIR, `${filename}.mp3`);
        
        // Wenn Datei schon existiert, überspringen (spart Zeit)
        if (fs.existsSync(filePath)) {
            // console.log(`Skipping existing: ${filename}`);
            resolve();
            return;
        }

        console.log(`Generating: ${filename} -> "${text}"`);

        // URL für Google TTS (Portugiesisch)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=pt&client=tw-ob`;

        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                console.error(`Failed to download ${text}: Status ${res.statusCode}`);
                // Bei Fehler nicht abbrechen, sondern leere Datei oder weitermachen
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
            console.error(`Error downloading ${filename}:`, err.message);
            resolve(); // Trotzdem resolven, damit die Schleife weitergeht
        });
    });
};

const run = async () => {
    console.log("--- Starte Smart Audio-Pipeline (Neue Struktur) ---");
    
    const course = content.courses[0];
    
    // NEU: Wir iterieren durch UNITS -> LEVELS -> EXERCISES
    if (!course.units) {
        console.error("Fehler: Keine 'units' in content.json gefunden!");
        return;
    }

    for (const unit of course.units) {
        console.log(`Verarbeite Unit: ${unit.title}`);
        
        if (!unit.levels) continue;

        for (const level of unit.levels) {
            
            if (!level.exercises) continue;

            for (const exercise of level.exercises) {
                // Wir brauchen Audio für:
                // 1. Die Frage (wenn es Portugiesisch ist)
                // 2. Die Antwort (wenn es Portugiesisch ist)
                // 3. AudioText (speziell für Multiple Choice)

                // Fall A: Die richtige Antwort ist Portugiesisch (z.B. bei translate_to_pt)
                if (exercise.type === 'translate_to_pt') {
                    await downloadAudio(exercise.correctAnswer, exercise.id);
                }
                
                // Fall B: Die Frage ist Portugiesisch (z.B. bei translate_to_de)
                else if (exercise.type === 'translate_to_de') {
                    await downloadAudio(exercise.question, exercise.id);
                }

                // Fall C: Multiple Choice (hat oft ein extra 'audioText' Feld oder wir nehmen die Frage)
                else if (exercise.type === 'multiple_choice') {
                    // Wenn audioText existiert, nimm das. Sonst nimm die Frage, falls sie portugiesisch klingt? 
                    // Besser: Wir verlassen uns auf 'audioText' aus der JSON, wenn da.
                    if (exercise.audioText) {
                         await downloadAudio(exercise.audioText, exercise.id);
                    } else {
                         // Fallback: Manchmal ist die Frage das Audio (z.B. "Was hörst du?")
                         // Hier generieren wir sicherheitshalber Audio für die richtige Antwort, 
                         // falls diese vorgelesen werden soll nach dem Klick.
                         // Aber für die Aufgabe selbst nutzen wir meist audioText.
                         // Wir laden hier mal die Antwort runter, damit man Feedback hat.
                         await downloadAudio(exercise.correctAnswer, `${exercise.id}_answer`);
                    }
                    
                    // Optionen vorlesen (optional, z.B. für Blinde oder zum Lernen)
                    if (exercise.options) {
                        for (let i = 0; i < exercise.options.length; i++) {
                            await downloadAudio(exercise.options[i], `${exercise.id}_opt_${i}`);
                        }
                    }
                }
            }
        }
    }
    
    console.log("--- Fertig! Alle Audios sind generiert. ---");
};

run();