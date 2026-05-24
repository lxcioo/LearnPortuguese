import { Achievement, StreakData } from '../types';
import { StorageService } from './StorageService';

const ACHIEVEMENTS_KEY = 'userAchievements_v1';

const achievementDefinitions: Omit<Achievement, 'isUnlocked' | 'unlockedAt'>[] = [
  // --- LEKTIONEN (Fortschritt) ---
  { id: 'les_1', title: 'Erste Schritte', description: '1 Lektion abgeschlossen.', icon: 'footsteps' },
  { id: 'les_10', title: 'Dranbleiber', description: '10 Lektionen abgeschlossen.', icon: 'bicycle' },
  { id: 'les_30', title: 'Halbzeit', description: '30 Lektionen abgeschlossen.', icon: 'map' },
  { id: 'les_60', title: 'Meister des Pfads', description: 'Alle 60 Lektionen abgeschlossen.', icon: 'airplane' },

  // --- STERNE & PERFEKTION (Qualität) ---
  { id: 'stars_50', title: 'Sternensammler', description: 'Sammle 50 Sterne.', icon: 'star-half' },
  { id: 'stars_100', title: 'Leuchtfeuer', description: 'Sammle 100 Sterne.', icon: 'star' },
  { id: 'stars_180', title: 'Galaxie', description: 'Sammle alle 180 Sterne.', icon: 'sparkles' },
  { id: 'perf_10', title: 'Streber', description: '10 Lektionen mit 3 Sternen abgeschlossen.', icon: 'medal' },
  { id: 'perf_60', title: 'Makellos', description: 'Alle 60 Lektionen mit 3 Sternen abgeschlossen.', icon: 'trophy' },

  // --- PRÜFUNGEN (Meilensteine) ---
  { id: 'exam_1', title: 'Erster Test', description: 'Bestehe deine erste Prüfung.', icon: 'pencil' },
  { id: 'exam_10', title: 'Halbzeit-Zeugnis', description: 'Bestehe 10 Prüfungen.', icon: 'school' },
  { id: 'exam_20', title: 'Absolvent', description: 'Bestehe alle 20 Prüfungen.', icon: 'library' },

  // --- STREAK (Konsistenz) ---
  { id: 'streak_7', title: 'Feuer & Flamme', description: '7-Tage-Lernserie erreicht.', icon: 'flame' },
  { id: 'streak_30', title: 'Gewohnheitstier', description: '30-Tage-Lernserie erreicht.', icon: 'calendar' },
  { id: 'streak_100', title: 'Unaufhaltsam', description: '100-Tage-Lernserie erreicht.', icon: 'bonfire' },

  // --- LANGZEITGEDÄCHTNIS (Leitner Box 4) ---
  { id: 'mem_50', title: 'Gutes Gedächtnis', description: '50 Wörter dauerhaft gemerkt.', icon: 'book' },
  { id: 'mem_200', title: 'Elefantengedächtnis', description: '200 Wörter dauerhaft gemerkt.', icon: 'brain' },
  { id: 'mem_500', title: 'Wandelndes Lexikon', description: '500 Wörter dauerhaft gemerkt.', icon: 'language' },

  // --- SPEZIAL (Besondere Ereignisse) ---
  { id: 'clean_slate', title: 'Weiße Weste', description: 'Lerne heute (min. 30 Wörter) und korrigiere alle Fehler.', icon: 'checkmark-done-circle' },
  { id: 'ice', title: 'Gerettet!', description: 'Nutze eine Eisflamme, um deinen Streak zu retten.', icon: 'snow' }
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
  async loadAchievements(stats: AchievementStats): Promise<Achievement[]> {
    const unlockedDates = (await StorageService.getItem<Record<string, string>>(ACHIEVEMENTS_KEY)) || {};
    const usedIce = stats.streakData?.history ? Object.values(stats.streakData.history).includes('frozen') : false;

    const unlockConditions: Record<string, boolean> = {
      'les_1': stats.completedLessonsCount >= 1,
      'les_10': stats.completedLessonsCount >= 10,
      'les_30': stats.completedLessonsCount >= 30,
      'les_60': stats.completedLessonsCount >= 60,
      'stars_50': stats.totalStars >= 50,
      'stars_100': stats.totalStars >= 100,
      'stars_180': stats.totalStars >= 180,
      'perf_10': stats.threeStarLessonsCount >= 10,
      'perf_60': stats.threeStarLessonsCount >= 60,
      'exam_1': stats.passedExamsCount >= 1,
      'exam_10': stats.passedExamsCount >= 10,
      'exam_20': stats.passedExamsCount >= 20,
      'streak_7': stats.streak >= 7,
      'streak_30': stats.streak >= 30,
      'streak_100': stats.streak >= 100,
      'mem_50': stats.longTermMemoryCount >= 50,
      'mem_200': stats.longTermMemoryCount >= 200,
      'mem_500': stats.longTermMemoryCount >= 500,
      'clean_slate': stats.hasCleanSlate,
      'ice': usedIce,
    };

    const todayStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    let hasChanges = false;

    const finalAchievements = achievementDefinitions.map(def => {
      const isUnlockedNow = unlockConditions[def.id] || false;
      let unlockedAt = unlockedDates[def.id];

      if (isUnlockedNow && !unlockedAt) {
        unlockedAt = todayStr;
        unlockedDates[def.id] = unlockedAt;
        hasChanges = true;
      }

      return { ...def, isUnlocked: isUnlockedNow, unlockedAt: isUnlockedNow ? unlockedAt : undefined };
    });

    if (hasChanges) {
      await StorageService.setItem(ACHIEVEMENTS_KEY, unlockedDates);
    }

    return finalAchievements;
  }
};