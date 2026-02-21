import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyStats, Exercise, VocabDatabase } from '../types';

const KEYS = {
  LESSON_SCORES: 'lessonScores',
  EXAM_SCORES: 'examScores',
  DAILY_PROGRESS: 'dailyProgress',
  STREAK_DATA: 'streakData',
  PRACTICE_SESSION: 'currentPracticeSession',
  GLOBAL_VOCAB: 'globalVocabDB',
  DAILY_STATS: 'dailyStats_v2',
  LAST_BOX6_REFRESH: 'lastBox6Refresh',
};

// Box 0 (Neu), Box 1 (1h), Box 2 (6h), Box 3 (1d), Box 4 (3d), Box 5 (7d), Box 6 (30d/Ruhe)
// Werte in Minuten:
const INTERVAL_MINUTES = [
    0,      // Box 0
    60,     // Box 1: 1 Stunde
    360,    // Box 2: 6 Stunden
    1440,   // Box 3: 1 Tag
    4320,   // Box 4: 3 Tage
    10080,  // Box 5: 1 Woche
    43200   // Box 6: 30 Tage (Fallback, falls Logik greift)
];

export const StorageService = {

  // --- 1. Tracking Logik ---
  
  // source kann jetzt 'lesson', 'practice_random' oder 'practice_leitner' sein
  async trackResult(exercise: Exercise, isCorrect: boolean, source: 'lesson' | 'practice_random' | 'practice_leitner', manualBox?: number) {
    try {
      const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
      const db: VocabDatabase = json ? JSON.parse(json) : {};
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      let entry = db[exercise.id];
      const isNewEntry = !entry;

      if (!entry) {
        entry = {
          exerciseId: exercise.id,
          exerciseRef: exercise,
          box: 0,
          nextReviewDate: now.toISOString(),
          box5Streak: 0,
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
      } else {
        entry.mistakeCount++;
        entry.mistakesToday++;
      }

      // --- BOX LOGIK ---
      
      let targetBox = entry.box;
      let shouldUpdateDate = false;

      // Fall A: Manuelles Leitner-Training (mit Bewertungs-Buttons)
      if (source === 'practice_leitner' && manualBox !== undefined) {
          shouldUpdateDate = true;
          const chosenBox = manualBox;
          
          if (chosenBox >= 3) entry.mistakesToday = 0;

          if (chosenBox === 5) { // Nutzer wählt "Einfach" (Box 5 Button)
             entry.box5Streak = (entry.box5Streak || 0) + 1;
             // Wenn 3x hintereinander "Einfach" -> Ab in Box 6
             if (entry.box5Streak >= 3) {
                 targetBox = 6;
                 entry.box5Streak = 0; 
             } else {
                 targetBox = 5;
             }
          } else {
             entry.box5Streak = 0;
             targetBox = chosenBox;
          }
      
      // Fall B: Falsche Antwort (egal wo) -> Absturz auf Box 1
      } else if (!isCorrect) {
          shouldUpdateDate = true;
          targetBox = 1;
          entry.box5Streak = 0;

      // Fall C: Lernpfad oder Zufalls-Training (RICHTIG beantwortet)
      } else {
          // Logik: Nur wenn das Wort NEU ist oder in Box 0 war, verschieben wir es auf Box 1.
          // Ansonsten (z.B. Wort ist schon in Box 4) fassen wir die Box NICHT an.
          if (entry.box === 0) {
              targetBox = 1;
              shouldUpdateDate = true;
          }
          // Wenn entry.box > 0 ist, bleibt es dort. Keine Änderung an Box oder Datum.
      }

      entry.box = targetBox;

      if (shouldUpdateDate) {
          const minutesToAdd = INTERVAL_MINUTES[targetBox] || 10;
          const nextDate = new Date(now.getTime() + minutesToAdd * 60000);
          entry.nextReviewDate = nextDate.toISOString();
      }

      db[exercise.id] = entry;
      await AsyncStorage.setItem(KEYS.GLOBAL_VOCAB, JSON.stringify(db));

      await this.updateDailyStats(isCorrect, entry.solvedToday >= 3 || (entry.box > 0 && isNewEntry));

    } catch (e) { console.error("Error tracking result", e); }
  },

  // --- Box 6 Refresh Logik ---
  async checkBox6Refresh() {
      try {
          const lastRefresh = await AsyncStorage.getItem(KEYS.LAST_BOX6_REFRESH);
          const now = new Date();
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          // Wenn noch nie ausgeführt oder letzte Ausführung länger als 1 Woche her
          if (!lastRefresh || new Date(lastRefresh) < oneWeekAgo) {
              const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
              if (!json) return;
              const db: VocabDatabase = JSON.parse(json);
              
              // Alle Wörter in Box 6 sammeln
              const box6Ids = Object.values(db)
                  .filter(e => e.box === 6)
                  .map(e => e.exerciseId);

              if (box6Ids.length > 0) {
                  // Mischeln
                  for (let i = box6Ids.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [box6Ids[i], box6Ids[j]] = [box6Ids[j], box6Ids[i]];
                  }

                  // Nimm maximal 10
                  const toRefresh = box6Ids.slice(0, 10);
                  
                  // Setze diese auf "fällig" (Datum in Vergangenheit) aber lasse sie in Box 6 (oder setze auf Box 5?)
                  // Strategie: Wir lassen sie in Box 6, setzen aber das Datum auf "Jetzt".
                  // Wenn der Nutzer sie dann übt (Leitner Modus), wird er sie neu bewerten.
                  const nowISO = now.toISOString();
                  toRefresh.forEach(id => {
                      if (db[id]) {
                          db[id].nextReviewDate = nowISO; 
                          // Optional: Man könnte sie temporär auf Box 5 setzen, damit sie im Leitner-System auftauchen
                          db[id].box = 5; 
                      }
                  });

                  await AsyncStorage.setItem(KEYS.GLOBAL_VOCAB, JSON.stringify(db));
                  await AsyncStorage.setItem(KEYS.LAST_BOX6_REFRESH, now.toISOString());
                  console.log("Box 6 Refresh durchgeführt:", toRefresh.length, "Wörter.");
              }
          }
      } catch (e) { console.error("Box 6 Refresh Error", e); }
  },

  async updateDailyStats(isCorrect: boolean, isLearned: boolean) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const json = await AsyncStorage.getItem(KEYS.DAILY_STATS);
        let stats: DailyStats = json ? JSON.parse(json) : { date: today, wordsLearned: 0, mistakesMade: 0 };
        if (stats.date !== today) stats = { date: today, wordsLearned: 0, mistakesMade: 0 };

        if (!isCorrect) stats.mistakesMade++;
        else if (isLearned) stats.wordsLearned++; 
        
        await AsyncStorage.setItem(KEYS.DAILY_STATS, JSON.stringify(stats));
      } catch(e) {}
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
  async getLeitnerStats(): Promise<number[]> {
      try {
        const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
        const db: VocabDatabase = json ? JSON.parse(json) : {};
        const counts = [0, 0, 0, 0, 0, 0, 0];
        Object.values(db).forEach(e => {
            if (e.box >= 0 && e.box <= 6) counts[e.box]++;
        });
        return counts;
      } catch(e) { return [0,0,0,0,0,0,0]; }
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
      await this.checkBox6Refresh(); // Checken ob Box 6 Wörter fällig sind
      
      const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
      if (!json) return [];
      const db: VocabDatabase = JSON.parse(json);
      const nowISO = new Date().toISOString();
      return Object.values(db)
        .filter(e => e.nextReviewDate <= nowISO && e.box > 0)
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
      } catch(e) { return []; }
  },
  async getSmartSelection(candidates: Exercise[], mode: 'random' | 'leitner', limit: number | 'all', allowedBoxes: number[] = []): Promise<Exercise[]> {
      const actualLimit = limit === 'all' ? candidates.length : limit;
      
      // Filtere Kandidaten nach Boxen, falls Boxen ausgewählt wurden
      let pool = candidates;
      if (allowedBoxes.length > 0) {
          const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
          const db: VocabDatabase = json ? JSON.parse(json) : {};
          pool = candidates.filter(ex => {
              const entry = db[ex.id];
              const box = entry ? entry.box : 0; // Wenn nicht in DB, ist es Box 0
              return allowedBoxes.includes(box);
          });
      }

      if (mode === 'random') {
          // Einfaches Mischen
          const mixed = [...pool];
          for (let i = mixed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [mixed[i], mixed[j]] = [mixed[j], mixed[i]];
          }
          return mixed.slice(0, actualLimit);
      } else {
          const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
          const db: VocabDatabase = json ? JSON.parse(json) : {};
          const nowISO = new Date().toISOString();
          const due: Exercise[] = [];
          const unknown: Exercise[] = [];
          const mastered: Exercise[] = [];
          
          pool.forEach(ex => {
              const entry = db[ex.id];
              if (!entry) unknown.push(ex);
              else if (entry.nextReviewDate <= nowISO) due.push(ex);
              else mastered.push(ex);
          });
          
          let result = [...due];
          if (result.length < actualLimit) {
              // Mische Unknown
              for (let i = unknown.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [unknown[i], unknown[j]] = [unknown[j], unknown[i]];
              }
              result = [...result, ...unknown];
          }
          if (result.length < actualLimit) {
              // Mische Mastered
               for (let i = mastered.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [mastered[i], mastered[j]] = [mastered[j], mastered[i]];
              }
              result = [...result, ...mastered];
          }
          return result.slice(0, actualLimit);
      }
  },
  // Standard Methoden (Unverändert)
  async saveLessonScore(lessonId: string, stars: number) {
    try {
      const existingData = await AsyncStorage.getItem(KEYS.LESSON_SCORES);
      let scores = existingData ? JSON.parse(existingData) : {};
      const oldScore = scores[lessonId] || 0;
      if (stars >= oldScore) {
        scores[lessonId] = stars;
        await AsyncStorage.setItem(KEYS.LESSON_SCORES, JSON.stringify(scores));
      }
    } catch (e) {}
  },
  async markExamPassed(lessonId: string) {
    try {
      const existingExams = await AsyncStorage.getItem(KEYS.EXAM_SCORES);
      let exams = existingExams ? JSON.parse(existingExams) : {};
      exams[lessonId] = true;
      await AsyncStorage.setItem(KEYS.EXAM_SCORES, JSON.stringify(exams));
    } catch (e) {}
  },
  async updateStreak() {
    try {
      const today = new Date().toDateString();
      const dailyProgressStr = await AsyncStorage.getItem(KEYS.DAILY_PROGRESS);
      let dailyData = dailyProgressStr ? JSON.parse(dailyProgressStr) : { count: 0, date: today };
      if (dailyData.date !== today) dailyData = { count: 0, date: today };
      dailyData.count += 1;
      await AsyncStorage.setItem(KEYS.DAILY_PROGRESS, JSON.stringify(dailyData));
      if (dailyData.count >= 15) {
        const streakDataStr = await AsyncStorage.getItem(KEYS.STREAK_DATA);
        let streakData = streakDataStr ? JSON.parse(streakDataStr) : { currentStreak: 0, lastStreakDate: '' };
        if (streakData.lastStreakDate !== today) {
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
          if (streakData.lastStreakDate === yesterday.toDateString()) streakData.currentStreak += 1;
          else streakData.currentStreak = 1;
          streakData.lastStreakDate = today;
          await AsyncStorage.setItem(KEYS.STREAK_DATA, JSON.stringify(streakData));
        }
      }
    } catch (e) {}
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
      } catch(e) { return null; }
  }
};