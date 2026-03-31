import { Colors } from '@/src/view/constants/theme';
import { useColorScheme } from '@/src/view/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator, MaterialTopTabBar } from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import { withLayoutContext } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      // @ts-expect-error: Expo Router vergisst diese Eigenschaft in den Typen, sie funktioniert aber!
      sceneContainerStyle={{ backgroundColor: 'transparent' }} 
      tabBar={(props: any) => {
        const isDark = colorScheme === 'dark';
        
        return (
          // 1. Der äußere Wrapper: Kümmert sich NUR noch um die Position und Schatten
          <View
            style={[
              styles.floatingTabBarWrapper,
              { bottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16 }
            ]}
          >
            {/* 2. Die BlurView: Hat jetzt ihre EIGENEN runden Ecken und Rahmen */}
            <BlurView
              intensity={Platform.OS === 'ios' ? 60 : 60}
              tint={isDark ? 'dark' : 'light'}
              experimentalBlurMethod="dimezisBlurView" // Zwingt Android, echtes Blur zu nutzen
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 32,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                }
              ]}
            />
            
            {/* 3. Die eigentlichen Icons */}
            <MaterialTopTabBar 
              {...props} 
              style={{ backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 }}
            />
          </View>
        );
      }}
      screenOptions={{
        tabBarActiveTintColor: '#58cc02',
        tabBarInactiveTintColor: 'gray',
        tabBarShowLabel: true,
        tabBarShowIcon: true,
        swipeEnabled: true,
        animationEnabled: true,
        
        tabBarStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
        },
        
        tabBarIndicatorStyle: {
          backgroundColor: 'transparent',
          height: 0,
        },
        tabBarLabelStyle: {
          textTransform: 'none',
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
  floatingTabBarWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    // HIER KEIN 'overflow: hidden' MEHR! Das hat den Filter zerstört.
    borderRadius: 32, 
    zIndex: 100,
    
    // Optional: Ein leichter Schlagschatten lässt das Milchglas besser schweben
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
});