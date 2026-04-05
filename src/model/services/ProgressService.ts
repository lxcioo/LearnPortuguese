import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyStats } from '../types';

const KEYS = {
    LESSON_SCORES: 'lessonScores',
    EXAM_SCORES: 'examScores',
    DAILY_STATS: 'dailyStats_v2',
    SEEN_VOCABULARY: 'seenVocabulary_v1',
};

export const ProgressService = {
    async saveLessonScore(lessonId: string, stars: number): Promise<void> {
        try {
            const existingData = await AsyncStorage.getItem(KEYS.LESSON_SCORES);
            let scores = existingData ? JSON.parse(existingData) : {};
            const oldScore = scores[lessonId] || 0;
            if (stars >= oldScore) {
                scores[lessonId] = stars;
                await AsyncStorage.setItem(KEYS.LESSON_SCORES, JSON.stringify(scores));
            }
        } catch (e) { console.error("Error saving lesson score", e); }
    },

    async markExamPassed(lessonId: string): Promise<void> {
        try {
            const existingExams = await AsyncStorage.getItem(KEYS.EXAM_SCORES);
            let exams = existingExams ? JSON.parse(existingExams) : {};
            exams[lessonId] = true;
            await AsyncStorage.setItem(KEYS.EXAM_SCORES, JSON.stringify(exams));
        } catch (e) { console.error("Error marking exam passed", e); }
    },

    async updateDailyStats(isCorrect: boolean, isLearned: boolean): Promise<void> {
        try {
            const today = new Date().toISOString().split('T')[0];
            const json = await AsyncStorage.getItem(KEYS.DAILY_STATS);
            let stats: DailyStats = json ? JSON.parse(json) : { date: today, wordsLearned: 0, mistakesMade: 0 };
            if (stats.date !== today) {
                stats = { date: today, wordsLearned: 0, mistakesMade: 0 };
            }

            // Logik verbessert: 'wordsLearned' wird nur erhöht, wenn ein Wort als "gelernt" gilt.
            if (isLearned) {
                stats.wordsLearned++;
            }
            if (!isCorrect) {
                stats.mistakesMade++;
            }

            await AsyncStorage.setItem(KEYS.DAILY_STATS, JSON.stringify(stats));
        } catch (e) { console.error("Error updating daily stats", e); }
    },

    async getDailyStats(): Promise<DailyStats> {
        const today = new Date().toISOString().split('T')[0];
        try {
            const json = await AsyncStorage.getItem(KEYS.DAILY_STATS);
            if (json) {
                const stats = JSON.parse(json);
                if (stats.date === today) return stats;
            }
        } catch (e) { console.error("Error getting daily stats", e); }
        return { date: today, wordsLearned: 0, mistakesMade: 0 };
    },

    // NEU: Lädt alle jemals gesehenen Wörter
    async getSeenVocabulary(): Promise<Record<string, boolean>> {
        try {
            const json = await AsyncStorage.getItem(KEYS.SEEN_VOCABULARY);
            return json ? JSON.parse(json) : {};
        } catch (e) { return {}; }
    },

    // NEU: Speichert neue Wörter als "gesehen"
    async markVocabularyAsSeen(vocabKeys: string[]): Promise<void> {
        if (!vocabKeys || vocabKeys.length === 0) return;
        try {
            const seen = await this.getSeenVocabulary();
            let hasChanges = false;

            vocabKeys.forEach(key => {
                if (!seen[key]) {
                    seen[key] = true;
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                await AsyncStorage.setItem(KEYS.SEEN_VOCABULARY, JSON.stringify(seen));
            }
        } catch (e) { console.error("Error saving seen vocabulary", e); }
    },
};