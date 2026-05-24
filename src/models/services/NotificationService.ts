import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'daily-reminder';

export const NotificationService = {
  async setupChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Erinnerungen',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#58cc02',
      });
    }
  },

  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  },

  async setupNotifications(hasPracticedToday: boolean) {
    if (Platform.OS === 'web') return;

    await this.setupChannel();
    const hasPermission = await this.requestPermissions();

    if (!hasPermission) return;

  },

  async rescheduleReminders(hasPracticedToday: boolean) {
    if (Platform.OS === 'web') return;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // 1. Alle alten Benachrichtigungen löschen (Rettet uns vor dem Spam!)
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();

    // 2. Für die nächsten 14 Tage im Voraus planen
    for (let i = 0; i < 14; i++) {
      // Wenn es heute ist (Tag 0) und schon gelernt wurde -> überspringen!
      if (i === 0 && hasPracticedToday) continue;

      // --- 18:00 UHR ERINNERUNG ---
      await this.scheduleNotification(
        "Zeit für Portugiesisch! 🇵🇹",
        "Halte deinen Streak am Leben. 5 Minuten reichen!",
        this.getTriggerDate(now, i, 18)
      );

      // --- 22:00 UHR ERINNERUNG (Letzte Chance) ---
      await this.scheduleNotification(
        "Letzte Chance! 🚨",
        "Dein Streak ist in Gefahr! Mach noch schnell eine Übung.",
        this.getTriggerDate(now, i, 22)
      );
    }
  },

  getTriggerDate(baseDate: Date, daysToAdd: number, hours: number): Date {
    const triggerDate = new Date(baseDate.getTime());
    triggerDate.setDate(baseDate.getDate() + daysToAdd);
    triggerDate.setHours(hours, 0, 0, 0);
    return triggerDate;
  },

  async scheduleNotification(title: string, body: string, triggerDate: Date) {
    // Verhindern, dass Benachrichtigungen in der Vergangenheit geplant werden
    if (triggerDate <= new Date()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
  }
};