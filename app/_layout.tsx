import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GenderModal } from '@/src/components/GenderModal';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';

SplashScreen.preventAutoHideAsync();

// FIX 1: Fehlende Properties ergänzt (shouldShowBanner, shouldShowList)
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
  const { isDarkMode, isLoading } = useTheme();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
      registerForPushNotificationsAsync();
    }
  }, [isLoading]);

  async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'web') return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return;
    }

    // Lösche alte Schedule um Duplikate zu vermeiden
    await Notifications.cancelAllScheduledNotificationsAsync();

    // FIX 2: 'type' Property hinzugefügt
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Zeit für Portugiesisch! 🇵🇹",
        body: "Halte deinen Streak am Leben. 5 Minuten reichen!",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour: 18,
        minute: 0,
        repeats: true,
      },
    });
  }

  if (isLoading) {
    return null;
  }

  return (
    <NavigationThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="lesson" options={{ headerShown: false }} />
      </Stack>
      <GenderModal /> 
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