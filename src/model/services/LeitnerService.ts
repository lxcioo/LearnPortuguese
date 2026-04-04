import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise, VocabDatabase } from '../types';
import { ProgressService } from './ProgressService';

const KEYS = {
    PRACTICE_SESSION: 'currentPracticeSession',
    GLOBAL_VOCAB: 'globalVocabDB',
};

// --- Dynamische Zeitfenster (Fuzzing) ----
function getRandomNextDate(box: number): string {
    const now = new Date();
    let minHours = 0;
    let maxHours = 0;

    switch (box) {
        case 1: minHours = 12; maxHours = 24; break;
        case 2: minHours = 72; maxHours = 120; break;
        case 3: minHours = 240; maxHours = 336; break;
        case 4: minHours = 1080; maxHours = 1440; break;
        default: minHours = 12; maxHours = 24;
    }

    const randomHours = Math.random() * (maxHours - minHours) + minHours;
    return new Date(now.getTime() + randomHours * 60 * 60 * 1000).toISOString();
}

export const LeitnerService = {
    async trackResult(exercise: Exercise, isCorrect: boolean, source: string, userRating?: number) {
        try {
            const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
            const db: VocabDatabase = json ? JSON.parse(json) : {};

            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            let entry = db[exercise.id];
            const isNewEntry = !entry;

            const wasDue = entry ? now >= new Date(entry.nextReviewDate) : true;

            if (!entry) {
                entry = {
                    exerciseId: exercise.id,
                    exerciseRef: exercise,
                    box: 0,
                    nextReviewDate: now.toISOString(),
                    mistakeCount: 0,
                    successCount: 0,
                    lastPracticed: '',
                    mistakesToday: 0,
                    solvedToday: 0
                };
            }

            if (entry.lastPracticed !== todayStr) {
                entry.mistakesToday = 0;
                entry.solvedToday = 0;
            }
            entry.lastPracticed = todayStr;

            if (isCorrect) {
                entry.successCount++;
                entry.solvedToday++;
                if (source === 'practice') {
                    entry.mistakesToday = 0;
                }
            } else {
                entry.mistakeCount++;
                entry.mistakesToday++;
            }

            let targetBox = entry.box || 1;

            if (!isCorrect) {
                targetBox = 1;
            } else {
                if (source === 'lesson') {
                    if (entry.box === 0) targetBox = 1;
                } else {
                    if (userRating) {
                        if (entry.box === 3 && userRating === 3) {
                            if (wasDue) { targetBox = 4; } else { targetBox = 3; }
                        } else if (entry.box === 4 && userRating === 3) {
                            targetBox = 4;
                        } else {
                            targetBox = userRating;
                        }
                    }
                }
            }

            entry.box = targetBox;
            entry.nextReviewDate = getRandomNextDate(targetBox);

            db[exercise.id] = entry;
            await AsyncStorage.setItem(KEYS.GLOBAL_VOCAB, JSON.stringify(db));

            const isLearned = isCorrect && (entry.solvedToday >= 3 || (entry.box > 0 && isNewEntry));
            await ProgressService.updateDailyStats(isCorrect, isLearned);

        } catch (e) { console.error("Error tracking result", e); }
    },

    async getLeitnerStats(): Promise<number[]> {
        try {
            const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
            const db: VocabDatabase = json ? JSON.parse(json) : {};
            const counts = [0, 0, 0, 0, 0];
            Object.values(db).forEach(e => {
                if (e.box >= 1 && e.box <= 4) counts[e.box]++;
            });
            return counts;
        } catch (e) { return [0, 0, 0, 0, 0]; }
    },

    async getTodayMistakes(): Promise<Exercise[]> {
        try {
            const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
            if (!json) return [];
            const db: VocabDatabase = JSON.parse(json);
            const today = new Date().toISOString().split('T')[0];
            return Object.values(db)
                .filter(e => e.lastPracticed === today && e.mistakesToday > 0)
                .map(e => e.exerciseRef);
        } catch (e) { return []; }
    },

    async getLeitnerDue(): Promise<Exercise[]> {
        try {
            const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
            if (!json) return [];
            const db: VocabDatabase = JSON.parse(json);
            const nowISO = new Date().toISOString();
            return Object.values(db)
                .filter(e => e.nextReviewDate <= nowISO && e.box >= 1)
                .map(e => e.exerciseRef);
        } catch (e) { return []; }
    },

    async getArchEnemies(): Promise<Exercise[]> {
        try {
            const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
            if (!json) return [];
            const db: VocabDatabase = JSON.parse(json);
            return Object.values(db)
                .sort((a, b) => b.mistakeCount - a.mistakeCount)
                .slice(0, 20)
                .filter(e => e.mistakeCount > 0)
                .map(e => e.exerciseRef);
        } catch (e) { return []; }
    },

    async getFreeTrainingSelection(candidates: Exercise[], limit: number | 'all'): Promise<Exercise[]> {
        const actualLimit = limit === 'all' ? candidates.length : limit;
        let pool = [...candidates];
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, actualLimit);
    },

    async savePracticeSession(exercises: Exercise[]) {
        await AsyncStorage.setItem(KEYS.PRACTICE_SESSION, JSON.stringify(exercises));
    },

    async getPracticeSession(): Promise<Exercise[] | null> {
        const session = await AsyncStorage.getItem(KEYS.PRACTICE_SESSION);
        return session ? JSON.parse(session) : null;
    },

    async getVocabForBox(boxIndex: number): Promise<Exercise[]> {
        try {
            const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
            if (!json) return [];
            const db: VocabDatabase = JSON.parse(json);
            return Object.values(db)
                .filter(entry => entry.box === boxIndex)
                .map(entry => entry.exerciseRef);
        } catch (e) {
            console.error("Fehler beim Laden der Box-Vokabeln", e);
            return [];
        }
    },
};