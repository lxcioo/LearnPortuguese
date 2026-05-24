import { AchievementService } from '@/src/models/services/AchievementService';
import { LeitnerService } from '@/src/models/services/LeitnerService';
import { ProgressService } from '@/src/models/services/ProgressService';
import { UserProfileService } from '@/src/models/services/UserProfileService';
import { Achievement, UserProfile } from '@/src/models/types';
import { useTheme } from '@/src/views/context/ThemeContext';
import { useUserProgress } from '@/src/viewmodels/useUserProgress';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useProfileViewModel() {
  const { gender } = useTheme();
  const router = useRouter();
  const { scores, streak, examScores, streakData } = useUserProgress();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyStats, setDailyStats] = useState({ wordsLearned: 0, mistakesMade: 0 });
  const [box4Count, setBox4Count] = useState(0);
  const [todayMistakesCount, setTodayMistakesCount] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [userProfile, stats, leitnerStats, mistakes] = await Promise.all([
          UserProfileService.getUserProfile(),
          ProgressService.getDailyStats(),
          LeitnerService.getLeitnerStats(),
          LeitnerService.getTodayMistakes(),
        ]);

        setProfile(userProfile);
        setDailyStats(stats);
        setBox4Count(leitnerStats[4] || 0);
        setTodayMistakesCount(mistakes.length);
      })();
    }, [])
  );

  const { totalStars, completedLessonsCount, threeStarLessonsCount, passedExamsCount, hasCleanSlate } = useMemo(() => {
    const safeScores = scores || {};
    const safeExamScores = examScores || {};

    const total = Object.values(safeScores).reduce<number>((sum, stars) => sum + (typeof stars === 'number' ? stars : 0), 0);
    const completed = Object.keys(safeScores).length;
    const threeStar = Object.values(safeScores).filter(s => s === 3).length;
    const passed = Object.keys(safeExamScores).length;
    const cleanSlate = todayMistakesCount === 0 && dailyStats.wordsLearned > 30;

    return { totalStars: total, completedLessonsCount: completed, threeStarLessonsCount: threeStar, passedExamsCount: passed, hasCleanSlate: cleanSlate };
  }, [scores, examScores, todayMistakesCount, dailyStats.wordsLearned]);

  const safeStreak = streak ?? 0;

  const { currentLevel, currentLevelXP, xpForNextLevel, progressPercent } = useMemo(() => {
    const totalXP = (totalStars * 10) + (safeStreak * 5);
    const level = Math.floor(totalXP / 100) + 1;
    const levelXp = totalXP % 100;

    return { currentLevel: level, currentLevelXP: levelXp, xpForNextLevel: 100, progressPercent: (levelXp / 100) * 100 };
  }, [totalStars, safeStreak]);

  let studentTitle = 'Portugiesisch-Schüler';
  if (gender === 'f') studentTitle = 'Portugiesisch-Schülerin';
  if (gender === 'd') studentTitle = 'Portugiesisch-Schüler*in';

  useEffect(() => {
    (async () => {
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
    })();
  }, [completedLessonsCount, threeStarLessonsCount, passedExamsCount, safeStreak, totalStars, box4Count, hasCleanSlate, streakData]);

  const maxDaily = Math.max(1, dailyStats.wordsLearned, dailyStats.mistakesMade);

  return {
    profile,
    studentTitle,
    levelInfo: { currentLevel, currentLevelXP, xpForNextLevel, progressPercent },
    dailyStats: {
      wordsLearned: dailyStats.wordsLearned,
      mistakesMade: dailyStats.mistakesMade,
      wordsLearnedHeight: (dailyStats.wordsLearned / maxDaily) * 100,
      mistakesMadeHeight: (dailyStats.mistakesMade / maxDaily) * 100,
    },
    achievements,
    actions: { navigateToSettings: () => router.push('/settings_modal') },
  };
}