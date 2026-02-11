import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise } from '../types';

const KEYS = {
  LESSON_SCORES: 'lessonScores',
  EXAM_SCORES: 'examScores',
  DAILY_PROGRESS: 'dailyProgress',
  STREAK_DATA: 'streakData',
  DAILY_MISTAKES: 'dailyMistakes',
  PRACTICE_SESSION: 'currentPracticeSession',
};

export const StorageService = {
  // --- Fortschritt speichern ---
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

  // --- Streak Logik ---
  async updateStreak() {
    try {
      const today = new Date().toDateString();
      const dailyProgressStr = await AsyncStorage.getItem(KEYS.DAILY_PROGRESS);
      let dailyData = dailyProgressStr ? JSON.parse(dailyProgressStr) : { count: 0, date: today };

      if (dailyData.date !== today) dailyData = { count: 0, date: today };

      dailyData.count += 1;
      await AsyncStorage.setItem(KEYS.DAILY_PROGRESS, JSON.stringify(dailyData));

      if (dailyData.count >= 15) { // Ziel erreicht für den Tag
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

  // --- Fehler speichern ---
  async saveDailyMistake(exercise: Exercise) {
    try {
      const today = new Date().toDateString();
      const existingDataStr = await AsyncStorage.getItem(KEYS.DAILY_MISTAKES);
      let data = existingDataStr ? JSON.parse(existingDataStr) : { date: today, exercises: [] };

      if (data.date !== today) data = { date: today, exercises: [] };

      const alreadyExists = data.exercises.some((ex: Exercise) => ex.id === exercise.id);
      if (!alreadyExists) {
        data.exercises.push(exercise);
        await AsyncStorage.setItem(KEYS.DAILY_MISTAKES, JSON.stringify(data));
      }
    } catch (e) { console.error("Error saving mistake", e); }
  },

  // --- Daten laden ---
  async getPracticeSession(): Promise<Exercise[] | null> {
    const session = await AsyncStorage.getItem(KEYS.PRACTICE_SESSION);
    return session ? JSON.parse(session) : null;
  }
};