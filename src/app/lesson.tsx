import { CustomAlert } from '@/src/view/components/CustomAlert';
import { FeedbackModal } from '@/src/view/components/lesson/FeedbackModal';
import { FinishScreen } from '@/src/view/components/lesson/FinishScreen';
import { useLessonViewModel } from '@/src/viewmodel/useLessonViewModel';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ==========================================
// 2. VIEW
// ==========================================
// Die dumme View-Komponente, die nur noch Daten darstellt.
export default function LessonScreen() {
  const { state, viewProps, feedback, finishScreenData, rating, actions, theme, isDarkMode } = useLessonViewModel();
  const navigation = useNavigation();
  const [confirmExit, setConfirmExit] = useState<{ visible: boolean; action: any }>({ visible: false, action: null });

  const currentExercise = state.currentExercise;

  // --- ANIMATIONS LOGIK ---
  const progressWidth = useSharedValue(0);
  const shakeTranslateX = useSharedValue(0);

  // 1. Fließender Fortschrittsbalken
  useEffect(() => {
    progressWidth.value = withSpring(state.progressPercent, { damping: 15, stiffness: 90 });
  }, [state.progressPercent]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`
  }));

// 2. Fehler-Wackeln (ohne das Einfliegen)
  useEffect(() => {
    if (feedback.show && !feedback.isCorrect) {
      shakeTranslateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [feedback.show, feedback.isCorrect]);

  const animatedModalStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeTranslateX.value }
    ]
  }));

  // --- NAVIGATION GUARD (View-spezifisch) ---
useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (finishScreenData.isFinished || finishScreenData.isPractice) return;
      e.preventDefault();
      // Anstatt Alert.alert zeigen wir unseren Custom Dialog:
      setConfirmExit({ visible: true, action: e.data.action });
    });
    return unsubscribe;
  }, [navigation, finishScreenData.isFinished, finishScreenData.isPractice]);

  const renderLoading = () => (
    <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color="#58cc02" />
    </View>
  );

  if (state.loading || !currentExercise) return renderLoading();
  if (finishScreenData.isFinished) {
    return <FinishScreen
      isPractice={finishScreenData.isPractice}
      earnedStars={finishScreenData.earnedStars}
      onGoBack={actions.goBack}
      backgroundColor={theme.background}
    />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex1}>
        <View style={styles.header}>
          <TouchableOpacity onPress={actions.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={theme.subText} />
          </TouchableOpacity>
          <View style={[styles.progressBarBackground, { backgroundColor: theme.progressBarBg }]}>
            <Animated.View style={[styles.progressBarFill, animatedProgressStyle]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View key={currentExercise.id} entering={FadeInRight} exiting={FadeOutLeft}>
            <Text style={[styles.instruction, { color: theme.subText }]}>{viewProps.instructionText}</Text>
            <View style={styles.questionContainer}>
              <TouchableOpacity style={[styles.speakerButton, { backgroundColor: theme.speakerBg }]} onPress={() => actions.playAudio(currentExercise.id)}>
                <Ionicons name="volume-medium" size={30} color="#1cb0f6" />
              </TouchableOpacity>
              <Text style={[styles.question, { color: theme.text }]}>{currentExercise.question}</Text>
            </View>

            {viewProps.isTranslateExercise && (
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
                placeholder={viewProps.placeholderText} placeholderTextColor="#ccc"
                value={state.userInput} onChangeText={actions.setUserInput} autoCapitalize="sentences" autoCorrect={false}
              />
            )}

            {currentExercise.type === 'multiple_choice' && (
              <View style={styles.optionsContainer}>
                {currentExercise.options?.map((option: string, index: number) => {
                  const isSelected = state.selectedOption === index;
                  return (
                    <TouchableOpacity key={index}
                      style={[styles.optionButton, { borderColor: isSelected ? '#1cb0f6' : theme.border }, isSelected && { backgroundColor: theme.optionSelectedBg }]}
                      onPress={() => actions.setSelectedOption(index)}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { borderColor: theme.cardBorder }]}>
          <TouchableOpacity style={[styles.checkButton, viewProps.isCheckButtonDisabled && styles.disabledButton]} onPress={actions.checkAnswer} disabled={viewProps.isCheckButtonDisabled}>
            <Text style={styles.checkButtonText}>ÜBERPRÜFEN</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <FeedbackModal
        isVisible={feedback.show}
        isCorrect={feedback.isCorrect}
        solutionText={feedback.solutionText}
        onContinue={actions.nextExercise}
        onRate={actions.ratePractice}
        rating={rating}
        theme={theme}
        isDarkMode={isDarkMode}
        animatedStyle={animatedModalStyle}
      />
      <CustomAlert 
        visible={confirmExit.visible}
        title="Lektion abbrechen?"
        message="Dein bisheriger Fortschritt in dieser Lektion geht verloren."
        primaryText="Verlassen"
        primaryColor="#ea2b2b" // Rot für destruktive Aktion
        showCancel={true}
        cancelText="Bleiben"
        onCancel={() => setConfirmExit({ visible: false, action: null })}
        onClose={() => {
          setConfirmExit({ visible: false, action: null });
          navigation.dispatch(confirmExit.action);
        }}
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { padding: 4 },
  progressBarBackground: { flex: 1, height: 16, borderRadius: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#58cc02' },
  content: { padding: 20, flexGrow: 1, justifyContent: 'center' },
  instruction: { fontSize: 18, marginBottom: 10, fontWeight: '600' },
  questionContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  speakerButton: { marginRight: 15, padding: 10, borderRadius: 50 },
  question: { fontSize: 26, fontWeight: 'bold', flex: 1 },
  input: { borderWidth: 2, borderRadius: 16, padding: 16, fontSize: 20 },
  optionsContainer: { gap: 12 },
  optionButton: { padding: 16, borderWidth: 2, borderRadius: 16, alignItems: 'center' },
  optionText: { fontSize: 18, fontWeight: '600', color: '#777' },
  optionTextSelected: { color: '#1cb0f6' },
  footer: { padding: 20, borderTopWidth: 2 },
  checkButton: { backgroundColor: '#58cc02', padding: 16, borderRadius: 16, alignItems: 'center', width: '100%' },
  disabledButton: { backgroundColor: '#e5e5e5' },
  checkButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
});