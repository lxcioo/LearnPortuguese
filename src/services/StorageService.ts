import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise, MistakeDatabase } from '../types';

const KEYS = {
  LESSON_SCORES: 'lessonScores',
  EXAM_SCORES: 'examScores',
  DAILY_PROGRESS: 'dailyProgress', // Streak-Logik
  STREAK_DATA: 'streakData',       // Streak-Daten
  PRACTICE_SESSION: 'currentPracticeSession',
  GLOBAL_MISTAKES: 'globalMistakeHistory', // NEU: Persistente Fehler-DB
};

// Leitner Intervalle in Tagen: Box 1=1 Tag, Box 2=3 Tage, etc.
const LEITNER_INTERVALS = [0, 1, 3, 7, 14, 30]; 

export const StorageService = {
  
  // --- 1. Kern-Logik: Ergebnis tracken ---
  async trackExerciseResult(exercise: Exercise, isCorrect: boolean) {
    try {
      const json = await AsyncStorage.getItem(KEYS.GLOBAL_MISTAKES);
      const db: MistakeDatabase = json ? JSON.parse(json) : {};
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

      let entry = db[exercise.id];

      if (!entry) {
        // Neu anlegen
        entry = {
          exerciseId: exercise.id,
          exerciseRef: exercise,
          leitnerBox: 0,
          nextReviewDate: todayStr,
          mistakeCount: 0,
          successCount: 0,
          history: []
        };
      }

      // Historie updaten
      entry.history.push({ 
        date: todayStr, 
        result: isCorrect ? 'correct' : 'wrong' 
      });

      if (isCorrect) {
        entry.successCount += 1;
        // Leitner: Box aufsteigen (max 5)
        if (entry.leitnerBox < 5) {
            entry.leitnerBox += 1;
        }
        // Nächstes Datum berechnen
        const interval = LEITNER_INTERVALS[entry.leitnerBox] || 1;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + interval);
        entry.nextReviewDate = nextDate.toISOString().split('T')[0];

      } else {
        entry.mistakeCount += 1;
        // Leitner: Zurück auf Box 1 (oder 0) bei Fehler
        entry.leitnerBox = 1; 
        // Muss morgen sofort wiederholt werden
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        entry.nextReviewDate = tomorrow.toISOString().split('T')[0];
      }

      // Zurückspeichern
      db[exercise.id] = entry;
      await AsyncStorage.setItem(KEYS.GLOBAL_MISTAKES, JSON.stringify(db));

    } catch (e) { console.error("Error tracking result", e); }
  },

  // --- 2. Datenabruf für Practice Screen ---

  // Gibt Übungen zurück, die heute (oder früher) fällig sind
  async getDueExercises(): Promise<Exercise[]> {
    try {
      const json = await AsyncStorage.getItem(KEYS.GLOBAL_MISTAKES);
      if (!json) return [];
      const db: MistakeDatabase = JSON.parse(json);
      const today = new Date().toISOString().split('T')[0];

      return Object.values(db)
        .filter(entry => entry.nextReviewDate <= today) // Fällig?
        .map(entry => entry.exerciseRef);
    } catch (e) { return []; }
  },

  // Hard Mode: Die Übungen mit den meisten Fehlern (Top 20)
  async getHardModeExercises(): Promise<Exercise[]> {
    try {
      const json = await AsyncStorage.getItem(KEYS.GLOBAL_MISTAKES);
      if (!json) return [];
      const db: MistakeDatabase = JSON.parse(json);

      return Object.values(db)
        .filter(entry => entry.mistakeCount > 0) // Nur wirkliche Fehler
        .sort((a, b) => b.mistakeCount - a.mistakeCount) // Absteigend sortieren
        .slice(0, 20) // Top 20
        .map(entry => entry.exerciseRef);
    } catch (e) { return []; }
  },

  // Statistik für Diagramm (Letzte 7 Tage)
  async getWeeklyStats(): Promise<{ date: string, correct: number, wrong: number }[]> {
    try {
        const json = await AsyncStorage.getItem(KEYS.GLOBAL_MISTAKES);
        const db: MistakeDatabase = json ? JSON.parse(json) : {};
        const entries = Object.values(db);
        
        const statsMap: Record<string, {correct: number, wrong: number}> = {};
        
        // Initialisiere letzte 7 Tage mit 0
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            statsMap[dateStr] = { correct: 0, wrong: 0 };
        }

        // Durch alle History-Einträge loopen
        entries.forEach(entry => {
            entry.history.forEach(h => {
                // Nur Datumsteil nutzen (falls history Zeitstempel hat, hier trimmen wir auf YYYY-MM-DD)
                const dateKey = h.date.split('T')[0];
                if (statsMap[dateKey]) {
                    if (h.result === 'correct') statsMap[dateKey].correct++;
                    else statsMap[dateKey].wrong++;
                }
            });
        });

        return Object.entries(statsMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, val]) => ({ date, ...val }));

    } catch (e) { return []; }
  },

  // --- 3. Bestehende Methoden (Scores, Streak, Session) ---
  
  async saveLessonScore(lessonId: string, stars: number) {
    try {
      const existingData = await AsyncStorage.getItem(KEYS.LESSON_SCORES);
      let scores = existingData ? JSON.parse(existingData) : {};
      const oldScore = scores[lessonId] || 0;
      if (stars >= oldScore) {
        scores[lessonId] = stars;
        await AsyncStorage.setItem(KEYS.LESSON_SCORES, JSON.stringify(scores));
      }
    } catch (e) { console.error("Error saving score", e); }
  },

  async markExamPassed(lessonId: string) {
    try {
      const existingExams = await AsyncStorage.getItem(KEYS.EXAM_SCORES);
      let exams = existingExams ? JSON.parse(existingExams) : {};
      exams[lessonId] = true;
      await AsyncStorage.setItem(KEYS.EXAM_SCORES, JSON.stringify(exams));
    } catch (e) { console.error("Error saving exam", e); }
  },

  async updateStreak() {
    try {
      const today = new Date().toDateString(); // "Mon Feb 14 2026"
      const dailyProgressStr = await AsyncStorage.getItem(KEYS.DAILY_PROGRESS);
      let dailyData = dailyProgressStr ? JSON.parse(dailyProgressStr) : { count: 0, date: today };

      if (dailyData.date !== today) dailyData = { count: 0, date: today };
      dailyData.count += 1;
      await AsyncStorage.setItem(KEYS.DAILY_PROGRESS, JSON.stringify(dailyData));

      if (dailyData.count >= 15) { 
        const streakDataStr = await AsyncStorage.getItem(KEYS.STREAK_DATA);
        let streakData = streakDataStr ? JSON.parse(streakDataStr) : { currentStreak: 0, lastStreakDate: '' };

        if (streakData.lastStreakDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          if (streakData.lastStreakDate === yesterday.toDateString()) {
            streakData.currentStreak += 1;
          } else {
            streakData.currentStreak = 1;
          }
          streakData.lastStreakDate = today;
          await AsyncStorage.setItem(KEYS.STREAK_DATA, JSON.stringify(streakData));
        }
      }
    } catch (e) { console.error("Error updating streak", e); }
  },

  async savePracticeSession(exercises: Exercise[]) {
      await AsyncStorage.setItem(KEYS.PRACTICE_SESSION, JSON.stringify(exercises));
  },

  async getPracticeSession(): Promise<Exercise[] | null> {
    const session = await AsyncStorage.getItem(KEYS.PRACTICE_SESSION);
    return session ? JSON.parse(session) : null;
  }
};