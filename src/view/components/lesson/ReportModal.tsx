import { BlurView } from 'expo-blur';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
  theme: any;
  isDarkMode: boolean;
}

export function ReportModal({ visible, onClose, onSubmit, theme, isDarkMode }: ReportModalProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(text);
      setText('');
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <BlurView intensity={70} tint={isDarkMode ? 'dark' : 'light'} style={styles.alertBackdrop}>
        <View style={[styles.alertBox, { backgroundColor: theme.card }]}>
          <Text style={[styles.alertTitle, { color: theme.text }]}>Feedback senden</Text>
          <Text style={[styles.alertMessage, { color: theme.subText }]}>
            Gibt es einen Fehler bei dieser Übung? Lass es uns wissen!
          </Text>

          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.inputBg, 
              borderColor: theme.border, 
              color: theme.text 
            }]}
            placeholder="Deine Nachricht..."
            placeholderTextColor="#ccc"
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={4}
            autoFocus
          />

          <View style={styles.alertButtons}>
            <TouchableOpacity style={[styles.alertButton, { backgroundColor: theme.inputBg }]} onPress={onClose} disabled={isSubmitting}>
              <Text style={[styles.alertButtonText, { color: theme.text }]}>Abbrechen</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.alertButton, styles.alertPrimaryButton, { opacity: !text.trim() ? 0.5 : 1 }]} 
              onPress={handleSubmit}
              disabled={isSubmitting || !text.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.alertPrimaryButtonText}>Senden</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  alertBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { width: '100%', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  alertTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  alertMessage: { fontSize: 16, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  input: { borderWidth: 2, borderRadius: 16, padding: 16, fontSize: 16, marginBottom: 20, minHeight: 100, textAlignVertical: 'top' },
  alertButtons: { flexDirection: 'row', gap: 12 },
  alertButton: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  alertPrimaryButton: { backgroundColor: '#1cb0f6' },
  alertButtonText: { fontSize: 16, fontWeight: 'bold' },
  alertPrimaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});