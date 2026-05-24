import { StreakData } from '../types';
import { StorageService } from './StorageService';
import { NotificationService } from './NotificationService';

const KEYS = {
  DAILY_PROGRESS: 'dailyProgress',
  STREAK_DATA: 'streakData',
};

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const StreakService = {
  async checkAndRepairStreak(): Promise<StreakData> {
    const baseData = await StorageService.getItem<StreakData>(KEYS.STREAK_DATA);
    let streakData: StreakData = {
      currentStreak: baseData?.currentStreak || 0,
      lastStreakDate: baseData?.lastStreakDate || '',
      streakOnIceCount: baseData?.streakOnIceCount || 0,
      history: baseData?.history || {}
    };

    if (!streakData.lastStreakDate) return streakData;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDate = new Date(streakData.lastStreakDate);
    lastDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      let daysToCover = diffDays - 1;
      let currentDateToFill = new Date(lastDate);
      currentDateToFill.setDate(currentDateToFill.getDate() + 1);

      while (daysToCover > 0 && streakData.streakOnIceCount > 0) {
        streakData.streakOnIceCount--;
        const dateStr = getLocalDateString(currentDateToFill);
        streakData.history[dateStr] = 'frozen';
        streakData.lastStreakDate = dateStr;
        currentDateToFill.setDate(currentDateToFill.getDate() + 1);
        daysToCover--;
      }

      if (daysToCover > 0) {
        streakData.currentStreak = 0;
      }

      await StorageService.setItem(KEYS.STREAK_DATA, streakData);
    }
    return streakData;
  },

  async updateStreak(forceComplete: boolean = false) {
    const todayObj = new Date();
    const todayStr = getLocalDateString(todayObj);
    const todayDateString = todayObj.toDateString();

    let dailyData = (await StorageService.getItem<{ count: number; date: string }>(KEYS.DAILY_PROGRESS)) || {
      count: 0,
      date: todayDateString
    };

    if (dailyData.date !== todayDateString) dailyData = { count: 0, date: todayDateString };

    dailyData.count += forceComplete ? 15 : 1;
    await StorageService.setItem(KEYS.DAILY_PROGRESS, dailyData);

    if (dailyData.count >= 15) {
      let streakData = await this.checkAndRepairStreak();

      if (streakData.history[todayStr] !== 'learned') {
        streakData.history[todayStr] = 'learned';

        if (streakData.lastStreakDate !== todayStr) {
          const lastDateStr = new Date(streakData.lastStreakDate || todayObj);
          lastDateStr.setHours(0, 0, 0, 0);
          const todayReset = new Date(todayObj);
          todayReset.setHours(0, 0, 0, 0);
          const diffTime = todayReset.getTime() - lastDateStr.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1 || streakData.lastStreakDate === '') {
            streakData.currentStreak += 1;
          } else if (diffDays !== 0) {
            streakData.currentStreak = 1;
          }

          streakData.lastStreakDate = todayStr;

          if (streakData.currentStreak > 0 && streakData.currentStreak % 7 === 0) {
            streakData.streakOnIceCount += 1;
          }
        }
        await StorageService.setItem(KEYS.STREAK_DATA, streakData);
        NotificationService.rescheduleReminders(true);
      }
    }
  },

  async hasCompletedDailyGoal(): Promise<boolean> {
    const streakData = await StorageService.getItem<StreakData>(KEYS.STREAK_DATA);
    if (!streakData) return false;
    const todayStr = getLocalDateString(new Date());
    return streakData.history?.[todayStr] === 'learned';
  },
};