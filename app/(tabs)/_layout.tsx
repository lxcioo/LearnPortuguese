import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#58cc02', headerShown: false }}>
      
      {/* Der Pfad-Screen (Home) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Lernen',
          tabBarIcon: ({ color }) => <Ionicons name="school" size={24} color={color} />,
        }}
      />

      {/* NEU: Der Üben-Screen */}
      <Tabs.Screen
        name="practice"
        options={{
          title: 'Üben',
          tabBarIcon: ({ color }) => <Ionicons name="barbell" size={24} color={color} />,
        }}
      />

    </Tabs>
  );
}