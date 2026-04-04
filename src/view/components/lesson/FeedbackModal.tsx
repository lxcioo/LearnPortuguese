import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';

type RatingButton = {
  box: number;
  label: string;
  sub: string;
  color: string;
};

type RatingProps = {
  show: boolean;
  buttons: RatingButton[];
};

type FeedbackModalProps = {
  isVisible: boolean;
  isCorrect: boolean;
  solutionData: { pt: string; de: string };
  onContinue: () => void;
  onRate: (box: number) => void;
  onPlayAudio?: () => void;
  onReportClick?: () => void;
  rating: RatingProps;
  theme: {
    feedbackSuccessBg: string;
    feedbackErrorBg: string;
    feedbackText: string;
    subText: string;
  };
  isDarkMode: boolean;
  animatedStyle: any;
};

export function FeedbackModal({
  isVisible, isCorrect, solutionData, onContinue, onRate, onPlayAudio, onReportClick, rating, theme, isDarkMode, animatedStyle
}: FeedbackModalProps) {
  return (
    <Modal animationType="fade" transparent={true} visible={isVisible}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[
          styles.feedbackContainer,
          { backgroundColor: isCorrect ? theme.feedbackSuccessBg : theme.feedbackErrorBg },
          animatedStyle
        ]}>
          <View style={styles.titleRow}>
            <Text style={[styles.feedbackTitle, { color: theme.feedbackText }]}>{isCorrect ? 'Richtig!' : 'Falsch'}</Text>
            {onReportClick && (
              <TouchableOpacity onPress={onReportClick} style={{ padding: 4 }}>
                <Ionicons name="flag-outline" size={24} color={theme.feedbackText} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.marginBottom20}>
            <Text style={[styles.feedbackSubtitle, { color: theme.subText }]}>Lösung:</Text>
            <View style={styles.solutionRow}>
              {onPlayAudio && (
                <TouchableOpacity style={[styles.speakerButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={onPlayAudio}>
                  <Ionicons name="volume-medium" size={26} color="#1cb0f6" />
                </TouchableOpacity>
              )}
              <View style={styles.solutionTextCol}>
                <Text style={[styles.feedbackSolutionPt, { color: theme.feedbackText }]}>{solutionData.pt}</Text>
                <Text style={[styles.feedbackSolutionDe, { color: theme.subText }]}>{solutionData.de}</Text>
              </View>
            </View>
          </View>

          {rating.show ? (
            <View>
              <Text style={{ color: theme.subText, marginBottom: 10, fontWeight: 'bold' }}>Wie gut wusstest du es?</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {rating.buttons.map((btn) => (
                  <TouchableOpacity key={btn.box} style={[styles.boxBtn, { backgroundColor: btn.color }]} onPress={() => onRate(btn.box)}>
                    <Text style={styles.boxBtnLabel}>{btn.label}</Text>
                    <Text style={styles.boxBtnSub}>{btn.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[styles.continueButton, isDarkMode && { backgroundColor: '#333' }]} onPress={onContinue}>
              <Text style={[styles.continueButtonText, isCorrect ? styles.textSuccess : styles.textError]}>WEITER</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  feedbackContainer: { padding: 24, paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  feedbackTitle: { fontSize: 24, fontWeight: 'bold' },
  feedbackSubtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  solutionRow: { flexDirection: 'row', alignItems: 'center' },
  speakerButton: { padding: 10, borderRadius: 14, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  solutionTextCol: { flexShrink: 1, justifyContent: 'center' },
  feedbackSolutionPt: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  feedbackSolutionDe: { fontSize: 15, fontWeight: '500' },
  continueButton: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 15 },
  continueButtonText: { fontSize: 18, fontWeight: 'bold' },
  textSuccess: { color: '#58cc02' },
  textError: { color: '#ea2b2b' },
  marginBottom20: { marginBottom: 20 },
  boxBtn: { flex: 1, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  boxBtnLabel: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  boxBtnSub: { color: '#fff', fontSize: 11, opacity: 0.9 }
});