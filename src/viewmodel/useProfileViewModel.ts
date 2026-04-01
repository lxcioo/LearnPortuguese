import { AchievementService } from '@/src/model/services/AchievementService';
import { LeitnerService } from '@/src/model/services/LeitnerService';
import { ProgressService } from '@/src/model/services/ProgressService';
import { UserProfileService } from '@/src/model/services/UserProfileService';
import { Achievement, UserProfile } from '@/src/model/types';
import { useTheme } from '@/src/view/context/ThemeContext';
import { useUserProgress } from '@/src/viewmodel/useUserProgress';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

export function useProfileViewModel() {
  const { gender } = useTheme();
  const router = useRouter();
  const { scores, streak, examScores, streakData } = useUserProgress();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyStats, setDailyStats] = useState({ wordsLearned: 0, mistakesMade: 0 });
  const [box4Count, setBox4Count] = useState(0);
  const [todayMistakesCount, setTodayMistakesCount] = useState(-1);

  // NEU: Achievements als State, da sie jetzt asynchron geladen werden
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // 1. Daten laden (wird ausgeführt, sobald der Tab geöffnet wird)
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

  // 2. Ableitungen und Berechnungen
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

  // NEU: Sobald alle abhängigen Daten geladen sind, prüfen wir die Errungenschaften
  useEffect(() => {
    if (todayMistakesCount === -1) return; // Warten, bis Daten da sind

    const loadAchievementsAsync = async () => {
      const achs = await AchievementService.loadAchievements({
        completedLessonsCount,
        threeStarLessonsCount,
        passedExamsCount,
        streak: safeStreak,
        totalStars,
        longTermMemoryCount: box4Count,
        hasCleanSlate,
        streakData,
      });
      setAchievements(achs);
    };

    loadAchievementsAsync();
  }, [completedLessonsCount, threeStarLessonsCount, passedExamsCount, safeStreak, totalStars, box4Count, hasCleanSlate, streakData, todayMistakesCount]);

  const maxDaily = Math.max(1, dailyStats.wordsLearned, dailyStats.mistakesMade);
  const dailyStatsFormatted = {
    wordsLearned: dailyStats.wordsLearned,
    mistakesMade: dailyStats.mistakesMade,
    wordsLearnedHeight: (dailyStats.wordsLearned / maxDaily) * 100,
    mistakesMadeHeight: (dailyStats.mistakesMade / maxDaily) * 100,
  };

  // 3. Übergabe an den Screen
  return {
    profile, studentTitle,
    levelInfo: { currentLevel, currentLevelXP, xpForNextLevel, progressPercent },
    dailyStats: dailyStatsFormatted,
    achievements, // Jetzt der geladene State
    actions: { navigateToSettings: () => router.push('/settings_modal') },
  };
}