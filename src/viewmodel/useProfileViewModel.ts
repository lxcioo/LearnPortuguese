import { AchievementService } from '@/src/model/services/AchievementService';
import { LeitnerService } from '@/src/model/services/LeitnerService';
import { ProgressService } from '@/src/model/services/ProgressService';
import { UserProfileService } from '@/src/model/services/UserProfileService';
import { UserProfile } from '@/src/model/types';
import { useTheme } from '@/src/view/context/ThemeContext';
import { useUserProgress } from '@/src/viewmodel/hooks/useUserProgress';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

// This ViewModel encapsulates all presentation logic for the ProfileScreen.
export function useProfileViewModel() {
  const { gender } = useTheme();
  const router = useRouter();
  const { scores, streak, examScores, streakData } = useUserProgress();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyStats, setDailyStats] = useState({ wordsLearned: 0, mistakesMade: 0 });
  const [box4Count, setBox4Count] = useState(0);
  const [todayMistakesCount, setTodayMistakesCount] = useState(-1);

  // 1. Fetch all necessary data on screen focus
  useFocusEffect(
    useCallback(() => {
      async function fetchData() {
        const userProfile = await UserProfileService.getUserProfile();
        setProfile(userProfile);

        const stats = await ProgressService.getDailyStats();
        setDailyStats(stats);

        const leitnerStats = await LeitnerService.getLeitnerStats();
        setBox4Count(leitnerStats[4] || 0);

        const mistakes = await LeitnerService.getTodayMistakes();
        setTodayMistakesCount(mistakes.length);
      }
      fetchData();
    }, [])
  );

  // 2. Derive state and compute values for the View
  const safeScores = scores || {};
  const safeExamScores = examScores || {};

  const totalStars = Object.values(safeScores).reduce<number>((sum, stars) => sum + (typeof stars === 'number' ? stars : 0), 0);
  const safeStreak = typeof streak === 'number' ? streak : 0;
  const totalXP = (totalStars * 10) + (safeStreak * 5);

  const currentLevel = Math.floor(totalXP / 100) + 1;
  const xpForNextLevel = 100;
  const currentLevelXP = totalXP % 100;
  const progressPercent = (currentLevelXP / xpForNextLevel) * 100;

  let studentTitle = 'Portugiesisch-Schüler';
  if (gender === 'f') studentTitle = 'Portugiesisch-Schülerin';
  if (gender === 'd') studentTitle = 'Portugiesisch-Schüler*in';

  const completedLessonsCount = Object.keys(safeScores).length;
  const threeStarLessonsCount = Object.values(safeScores).filter(s => s === 3).length;
  const passedExamsCount = Object.keys(safeExamScores).length;
  const hasCleanSlate = todayMistakesCount === 0 && dailyStats.wordsLearned > 30;

  const achievements = AchievementService.getAchievements({
    completedLessonsCount,
    threeStarLessonsCount,
    passedExamsCount,
    streak: safeStreak,
    totalStars,
    longTermMemoryCount: box4Count,
    hasCleanSlate,
    streakData,
  });

  // STRIKTES MVVM: Berechnungen für UI-Eigenschaften (wie Balkenhöhen) gehören ins ViewModel!
  const maxDaily = Math.max(1, dailyStats.wordsLearned, dailyStats.mistakesMade);
  const dailyStatsFormatted = {
    wordsLearned: dailyStats.wordsLearned,
    mistakesMade: dailyStats.mistakesMade,
    wordsLearnedHeight: (dailyStats.wordsLearned / maxDaily) * 100,
    mistakesMadeHeight: (dailyStats.mistakesMade / maxDaily) * 100,
  };

  // 3. Return a clean, structured interface for the View
  return {
    profile, studentTitle,
    levelInfo: { currentLevel, currentLevelXP, xpForNextLevel, progressPercent },
    dailyStats: dailyStatsFormatted, achievements,
    actions: { navigateToSettings: () => router.push('/settings_modal') },
  };
}