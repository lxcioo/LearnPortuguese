import { Colors } from '@/src/view/constants/theme';
import { useColorScheme } from '@/src/view/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator, MaterialTopTabBar } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Erstellt den Navigator, der Wischgesten unterstützt
const { Navigator } = createMaterialTopTabNavigator();

// Wrap für Expo Router
const MaterialTopTabs = withLayoutContext(Navigator);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      tabBar={(props: any) => {
        const isDark = colorScheme === 'dark';
        return (
          <View
            style={[
              styles.floatingTabBarContainer,
              {
                bottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                // ÄNDERUNG: Stabile, semi-transparente Farbe (92% Deckkraft) statt Buggy BlurView
                backgroundColor: isDark ? 'rgba(28, 28, 30, 0.92)' : 'rgba(255, 255, 255, 0.92)', 
              },
            ]}
          >
            <MaterialTopTabBar
              {...props}
              style={{ backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }}
            />
          </View>
        );
      }}
      screenOptions={{
        tabBarActiveTintColor: '#58cc02', // Zurück zum frischen Grün
        tabBarInactiveTintColor: 'gray',
        tabBarShowLabel: true,
        tabBarShowIcon: true, // Wichtig: Icons explizit aktivieren
        swipeEnabled: true,   // Aktiviert das Wischen zwischen den Tabs
        animationEnabled: true,
        
        // Den typischen "Strich" unter dem aktiven Tab entfernen wir für den klassischen Look
        tabBarIndicatorStyle: {
          backgroundColor: 'transparent',
          height: 0,
        },
        tabBarLabelStyle: {
          textTransform: 'none', // Verhindert GROSSBUCHSTABEN
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
      }}
    >
      
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: 'Lernen',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="school" size={24} color={color} />,
        }}
      />

      <MaterialTopTabs.Screen
        name="practice"
        options={{
          title: 'Üben',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="barbell" size={24} color={color} />,
        }}
      />

      <MaterialTopTabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="person-circle" size={24} color={color} />,
        }}
      />

    </MaterialTopTabs>
  );
}

const styles = StyleSheet.create({
  floatingTabBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
  },
});