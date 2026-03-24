import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyStats, Exercise, StreakData, UserProfile, VocabDatabase } from '../types';
import { NotificationService } from './NotificationService';

const KEYS = {
  LESSON_SCORES: 'lessonScores',
  EXAM_SCORES: 'examScores',
  DAILY_PROGRESS: 'dailyProgress',
  STREAK_DATA: 'streakData',
  PRACTICE_SESSION: 'currentPracticeSession',
  GLOBAL_VOCAB: 'globalVocabDB',
  DAILY_STATS: 'dailyStats_v2',
  USER_PROFILE: 'userProfile',
};

// --- NEU: Dynamische Zeitfenster (Fuzzing) ---
function getRandomNextDate(box: number): string {
  const now = new Date();
  let minHours = 0;
  let maxHours = 0;

  switch (box) {
    case 1: // Schwer: 12 bis 24 Stunden
      minHours = 12; maxHours = 24; break;
    case 2: // Mittel: 3 bis 5 Tage (72 - 120 h)
      minHours = 72; maxHours = 120; break;
    case 3: // Leicht: 10 bis 14 Tage (240 - 336 h)
      minHours = 240; maxHours = 336; break;
    case 4: // Stern: 45 bis 60 Tage (1080 - 1440 h)
      minHours = 1080; maxHours = 1440; break;
    default:
      minHours = 12; maxHours = 24;
  }

  // Zufälligen Wert innerhalb des Fensters berechnen
  const randomHours = Math.random() * (maxHours - minHours) + minHours;
  return new Date(now.getTime() + randomHours * 60 * 60 * 1000).toISOString();
}

export const StorageService = {

  // --- 1. Tracking Logik (Die Goldenen Regeln) ---
  // source: 'lesson' (Lernpfad) oder 'practice' (Übungsbereich)
  // userRating: 1 (Schwer), 2 (Mittel), 3 (Leicht)
  async trackResult(exercise: Exercise, isCorrect: boolean, source: string, userRating?: number) {
    try {
      const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
      const db: VocabDatabase = json ? JSON.parse(json) : {};

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      let entry = db[exercise.id];
      const isNewEntry = !entry;

      // NEU & WICHTIG: War die Vokabel laut Leitner-System überhaupt fällig?
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
        entry.mistakesToday = 0;
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
        }
        else {
          if (userRating) {
            if (entry.box === 3 && userRating === 3) {
              // LOGIK-FIX 1: Nur ins Sternchen aufsteigen, wenn die 10-14 Tage auch um waren!
              if (wasDue) {
                targetBox = 4;
              } else {
                // Ansonsten bleibt sie in Box 3, aber der Timer (10-14 Tage) wird neu gestartet
                targetBox = 3;
              }
            } else if (entry.box === 4 && userRating === 3) {
              // LOGIK-FIX 2: Ein Sternchen verliert seinen Status nicht, wenn man "Leicht" drückt
              targetBox = 4;
            } else {
              // In allen anderen Fällen (Schwer oder Mittel) wird die Box ganz normal angepasst
              targetBox = userRating;
            }
          }
        }
      }

      entry.box = targetBox;
      entry.nextReviewDate = getRandomNextDate(targetBox);

      db[exercise.id] = entry;
      await AsyncStorage.setItem(KEYS.GLOBAL_VOCAB, JSON.stringify(db));

      await this.updateDailyStats(isCorrect, entry.solvedToday >= 3 || (entry.box > 0 && isNewEntry));

    } catch (e) { console.error("Error tracking result", e); }
  },

  async updateDailyStats(isCorrect: boolean, isLearned: boolean) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const json = await AsyncStorage.getItem(KEYS.DAILY_STATS);
      let stats: DailyStats = json ? JSON.parse(json) : { date: today, wordsLearned: 0, mistakesMade: 0 };
      if (stats.date !== today) stats = { date: today, wordsLearned: 0, mistakesMade: 0 };

      if (!isCorrect) stats.mistakesMade++;
      else if (isCorrect) stats.wordsLearned++;

      await AsyncStorage.setItem(KEYS.DAILY_STATS, JSON.stringify(stats));
    } catch (e) { }
  },

  // --- Abruf Methoden ---
  async getDailyStats(): Promise<DailyStats> {
    const today = new Date().toISOString().split('T')[0];
    const json = await AsyncStorage.getItem(KEYS.DAILY_STATS);
    if (json) {
      const stats = JSON.parse(json);
      if (stats.date === today) return stats;
    }
    return { date: today, wordsLearned: 0, mistakesMade: 0 };
  },
  // Aktualisiert für die 4 neuen Blöcke
  async getLeitnerStats(): Promise<number[]> {
    try {
      const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
      const db: VocabDatabase = json ? JSON.parse(json) : {};
      // Index 0=Neu, 1=Schwer, 2=Mittel, 3=Leicht, 4=Stern
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
      // Hole alle fälligen aus Schwer, Mittel, Leicht, Stern
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
  // Freies Training ist jetzt viel simpler (holt nur aus Lektionen)
  async getFreeTrainingSelection(candidates: Exercise[], limit: number | 'all'): Promise<Exercise[]> {
    const actualLimit = limit === 'all' ? candidates.length : limit;
    let pool = [...candidates];

    // Mischen
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, actualLimit);
  },

  async saveLessonScore(lessonId: string, stars: number) {
    try {
      const existingData = await AsyncStorage.getItem(KEYS.LESSON_SCORES);
      let scores = existingData ? JSON.parse(existingData) : {};
      const oldScore = scores[lessonId] || 0;
      if (stars >= oldScore) {
        scores[lessonId] = stars;
        await AsyncStorage.setItem(KEYS.LESSON_SCORES, JSON.stringify(scores));
      }
    } catch (e) { }
  },
  async markExamPassed(lessonId: string) {
    try {
      const existingExams = await AsyncStorage.getItem(KEYS.EXAM_SCORES);
      let exams = existingExams ? JSON.parse(existingExams) : {};
      exams[lessonId] = true;
      await AsyncStorage.setItem(KEYS.EXAM_SCORES, JSON.stringify(exams));
    } catch (e) { }
  },

  // --- NEUE Streak & Timeline Logik ---

  // Prüft, ob ein Tag verpasst wurde und füllt ihn ggf. mit einer blauen Flamme auf
  async checkAndRepairStreak(): Promise<StreakData> {
    try {
      const streakDataStr = await AsyncStorage.getItem(KEYS.STREAK_DATA);
      let baseData = streakDataStr ? JSON.parse(streakDataStr) : null;

      let streakData: StreakData = {
        currentStreak: baseData?.currentStreak || 0,
        lastStreakDate: baseData?.lastStreakDate || '',
        streakOnIceCount: baseData?.streakOnIceCount || 0,
        history: baseData?.history || {}
      };

      if (!streakData.lastStreakDate) return streakData;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Versucht das Datum zu parsen. Fallback, wenn altes Datumsformat genutzt wurde.
      const lastDate = new Date(streakData.lastStreakDate);
      lastDate.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        let daysToCover = diffDays - 1;
        let currentDateToFill = new Date(lastDate);
        currentDateToFill.setDate(currentDateToFill.getDate() + 1);

        // Verpasste Tage mit "Streak on Ice" auffüllen
        while (daysToCover > 0 && streakData.streakOnIceCount > 0) {
          streakData.streakOnIceCount--;
          const dateStr = currentDateToFill.toISOString().split('T')[0];
          streakData.history[dateStr] = 'frozen';
          streakData.lastStreakDate = dateStr;
          currentDateToFill.setDate(currentDateToFill.getDate() + 1);
          daysToCover--;
        }

        // Wenn immer noch Tage fehlen, verfällt die Streak
        if (daysToCover > 0) {
          streakData.currentStreak = 0;
        }

        await AsyncStorage.setItem(KEYS.STREAK_DATA, JSON.stringify(streakData));
      }
      return streakData;
    } catch (e) {
      return { currentStreak: 0, lastStreakDate: '', streakOnIceCount: 0, history: {} };
    }
  },

  async updateStreak() {
    try {
      const todayObj = new Date();
      const todayStr = todayObj.toISOString().split('T')[0];
      const todayDateString = todayObj.toDateString();

      const dailyProgressStr = await AsyncStorage.getItem(KEYS.DAILY_PROGRESS);
      let dailyData = dailyProgressStr ? JSON.parse(dailyProgressStr) : { count: 0, date: todayDateString };
      if (dailyData.date !== todayDateString) dailyData = { count: 0, date: todayDateString };

      dailyData.count += 1;
      await AsyncStorage.setItem(KEYS.DAILY_PROGRESS, JSON.stringify(dailyData));

      if (dailyData.count >= 15) {
        let streakData = await this.checkAndRepairStreak();

        if (streakData.history[todayStr] !== 'learned') {
          streakData.history[todayStr] = 'learned';

          if (streakData.lastStreakDate !== todayStr) {
            const lastDateStr = new Date(streakData.lastStreakDate || todayObj);
            lastDateStr.setHours(0, 0, 0, 0);
            const todayReset = new Date(todayObj);
            todayReset.setHours(0, 0, 0, 0);

            const diffTime = todayReset.getTime() - lastDateStr.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1 || streakData.lastStreakDate === '') {
              streakData.currentStreak += 1;
            } else if (diffDays !== 0) {
              streakData.currentStreak = 1;
            }

            streakData.lastStreakDate = todayStr;

            if (streakData.currentStreak > 0 && streakData.currentStreak % 7 === 0) {
              streakData.streakOnIceCount += 1;
            }
          }
          await AsyncStorage.setItem(KEYS.STREAK_DATA, JSON.stringify(streakData));

          // NEU: Tagesziel erreicht! Wir stornieren die heutigen Benachrichtigungen
          NotificationService.rescheduleReminders(true);
        }
      }
    } catch (e) { }
  },

  async savePracticeSession(exercises: Exercise[]) {
    await AsyncStorage.setItem(KEYS.PRACTICE_SESSION, JSON.stringify(exercises));
  },
  async getPracticeSession(): Promise<Exercise[] | null> {
    const session = await AsyncStorage.getItem(KEYS.PRACTICE_SESSION);
    return session ? JSON.parse(session) : null;
  },
  async getLastPracticedDate(): Promise<string | null> {
    try {
      const json = await AsyncStorage.getItem(KEYS.DAILY_STATS);
      if (json) {
        const stats = JSON.parse(json);
        return stats.date;
      }
      return null;
    } catch (e) { return null; }
  },
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const json = await AsyncStorage.getItem('userProfile');
      return json ? JSON.parse(json) : null;
    } catch (e) { return null; }
  },

  async saveUserProfile(name: string): Promise<void> {
    try {
      const profile: UserProfile = { name, hasCompletedOnboarding: true };
      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
    } catch (e) { }
  },

  async hasCompletedDailyGoal(): Promise<boolean> {
    try {
      const json = await AsyncStorage.getItem(KEYS.STREAK_DATA);
      if (!json) return false;
      const streakData: StreakData = JSON.parse(json);
      const todayStr = new Date().toISOString().split('T')[0];
      return streakData.history?.[todayStr] === 'learned';
    } catch (e) { return false; }
  }
};