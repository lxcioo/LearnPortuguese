import { Colors } from '@/src/constants/theme';
import { useColorScheme } from '@/src/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
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
      tabBarPosition="bottom" // Leiste unten positionieren
      screenOptions={{
        tabBarActiveTintColor: '#58cc02',
        tabBarInactiveTintColor: 'gray',
        tabBarShowLabel: true,
        tabBarShowIcon: true, // Wichtig: Icons explizit aktivieren
        swipeEnabled: true,   // Aktiviert das Wischen zwischen den Tabs
        animationEnabled: true,
        
        // Styling, um wie eine normale Bottom-Bar auszusehen
        tabBarStyle: {
          backgroundColor: themeColors.background,
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#333' : '#e0e0e0',
          paddingBottom: insets.bottom, // Abstand für iPhone Home-Bar
          height: 60 + insets.bottom,   // Höhe anpassen
          elevation: 0, // Schatten bei Android entfernen
          shadowOpacity: 0, // Schatten bei iOS entfernen
        },
        // Den typischen "Strich" unter dem aktiven Tab entfernen wir für den klassischen Look
        tabBarIndicatorStyle: {
          backgroundColor: 'transparent',
          height: 0,
        },
        tabBarLabelStyle: {
          textTransform: 'none', // Verhindert GROSSBUCHSTABEN
          fontSize: 12,
          fontWeight: '600',
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
        name="settings"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="person-circle" size={24} color={color} />,
        }}
      />

    </MaterialTopTabs>
  );
}