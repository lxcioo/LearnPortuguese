import { Colors } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { StorageService } from '@/src/services/StorageService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsModal() {
  const { isDarkMode, toggleTheme, theme, gender, setGender } = useTheme();
  const currentColors = Colors[theme];

  // NEU: State für den Namen
  const [name, setName] = useState('');

  // NEU: Namen beim Laden der Seite abrufen
  useEffect(() => {
    StorageService.getUserProfile().then(profile => {
      if (profile) setName(profile.name);
    });
  }, []);

  // NEU: Namen speichern, wenn das Textfeld verlassen wird
  const handleSaveName = async () => {
    if (name.trim()) {
      await StorageService.saveUserProfile(name.trim());
    }
  };

  const performReset = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert("Erfolg", "Alle Daten wurden zurückgesetzt. Bitte starte die App neu.");
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
    <SafeAreaView 
      style={[styles.container, { backgroundColor: currentColors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* NEU: Sektion für den Namen */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.icon }]}>DEIN PROFIL</Text>
          <View style={[styles.card, { backgroundColor: isDarkMode ? '#222' : '#f9f9f9' }]}>
             <Text style={[styles.cardText, { color: currentColors.text, marginBottom: 10 }]}>
                Anzeigename:
             </Text>
             <TextInput
               style={[styles.input, { color: currentColors.text, borderColor: currentColors.border }]}
               value={name}
               onChangeText={setName}
               onEndEditing={handleSaveName} // Speichert automatisch, wenn die Tastatur zugeht
               placeholder="Dein Name"
               placeholderTextColor={currentColors.icon}
             />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.icon }]}>LERN-EINSTELLUNGEN</Text>
          <View style={[styles.card, { backgroundColor: isDarkMode ? '#222' : '#f9f9f9' }]}>
             <Text style={[styles.cardText, { color: currentColors.text, marginBottom: 15 }]}>
                Wähle deine Anredeform:
             </Text>
             
             <View style={styles.genderRow}>
                <TouchableOpacity 
                   style={[styles.genderBtn, gender === 'm' && styles.genderBtnActive]} 
                   onPress={() => setGender('m')}
                >
                   <Text style={[styles.genderLabel, gender === 'm' ? {color:'#fff'} : {color: currentColors.text}]}>Männlich</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                   style={[styles.genderBtn, gender === 'f' && styles.genderBtnActive]} 
                   onPress={() => setGender('f')}
                >
                   <Text style={[styles.genderLabel, gender === 'f' ? {color:'#fff'} : {color: currentColors.text}]}>Weiblich</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                   style={[styles.genderBtn, gender === 'd' && styles.genderBtnActive]} 
                   onPress={() => setGender('d')}
                >
                   <Text style={[styles.genderLabel, gender === 'd' ? {color:'#fff'} : {color: currentColors.text}]}>Divers</Text>
                </TouchableOpacity>
             </View>
          </View>
        </View>

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
            <Text style={{color: '#999'}}>Version 1.1.0</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  card: { padding: 15, borderRadius: 12 },
  cardText: { fontSize: 15 },
  rowText: { fontSize: 16, fontWeight: '500' },
  
  // NEU: Style für das Textfeld
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  genderBtn: { 
    flex: 1, 
    alignItems: 'center', 
    padding: 15, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#ddd',
    backgroundColor: 'transparent'
  },
  genderBtnActive: {
    backgroundColor: '#58cc02',
    borderColor: '#58cc02'
  },
  genderLabel: { fontSize: 14, fontWeight: '600' }
});