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
};

// Index 0 (unbenutzt), Box 1 (10m), Box 2 (30m), Box 3 (1h), Box 4 (6h), Box 5 (1d), Box 6 (30d)
const INTERVAL_MINUTES = [0, 10, 30, 60, 360, 1440, 43200]; 

export const StorageService = {

  // --- 1. Tracking Logik ---
  
  async trackResult(exercise: Exercise, isCorrect: boolean, source: 'lesson' | 'practice', manualBox?: number) {
    try {
      const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
      const db: VocabDatabase = json ? JSON.parse(json) : {};
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      let entry = db[exercise.id];
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

      if (source === 'practice' && manualBox !== undefined) {
          // Manuelle Bewertung
          const chosenBox = manualBox;
          
          // NEU: Wenn "Mittel" (Box 3) oder besser gewählt wird -> Fehlerstatus von heute löschen
          if (chosenBox >= 3) {
              entry.mistakesToday = 0;
          }

          if (chosenBox === 5) {
             entry.box5Streak = (entry.box5Streak || 0) + 1;
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

      } else if (source === 'lesson' || (source === 'practice' && !isCorrect)) {
          // Lernpfad ODER Falsche Antwort im Practice-Mode -> Automatik
          entry.box5Streak = 0; 
          if (isCorrect) {
             if (entry.box === 0) targetBox = 1;
          } else {
             // Fehler -> Sofort Box 1 (Absturz)
             targetBox = 1; 
          }
      }

      entry.box = targetBox;

      const minutesToAdd = INTERVAL_MINUTES[targetBox] || 10;
      const nextDate = new Date(now.getTime() + minutesToAdd * 60000);
      entry.nextReviewDate = nextDate.toISOString();

      db[exercise.id] = entry;
      await AsyncStorage.setItem(KEYS.GLOBAL_VOCAB, JSON.stringify(db));

      await this.updateDailyStats(isCorrect, entry.solvedToday >= 3 || entry.box > 0);

    } catch (e) { console.error("Error tracking result", e); }
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

  // --- Abruf Methoden (Unverändert) ---
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
  async getSmartSelection(candidates: Exercise[], mode: 'random' | 'leitner', limit: number | 'all'): Promise<Exercise[]> {
      const actualLimit = limit === 'all' ? candidates.length : limit;
      if (mode === 'random') {
          const pool = [...candidates];
          for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
          }
          return pool.slice(0, actualLimit);
      } else {
          const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
          const db: VocabDatabase = json ? JSON.parse(json) : {};
          const nowISO = new Date().toISOString();
          const due: Exercise[] = [];
          const unknown: Exercise[] = [];
          const mastered: Exercise[] = [];
          candidates.forEach(ex => {
              const entry = db[ex.id];
              if (!entry) unknown.push(ex);
              else if (entry.nextReviewDate <= nowISO) due.push(ex);
              else mastered.push(ex);
          });
          let result = [...due];
          if (result.length < actualLimit) {
              for (let i = unknown.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [unknown[i], unknown[j]] = [unknown[j], unknown[i]];
              }
              result = [...result, ...unknown];
          }
          if (result.length < actualLimit) {
               for (let i = mastered.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [mastered[i], mastered[j]] = [mastered[j], mastered[i]];
              }
              result = [...result, ...mastered];
          }
          return result.slice(0, actualLimit);
      }
  },
  // Standard Methoden
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