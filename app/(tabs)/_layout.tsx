import { Colors } from '@/src/constants/theme';
import { useColorScheme } from '@/src/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#58cc02', 
      headerShown: false,
      tabBarStyle: {
        backgroundColor: themeColors.background,
        borderTopColor: colorScheme === 'dark' ? '#333' : '#e0e0e0',
      }
    }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Lernen',
          tabBarIcon: ({ color }) => <Ionicons name="school" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="practice"
        options={{
          title: 'Üben',
          tabBarIcon: ({ color }) => <Ionicons name="barbell" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={24} color={color} />,
        }}
      />

    </Tabs>
  );
}