import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../components/ThemeContext';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useLessonLogic } from './hooks/useLessonLogic';

export default function LessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { gender, isDarkMode } = useTheme();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light']; // NEU: Zugriff auf zentrales Theme
  
  const lessonId = params.id as string;
  const lessonType = params.type as string;

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

  if (loading || !currentExercise) {
    return (
        <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: theme.background}}>
            <ActivityIndicator size="large" color="#58cc02" />
        </View>
    );
  }

  if (isLessonFinished) {
      const isPractice = lessonId === 'practice';
      const isExam = lessonType === 'exam';
      
      return (
        <SafeAreaView 
          style={[styles.container, {justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background}]}
          edges={['top', 'bottom', 'left', 'right']}
        >
            {isExam ? (
                <>
                    <Ionicons name="trophy" size={80} color="#FFD700" style={{marginBottom: 20}} />
                    <Text style={styles.finishTitle}>Kapitel gemeistert!</Text>
                    <Text style={[styles.finishSubText, {color: theme.subText}]}>
                        Du hast die Prüfung bestanden und das nächste Kapitel freigeschaltet.
                    </Text>
                </>
            ) : (
                <>
                    <Text style={styles.finishTitle}>
                        {isPractice ? "Training beendet!" : "Lektion beendet!"}
                    </Text>
                </>
            )}

            <View style={styles.starsContainer}>
                {[1, 2, 3].map((star) => (
                    <Ionicons key={star} name={star <= earnedStars ? "star" : "star-outline"} size={isExam ? 40 : 60} color="#FFD700" />
                ))}
            </View>

            <TouchableOpacity style={styles.checkButton} onPress={() => router.back()}>
                <Text style={styles.checkButtonText}>
                    {isExam ? "ZUR KAPITEL-ÜBERSICHT" : "ZUR ÜBERSICHT"}
                </Text>
            </TouchableOpacity>
        </SafeAreaView>
      );
  }

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        
        <View style={styles.header}>
          <View style={[styles.progressBarBackground, { backgroundColor: theme.progressBarBg }]}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.instruction, { color: theme.subText }]}>
            {currentExercise.type.includes('translate') 
              ? (currentExercise.type === 'translate_to_pt' ? 'Übersetze ins Portugiesische' : 'Übersetze ins Deutsche')
              : 'Wähle die richtige Lösung'}
          </Text>
          
          <View style={styles.questionContainer}>
            <TouchableOpacity style={[styles.speakerButton, { backgroundColor: theme.speakerBg }]} onPress={() => playAudio(currentExercise.id)}>
               <Ionicons name="volume-medium" size={30} color="#1cb0f6" />
            </TouchableOpacity>
            <Text style={[styles.question, { color: theme.text }]}>{currentExercise.question}</Text>
          </View>

          {currentExercise.type.includes('translate') && (
            <TextInput 
              style={[
                  styles.input, 
                  { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }
              ]} 
              placeholder={currentExercise.type === 'translate_to_pt' ? 'Auf Portugiesisch...' : 'Auf Deutsch...'}
              placeholderTextColor="#ccc" 
              value={userInput} 
              onChangeText={setUserInput} 
              autoCapitalize="sentences" 
              autoCorrect={false} 
            />
          )}

          {currentExercise.type === 'multiple_choice' && (
            <View style={styles.optionsContainer}>
              {currentExercise.options?.map((option: string, index: number) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                      styles.optionButton, 
                      { borderColor: theme.border },
                      selectedOption === index && { borderColor: '#1cb0f6', backgroundColor: theme.optionSelectedBg }
                  ]} 
                  onPress={() => {
                    setSelectedOption(index);
                    playAudio(`${currentExercise.id}_opt_${index}`);
                  }}
                >
                  <Text style={[styles.optionText, selectedOption === index && styles.optionTextSelected]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderColor: theme.cardBorder }]}>
          <TouchableOpacity 
            style={[styles.checkButton, (!userInput && selectedOption === null) && styles.disabledButton]} 
            onPress={() => checkAnswer(playAudio)} 
            disabled={!userInput && selectedOption === null}
          >
            <Text style={styles.checkButtonText}>ÜBERPRÜFEN</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal animationType="slide" transparent={true} visible={showFeedback}>
        <View style={styles.modalOverlay}>
          <View style={[
              styles.feedbackContainer, 
              { backgroundColor: isCorrect ? theme.feedbackSuccessBg : theme.feedbackErrorBg }
          ]}>
            <Text style={[styles.feedbackTitle, { color: theme.feedbackText }]}>{isCorrect ? 'Richtig!' : 'Falsch'}</Text>
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.feedbackSubtitle, { color: theme.subText }]}>Lösung:</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <TouchableOpacity onPress={() => playAudio(currentExercise.id)}>
                    <Ionicons name="volume-medium" size={24} color={isDarkMode ? "#ccc" : "#555"} style={{marginRight: 10}}/>
                 </TouchableOpacity>
                 <Text style={[styles.feedbackSolution, { color: theme.feedbackText }]}>{getSolutionDisplay()}</Text>
              </View>
            </View>
            <TouchableOpacity 
                style={[styles.continueButton, isDarkMode && { backgroundColor: '#333' }]} 
                onPress={nextExercise}
            >
              <Text style={[styles.continueButtonText, isCorrect ? styles.textSuccess : styles.textError]}>
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
  header: { padding: 20, flexDirection: 'row', alignItems: 'center' },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)' },
  feedbackContainer: { padding: 24, paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  feedbackTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  feedbackSubtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  feedbackSolution: { fontSize: 19, fontWeight: '600', flexShrink: 1 },
  continueButton: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 15 },
  continueButtonText: { fontSize: 18, fontWeight: 'bold' },
  textSuccess: { color: '#58cc02' }, textError: { color: '#ea2b2b' },
  finishTitle: { fontSize: 32, fontWeight: 'bold', color: '#58cc02', marginBottom: 20, textAlign: 'center' },
  finishSubText: { fontSize: 18, marginBottom: 20, textAlign: 'center', paddingHorizontal: 20 },
  starsContainer: { flexDirection: 'row', marginBottom: 30, gap: 10, justifyContent: 'center' },
});