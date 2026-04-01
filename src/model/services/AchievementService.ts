import AsyncStorage from '@react-native-async-storage/async-storage';
import { Achievement, StreakData } from '../types';

const ACHIEVEMENTS_KEY = 'userAchievements_v1';

// Die isUnlocked und unlockedAt Felder lassen wir hier weg, da sie dynamisch befüllt werden
const achievementDefinitions: Omit<Achievement, 'isUnlocked' | 'unlockedAt'>[] = [
    { id: 'les_1', title: 'Erste Schritte', description: '1 Lektion abgeschlossen.', icon: 'footsteps' },
    { id: 'les_10', title: 'Dranbleiber', description: '10 Lektionen abgeschlossen.', icon: 'bicycle' },
    { id: 'les_30', title: 'Meister des Pfads', description: 'Alle 30 Lektionen abgeschlossen.', icon: 'airplane' },
    { id: 'streak_7', title: 'Feuer & Flamme', description: '7-Tage-Lernserie.', icon: 'flame' },
    { id: 'stars_90', title: 'Galaxie', description: 'Sammle alle 90 Sterne.', icon: 'sparkles' },
    { id: 'exam_10', title: 'Meisterabschluss', description: 'Bestehe alle 10 Prüfungen.', icon: 'trophy' },
    { id: 'perf_30', title: 'Makellos', description: 'Alle 30 Lektionen mit 3 Sternen.', icon: 'star' },
    { id: 'mem_50', title: 'Elefantengedächtnis', description: 'Bringe 50 Wörter ins Langzeitgedächtnis.', icon: 'brain' },
    { id: 'clean_slate', title: 'Weiße Weste', description: 'Lerne heute (min 30 Wörter) und korrigiere alle deine heutigen Fehler.', icon: 'checkmark-done-circle' },
    { id: 'ice', title: 'Gerettet!', description: 'Nutze eine Eisflamme um deinen Streak zu retten.', icon: 'snow' }
];

export interface AchievementStats {
    completedLessonsCount: number;
    threeStarLessonsCount: number;
    passedExamsCount: number;
    streak: number;
    totalStars: number;
    longTermMemoryCount: number;
    hasCleanSlate: boolean;
    streakData: StreakData | null;
}

export const AchievementService = {
    // NEU: Asynchrone Funktion, die auch den Speicher (AsyncStorage) abfragt
    async loadAchievements(stats: AchievementStats): Promise<Achievement[]> {
        try {
            // 1. Gespeicherte Freischalt-Daten abrufen (z.B. { "les_1": "12.04.2026" })
            const savedDatesJson = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
            let unlockedDates: Record<string, string> = savedDatesJson ? JSON.parse(savedDatesJson) : {};

            const usedIce = stats.streakData ? Object.values(stats.streakData.history || {}).includes('frozen') : false;

            // 2. Aktuelle Bedingungen prüfen
            const unlockConditions: { [key: string]: boolean } = {
                'les_1': stats.completedLessonsCount >= 1, 'les_10': stats.completedLessonsCount >= 10, 'les_30': stats.completedLessonsCount >= 30,
                'streak_7': stats.streak >= 7, 'stars_90': stats.totalStars >= 90, 'exam_10': stats.passedExamsCount >= 10,
                'perf_30': stats.threeStarLessonsCount >= 30, 'mem_50': stats.longTermMemoryCount >= 50, 'clean_slate': stats.hasCleanSlate, 'ice': usedIce,
            };

            let hasChanges = false;
            // Deutsches Datumsformat (z.B. 12.04.2026)
            const todayStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

            // 3. Errungenschaften zusammenbauen
            const finalAchievements = achievementDefinitions.map(def => {
                const isUnlockedNow = unlockConditions[def.id] || false;
                let unlockedAt = unlockedDates[def.id];

                // Wenn es JETZT freigeschaltet ist, aber noch kein Datum hat -> Neues Datum vergeben!
                if (isUnlockedNow && !unlockedAt) {
                    unlockedAt = todayStr;
                    unlockedDates[def.id] = unlockedAt;
                    hasChanges = true;
                }

                return {
                    ...def,
                    isUnlocked: isUnlockedNow,
                    unlockedAt: isUnlockedNow ? unlockedAt : undefined
                };
            });

            // 4. Nur speichern, wenn etwas Neues dazugekommen ist (spart Performance)
            if (hasChanges) {
                await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlockedDates));
            }

            return finalAchievements;
        } catch (e) {
            console.error("Fehler beim Laden der Errungenschaften", e);
            // Fallback, damit die App bei einem Fehler nicht abstürzt
            return achievementDefinitions.map(def => ({ ...def, isUnlocked: false }));
        }
    }
};