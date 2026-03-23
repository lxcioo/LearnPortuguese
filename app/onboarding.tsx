import { Colors } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { StorageService } from '@/src/services/StorageService';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const router = useRouter();
  const { setGender, theme } = useTheme();
  const currentColors = Colors[theme];
  
  const [name, setName] = useState('');
  const [selectedGender, setSelectedGender] = useState<'m' | 'f' | 'd'>('m');

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Halt!", "Bitte gib einen Namen ein.");
      return;
    }
    
    // Daten speichern und zur App weiterleiten
    await StorageService.saveUserProfile(name);
    setGender(selectedGender);
    router.replace('/(tabs)/');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: currentColors.text }]}>Willkommen!</Text>
        <Text style={[styles.subtitle, { color: currentColors.icon }]}>Wie dürfen wir dich nennen?</Text>
        
        <TextInput 
          style={[styles.input, { color: currentColors.text, borderColor: currentColors.border }]}
          placeholder="Dein Name"
          placeholderTextColor={currentColors.icon}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={[styles.subtitle, { color: currentColors.icon, marginTop: 30 }]}>Wähle deine Anredeform für passende Vokabeln (z.B. Obrigado vs. Obrigada):</Text>
        
        <View style={styles.genderRow}>
          <TouchableOpacity style={[styles.genderBtn, selectedGender === 'm' && styles.genderBtnActive]} onPress={() => setSelectedGender('m')}>
             <Text style={[styles.genderLabel, selectedGender === 'm' ? {color:'#fff'} : {color: currentColors.text}]}>Männlich</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.genderBtn, selectedGender === 'f' && styles.genderBtnActive]} onPress={() => setSelectedGender('f')}>
             <Text style={[styles.genderLabel, selectedGender === 'f' ? {color:'#fff'} : {color: currentColors.text}]}>Weiblich</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.genderBtn, selectedGender === 'd' && styles.genderBtnActive]} onPress={() => setSelectedGender('d')}>
             <Text style={[styles.genderLabel, selectedGender === 'd' ? {color:'#fff'} : {color: currentColors.text}]}>Divers</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Loslegen</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 30, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, padding: 15, borderRadius: 12, fontSize: 18, marginBottom: 20 },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 40 },
  genderBtn: { flex: 1, alignItems: 'center', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#ddd' },
  genderBtnActive: { backgroundColor: '#58cc02', borderColor: '#58cc02' },
  genderLabel: { fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: '#58cc02', padding: 18, borderRadius: 30, alignItems: 'center', marginBottom: 20 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});