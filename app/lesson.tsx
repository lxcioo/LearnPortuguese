import { Colors } from '@/src/constants/theme';
import { useColorScheme } from '@/src/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../src/context/ThemeContext';
import { useAudioPlayer } from '../src/hooks/useAudioPlayer';
import { useLessonLogic } from '../src/hooks/useLessonLogic';

export default function LessonScreen() {
  const router = useRouter();
  const { id: lessonId, type: lessonType } = useLocalSearchParams<{ id: string, type: string }>();
  
  const { gender, isDarkMode } = useTheme();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const { playAudio } = useAudioPlayer();
  const {
    loading,
    currentExercise,
    progressPercent,
    userInput, setUserInput,
    selectedOption, setSelectedOption,
    showFeedback,
    isCorrect,
    isLessonFinished,
    earnedStars,
    checkAnswer,
    nextExercise,
    getSolutionDisplay
  } = useLessonLogic(lessonId, lessonType, gender);

  // --- Sub-Render Functions für saubereres JSX ---

  const renderLoading = () => (
    <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color="#58cc02" />
    </View>
  );

  const renderFinishScreen = () => {
    const isExam = lessonType === 'exam';
    const isPractice = lessonId === 'practice';
    
    return (
      <SafeAreaView 
        style={[styles.container, styles.centerContent, { backgroundColor: theme.background }]}
        edges={['top', 'bottom', 'left', 'right']}
      >
        {isExam ? (
          <>
            <Ionicons name="trophy" size={80} color="#FFD700" style={styles.marginBottom20} />
            <Text style={styles.finishTitle}>Kapitel gemeistert!</Text>
            <Text style={[styles.finishSubText, { color: theme.subText }]}>
              Du hast die Prüfung bestanden und das nächste Kapitel freigeschaltet.
            </Text>
          </>
        ) : (
          <Text style={styles.finishTitle}>
            {isPractice ? "Training beendet!" : "Lektion beendet!"}
          </Text>
        )}

        <View style={styles.starsContainer}>
          {[1, 2, 3].map((star) => (
            <Ionicons 
              key={star} 
              name={star <= earnedStars ? "star" : "star-outline"} 
              size={isExam ? 40 : 60} 
              color="#FFD700" 
            />
          ))}
        </View>

        <TouchableOpacity style={styles.checkButton} onPress={() => router.back()}>
          <Text style={styles.checkButtonText}>
            {isExam ? "ZUR KAPITEL-ÜBERSICHT" : "ZUR ÜBERSICHT"}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  };

  // --- Main Logic ---

  if (loading || !currentExercise) return renderLoading();
  if (isLessonFinished) return renderFinishScreen();

  // Berechnete Werte für UI
  const isTranslate = currentExercise.type.includes('translate');
  const isTranslateToPt = currentExercise.type === 'translate_to_pt';
  const instructionText = isTranslate 
    ? (isTranslateToPt ? 'Übersetze ins Portugiesische' : 'Übersetze ins Deutsche')
    : 'Wähle die richtige Lösung';
  const placeholderText = isTranslateToPt ? 'Auf Portugiesisch...' : 'Auf Deutsch...';
  const isButtonDisabled = !userInput && selectedOption === null;

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.flex1}
      >
        {/* Header mit Progress Bar */}
        <View style={styles.header}>
          <View style={[styles.progressBarBackground, { backgroundColor: theme.progressBarBg }]}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.instruction, { color: theme.subText }]}>
            {instructionText}
          </Text>
          
          <View style={styles.questionContainer}>
            <TouchableOpacity 
              style={[styles.speakerButton, { backgroundColor: theme.speakerBg }]} 
              onPress={() => playAudio(currentExercise.id)}
            >
               <Ionicons name="volume-medium" size={30} color="#1cb0f6" />
            </TouchableOpacity>
            <Text style={[styles.question, { color: theme.text }]}>
              {currentExercise.question}
            </Text>
          </View>

          {isTranslate && (
            <TextInput 
              style={[
                styles.input, 
                { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }
              ]} 
              placeholder={placeholderText}
              placeholderTextColor="#ccc" 
              value={userInput} 
              onChangeText={setUserInput} 
              autoCapitalize="sentences" 
              autoCorrect={false} 
            />
          )}

          {currentExercise.type === 'multiple_choice' && (
            <View style={styles.optionsContainer}>
              {currentExercise.options?.map((option, index) => {
                const isSelected = selectedOption === index;
                return (
                  <TouchableOpacity 
                    key={index} 
                    style={[
                      styles.optionButton, 
                      { borderColor: isSelected ? '#1cb0f6' : theme.border },
                      isSelected && { backgroundColor: theme.optionSelectedBg }
                    ]} 
                    onPress={() => {
                      setSelectedOption(index);
                      playAudio(`${currentExercise.id}_opt_${index}`);
                    }}
                  >
                    <Text style={[
                      styles.optionText, 
                      isSelected && styles.optionTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderColor: theme.cardBorder }]}>
          <TouchableOpacity 
            style={[styles.checkButton, isButtonDisabled && styles.disabledButton]} 
            onPress={() => checkAnswer(playAudio)} 
            disabled={isButtonDisabled}
          >
            <Text style={styles.checkButtonText}>ÜBERPRÜFEN</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Feedback Modal */}
      <Modal animationType="slide" transparent={true} visible={showFeedback}>
        <View style={styles.modalOverlay}>
          <View style={[
              styles.feedbackContainer, 
              { backgroundColor: isCorrect ? theme.feedbackSuccessBg : theme.feedbackErrorBg }
          ]}>
            <Text style={[styles.feedbackTitle, { color: theme.feedbackText }]}>
              {isCorrect ? 'Richtig!' : 'Falsch'}
            </Text>
            
            <View style={styles.marginBottom20}>
              <Text style={[styles.feedbackSubtitle, { color: theme.subText }]}>Lösung:</Text>
              <View style={styles.solutionRow}>
                 <TouchableOpacity onPress={() => playAudio(currentExercise.id)}>
                    <Ionicons 
                      name="volume-medium" 
                      size={24} 
                      color={isDarkMode ? "#ccc" : "#555"} 
                      style={styles.marginRight10}
                    />
                 </TouchableOpacity>
                 <Text style={[styles.feedbackSolution, { color: theme.feedbackText }]}>
                   {getSolutionDisplay()}
                 </Text>
              </View>
            </View>

            <TouchableOpacity 
                style={[styles.continueButton, isDarkMode && { backgroundColor: '#333' }]} 
                onPress={nextExercise}
            >
              <Text style={[
                styles.continueButtonText, 
                isCorrect ? styles.textSuccess : styles.textError
              ]}>
                {isCorrect ? 'WEITER' : 'OKAY'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  flex1: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  progressBarBackground: { flex: 1, height: 16, borderRadius: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#58cc02' },
  
  // Content
  content: { padding: 20, flexGrow: 1, justifyContent: 'center' },
  instruction: { fontSize: 18, marginBottom: 10, fontWeight: '600' },
  questionContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  speakerButton: { marginRight: 15, padding: 10, borderRadius: 50 },
  question: { fontSize: 26, fontWeight: 'bold', flex: 1 }, 
  
  // Inputs
  input: { borderWidth: 2, borderRadius: 16, padding: 16, fontSize: 20 },
  optionsContainer: { gap: 12 },
  optionButton: { padding: 16, borderWidth: 2, borderRadius: 16, alignItems: 'center' },
  optionText: { fontSize: 18, fontWeight: '600', color: '#777' },
  optionTextSelected: { color: '#1cb0f6' },
  
  // Footer
  footer: { padding: 20, borderTopWidth: 2 },
  checkButton: { backgroundColor: '#58cc02', padding: 16, borderRadius: 16, alignItems: 'center', width: '100%' },
  disabledButton: { backgroundColor: '#e5e5e5' },
  checkButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  
  // Modal & Feedback
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)' },
  feedbackContainer: { padding: 24, paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  feedbackTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  feedbackSubtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  feedbackSolution: { fontSize: 19, fontWeight: '600', flexShrink: 1 },
  solutionRow: { flexDirection: 'row', alignItems: 'center' },
  
  continueButton: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 15 },
  continueButtonText: { fontSize: 18, fontWeight: 'bold' },
  textSuccess: { color: '#58cc02' }, 
  textError: { color: '#ea2b2b' },
  
  // Finish Screen
  finishTitle: { fontSize: 32, fontWeight: 'bold', color: '#58cc02', marginBottom: 20, textAlign: 'center' },
  finishSubText: { fontSize: 18, marginBottom: 20, textAlign: 'center', paddingHorizontal: 20 },
  starsContainer: { flexDirection: 'row', marginBottom: 30, gap: 10, justifyContent: 'center' },
  
  // Utils
  marginBottom20: { marginBottom: 20 },
  marginRight10: { marginRight: 10 },
});