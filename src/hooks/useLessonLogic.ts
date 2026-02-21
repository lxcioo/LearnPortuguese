import * as Haptics from 'expo-haptics';
// Speech wird nicht mehr benötigt, da wir die Audiodateien nutzen
// import * as Speech from 'expo-speech'; 
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import content from '../data/content.json';
import { StorageService } from '../services/StorageService';
import { Course, Exercise, Unit } from '../types/index';

const courseData = content.courses[0] as Course;

const normalizeText = (str: string) => {
  if (!str) return "";
  return str.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
};

export const useLessonLogic = (lessonId: string, lessonType: string, gender: string | null, practiceMode?: string) => {
  const [loading, setLoading] = useState(true);
  const [lessonQueue, setLessonQueue] = useState<Exercise[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  
  const [userInput, setUserInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const [mistakes, setMistakes] = useState(0);
  const [isLessonFinished, setIsLessonFinished] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);

  const isPractice = lessonId === 'practice';

  useEffect(() => {
    const fetchExercises = async () => {
      let rawExercises: Exercise[] = [];

      if (isPractice) {
        const session = await StorageService.getPracticeSession();
        if (session) rawExercises = session;
      } else if (lessonType === 'exam') {
        const unit = courseData.units.find((u: Unit) => u.id === lessonId);
        if (unit) rawExercises = unit.levels.flatMap(level => level.exercises || []);
      } else {
        for (const unit of courseData.units) {
          const level = unit.levels.find(l => l.id === lessonId);
          if (level) {
            rawExercises = [...level.exercises];
            break;
          }
        }
      }

      let filtered = rawExercises.filter(ex => 
        !ex.gender || !gender || gender === 'd' || ex.gender === gender
      );

      if (lessonType === 'exam') {
        for (let i = filtered.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }
        filtered = filtered.slice(0, 30);
        if (filtered.length === 0) Alert.alert("Ups", "Keine Übungen gefunden!");
      }

      setLessonQueue(filtered);
      setTotalQuestions(filtered.length);
      setLoading(false);
    };

    fetchExercises();
  }, [lessonId, lessonType, gender]);

  const currentExercise = lessonQueue[currentExerciseIndex];

  // HIER GEÄNDERT: playAudioSuccess umbenannt zu playAudio, um Klarheit zu schaffen
  const checkAnswer = (playAudio: (id: string) => void) => {
    if (!currentExercise) return;

    let correct = false;
    
    if (currentExercise.type.includes('translate')) {
      const inputNorm = normalizeText(userInput);
      const answerNorm = normalizeText(currentExercise.correctAnswer);
      const isAlt = currentExercise.alternativeAnswers?.some(alt => normalizeText(alt) === inputNorm);
      if (inputNorm === answerNorm || isAlt) correct = true;
    } else if (currentExercise.type === 'multiple_choice') {
      if (selectedOption === currentExercise.correctAnswerIndex) correct = true;
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Spielt die hochwertige Audiodatei ab
        playAudio(currentExercise.id);
        
        StorageService.updateStreak();
        
        if (isPractice && practiceMode === 'random') {
             StorageService.trackResult(currentExercise, true, 'practice_random');
        }
    } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setMistakes(prev => prev + 1);
        
        // HIER GEÄNDERT: Statt speakCorrection() nutzen wir jetzt AUCH hier die Audiodatei.
        // Das garantiert, dass die Stimme konsistent zur "richtigen" Antwort ist (europäisch).
        playAudio(currentExercise.id);

        StorageService.trackResult(currentExercise, false, 'practice_random'); 
    }

    if (!isPractice) {
        StorageService.trackResult(currentExercise, correct, 'lesson');
        
        if (!correct) {
            setLessonQueue(prevQueue => {
                const newQueue = [...prevQueue];
                const remaining = newQueue.length - (currentExerciseIndex + 1);
                if (remaining > 0) {
                    const offset = Math.floor(Math.random() * remaining) + 1;
                    newQueue.splice(currentExerciseIndex + 1 + offset, 0, currentExercise);
                } else {
                    newQueue.push(currentExercise);
                }
                return newQueue;
            });
        }
    }
  };

  const ratePractice = (box: number) => {
      if (!currentExercise) return;
      StorageService.trackResult(currentExercise, true, 'practice_leitner', box);
      nextExercise();
  };

  const nextExercise = () => {
    setShowFeedback(false);
    setUserInput('');
    setSelectedOption(null);
    if (currentExerciseIndex < lessonQueue.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      finishLesson();
    }
  };

  const finishLesson = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const correctFirstTries = Math.max(0, totalQuestions - mistakes);
    const score = totalQuestions > 0 ? (correctFirstTries / totalQuestions) * 100 : 100;
    
    let stars = 0;
    if (score === 100) stars = 3;
    else if (score >= 75) stars = 2;
    else if (score >= 50) stars = 1;

    setEarnedStars(stars);
    setIsLessonFinished(true);

    if (lessonType === 'exam') {
      StorageService.markExamPassed(lessonId);
    } else if (!isPractice) {
      StorageService.saveLessonScore(lessonId, stars);
    }
  };

  const getSolutionDisplay = useCallback(() => {
    if (!currentExercise) return "";
    if (currentExercise.type === 'translate_to_de') return `${currentExercise.correctAnswer} = ${currentExercise.question}`;
    if (currentExercise.type === 'multiple_choice' && currentExercise.optionsLanguage === 'de-DE') return `${currentExercise.correctAnswer} = ${currentExercise.audioText}`;
    return currentExercise.correctAnswer;
  }, [currentExercise]);

  const progressPercent = lessonQueue.length > 0 ? (currentExerciseIndex / lessonQueue.length) * 100 : 0;

  return {
    loading, currentExercise, progressPercent,
    userInput, setUserInput, selectedOption, setSelectedOption,
    showFeedback, isCorrect, isLessonFinished, earnedStars,
    checkAnswer, nextExercise, ratePractice, isPractice,
    getSolutionDisplay
  };
};