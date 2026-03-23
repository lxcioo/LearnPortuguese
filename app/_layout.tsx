import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, 
    shouldShowList: true,
  }),
});

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { isDarkMode, isLoading: isThemeLoading } = useTheme();
  // Neuer State für den Update-Check
  const [isUpdateChecking, setIsUpdateChecking] = useState(true);

  useEffect(() => {
    async function checkUpdates() {
      // 1. Im Development-Modus (lokal) Updates überspringen
      if (__DEV__) {
        console.log('Dev mode: Skipping update check');
        setIsUpdateChecking(false);
        return;
      }

      try {
        // 2. Timeout hinzufügen (5 Sekunden), damit die App nicht hängt
        const updateCheck = Updates.checkForUpdateAsync();
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        // Renne gegen die Zeit: Entweder Update-Check fertig ODER Timeout
        const result: any = await Promise.race([updateCheck, timeout]);

        if (result?.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        // Fehler ignorieren (z.B. kein Internet oder Timeout), damit die App trotzdem startet
        console.log('Update check failed or timed out:', e);
      } finally {
        setIsUpdateChecking(false);
      }
    }

    checkUpdates();
  }, []);

  useEffect(() => {
    // Splash Screen erst ausblenden, wenn Theme UND Update-Check fertig sind
    if (!isThemeLoading && !isUpdateChecking) {
      SplashScreen.hideAsync();
      registerForPushNotificationsAsync();
    }
  }, [isThemeLoading, isUpdateChecking]);

  async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'web') return;

    let channelId = 'daily-reminder';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Erinnerungen',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#58cc02', // Passend zur App-Farbe
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log("Benachrichtigungen wurden vom Nutzer abgelehnt.");
      return;
    }

    // Lösche alte Schedule um Duplikate zu vermeiden
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Zeit für Portugiesisch! 🇵🇹",
        body: "Halte deinen Streak am Leben. 5 Minuten reichen!",
        sound: true, // Wichtig für Android
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 18,
        minute: 0,
        repeats: true,
        ...(Platform.OS === 'android' ? { channelId } : {}),
      },
    });
  }

  // Solange geladen wird, nichts rendern (Splash Screen ist noch sichtbar)
  if (isThemeLoading || isUpdateChecking) {
    return null;
  }

  return (
    <NavigationThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="lesson" options={{ headerShown: false }} />
        <Stack.Screen name="settings_modal" options={{ presentation: 'modal', title: 'Einstellungen' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}