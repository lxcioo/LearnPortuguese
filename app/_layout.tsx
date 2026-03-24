import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { NotificationService } from '@/src/services/NotificationService';
import { StorageService } from '@/src/services/StorageService';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { ErrorBoundaryProps, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorFallbackScreen } from '../src/components/ui/ErrorFallbackScreen';
import { DiscordService } from '../src/services/DiscordService';

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
    if (!isThemeLoading && !isUpdateChecking) {
      SplashScreen.hideAsync();

      // Prüfen, ob heute schon gelernt wurde und Benachrichtigungen entsprechend planen
      StorageService.hasCompletedDailyGoal().then(hasCompleted => {
        NotificationService.setupNotifications(hasCompleted);
      });
    }
  }, [isThemeLoading, isUpdateChecking]);

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
        <Stack.Screen name="grammar_modal" options={{ presentation: 'modal', title: 'Grammatik' }} />
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

// NEU: Expo Router Error Boundary
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    DiscordService.sendCrashReport(error);
  }, [error]);

  return <ErrorFallbackScreen retry={retry} />;
}