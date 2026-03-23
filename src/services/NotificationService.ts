import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const NotificationService = {
  async setupNotifications(hasPracticedToday: boolean) {
    if (Platform.OS === 'web') return;

    const channelId = 'daily-reminder';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(channelId, {
        name: 'Erinnerungen',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#58cc02',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    await this.rescheduleReminders(hasPracticedToday);
  },

  async rescheduleReminders(hasPracticedToday: boolean) {
    if (Platform.OS === 'web') return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    // 1. Alle alten Benachrichtigungen löschen (Rettet uns vor dem Spam!)
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    
    // 2. Für die nächsten 14 Tage im Voraus planen
    for (let i = 0; i < 14; i++) {
      // Wenn es heute ist (Tag 0) und schon gelernt wurde -> überspringen!
      if (i === 0 && hasPracticedToday) continue;

      // --- 18:00 UHR ERINNERUNG ---
      const d18 = new Date(now.getTime());
      d18.setDate(now.getDate() + i);
      d18.setHours(18, 0, 0, 0);

      if (d18 > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Zeit für Portugiesisch! 🇵🇹",
            body: "Halte deinen Streak am Leben. 5 Minuten reichen!",
            sound: true,
          },
          trigger: {
            // NEU: Diese Zeile zwingt Expo dazu, auf das Datum zu warten!
            type: Notifications.SchedulableTriggerInputTypes.DATE, 
            date: d18,
            ...(Platform.OS === 'android' ? { channelId: 'daily-reminder' } : {}),
          },
        });
      }

      // --- 22:00 UHR ERINNERUNG (Letzte Chance) ---
      const d22 = new Date(now.getTime());
      d22.setDate(now.getDate() + i);
      d22.setHours(22, 0, 0, 0);

      if (d22 > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Letzte Chance! 🚨",
            body: "Dein Streak ist in Gefahr! Mach noch schnell eine Übung.",
            sound: true,
          },
          trigger: {
            // NEU: Diese Zeile zwingt Expo dazu, auf das Datum zu warten!
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: d22,
            ...(Platform.OS === 'android' ? { channelId: 'daily-reminder' } : {}),
          },
        });
      }
    }
  }
};