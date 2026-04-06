import { StreakService } from '@/src/model/services/StreakService';
import { StreakData } from '@/src/model/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export function useUserProgress() {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [examScores, setExamScores] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Scores laden
      const savedScores = await AsyncStorage.getItem('lessonScores');
      setScores(savedScores ? JSON.parse(savedScores) : {});

      // 2. Prüfungen laden
      const savedExams = await AsyncStorage.getItem('examScores');
      setExamScores(savedExams ? JSON.parse(savedExams) : {});

      // 3. Streak berechnen & reparieren (falls Aussetzer)
      const validatedStreak = await StreakService.checkAndRepairStreak();
      setStreakData(validatedStreak);
      setStreak(validatedStreak.currentStreak);

      // 4. Tagesfehler laden
      const dailyMistakesStr = await AsyncStorage.getItem('dailyMistakes');
      if (dailyMistakesStr) {
        const data = JSON.parse(dailyMistakesStr);
        const today = new Date().toDateString();
        if (data.date === today) {
          setMistakesCount(data.exercises.length);
        } else {
          setMistakesCount(0);
        }
      } else {
        setMistakesCount(0);
      }

    } catch (e) {
      console.error("Fehler beim Laden des Fortschritts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return { scores, examScores, streak, streakData, mistakesCount, loading, reload: loadData };
}