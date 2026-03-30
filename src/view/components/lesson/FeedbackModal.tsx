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
  solutionText: string;
  onContinue: () => void;
  onRate: (box: number) => void;
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
  isVisible, isCorrect, solutionText, onContinue, onRate, rating, theme, isDarkMode, animatedStyle
}: FeedbackModalProps) {
  return (
    <Modal animationType="fade" transparent={true} visible={isVisible}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[
          styles.feedbackContainer,
          { backgroundColor: isCorrect ? theme.feedbackSuccessBg : theme.feedbackErrorBg },
          animatedStyle
        ]}>
          <Text style={[styles.feedbackTitle, { color: theme.feedbackText }]}>{isCorrect ? 'Richtig!' : 'Falsch'}</Text>
          <View style={styles.marginBottom20}>
            <Text style={[styles.feedbackSubtitle, { color: theme.subText }]}>Lösung:</Text>
            <View style={styles.solutionRow}>
              <Text style={[styles.feedbackSolution, { color: theme.feedbackText }]}>{solutionText}</Text>
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
  feedbackTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  feedbackSubtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  feedbackSolution: { fontSize: 19, fontWeight: '600', flexShrink: 1 },
  solutionRow: { flexDirection: 'row', alignItems: 'center' },
  continueButton: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 15 },
  continueButtonText: { fontSize: 18, fontWeight: 'bold' },
  textSuccess: { color: '#58cc02' },
  textError: { color: '#ea2b2b' },
  marginBottom20: { marginBottom: 20 },
  boxBtn: { flex: 1, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  boxBtnLabel: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  boxBtnSub: { color: '#fff', fontSize: 11, opacity: 0.9 }
});