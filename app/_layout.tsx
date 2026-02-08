import 'react-native-reanimated';

import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemeProvider, useTheme } from '@/components/ThemeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function GenderSelectionModal() {
  const { gender, setGender, isLoading, isDarkMode } = useTheme();

  if (isLoading || gender !== null) return null;

  return (
    <Modal visible={true} animationType="slide" transparent={false}>
      <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? '#151718' : '#fff' }]}>
        <View style={styles.content}>
            <Image 
              source={{ uri: 'https://flagcdn.com/w160/pt.png' }} 
              style={{ width: 80, height: 53, marginBottom: 30, borderRadius: 8 }} 
            />
            <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>Bem-vindo!</Text>
            <Text style={[styles.subtitle, { color: isDarkMode ? '#ccc' : '#555' }]}>
              Im Portugiesischen hängen viele Wörter vom Geschlecht ab. 
              Wie möchtest du angesprochen werden?
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.optionButton} onPress={() => setGender('m')}>
                <Text style={styles.buttonText}>Männlich</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.optionButton} onPress={() => setGender('f')}>
                <Text style={styles.buttonText}>Weiblich</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.optionButton} onPress={() => setGender('d')}>
                <Text style={styles.buttonText}>Divers</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.hint, { color: isDarkMode ? '#666' : '#999' }]}>
              Dies beeinflusst, welche Vokabelformen du lernst (z.B. obrigado vs. obrigada). 
              Du kannst das später in den Einstellungen ändern.
            </Text>
        </View>
      </View>
    </Modal>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isDarkMode } = useTheme();

  return (
    <NavigationThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="lesson" options={{ headerShown: false }} />
      </Stack>
      <GenderSelectionModal />
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { width: '100%', maxWidth: 400, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  subtitle: { fontSize: 18, textAlign: 'center', marginBottom: 40, lineHeight: 26 },
  buttonContainer: { width: '100%', gap: 15, marginBottom: 30 },
  optionButton: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f0f0f0', 
    padding: 18, 
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e5e5'
  },
  buttonText: { fontSize: 18, fontWeight: '600', color: '#333' },
  hint: { fontSize: 14, textAlign: 'center' }
});