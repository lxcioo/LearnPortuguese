import { DiscordService } from '@/src/model/services/DiscordService';
import { NotificationService } from '@/src/model/services/NotificationService';
import { ErrorFallbackScreen } from '@/src/view/components/ui/ErrorFallbackScreen';
import { Colors } from '@/src/view/constants/theme';
import { ThemeProvider, useTheme } from '@/src/view/context/ThemeContext';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { ErrorBoundaryProps, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StreakService } from '../model/services/StreakService';

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
  const [isUpdateChecking, setIsUpdateChecking] = useState(true);

  // --- NEU: Das native Basis-Fenster von Android/iOS einfärben ----
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(
      isDarkMode ? Colors.dark.background : Colors.light.background
    );
  }, [isDarkMode]);

  // NEU: Wir passen das Standard-Theme von React Navigation an deine Farben an
  const MyLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: Colors.light.background,
    },
  };

  const MyDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Colors.dark.background,
    },
  };

  useEffect(() => {
    async function checkUpdates() {
      if (__DEV__) {
        console.log('Dev mode: Skipping update check');
        setIsUpdateChecking(false);
        return;
      }

      try {
        const updateCheck = Updates.checkForUpdateAsync();
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        const result: any = await Promise.race([updateCheck, timeout]);

        if (result?.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
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

      StreakService.hasCompletedDailyGoal().then(hasCompleted => {
        NotificationService.setupNotifications(hasCompleted);
      });
    }
  }, [isThemeLoading, isUpdateChecking]);

  if (isThemeLoading || isUpdateChecking) {
    return null;
  }

  return (
    // NEU: Hier übergeben wir unsere angepassten Themes
    <NavigationThemeProvider value={isDarkMode ? MyDarkTheme : MyLightTheme}>
      <Stack
        // NEU: Verhindert den weißen Balken bei Slide-Animationen
        screenOptions={{
          contentStyle: {
            backgroundColor: isDarkMode ? Colors.dark.background : Colors.light.background
          }
        }}
      >
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