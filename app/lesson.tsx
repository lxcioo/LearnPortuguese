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
  SafeAreaView,
  ScrollView,
  StyleSheet, Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';

import content from '../content.json';

// Wir greifen auf den ersten Kurs zu
const courseData = content.courses[0];
const BASE_URL = 'https://lxcioo.github.io/LearnPortuguese';

// Typ-Definitionen
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
}

export default function LessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parameter aus der URL lesen
  const lessonId = params.id as string; 
  const lessonType = params.type as string; // 'normal', 'exam' oder 'practice' (undefined ist 'normal')

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

  // --- INIT: Lektion laden ---
  useEffect(() => {
    const initLesson = async () => {
      let exercises: any[] = []; // Hier kurz any erlauben beim Laden

      if (lessonId === 'practice') {
        // Fall 1: Übungsmodus (aus AsyncStorage)
        const savedSession = await AsyncStorage.getItem('currentPracticeSession');
        if (savedSession) {
          exercises = JSON.parse(savedSession);
        }
      
      } else if (lessonType === 'exam') {
        // Fall 2: Prüfung (Sammle alle Aufgaben der Unit)
        const unit = courseData.units.find(u => u.id === lessonId);
        
        if (unit) {
            let allUnitExercises: any[] = [];
            
            // Alle Level durchgehen und Übungen sammeln
            unit.levels.forEach(level => {
                if (level.exercises) {
                    allUnitExercises = [...allUnitExercises, ...level.exercises];
                }
            });

            // Mischen (Shuffle)
            for (let i = allUnitExercises.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allUnitExercises[i], allUnitExercises[j]] = [allUnitExercises[j], allUnitExercises[i]];
            }

            // Nimm maximal 30 Stück (oder weniger, wenn nicht genug da sind)
            const count = Math.min(allUnitExercises.length, 30);
            exercises = allUnitExercises.slice(0, count);
            
            if(exercises.length === 0) Alert.alert("Ups", "Keine Übungen in diesem Kapitel gefunden!");
        }

      } else {
        // Fall 3: Normale Lektion (Suche das Level in den Units)
        // Wir suchen in jeder Unit nach dem Level mit der ID 'lessonId'
        for (const unit of courseData.units) {
            const level = unit.levels.find(l => l.id === lessonId);
            if (level) {
                exercises = [...level.exercises];
                break; // Gefunden, Suche beenden
            }
        }
      }

      setLessonQueue(exercises);
      setTotalQuestions(exercises.length);
      setLoading(false);
    };

    initLesson();
  }, [lessonId, lessonType]);

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
    } catch (e) { console.error("Audio Fehler:", e); }
  };

  // Streak erhöhen
  const updateStreakProgress = async () => {
    try {
        const today = new Date().toDateString();
        
        const dailyProgressStr = await AsyncStorage.getItem('dailyProgress');
        let dailyData = dailyProgressStr ? JSON.parse(dailyProgressStr) : { count: 0, date: today };

        if (dailyData.date !== today) {
            dailyData = { count: 0, date: today };
        }

        dailyData.count += 1;
        await AsyncStorage.setItem('dailyProgress', JSON.stringify(dailyData));

        if (dailyData.count >= 15) {
            const streakDataStr = await AsyncStorage.getItem('streakData');
            let streakData = streakDataStr ? JSON.parse(streakDataStr) : { currentStreak: 0, lastStreakDate: '' };

            if (streakData.lastStreakDate !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toDateString();

                if (streakData.lastStreakDate === yesterdayStr) {
                    streakData.currentStreak += 1;
                } else {
                    streakData.currentStreak = 1;
                }

                streakData.lastStreakDate = today;
                await AsyncStorage.setItem('streakData', JSON.stringify(streakData));
            }
        }
    } catch(e) { console.error(e); }
  };

  // Fehler speichern für "Daily Mistakes"
  const saveDailyMistake = async (exercise: Exercise) => {
    try {
        const today = new Date().toDateString();
        const storageKey = 'dailyMistakes';
        
        const existingDataStr = await AsyncStorage.getItem(storageKey);
        let data = existingDataStr ? JSON.parse(existingDataStr) : { date: today, exercises: [] };

        if (data.date !== today) {
            data = { date: today, exercises: [] };
        }

        const alreadyExists = data.exercises.some((ex: Exercise) => ex.id === exercise.id);
        
        if (!alreadyExists) {
            data.exercises.push(exercise);
            await AsyncStorage.setItem(storageKey, JSON.stringify(data));
        }
    } catch (e) { console.error(e); }
  };

  // --- LOGIK: ANTWORT PRÜFEN ---
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
      
      // Nur bei normalen Lektionen Fehler speichern (nicht in der Prüfung, da ist eh alles Zufall)
      if (lessonType !== 'exam') {
          saveDailyMistake(currentExercise);
      }

      const newQueue = [...lessonQueue];
      const currentItem = newQueue[currentExerciseIndex];
      
      // Fehler wiederholen: Am Ende anfügen oder zufällig einschieben
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

  // --- LOGIK: LEKTION BEENDEN ---
  const finishLesson = async () => {
    // Echte Fehler zählen (ohne Wiederholungen)
    const correctFirstTries = Math.max(0, totalQuestions - mistakes);
    const scorePercentage = totalQuestions > 0 ? (correctFirstTries / totalQuestions) * 100 : 100;

    let stars = 0;
    if (scorePercentage === 100) stars = 3;
    else if (scorePercentage >= 75) stars = 2;
    else if (scorePercentage >= 50) stars = 1;

    setIsLessonFinished(true);

    // FIX: Sterne IMMER für die UI setzen, egal welcher Modus
    setEarnedStars(stars);

    // SPEICHERN
    if (lessonType === 'exam') {
        // Prüfung bestanden?
        setExamPassed(true);
        
        try {
            const existingExams = await AsyncStorage.getItem('examScores');
            let exams = existingExams ? JSON.parse(existingExams) : {};
            exams[lessonId] = true; // lessonId ist hier die Unit-ID
            await AsyncStorage.setItem('examScores', JSON.stringify(exams));
        } catch(e) {}

    } else if (lessonId !== 'practice') {
        // Normale Lektion: Nur hier wird dauerhaft gespeichert
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

  if (loading) {
    return (
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
            <ActivityIndicator size="large" color="#58cc02" />
        </View>
    );
  }

  // --- END SCREEN (Unterschiedlich für Exam / Normal) ---
  if (isLessonFinished) {
      const isPractice = lessonId === 'practice';
      const isExam = lessonType === 'exam';
      
      return (
        <SafeAreaView style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
            
            {/* PRÜFUNG BESTANDEN SCREEN */}
            {isExam ? (
                <>
                    <Ionicons name="trophy" size={80} color="#FFD700" style={{marginBottom: 20}} />
                    <Text style={styles.finishTitle}>Kapitel gemeistert!</Text>
                    <Text style={styles.finishSubText}>
                        Du hast die Prüfung bestanden und das nächste Kapitel freigeschaltet.
                    </Text>
                    
                    {/* Auch bei Prüfung Sterne anzeigen */}
                    <View style={styles.starsContainer}>
                        {[1, 2, 3].map((star) => (
                            <Ionicons 
                                key={star} 
                                name={star <= earnedStars ? "star" : "star-outline"} 
                                size={40} 
                                color="#FFD700" 
                            />
                        ))}
                    </View>
                </>
            ) : (
                /* NORMALER SCREEN */
                <>
                    <Text style={styles.finishTitle}>
                        {isPractice ? "Training beendet!" : "Lektion beendet!"}
                    </Text>
                    
                    <View style={styles.starsContainer}>
                        {[1, 2, 3].map((star) => (
                            <Ionicons 
                                key={star} 
                                name={star <= earnedStars ? "star" : "star-outline"} 
                                size={60} 
                                color="#FFD700" 
                            />
                        ))}
                    </View>

                    <Text style={styles.finishSubText}>
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        
        {/* Header mit Progressbar */}
        <View style={styles.header}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.instruction}>
            {currentExercise.type === 'translate_to_pt' ? 'Übersetze ins Portugiesische' : 
             currentExercise.type === 'translate_to_de' ? 'Übersetze ins Deutsche' : 
             'Wähle die richtige Lösung'}
          </Text>
          
          <View style={styles.questionContainer}>
            <TouchableOpacity style={styles.speakerButton} onPress={() => playAudio(currentExercise.id)}>
               <Ionicons name="volume-medium" size={30} color="#1cb0f6" />
            </TouchableOpacity>
            <Text style={styles.question}>{currentExercise.question}</Text>
          </View>

          {/* Eingabefeld (für Übersetzungen) */}
          {(currentExercise.type === 'translate_to_pt' || currentExercise.type === 'translate_to_de') && (
            <TextInput 
              style={styles.input} 
              placeholder={currentExercise.type === 'translate_to_pt' ? 'Auf Portugiesisch...' : 'Auf Deutsch...'}
              placeholderTextColor="#ccc" 
              value={userInput} 
              onChangeText={setUserInput} 
              autoCapitalize="sentences" 
              autoCorrect={false} 
            />
          )}

          {/* Multiple Choice Buttons */}
          {currentExercise.type === 'multiple_choice' && (
            <View style={styles.optionsContainer}>
              {currentExercise.options?.map((option: string, index: number) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.optionButton, selectedOption === index && styles.optionSelected]} 
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

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.checkButton, (!userInput && selectedOption === null) && styles.disabledButton]} 
            onPress={checkAnswer} 
            disabled={!userInput && selectedOption === null}
          >
            <Text style={styles.checkButtonText}>ÜBERPRÜFEN</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* FEEDBACK MODAL (Unten) */}
      <Modal animationType="slide" transparent={true} visible={showFeedback}>
        <View style={styles.modalOverlay}>
          <View style={[styles.feedbackContainer, isCorrect ? styles.bgSuccess : styles.bgError]}>
            <Text style={styles.feedbackTitle}>{isCorrect ? 'Richtig!' : 'Falsch'}</Text>
            <View style={{ marginBottom: 20 }}>
              <Text style={styles.feedbackSubtitle}>Lösung:</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <TouchableOpacity onPress={() => playAudio(currentExercise.id)}>
                    <Ionicons name="volume-medium" size={24} color="#555" style={{marginRight: 10}}/>
                 </TouchableOpacity>
                 <Text style={styles.feedbackSolution}>{getSolutionDisplay()}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.continueButton} onPress={nextExercise}>
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
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  progressBarBackground: { flex: 1, height: 16, backgroundColor: '#e5e5e5', borderRadius: 8, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#58cc02' },
  content: { padding: 20, flexGrow: 1, justifyContent: 'center' },
  instruction: { fontSize: 18, color: '#777', marginBottom: 10, fontWeight: '600' },
  questionContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  speakerButton: { marginRight: 15, padding: 10, backgroundColor: '#ddf4ff', borderRadius: 50 },
  question: { fontSize: 26, fontWeight: 'bold', color: '#3c3c3c', flex: 1 }, 
  input: { backgroundColor: '#f7f7f7', borderWidth: 2, borderColor: '#e5e5e5', borderRadius: 16, padding: 16, fontSize: 20, color: '#333' },
  optionsContainer: { gap: 12 },
  optionButton: { padding: 16, borderWidth: 2, borderColor: '#e5e5e5', borderRadius: 16, alignItems: 'center' },
  optionSelected: { borderColor: '#1cb0f6', backgroundColor: '#ddf4ff' },
  optionText: { fontSize: 18, fontWeight: '600', color: '#777' },
  optionTextSelected: { color: '#1cb0f6' },
  footer: { padding: 20, borderTopWidth: 2, borderColor: '#f0f0f0' },
  checkButton: { backgroundColor: '#58cc02', padding: 16, borderRadius: 16, alignItems: 'center', width: '100%' },
  disabledButton: { backgroundColor: '#e5e5e5' },
  checkButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)' },
  feedbackContainer: { padding: 24, paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  bgSuccess: { backgroundColor: '#d7ffb8' }, bgError: { backgroundColor: '#ffdfe0' },
  feedbackTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#3c3c3c' },
  feedbackSubtitle: { fontSize: 16, color: '#555', fontWeight: 'bold', marginBottom: 5 },
  feedbackSolution: { fontSize: 19, color: '#3c3c3c', fontWeight: '600', flexShrink: 1 },
  continueButton: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 15 },
  continueButtonText: { fontSize: 18, fontWeight: 'bold' },
  textSuccess: { color: '#58cc02' }, textError: { color: '#ea2b2b' },
  finishTitle: { fontSize: 32, fontWeight: 'bold', color: '#58cc02', marginBottom: 20, textAlign: 'center' },
  finishSubText: { fontSize: 18, color: '#555', marginBottom: 20, textAlign: 'center', paddingHorizontal: 20 },
  starsContainer: { flexDirection: 'row', marginBottom: 30, gap: 10 },
});