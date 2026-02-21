import { Colors } from '@/src/constants/theme';
import { useColorScheme } from '@/src/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { useLessonLogic } from '../src/hooks/useLessonLogic';

export default function LessonScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id: lessonId, type: lessonType, mode: lessonMode } = useLocalSearchParams<{ id: string, type: string, mode: string }>();
  
  const { gender, isDarkMode } = useTheme();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const { playAudio } = useAudioPlayer();
  
  const {
    loading, currentExercise, progressPercent,
    userInput, setUserInput, selectedOption, setSelectedOption,
    showFeedback, isCorrect, isLessonFinished, earnedStars,
    checkAnswer, nextExercise, ratePractice, isPractice,
    getSolutionDisplay
  } = useLessonLogic(lessonId, lessonType, gender, lessonMode);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isLessonFinished || isPractice) return;
      e.preventDefault();
      Alert.alert('Lektion abbrechen?', 'Fortschritt geht verloren.', [
          { text: 'Bleiben', style: 'cancel', onPress: () => {} },
          { text: 'Verlassen', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, isLessonFinished, isPractice]);

  const renderLoading = () => (
    <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color="#58cc02" />
    </View>
  );

  const renderFinishScreen = () => {
      return (
        <SafeAreaView style={[styles.container, styles.centerContent, { backgroundColor: theme.background }]}>
          <Text style={styles.finishTitle}>{isPractice ? "Training beendet!" : "Lektion beendet!"}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3].map((star) => (
              <Ionicons key={star} name={star <= earnedStars ? "star" : "star-outline"} size={60} color="#FFD700" />
            ))}
          </View>
          <TouchableOpacity style={styles.checkButton} onPress={() => router.back()}>
            <Text style={styles.checkButtonText}>ZUR ÜBERSICHT</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
  };

  if (loading || !currentExercise) return renderLoading();
  if (isLessonFinished) return renderFinishScreen();

  const isTranslate = currentExercise.type.includes('translate');
  const isTranslateToPt = currentExercise.type === 'translate_to_pt';
  const instructionText = isTranslate 
    ? (isTranslateToPt ? 'Übersetze ins Portugiesische' : 'Übersetze ins Deutsche')
    : 'Wähle die richtige Lösung';
  const placeholderText = isTranslateToPt ? 'Auf Portugiesisch...' : 'Auf Deutsch...';
  const isButtonDisabled = !userInput && selectedOption === null;

  // NEU: Zeiten angepasst
  const ratingButtons = [
      { box: 1, label: 'Nochmal', sub: '1h', color: '#ff7675' },
      { box: 2, label: 'Schwer', sub: '6h', color: '#fdcb6e' },
      { box: 3, label: 'Mittel', sub: '1 Tag', color: '#ffeaa7' },
      { box: 4, label: 'Gut', sub: '3 Tage', color: '#55efc4' },
      { box: 5, label: 'Einfach', sub: '1 Wo', color: '#00b894' },
  ];

  const showRating = isPractice && isCorrect && lessonMode !== 'random';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex1}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={theme.subText} />
          </TouchableOpacity>
          <View style={[styles.progressBarBackground, { backgroundColor: theme.progressBarBg }]}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.instruction, { color: theme.subText }]}>{instructionText}</Text>
          <View style={styles.questionContainer}>
            <TouchableOpacity style={[styles.speakerButton, { backgroundColor: theme.speakerBg }]} onPress={() => playAudio(currentExercise.id)}>
               <Ionicons name="volume-medium" size={30} color="#1cb0f6" />
            </TouchableOpacity>
            <Text style={[styles.question, { color: theme.text }]}>{currentExercise.question}</Text>
          </View>

          {isTranslate && (
            <TextInput 
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} 
              placeholder={placeholderText} placeholderTextColor="#ccc" 
              value={userInput} onChangeText={setUserInput} autoCapitalize="sentences" autoCorrect={false} 
            />
          )}

          {currentExercise.type === 'multiple_choice' && (
            <View style={styles.optionsContainer}>
              {currentExercise.options?.map((option, index) => {
                const isSelected = selectedOption === index;
                return (
                  <TouchableOpacity key={index} 
                    style={[styles.optionButton, { borderColor: isSelected ? '#1cb0f6' : theme.border }, isSelected && { backgroundColor: theme.optionSelectedBg }]} 
                    onPress={() => { setSelectedOption(index); playAudio(`${currentExercise.id}_opt_${index}`); }}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderColor: theme.cardBorder }]}>
          <TouchableOpacity style={[styles.checkButton, isButtonDisabled && styles.disabledButton]} onPress={() => checkAnswer(playAudio)} disabled={isButtonDisabled}>
            <Text style={styles.checkButtonText}>ÜBERPRÜFEN</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal animationType="slide" transparent={true} visible={showFeedback}>
        <View style={styles.modalOverlay}>
          <View style={[styles.feedbackContainer, { backgroundColor: isCorrect ? theme.feedbackSuccessBg : theme.feedbackErrorBg }]}>
            <Text style={[styles.feedbackTitle, { color: theme.feedbackText }]}>{isCorrect ? 'Richtig!' : 'Falsch'}</Text>
            <View style={styles.marginBottom20}>
              <Text style={[styles.feedbackSubtitle, { color: theme.subText }]}>Lösung:</Text>
              <View style={styles.solutionRow}>
                 <Text style={[styles.feedbackSolution, { color: theme.feedbackText }]}>{getSolutionDisplay()}</Text>
              </View>
            </View>

            {showRating ? (
                <View>
                    <Text style={{color: theme.subText, marginBottom: 10, fontWeight: 'bold'}}>Wie gut wusstest du es?</Text>
                    <View style={{flexDirection: 'row', gap: 5}}>
                         {ratingButtons.map((btn) => (
                             <TouchableOpacity 
                                key={btn.box}
                                style={[styles.boxBtn, {backgroundColor: btn.color}]} 
                                onPress={() => ratePractice(btn.box)}
                             >
                                <Text style={styles.boxBtnLabel}>{btn.label}</Text>
                                <Text style={styles.boxBtnSub}>{btn.sub}</Text>
                             </TouchableOpacity>
                         ))}
                    </View>
                </View>
            ) : (
                <TouchableOpacity style={[styles.continueButton, isDarkMode && { backgroundColor: '#333' }]} onPress={nextExercise}>
                  <Text style={[styles.continueButtonText, isCorrect ? styles.textSuccess : styles.textError]}>WEITER</Text>
                </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
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
  finishTitle: { fontSize: 32, fontWeight: 'bold', color: '#58cc02', marginBottom: 20, textAlign: 'center' },
  starsContainer: { flexDirection: 'row', marginBottom: 30, gap: 10, justifyContent: 'center' },
  marginBottom20: { marginBottom: 20 },
  boxBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  boxBtnLabel: { color: '#333', fontWeight: 'bold', fontSize: 11, marginBottom: 2 },
  boxBtnSub: { color: '#555', fontSize: 9 }
});