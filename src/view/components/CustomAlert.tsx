import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void; // Funktion für den primären Button
  isDarkMode?: boolean;

  // NEUE PROPS FÜR MEHR FLEXIBILITÄT
  primaryText?: string;
  primaryColor?: string;
  showCancel?: boolean;
  cancelText?: string;
  onCancel?: () => void;
}

export function CustomAlert({
  visible,
  title,
  message,
  onClose,
  isDarkMode = false,
  primaryText = "Verstanden",
  primaryColor = "#58cc02",
  showCancel = false,
  cancelText = "Abbrechen",
  onCancel
}: CustomAlertProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={showCancel && onCancel ? onCancel : onClose}>
      {/* ÄNDERUNG: Sauberes RGBA-Overlay statt buggy BlurView */}
      <View style={styles.modalOverlay}>
        <View style={[styles.content, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="information-circle" size={48} color={primaryColor} />
          </View>
          <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#1C1C1E' }]}>{title}</Text>
          <Text style={[styles.message, { color: isDarkMode ? '#EBEBF599' : '#3C3C4399' }]}>
            {message}
          </Text>

          <View style={styles.buttonContainer}>
            {showCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: isDarkMode ? '#333' : '#E5E5E5' }]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelButtonText, { color: isDarkMode ? '#fff' : '#333' }]}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: primaryColor, flex: 2 }]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>{primaryText}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', // Macht den Hintergrund dunkel und lenkt den Fokus auf den Alert
  },
  content: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  message: { fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    flex: 1,
  },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  cancelButtonText: { fontSize: 16, fontWeight: 'bold' }
});