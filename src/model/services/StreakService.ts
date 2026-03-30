import AsyncStorage from '@react-native-async-storage/async-storage';
import { StreakData } from '../types';
import { NotificationService } from './NotificationService';

const KEYS = {
    DAILY_PROGRESS: 'dailyProgress',
    STREAK_DATA: 'streakData',
};

export const StreakService = {
    async checkAndRepairStreak(): Promise<StreakData> {
        try {
            const streakDataStr = await AsyncStorage.getItem(KEYS.STREAK_DATA);
            let baseData = streakDataStr ? JSON.parse(streakDataStr) : null;

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

            const diffTime = today.getTime() - lastDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 1) {
                let daysToCover = diffDays - 1;
                let currentDateToFill = new Date(lastDate);
                currentDateToFill.setDate(currentDateToFill.getDate() + 1);

                while (daysToCover > 0 && streakData.streakOnIceCount > 0) {
                    streakData.streakOnIceCount--;
                    const dateStr = currentDateToFill.toISOString().split('T')[0];
                    streakData.history[dateStr] = 'frozen';
                    streakData.lastStreakDate = dateStr;
                    currentDateToFill.setDate(currentDateToFill.getDate() + 1);
                    daysToCover--;
                }

                if (daysToCover > 0) {
                    streakData.currentStreak = 0;
                }

                await AsyncStorage.setItem(KEYS.STREAK_DATA, JSON.stringify(streakData));
            }
            return streakData;
        } catch (e) {
            return { currentStreak: 0, lastStreakDate: '', streakOnIceCount: 0, history: {} };
        }
    },

    async updateStreak(forceComplete: boolean = false) {
        try {
            const todayObj = new Date();
            const todayStr = todayObj.toISOString().split('T')[0];
            const todayDateString = todayObj.toDateString();

            const dailyProgressStr = await AsyncStorage.getItem(KEYS.DAILY_PROGRESS);
            let dailyData = dailyProgressStr ? JSON.parse(dailyProgressStr) : { count: 0, date: todayDateString };
            if (dailyData.date !== todayDateString) dailyData = { count: 0, date: todayDateString };

            dailyData.count += forceComplete ? 15 : 1;
            await AsyncStorage.setItem(KEYS.DAILY_PROGRESS, JSON.stringify(dailyData));

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
                    await AsyncStorage.setItem(KEYS.STREAK_DATA, JSON.stringify(streakData));

                    NotificationService.rescheduleReminders(true);
                }
            }
        } catch (e) { }
    },

    async hasCompletedDailyGoal(): Promise<boolean> {
        try {
            const json = await AsyncStorage.getItem(KEYS.STREAK_DATA);
            if (!json) return false;
            const streakData: StreakData = JSON.parse(json);
            const todayStr = new Date().toISOString().split('T')[0];
            return streakData.history?.[todayStr] === 'learned';
        } catch (e) { return false; }
    },
};