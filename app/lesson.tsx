import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet, Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../components/ThemeContext';
import content from '../content.json';

const courseData = content.courses[0];
const BASE_URL = 'https://lxcioo.github.io/LearnPortuguese';

interface Exercise {
  id: string;
  type: string;
  question: string;
  correctAnswer: string;
  alternativeAnswers?: string[];
  audioText?: string;
  options?: string[];
  correctAnswerIndex?: number;
  optionsLanguage?: string;
  gender?: 'm' | 'f';
}

export default function LessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDarkMode, gender } = useTheme(); 
  
  const lessonId = params.id as string; 
  const lessonType = params.type as string; 

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [lessonQueue, setLessonQueue] = useState<Exercise[]>([]); 
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | undefined>();
  const [mistakes, setMistakes] = useState(0);
  const [isLessonFinished, setIsLessonFinished] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);
  const [examPassed, setExamPassed] = useState(false);

  // --- AUDIO KONFIGURATION (FIX FÜR IOS STUMMMODUS) ---
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true, // WICHTIG: Ignoriert den Stumm-Schalter
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (e) {
        console.error("Audio Konfiguration fehlgeschlagen:", e);
      }
    };
    configureAudio();
  }, []);

  // --- DYNAMISCHE FARBEN ---
  const themeColors = {
      background: isDarkMode ? '#151718' : '#fff',
      text: isDarkMode ? '#ECEDEE' : '#3c3c3c',
      subText: isDarkMode ? '#9BA1A6' : '#777',
      inputBg: isDarkMode ? '#232526' : '#f7f7f7',
      inputBorder: isDarkMode ? '#444' : '#e5e5e5',
      optionBorder: isDarkMode ? '#444' : '#e5e5e5',
      optionSelectedBg: isDarkMode ? '#1a3b1a' : '#ddf4ff',
      speakerBg: isDarkMode ? '#232526' : '#ddf4ff',
      progressBarBg: isDarkMode ? '#333' : '#e5e5e5',
      footerBorder: isDarkMode ? '#333' : '#f0f0f0',
      feedbackSuccessBg: isDarkMode ? '#1e3a1e' : '#d7ffb8',
      feedbackErrorBg: isDarkMode ? '#3a1e1e' : '#ffdfe0',
      feedbackText: isDarkMode ? '#ECEDEE' : '#3c3c3c',
      finishSubText: isDarkMode ? '#bbb' : '#555',
  };

  // --- INIT: Lektion laden & Filtern ---
  useEffect(() => {
    const initLesson = async () => {
      let rawExercises: Exercise[] = []; 

      // 1. Übungen laden (Rohdaten)
      if (lessonId === 'practice') {
        const savedSession = await AsyncStorage.getItem('currentPracticeSession');
        if (savedSession) {
          rawExercises = JSON.parse(savedSession);
        }
      } else if (lessonType === 'exam') {
        const unit = courseData.units.find(u => u.id === lessonId);
        if (unit) {
            let allUnitExercises: Exercise[] = [];
            unit.levels.forEach(level => {
                if (level.exercises) {
                    allUnitExercises = [...allUnitExercises, ...level.exercises as Exercise[]];
                }
            });
            rawExercises = allUnitExercises;
        }
      } else {
        for (const unit of courseData.units) {
            const level = unit.levels.find(l => l.id === lessonId);
            if (level) {
                rawExercises = [...level.exercises] as Exercise[];
                break; 
            }
        }
      }

      // 2. Filtern nach Geschlecht
      let filteredExercises = rawExercises.filter(ex => {
        if (!ex.gender) return true; 
        if (gender === 'd') return true; 
        return ex.gender === gender; 
      });

      // 3. Wenn Exam: Mischen und Begrenzen
      if (lessonType === 'exam') {
          for (let i = filteredExercises.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [filteredExercises[i], filteredExercises[j]] = [filteredExercises[j], filteredExercises[i]];
          }
          const count = Math.min(filteredExercises.length, 30);
          filteredExercises = filteredExercises.slice(0, count);
          
          if(filteredExercises.length === 0) Alert.alert("Ups", "Keine passenden Übungen gefunden!");
      }

      setLessonQueue(filteredExercises);
      setTotalQuestions(filteredExercises.length);
      setLoading(false);
    };

    initLesson();
  }, [lessonId, lessonType, gender]);

  const currentExercise = lessonQueue[currentExerciseIndex];
  
  const progressPercent = lessonQueue.length > 0 
      ? (currentExerciseIndex / lessonQueue.length) * 100 
      : 0;

  // --- HELPER FUNKTIONEN ---
  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const normalize = (str: string) => {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").toLowerCase().trim();
  };

  const playAudio = async (filename: string) => {
    try {
        const audioUrl = `${BASE_URL}/audio/${filename}.mp3`;
        if (sound) await sound.unloadAsync();
        const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: audioUrl },
            { shouldPlay: true }
        );
        setSound(newSound);
    } catch (e) { 
        console.error("Audio Error:", e);
    }
  };

  const updateStreakProgress = async () => {
    try {
        const today = new Date().toDateString();
        const dailyProgressStr = await AsyncStorage.getItem('dailyProgress');
        let dailyData = dailyProgressStr ? JSON.parse(dailyProgressStr) : { count: 0, date: today };

        if (dailyData.date !== today) dailyData = { count: 0, date: today };

        dailyData.count += 1;
        await AsyncStorage.setItem('dailyProgress', JSON.stringify(dailyData));

        if (dailyData.count >= 15) {
            const streakDataStr = await AsyncStorage.getItem('streakData');
            let streakData = streakDataStr ? JSON.parse(streakDataStr) : { currentStreak: 0, lastStreakDate: '' };

            if (streakData.lastStreakDate !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toDateString();

                if (streakData.lastStreakDate === yesterdayStr) streakData.currentStreak += 1;
                else streakData.currentStreak = 1;

                streakData.lastStreakDate = today;
                await AsyncStorage.setItem('streakData', JSON.stringify(streakData));
            }
        }
    } catch(e) { console.error(e); }
  };

  const saveDailyMistake = async (exercise: Exercise) => {
    try {
        const today = new Date().toDateString();
        const storageKey = 'dailyMistakes';
        const existingDataStr = await AsyncStorage.getItem(storageKey);
        let data = existingDataStr ? JSON.parse(existingDataStr) : { date: today, exercises: [] };

        if (data.date !== today) data = { date: today, exercises: [] };

        const alreadyExists = data.exercises.some((ex: Exercise) => ex.id === exercise.id);
        if (!alreadyExists) {
            data.exercises.push(exercise);
            await AsyncStorage.setItem(storageKey, JSON.stringify(data));
        }
    } catch (e) { console.error(e); }
  };

  const checkAnswer = () => {
    let correct = false;
    if (currentExercise.type === 'translate_to_pt' || currentExercise.type === 'translate_to_de') {
      const inputNorm = normalize(userInput);
      const answerNorm = normalize(currentExercise.correctAnswer);
      const isAlt = currentExercise.alternativeAnswers?.some((alt: string) => normalize(alt) === inputNorm);
      if (inputNorm === answerNorm || isAlt) correct = true;
    } else if (currentExercise.type === 'multiple_choice') {
      if (selectedOption === currentExercise.correctAnswerIndex) correct = true;
    }

    setIsCorrect(correct);
    if (correct) {
      playAudio(currentExercise.id);
      updateStreakProgress();
    } else {
      setMistakes(m => m + 1);
      if (lessonType !== 'exam') saveDailyMistake(currentExercise);

      const newQueue = [...lessonQueue];
      const currentItem = newQueue[currentExerciseIndex];
      const remainingExercises = newQueue.length - (currentExerciseIndex + 1);
      if (remainingExercises > 0) {
        const randomOffset = Math.floor(Math.random() * remainingExercises) + 1;
        newQueue.splice(currentExerciseIndex + 1 + randomOffset, 0, currentItem);
      } else {
        newQueue.push(currentItem);
      }
      setLessonQueue(newQueue);
    }
    setShowFeedback(true);
  };

  const finishLesson = async () => {
    const correctFirstTries = Math.max(0, totalQuestions - mistakes);
    const scorePercentage = totalQuestions > 0 ? (correctFirstTries / totalQuestions) * 100 : 100;

    let stars = 0;
    if (scorePercentage === 100) stars = 3;
    else if (scorePercentage >= 75) stars = 2;
    else if (scorePercentage >= 50) stars = 1;

    setIsLessonFinished(true);
    setEarnedStars(stars);

    if (lessonType === 'exam') {
        setExamPassed(true);
        try {
            const existingExams = await AsyncStorage.getItem('examScores');
            let exams = existingExams ? JSON.parse(existingExams) : {};
            exams[lessonId] = true; 
            await AsyncStorage.setItem('examScores', JSON.stringify(exams));
        } catch(e) {}
    } else if (lessonId !== 'practice') {
        try {
          const existingData = await AsyncStorage.getItem('lessonScores');
          let scores = existingData ? JSON.parse(existingData) : {};
          const oldScore = scores[lessonId] || 0;
          if (stars >= oldScore) {
              scores[lessonId] = stars;
              await AsyncStorage.setItem('lessonScores', JSON.stringify(scores));
          }
        } catch (e) { console.error(e); }
    }
  };

  const nextExercise = async () => {
    setShowFeedback(false);
    setUserInput('');
    setSelectedOption(null);
    if (currentExerciseIndex < lessonQueue.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      finishLesson();
    }
  };

  const getSolutionDisplay = () => {
    if (currentExercise.type === 'translate_to_de') return `${currentExercise.correctAnswer} = ${currentExercise.question}`;
    if (currentExercise.type === 'multiple_choice' && currentExercise.optionsLanguage === 'de-DE') return `${currentExercise.correctAnswer} = ${currentExercise.audioText}`;
    return currentExercise.correctAnswer;
  };

  if (loading || !currentExercise) {
    return (
        <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: themeColors.background}}>
            <ActivityIndicator size="large" color="#58cc02" />
        </View>
    );
  }

  // --- END SCREEN ---
  if (isLessonFinished) {
      const isPractice = lessonId === 'practice';
      const isExam = lessonType === 'exam';
      
      return (
        <SafeAreaView 
          style={[styles.container, {justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background}]}
          edges={['top', 'bottom', 'left', 'right']}
        >
            {isExam ? (
                <>
                    <Ionicons name="trophy" size={80} color="#FFD700" style={{marginBottom: 20}} />
                    <Text style={styles.finishTitle}>Kapitel gemeistert!</Text>
                    <Text style={[styles.finishSubText, {color: themeColors.finishSubText}]}>
                        Du hast die Prüfung bestanden und das nächste Kapitel freigeschaltet.
                    </Text>
                    <View style={styles.starsContainer}>
                        {[1, 2, 3].map((star) => (
                            <Ionicons key={star} name={star <= earnedStars ? "star" : "star-outline"} size={40} color="#FFD700" />
                        ))}
                    </View>
                </>
            ) : (
                <>
                    <Text style={styles.finishTitle}>
                        {isPractice ? "Training beendet!" : "Lektion beendet!"}
                    </Text>
                    <View style={styles.starsContainer}>
                        {[1, 2, 3].map((star) => (
                            <Ionicons key={star} name={star <= earnedStars ? "star" : "star-outline"} size={60} color="#FFD700" />
                        ))}
                    </View>
                    <Text style={[styles.finishSubText, {color: themeColors.finishSubText}]}>
                        {earnedStars === 3 ? "Perfekt! Alles richtig." : 
                         earnedStars === 2 ? "Super gemacht!" :
                         earnedStars === 1 ? "Gut, aber übe noch etwas." : 
                         "Versuche es nochmal für mehr Sterne."}
                    </Text>
                </>
            )}

            {isPractice && (
                <Text style={{color: '#999', marginBottom: 20, fontStyle: 'italic'}}>
                   (Ergebnis wird im Training nicht gespeichert)
                </Text>
            )}

            <TouchableOpacity style={styles.checkButton} onPress={() => router.back()}>
                <Text style={styles.checkButtonText}>
                    {isExam ? "ZUR KAPITEL-ÜBERSICHT" : "ZUR ÜBERSICHT"}
                </Text>
            </TouchableOpacity>
        </SafeAreaView>
      );
  }

  // --- MAIN SCREEN ---
  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        
        <View style={styles.header}>
          <View style={[styles.progressBarBackground, { backgroundColor: themeColors.progressBarBg }]}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.instruction, { color: themeColors.subText }]}>
            {currentExercise.type === 'translate_to_pt' ? 'Übersetze ins Portugiesische' : 
             currentExercise.type === 'translate_to_de' ? 'Übersetze ins Deutsche' : 
             'Wähle die richtige Lösung'}
          </Text>
          
          <View style={styles.questionContainer}>
            <TouchableOpacity style={[styles.speakerButton, { backgroundColor: themeColors.speakerBg }]} onPress={() => playAudio(currentExercise.id)}>
               <Ionicons name="volume-medium" size={30} color="#1cb0f6" />
            </TouchableOpacity>
            <Text style={[styles.question, { color: themeColors.text }]}>{currentExercise.question}</Text>
          </View>

          {/* Eingabefeld */}
          {(currentExercise.type === 'translate_to_pt' || currentExercise.type === 'translate_to_de') && (
            <TextInput 
              style={[
                  styles.input, 
                  { backgroundColor: themeColors.inputBg, borderColor: themeColors.inputBorder, color: themeColors.text }
              ]} 
              placeholder={currentExercise.type === 'translate_to_pt' ? 'Auf Portugiesisch...' : 'Auf Deutsch...'}
              placeholderTextColor="#ccc" 
              value={userInput} 
              onChangeText={setUserInput} 
              autoCapitalize="sentences" 
              autoCorrect={false} 
            />
          )}

          {/* Multiple Choice */}
          {currentExercise.type === 'multiple_choice' && (
            <View style={styles.optionsContainer}>
              {currentExercise.options?.map((option: string, index: number) => (
                <TouchableOpacity 
                  key={index} 
                  style={[
                      styles.optionButton, 
                      { borderColor: themeColors.optionBorder },
                      selectedOption === index && { borderColor: '#1cb0f6', backgroundColor: themeColors.optionSelectedBg }
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

        <View style={[styles.footer, { borderColor: themeColors.footerBorder }]}>
          <TouchableOpacity 
            style={[styles.checkButton, (!userInput && selectedOption === null) && styles.disabledButton]} 
            onPress={checkAnswer} 
            disabled={!userInput && selectedOption === null}
          >
            <Text style={styles.checkButtonText}>ÜBERPRÜFEN</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* FEEDBACK MODAL */}
      <Modal animationType="slide" transparent={true} visible={showFeedback}>
        <View style={styles.modalOverlay}>
          <View style={[
              styles.feedbackContainer, 
              { backgroundColor: isCorrect ? themeColors.feedbackSuccessBg : themeColors.feedbackErrorBg }
          ]}>
            <Text style={[styles.feedbackTitle, { color: themeColors.feedbackText }]}>{isCorrect ? 'Richtig!' : 'Falsch'}</Text>
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.feedbackSubtitle, { color: themeColors.subText }]}>Lösung:</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <TouchableOpacity onPress={() => playAudio(currentExercise.id)}>
                    <Ionicons name="volume-medium" size={24} color={isDarkMode ? "#ccc" : "#555"} style={{marginRight: 10}}/>
                 </TouchableOpacity>
                 <Text style={[styles.feedbackSolution, { color: themeColors.feedbackText }]}>{getSolutionDisplay()}</Text>
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
  starsContainer: { flexDirection: 'row', marginBottom: 30, gap: 10 },
});