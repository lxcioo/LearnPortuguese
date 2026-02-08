import { useTheme } from '@/components/ThemeContext';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const { isDarkMode, toggleTheme, theme } = useTheme();
  const currentColors = Colors[theme];

  const performReset = async () => {
    try {
      await AsyncStorage.clear();
      // Wenn der User Theme-Einstellungen behalten will, müssten wir das hier ausschließen,
      // aber "Alles löschen" impliziert oft einen kompletten Reset.
      // Falls das Theme bleiben soll, speichern wir es kurz zwischen oder setzen es neu.
      // Hier löschen wir alles rigoros.
      Alert.alert("Erfolg", "Alle Daten wurden zurückgesetzt.");
    } catch (e) {
      console.error(e);
    }
  };

  const resetProgress = () => {
    Alert.alert(
      "Alles löschen?",
      "Dein gesamter Lernfortschritt geht verloren. Dies kann nicht rückgängig gemacht werden.",
      [{ text: "Abbrechen" }, { text: "Löschen", style: "destructive", onPress: performReset }]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>Einstellungen</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Sektion: Darstellung */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.icon }]}>DARSTELLUNG</Text>
          
          <View style={[styles.row, { backgroundColor: isDarkMode ? '#222' : '#f9f9f9' }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <Ionicons name="moon" size={22} color={currentColors.text} />
                <Text style={[styles.rowText, { color: currentColors.text }]}>Dark Mode</Text>
            </View>
            <Switch 
              value={isDarkMode} 
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: '#58cc02' }}
              thumbColor={'#fff'}
            />
          </View>
        </View>

        {/* Sektion: Daten */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.icon }]}>DATEN</Text>
          
          <TouchableOpacity 
            style={[styles.row, { backgroundColor: isDarkMode ? '#222' : '#f9f9f9' }]} 
            onPress={resetProgress}
          >
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <Ionicons name="trash-outline" size={22} color="#ff4444" />
                <Text style={[styles.rowText, { color: '#ff4444' }]}>Fortschritt zurücksetzen</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{marginTop: 30, alignItems: 'center'}}>
            <Text style={{color: '#999'}}>Version 1.0.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  content: { padding: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10, marginLeft: 5 },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 15, 
    borderRadius: 12,
    marginBottom: 10
  },
  rowText: { fontSize: 16, fontWeight: '500' }
});