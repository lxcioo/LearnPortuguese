import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyStats, Exercise, VocabDatabase } from '../types';

const KEYS = {
  LESSON_SCORES: 'lessonScores',
  EXAM_SCORES: 'examScores',
  DAILY_PROGRESS: 'dailyProgress',
  STREAK_DATA: 'streakData',
  PRACTICE_SESSION: 'currentPracticeSession',
  GLOBAL_VOCAB: 'globalVocabDB',
  DAILY_STATS: 'dailyStats_v2', // Neuer Key für Diagramm-Daten
};

// Leitner Intervalle in Tagen (Box 1..5)
const INTERVALS = [0, 1, 3, 7, 14, 30]; 

export const StorageService = {

  // --- 1. Tracking Logik ---
  
  async trackResult(exercise: Exercise, isCorrect: boolean, source: 'lesson' | 'practice') {
    try {
      const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
      const db: VocabDatabase = json ? JSON.parse(json) : {};
      const today = new Date().toISOString().split('T')[0];

      let entry = db[exercise.id];
      if (!entry) {
        entry = {
          exerciseId: exercise.id,
          exerciseRef: exercise,
          box: 0,
          nextReviewDate: today,
          mistakeCount: 0,
          successCount: 0,
          lastPracticed: '',
          mistakesToday: 0,
          solvedToday: 0
        };
      }

      // Reset Daily Counters wenn neuer Tag
      if (entry.lastPracticed !== today) {
        entry.mistakesToday = 0;
        entry.solvedToday = 0;
      }
      entry.lastPracticed = today;

      if (isCorrect) {
        entry.successCount++;
        entry.solvedToday++;
        
        // Leitner Logik
        if (source === 'lesson') {
            // Im Lernpfad: Initialisierung auf Box 1 (Gelernt)
            if (entry.box === 0) entry.box = 1;
        } else {
            // Im Übungsmodus: Aufstieg
            if (entry.box < 5) entry.box++;
        }
      } else {
        entry.mistakeCount++;
        entry.mistakesToday++;
        entry.box = 1; // Rückfall auf Box 1 (oder 0, je nach Härtegrad. 1 ist fair)
      }

      // Nächstes Datum setzen
      const days = INTERVALS[entry.box] || 1;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + days);
      entry.nextReviewDate = nextDate.toISOString().split('T')[0];

      db[exercise.id] = entry;
      await AsyncStorage.setItem(KEYS.GLOBAL_VOCAB, JSON.stringify(db));

      // Update Daily Stats Diagramm
      await this.updateDailyStats(isCorrect, entry.solvedToday >= 3 || entry.box > 0);

    } catch (e) { console.error("Error tracking result", e); }
  },

  async updateDailyStats(isCorrect: boolean, isLearned: boolean) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const json = await AsyncStorage.getItem(KEYS.DAILY_STATS);
        let stats: DailyStats = json ? JSON.parse(json) : { date: today, wordsLearned: 0, mistakesMade: 0 };

        if (stats.date !== today) {
            stats = { date: today, wordsLearned: 0, mistakesMade: 0 };
        }

        if (!isCorrect) {
            stats.mistakesMade++;
        } else if (isLearned) {
            // Wir zählen es als "gelernt" für die Statistik, wenn es korrekt war 
            // Hier könnte man verfeinern (nur zählen wenn es VORHER noch nicht gelernt war), 
            // aber für einfache "Aktivität heute" reicht inkrementieren oft.
            // Besser: Wir zählen "Aktivität".
            stats.wordsLearned++; 
        }
        await AsyncStorage.setItem(KEYS.DAILY_STATS, JSON.stringify(stats));
      } catch(e) {}
  },

  // --- 2. Abruf-Methoden für Practice Screen ---

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
      // Return array [box0_count, box1_count, ..., box5_count]
      try {
        const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
        const db: VocabDatabase = json ? JSON.parse(json) : {};
        const counts = [0, 0, 0, 0, 0, 0];
        
        Object.values(db).forEach(e => {
            if (e.box >= 0 && e.box <= 5) counts[e.box]++;
        });
        return counts;
      } catch(e) { return [0,0,0,0,0,0]; }
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
      const today = new Date().toISOString().split('T')[0];

      return Object.values(db)
        .filter(e => e.nextReviewDate <= today && e.box < 5) // Fällig & nicht gemeistert
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

  async getSmartSelection(candidates: Exercise[], mode: 'random' | 'leitner', limit: number): Promise<Exercise[]> {
      if (mode === 'random') {
          // Einfach mischen und limitieren
          const pool = [...candidates];
          for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
          }
          return pool.slice(0, limit);
      } else {
          // Leitner Logik INNERHALB der Auswahl
          const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
          const db: VocabDatabase = json ? JSON.parse(json) : {};
          const today = new Date().toISOString().split('T')[0];

          // Priorität: 1. Fällig, 2. Neu, 3. Gemeistert (zufällig)
          const due: Exercise[] = [];
          const unknown: Exercise[] = [];
          const mastered: Exercise[] = [];

          candidates.forEach(ex => {
              const entry = db[ex.id];
              if (!entry) unknown.push(ex);
              else if (entry.nextReviewDate <= today && entry.box < 5) due.push(ex);
              else mastered.push(ex); // Oder noch nicht fällig
          });

          let result = [...due];
          if (result.length < limit) {
              // Neue dazumischen
              for (let i = unknown.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [unknown[i], unknown[j]] = [unknown[j], unknown[i]];
              }
              result = [...result, ...unknown];
          }
          if (result.length < limit) {
              // Rest auffüllen
               for (let i = mastered.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [mastered[i], mastered[j]] = [mastered[j], mastered[i]];
              }
              result = [...result, ...mastered];
          }
          return result.slice(0, limit);
      }
  },

  // --- 3. Standard Methoden (Unverändert) ---
  
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
  }
};