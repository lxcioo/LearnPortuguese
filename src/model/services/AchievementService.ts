import { Achievement, StreakData } from '../types';

// Diese Definitionen könnten für mehr Flexibilität auch aus einer JSON-Datei geladen werden.
const achievementDefinitions: Omit<Achievement, 'isUnlocked'>[] = [
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

interface AchievementStats {
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
    getAchievements(stats: AchievementStats): Achievement[] {
        const usedIce = stats.streakData ? Object.values(stats.streakData.history || {}).includes('frozen') : false;

        const unlockConditions: { [key: string]: boolean } = {
            'les_1': stats.completedLessonsCount >= 1, 'les_10': stats.completedLessonsCount >= 10, 'les_30': stats.completedLessonsCount >= 30,
            'streak_7': stats.streak >= 7, 'stars_90': stats.totalStars >= 90, 'exam_10': stats.passedExamsCount >= 10,
            'perf_30': stats.threeStarLessonsCount >= 30, 'mem_50': stats.longTermMemoryCount >= 50, 'clean_slate': stats.hasCleanSlate, 'ice': usedIce,
        };

        return achievementDefinitions.map(def => ({ ...def, isUnlocked: unlockConditions[def.id] || false, }));
    }
};