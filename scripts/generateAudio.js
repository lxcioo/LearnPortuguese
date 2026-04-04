const fs = require('fs');
const path = require('path');
const https = require('https');

const unitsDir = path.join(__dirname, '../src/model/data/units');
const AUDIO_DIR = path.join(__dirname, '../assets/audio');
const MANIFEST_PATH = path.join(AUDIO_DIR, 'audio_manifest.json');

// Alle Dateien im Ordner finden, die auf .json enden.
const unitFiles = fs.readdirSync(unitsDir).filter(file => file.endsWith('.json'));

const loadedUnits = [];
for (const file of unitFiles) {
    const filePath = path.join(unitsDir, file);
    const unitData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    loadedUnits.push(unitData);
}

const content = {
    courses: [
        {
            units: loadedUnits
        }
    ]
};

// 1. Ordner NICHT mehr löschen, sondern nur erstellen falls er fehlt
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// 2. Manifest laden (speichert welcher Text zu welcher Datei gehört)
let manifest = {};
if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

// 3. Set für alle aktuell benötigten Dateien
const requiredFiles = new Set();

const downloadAudio = (text, filename, lang = 'pt-PT') => {
    return new Promise((resolve, reject) => {
        const fileNameWithExt = `${filename}.mp3`;
        const filePath = path.join(AUDIO_DIR, fileNameWithExt);

        // Diese Datei wird benötigt, also zur Liste hinzufügen
        requiredFiles.add(fileNameWithExt);

        // Prüfen: Existiert die Datei UND hat sich der Text NICHT geändert?
        if (fs.existsSync(filePath) && manifest[fileNameWithExt] === text) {
            resolve();
            return;
        }

        console.log(`Generiere (${lang}): ${filename} -> "${text}"`);

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
                // Neuen Text im Manifest speichern
                manifest[fileNameWithExt] = text;
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

                            if (exercise.type === 'translate_to_pt') {
                                await downloadAudio(exercise.correctAnswer, exercise.id, 'pt-PT');
                            }
                            else if (exercise.type === 'translate_to_de') {
                                await downloadAudio(exercise.question, exercise.id, 'pt-PT');
                            }
                            else if (exercise.type === 'multiple_choice') {
                                if (exercise.audioText) {
                                    await downloadAudio(exercise.audioText, exercise.id, 'pt-PT');
                                }

                                const optionsLang = exercise.optionsLanguage === 'de' ? 'de' : 'pt-PT';

                                await downloadAudio(exercise.correctAnswer, `${exercise.id}_answer`, optionsLang);

                                if (exercise.options) {
                                    for (let i = 0; i < exercise.options.length; i++) {
                                        await downloadAudio(exercise.options[i], `${exercise.id}_opt_${i}`, optionsLang);
                                    }
                                }
                            }
                            // NEU: Audio für einzelne Vokabeln / Teilsätze generieren
                            if (exercise.vocabulary) {
                                for (let v = 0; v < exercise.vocabulary.length; v++) {
                                    const vocab = exercise.vocabulary[v];
                                    // Die Zielsprache ist Portugiesisch, es sei denn, die Übung ist translate_to_de (dann ist die Frage auf PT)
                                    const lang = exercise.type === 'translate_to_de' ? 'pt-PT' : 'pt-PT';

                                    // Wir speichern die Audio-Datei unter der Übungs-ID + _vocab_ + Index
                                    await downloadAudio(vocab.text, `${exercise.id}_vocab_${v}`, lang);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 4. Aufräumen: Alle nicht mehr benötigten Dateien löschen
    console.log("--- 🧹 Räume alte Dateien auf ---");
    const existingFiles = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3'));
    let deletedCount = 0;

    for (const file of existingFiles) {
        if (!requiredFiles.has(file)) {
            fs.unlinkSync(path.join(AUDIO_DIR, file));
            delete manifest[file]; // Auch aus dem Manifest entfernen
            deletedCount++;
            console.log(`🗑️  Gelöscht: ${file}`);
        }
    }

    // 5. Manifest speichern für den nächsten Durchlauf
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

    console.log(`--- ✅ Fertig! ${deletedCount} alte Dateien gelöscht. ---`);
};

run();