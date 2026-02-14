import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConfidenceLevel, Exercise, VocabDatabase } from '../types';

const KEYS = {
  LESSON_SCORES: 'lessonScores',
  EXAM_SCORES: 'examScores',
  DAILY_PROGRESS: 'dailyProgress',
  STREAK_DATA: 'streakData',
  PRACTICE_SESSION: 'currentPracticeSession',
  GLOBAL_VOCAB: 'globalVocabDB', // Neue Datenbank
};

export const StorageService = {

  // --- 1. Neue Tracking Logik (Turbo Spaced Repetition) ---
  
  async trackResult(exercise: Exercise, confidence: ConfidenceLevel) {
    try {
      const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
      const db: VocabDatabase = json ? JSON.parse(json) : {};
      const now = new Date();

      let entry = db[exercise.id];
      if (!entry) {
        entry = {
          exerciseId: exercise.id,
          exerciseRef: exercise,
          nextReviewDate: now.toISOString(),
          intervalMinutes: 0,
          perfectStreak: 0,
          isMastered: false,
          mistakeCount: 0,
          successCount: 0,
          history: []
        };
      }

      // Mapping: Confidence -> Minuten
      let addedMinutes = 0;
      let isCorrect = true;

      switch (confidence) {
        case 'none': // Gar nicht (Falsch) -> Sofort (0 min)
          addedMinutes = 0;
          isCorrect = false;
          entry.perfectStreak = 0; // Reset
          break;
        case 'low': // Kaum -> 5 min
          addedMinutes = 5;
          entry.perfectStreak = 0;
          break;
        case 'medium': // Unsicher -> 10 min
          addedMinutes = 10;
          entry.perfectStreak = 0;
          break;
        case 'high': // Fast sicher -> 30 min
          addedMinutes = 30;
          entry.perfectStreak = 0;
          break;
        case 'perfect': // Komplett gewusst -> 60 min
          addedMinutes = 60;
          entry.perfectStreak += 1;
          break;
      }

      // Mastery Check (3x Perfekt hintereinander)
      if (entry.perfectStreak >= 3) {
        entry.isMastered = true;
        // Wird effektiv aus dem Pool genommen (Datum sehr weit in Zukunft oder Flag prüfen)
        addedMinutes = 525600; // 1 Jahr Ruhe
      } else {
        // Falls es vorher mastered war, aber jetzt nicht mehr perfekt gewusst wurde:
        if (confidence !== 'perfect') {
            entry.isMastered = false;
        }
      }

      // Neues Fälligkeitsdatum berechnen
      const nextDate = new Date(now.getTime() + addedMinutes * 60000);
      entry.nextReviewDate = nextDate.toISOString();
      entry.intervalMinutes = addedMinutes;

      // Stats update
      if (isCorrect) entry.successCount++;
      else entry.mistakeCount++;

      entry.history.push({
        date: now.toISOString(),
        result: isCorrect ? 'correct' : 'wrong',
        confidence
      });

      db[exercise.id] = entry;
      await AsyncStorage.setItem(KEYS.GLOBAL_VOCAB, JSON.stringify(db));

    } catch (e) { console.error("Error tracking result", e); }
  },

  // --- 2. Datenabruf Strategien ---

  // Strategie A: Alles was fällig ist (Spaced Repetition)
  async getDueExercises(): Promise<Exercise[]> {
    try {
      const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
      if (!json) return [];
      const db: VocabDatabase = JSON.parse(json);
      const now = new Date().toISOString();

      return Object.values(db)
        .filter(e => !e.isMastered && e.nextReviewDate <= now) // Nicht gemeistert & Zeit abgelaufen
        .map(e => e.exerciseRef);
    } catch (e) { return []; }
  },

  // Strategie B: Fehler von HEUTE (für "Fehler heute" Button)
  async getTodayMistakes(): Promise<Exercise[]> {
    try {
      const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
      if (!json) return [];
      const db: VocabDatabase = JSON.parse(json);
      
      // Heute Start (00:00 Uhr)
      const startToday = new Date();
      startToday.setHours(0,0,0,0);
      
      const mistakes: Exercise[] = [];
      
      Object.values(db).forEach(entry => {
        // Hat irgendeinen History-Eintrag von heute mit 'wrong' oder confidence 'none'?
        const hasMistakeToday = entry.history.some(h => {
            const hDate = new Date(h.date);
            return hDate >= startToday && (h.result === 'wrong' || h.confidence === 'none');
        });
        
        // Nur hinzufügen, wenn noch nicht gemeistert (Sicherheitsnetz)
        if (hasMistakeToday && !entry.isMastered) {
            mistakes.push(entry.exerciseRef);
        }
      });
      
      return mistakes;
    } catch (e) { return []; }
  },

  // Strategie C: Intelligentes "Freies Training" (Smart Select)
  async getSmartSelection(candidateExercises: Exercise[], limit: number = 20): Promise<Exercise[]> {
    try {
        const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
        const db: VocabDatabase = json ? JSON.parse(json) : {};
        const now = new Date().toISOString();

        const dueList: Exercise[] = [];
        const newItems: Exercise[] = [];
        const notDueButActive: Exercise[] = [];

        for (const ex of candidateExercises) {
            const entry = db[ex.id];

            if (!entry) {
                // Noch nie gemacht -> Neu
                newItems.push(ex);
            } else if (entry.isMastered) {
                // Gemeistert -> Ignorieren!
                continue;
            } else if (entry.nextReviewDate <= now) {
                // Fällig -> Priorität
                dueList.push(ex);
            } else {
                // Noch nicht fällig, aber im Lernprozess
                notDueButActive.push(ex);
            }
        }

        // 1. Fällige
        let result = [...dueList];
        
        // 2. Neue (zufällig gemischt)
        if (result.length < limit) {
            for (let i = newItems.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newItems[i], newItems[j]] = [newItems[j], newItems[i]];
            }
            result = [...result, ...newItems];
        }

        // 3. Laufende (zum Auffüllen)
        if (result.length < limit) {
             result = [...result, ...notDueButActive];
        }

        return result.slice(0, limit);

    } catch (e) { return candidateExercises.slice(0, limit); }
  },

  // --- 3. Statistik Daten ---
  
  async getGlobalProgressStats() {
      try {
        const json = await AsyncStorage.getItem(KEYS.GLOBAL_VOCAB);
        const db: VocabDatabase = json ? JSON.parse(json) : {};
        const values = Object.values(db);

        const stats = {
            total: values.length,
            mastered: 0,
            learning: 0,
            struggling: 0,
            new: 0 
        };

        values.forEach(v => {
            if (v.isMastered) {
                stats.mastered++;
            } else {
                const last = v.history[v.history.length - 1];
                // Als "Struggling" werten, wenn das letzte Mal falsch/schlecht war
                if (last && (last.confidence === 'none' || last.confidence === 'low')) {
                    stats.struggling++;
                } else {
                    stats.learning++;
                }
            }
        });
        
        return stats;
      } catch (e) { return { total:0, mastered:0, learning:0, struggling:0, new:0 }; }
  },

  // --- 4. Bestehende Methoden ---

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