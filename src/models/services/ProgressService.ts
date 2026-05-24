import { DailyStats } from '../types';
import { StorageService } from './StorageService';

const KEYS = {
  LESSON_SCORES: 'lessonScores',
  EXAM_SCORES: 'examScores',
  DAILY_STATS: 'dailyStats_v2',
  SEEN_VOCABULARY: 'seenVocabulary_v2',
};

export const ProgressService = {
  async saveLessonScore(lessonId: string, stars: number): Promise<void> {
    const scores = (await StorageService.getItem<Record<string, number>>(KEYS.LESSON_SCORES)) || {};
    if (stars >= (scores[lessonId] || 0)) {
      scores[lessonId] = stars;
      await StorageService.setItem(KEYS.LESSON_SCORES, scores);
    }
  },

  async markExamPassed(lessonId: string): Promise<void> {
    const exams = (await StorageService.getItem<Record<string, boolean>>(KEYS.EXAM_SCORES)) || {};
    exams[lessonId] = true;
    await StorageService.setItem(KEYS.EXAM_SCORES, exams);
  },

  async updateDailyStats(isCorrect: boolean, isLearned: boolean): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let stats = (await StorageService.getItem<DailyStats>(KEYS.DAILY_STATS)) || {
      date: today,
      wordsLearned: 0,
      mistakesMade: 0,
    };

    if (stats.date !== today) {
      stats = { date: today, wordsLearned: 0, mistakesMade: 0 };
    }

    if (isLearned) stats.wordsLearned++;
    if (!isCorrect) stats.mistakesMade++;

    await StorageService.setItem(KEYS.DAILY_STATS, stats);
  },

  async getDailyStats(): Promise<DailyStats> {
    const today = new Date().toISOString().split('T')[0];
    const stats = await StorageService.getItem<DailyStats>(KEYS.DAILY_STATS);

    if (stats && stats.date === today) return stats;
    return { date: today, wordsLearned: 0, mistakesMade: 0 };
  },

  async getSeenVocabulary(): Promise<Record<string, string>> {
    return (await StorageService.getItem<Record<string, string>>(KEYS.SEEN_VOCABULARY)) || {};
  },

  async saveNewVocabulary(newWords: Record<string, string>): Promise<void> {
    const existing = await this.getSeenVocabulary();
    await StorageService.setItem(KEYS.SEEN_VOCABULARY, { ...existing, ...newWords });
  },
};