import { StreakService } from '@/src/models/services/StreakService';
import { StorageService } from '@/src/models/services/StorageService';
import { StreakData } from '@/src/models/types';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export function useUserProgress() {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [examScores, setExamScores] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [savedScores, savedExams, validatedStreak] = await Promise.all([
      StorageService.getItem<Record<string, number>>('lessonScores'),
      StorageService.getItem<Record<string, boolean>>('examScores'),
      StreakService.checkAndRepairStreak(),
    ]);

    setScores(savedScores || {});
    setExamScores(savedExams || {});
    setStreakData(validatedStreak);
    setStreak(validatedStreak.currentStreak);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  return { scores, examScores, streak, streakData, loading, reload: loadData };
}