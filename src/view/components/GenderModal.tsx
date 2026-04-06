import { useTheme } from '@/src/view/context/ThemeContext';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function GenderModal() {
  const { gender, setGender, isLoading, isDarkMode } = useTheme();

  // Modal nicht zeigen, wenn noch geladen wird oder Gender schon gesetzt ist
  if (isLoading || gender !== null) return null;

  return (
    <Modal visible={true} animationType="fade" transparent={true}>
      <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={styles.modalContainer}>
        <View style={styles.content}>
          <Image
            source={{ uri: 'https://flagcdn.com/w160/pt.png' }}
            style={{ width: 80, height: 53, marginBottom: 30, borderRadius: 8 }}
          />
          <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Bem-vindo!</Text>
          <Text style={[styles.subtitle, { color: isDarkMode ? '#EBEBF599' : '#3C3C4399' }]}>
            Im Portugiesischen hängen viele Wörter vom Geschlecht ab.
            Wie möchtest du angesprochen werden?
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.optionButton, { backgroundColor: isDarkMode ? '#2c2c2e' : '#fff' }]} onPress={() => setGender('m')}>
              <Text style={[styles.buttonText, { color: isDarkMode ? '#fff' : '#000' }]}>Männlich</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionButton, { backgroundColor: isDarkMode ? '#2c2c2e' : '#fff' }]} onPress={() => setGender('f')}>
              <Text style={[styles.buttonText, { color: isDarkMode ? '#fff' : '#000' }]}>Weiblich</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.optionButton, { backgroundColor: isDarkMode ? '#2c2c2e' : '#fff' }]} onPress={() => setGender('d')}>
              <Text style={[styles.buttonText, { color: isDarkMode ? '#fff' : '#000' }]}>Divers</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.hint, { color: isDarkMode ? '#EBEBF599' : '#3C3C4399' }]}>
            Dies beeinflusst, welche Vokabelformen du lernst (z.B. obrigado vs. obrigada).
            Du kannst das später in den Einstellungen ändern.
          </Text>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { width: '100%', maxWidth: 400, alignItems: 'center' },
  title: { fontSize: 34, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  subtitle: { fontSize: 18, textAlign: 'center', marginBottom: 40, lineHeight: 26 },
  buttonContainer: { width: '100%', gap: 15, marginBottom: 30 },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
  },
  buttonText: { fontSize: 18, fontWeight: '600' },
  hint: { fontSize: 14, textAlign: 'center' }
});