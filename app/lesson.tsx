import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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

const courseData = content.courses[0];
const BASE_URL = 'https://lxcioo.github.io/LearnPortuguese';

export default function LessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const lessonId = params.id || 'l1';
  
  // Wir holen die Original-Lektion
  const originalLesson = courseData.lessons.find(l => l.id === lessonId) || courseData.lessons[0];

  // --- NEU: Die Warteschlange (Queue) als State ---
  // Wir starten mit den normalen Übungen, aber dieses Array kann wachsen!
  const [lessonQueue, setLessonQueue] = useState([...originalLesson.exercises]);
  
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sound, setSound] = useState();

  // Wir greifen jetzt auf die Queue zu, nicht mehr auf das Original
  const currentExercise = lessonQueue[currentExerciseIndex];
  
  // Fortschrittsbalken basiert auf der aktuellen Länge der Warteschlange
  const progressPercent = ((currentExerciseIndex) / lessonQueue.length) * 100;

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  const normalize = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").toLowerCase().trim();
  };

  const playAudio = async (filename) => {
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

  const checkAnswer = () => {
    let correct = false;
    
    if (currentExercise.type === 'translate_to_pt' || currentExercise.type === 'translate_to_de') {
      const inputNorm = normalize(userInput);
      const answerNorm = normalize(currentExercise.correctAnswer);
      const isAlt = currentExercise.alternativeAnswers?.some(alt => normalize(alt) === inputNorm);
      if (inputNorm === answerNorm || isAlt) correct = true;
    } else if (currentExercise.type === 'multiple_choice') {
      if (selectedOption === currentExercise.correctAnswerIndex) correct = true;
    }

    setIsCorrect(correct);
    
    if (correct) {
      playAudio(currentExercise.id);
    } else {
      // --- NEU: WIEDERHOLUNGS-LOGIK ---
      // Wenn falsch: Füge die Übung später nochmal hinzu
      
      const newQueue = [...lessonQueue];
      const currentItem = newQueue[currentExerciseIndex];

      // Wie viele Übungen sind noch übrig?
      const remainingExercises = newQueue.length - (currentExerciseIndex + 1);

      if (remainingExercises > 0) {
        // Zufällige Position in der Zukunft (aber nicht direkt als nächstes, wenn möglich)
        // Mindestens 1 Schritt später, maximal am Ende
        const randomOffset = Math.floor(Math.random() * remainingExercises) + 1;
        const insertIndex = currentExerciseIndex + 1 + randomOffset;
        
        // Einfügen
        newQueue.splice(insertIndex, 0, currentItem);
      } else {
        // Wenn es die allerletzte Übung war, einfach hinten anhängen
        newQueue.push(currentItem);
      }
      
      console.log(`Falsch! Übung wieder eingereiht. Neue Länge: ${newQueue.length}`);
      setLessonQueue(newQueue);
    }

    setShowFeedback(true);
  };

  const nextExercise = async () => {
    setShowFeedback(false);
    setUserInput('');
    setSelectedOption(null);

    // Prüfen ob wir am Ende der (möglicherweise gewachsenen) Queue sind
    if (currentExerciseIndex < lessonQueue.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      try {
        const existingData = await AsyncStorage.getItem('completedLessons');
        let completed = existingData ? JSON.parse(existingData) : [];
        if (!completed.includes(lessonId)) {
          completed.push(lessonId);
          await AsyncStorage.setItem('completedLessons', JSON.stringify(completed));
        }
      } catch (e) { console.error(e); }
      router.back(); 
    }
  };

  const getInstructionText = () => {
    switch (currentExercise.type) {
      case 'translate_to_pt': return 'Übersetze ins Portugiesische';
      case 'translate_to_de': return 'Übersetze ins Deutsche';
      default: return 'Wähle die richtige Lösung';
    }
  };

  const getPlaceholderText = () => {
    return currentExercise.type === 'translate_to_pt' ? 'Auf Portugiesisch...' : 'Auf Deutsch...';
  };

  const getSolutionDisplay = () => {
    if (currentExercise.type === 'translate_to_de') {
        return `${currentExercise.correctAnswer} = ${currentExercise.question}`;
    }
    if (currentExercise.type === 'multiple_choice' && currentExercise.optionsLanguage === 'de-DE') {
        return `${currentExercise.correctAnswer} = ${currentExercise.audioText}`;
    }
    return currentExercise.correctAnswer;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        
        <View style={styles.header}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.instruction}>{getInstructionText()}</Text>
          
          <View style={styles.questionContainer}>
            <TouchableOpacity 
              style={styles.speakerButton}
              onPress={() => playAudio(currentExercise.id)}
            >
               <Ionicons name="volume-medium" size={30} color="#1cb0f6" />
            </TouchableOpacity>
            
            <Text style={styles.question}>{currentExercise.question}</Text>
          </View>

          {(currentExercise.type === 'translate_to_pt' || currentExercise.type === 'translate_to_de') && (
            <TextInput 
              style={styles.input} 
              placeholder={getPlaceholderText()}
              placeholderTextColor="#ccc" 
              value={userInput} 
              onChangeText={setUserInput} 
              autoCapitalize="sentences" 
              autoCorrect={false} 
            />
          )}

          {currentExercise.type === 'multiple_choice' && (
            <View style={styles.optionsContainer}>
              {currentExercise.options.map((option, index) => (
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
          <TouchableOpacity style={[styles.checkButton, (!userInput && selectedOption === null) && styles.disabledButton]} onPress={checkAnswer} disabled={!userInput && selectedOption === null}>
            <Text style={styles.checkButtonText}>ÜBERPRÜFEN</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
              {/* Kleines visuelles Feedback im Button Text */}
              <Text style={[styles.continueButtonText, isCorrect ? styles.textSuccess : styles.textError]}>
                {isCorrect ? 'WEITER' : 'OKAY (WIRD WIEDERHOLT)'}
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
  checkButton: { backgroundColor: '#58cc02', padding: 16, borderRadius: 16, alignItems: 'center' },
  disabledButton: { backgroundColor: '#e5e5e5' },
  checkButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)' },
  feedbackContainer: { padding: 24, paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  bgSuccess: { backgroundColor: '#d7ffb8' }, bgError: { backgroundColor: '#ffdfe0' },
  feedbackTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#3c3c3c' },
  feedbackSubtitle: { fontSize: 16, color: '#555', fontWeight: 'bold', marginBottom: 5 },
  feedbackSolution: { fontSize: 19, color: '#3c3c3c', fontWeight: '600', flexShrink: 1 },
  continueButton: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 15 },
  continueButtonText: { fontSize: 18, fontWeight: 'bold' },
  textSuccess: { color: '#58cc02' }, textError: { color: '#ea2b2b' },
});