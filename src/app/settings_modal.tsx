import { DiscordService } from '@/src/model/services/DiscordService';
import { UserProfileService } from '@/src/model/services/UserProfileService';
import { useTheme } from '@/src/view/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function SettingsModal() {
  const { isDarkMode, themeSetting, setThemeSetting, gender, setGender } = useTheme();
  const currentColors = {
    background: isDarkMode ? '#000' : '#F2F2F7',
    card: isDarkMode ? '#1C1C1E' : '#fff',
    text: isDarkMode ? '#fff' : '#000',
    secondaryText: isDarkMode ? '#EBEBF599' : '#3C3C4399',
    separator: isDarkMode ? '#38383A' : '#C6C6C8',
    accent: '#58cc02', // Zurück zum typischen Grün
    destructive: '#FF453A',
  };

  const [name, setName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    UserProfileService.getUserProfile().then(profile => {
      if (profile) setName(profile.name);
    });
  }, []);

  const handleSaveName = async () => {
    if (name.trim()) {
      await UserProfileService.saveUserProfile(name.trim());
    }
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) return;
    try {
      const senderName = name.trim() ? name.trim() : "Unbekannt (Gast)";

      await DiscordService.sendFeedback(senderName, feedback);

      Toast.show({ type: 'success', text1: 'Danke!', text2: 'Dein Feedback wurde erfolgreich gesendet.' });
      setFeedback('');
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Fehler', text2: 'Senden fehlgeschlagen. Bitte überprüfe deine Internetverbindung.' });
    }
  };

  const performReset = async () => {
    setShowResetConfirm(false);
    try {
      await AsyncStorage.clear();
      Toast.show({ type: 'success', text1: 'Erfolg', text2: 'Alle Daten wurden zurückgesetzt. Bitte Neustarten.' });
    } catch (e) {
      console.error(e);
    }
  };

  const resetProgress = () => {
    setShowResetConfirm(true); // Custom Glass Modal statt Standard Alert
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: currentColors.background }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.secondaryText }]}>DEIN PROFIL</Text>
          <View style={[styles.card, { backgroundColor: currentColors.card }]}>
            <TextInput
              style={[styles.input, { color: currentColors.text }]}
              value={name}
              onChangeText={setName}
              onEndEditing={handleSaveName}
              placeholder="Dein Name"
              placeholderTextColor={currentColors.secondaryText}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.secondaryText }]}>LERN-EINSTELLUNGEN</Text>
          <View style={[styles.card, { backgroundColor: currentColors.card }]}>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentBtn, gender === 'm' && [styles.segmentBtnActive, { backgroundColor: currentColors.accent }]]}
                onPress={() => setGender('m')}
              >
                <Text style={[styles.segmentLabel, gender === 'm' ? { color: '#fff' } : { color: currentColors.text }]}>Männlich</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, gender === 'f' && [styles.segmentBtnActive, { backgroundColor: currentColors.accent }]]}
                onPress={() => setGender('f')}
              >
                <Text style={[styles.segmentLabel, gender === 'f' ? { color: '#fff' } : { color: currentColors.text }]}>Weiblich</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, gender === 'd' && [styles.segmentBtnActive, { backgroundColor: currentColors.accent }]]}
                onPress={() => setGender('d')}
              >
                <Text style={[styles.segmentLabel, gender === 'd' ? { color: '#fff' } : { color: currentColors.text }]}>Divers</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.secondaryText }]}>FEEDBACK</Text>
          <View style={[styles.card, { backgroundColor: currentColors.card }]}>
            <TextInput
              style={[styles.input, styles.textArea, { color: currentColors.text, borderTopColor: currentColors.separator }]}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Gefundene Fehler, Ideen oder Wünsche?"
              placeholderTextColor={currentColors.secondaryText}
              multiline
            />
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: currentColors.accent }]} onPress={submitFeedback}>
              <Text style={styles.actionBtnText}>Senden</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.secondaryText }]}>DARSTELLUNG</Text>
          <View style={[styles.card, { backgroundColor: currentColors.card }]}>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentBtn, themeSetting === 'light' && [styles.segmentBtnActive, { backgroundColor: currentColors.accent }]]}
                onPress={() => setThemeSetting('light')}
              >
                <Text style={[styles.segmentLabel, themeSetting === 'light' ? { color: '#fff' } : { color: currentColors.text }]}>Hell</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, themeSetting === 'dark' && [styles.segmentBtnActive, { backgroundColor: currentColors.accent }]]}
                onPress={() => setThemeSetting('dark')}
              >
                <Text style={[styles.segmentLabel, themeSetting === 'dark' ? { color: '#fff' } : { color: currentColors.text }]}>Dunkel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, themeSetting === 'system' && [styles.segmentBtnActive, { backgroundColor: currentColors.accent }]]}
                onPress={() => setThemeSetting('system')}
              >
                <Text style={[styles.segmentLabel, themeSetting === 'system' ? { color: '#fff' } : { color: currentColors.text }]}>System</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentColors.secondaryText }]}>DATEN</Text>
          <View style={[styles.card, { backgroundColor: currentColors.card }]}>
            <TouchableOpacity
              style={styles.row}
              onPress={resetProgress}
            >
              <Text style={[styles.rowText, { color: currentColors.destructive }]}>Fortschritt zurücksetzen</Text>
              <Ionicons name="trash-outline" size={20} color={currentColors.destructive} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginTop: 30, marginBottom: 50, alignItems: 'center' }}>
          <Text style={{ color: currentColors.secondaryText }}>Version 1.1.0</Text>
        </View>

      </ScrollView>
      <Toast />

      {/* Modernes "Liquid Glass" Alert Modal */}
      <Modal visible={showResetConfirm} transparent={true} animationType="fade">
        <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={styles.alertBackdrop}>
          <View style={[styles.alertBox, { backgroundColor: currentColors.card }]}>
            <Text style={[styles.alertTitle, { color: currentColors.text }]}>Alles löschen?</Text>
            <Text style={[styles.alertMessage, { color: currentColors.secondaryText }]}>
              Dein gesamter Lernfortschritt geht verloren. Dies kann nicht rückgängig gemacht werden.
            </Text>

            <View style={[styles.alertButtonGroup, { borderTopColor: currentColors.separator }]}>
              <TouchableOpacity style={styles.alertButton} onPress={() => setShowResetConfirm(false)}>
                <Text style={[styles.alertButtonText, { color: currentColors.text }]}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.alertButton, { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: currentColors.separator }]} onPress={performReset}>
                <Text style={[styles.alertButtonText, { color: currentColors.destructive, fontWeight: 'bold' }]}>Löschen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 20 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 13, fontWeight: '400', marginBottom: 8, marginLeft: 16, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  card: { borderRadius: 12, overflow: 'hidden' },
  rowText: { fontSize: 17 },

  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  segmentBtnActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  segmentLabel: { fontSize: 13, fontWeight: '600' },
  actionBtn: {
    margin: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },

  // Alert Styles
  alertBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    width: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  alertMessage: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  alertButtonGroup: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  alertButtonText: {
    fontSize: 17,
  },
});