import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import content from '../../content.json'; // Pfad ggf. anpassen
import { StorageService } from '../services/StorageService';
import { Course, Exercise } from '../types/index';

const courseData = content.courses[0] as Course;

export const useLessonLogic = (lessonId: string, lessonType: string, gender: string | null) => {
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
  const [examPassed, setExamPassed] = useState(false);

  // Initialisierung
  useEffect(() => {
    const initLesson = async () => {
      let rawExercises: Exercise[] = [];

      if (lessonId === 'practice') {
        const session = await StorageService.getPracticeSession();
        if (session) rawExercises = session;
      } else if (lessonType === 'exam') {
        const unit = courseData.units.find(u => u.id === lessonId);
        if (unit) {
          unit.levels.forEach(level => {
            if (level.exercises) rawExercises = [...rawExercises, ...level.exercises];
          });
        }
      } else {
        for (const unit of courseData.units) {
          const level = unit.levels.find(l => l.id === lessonId);
          if (level) {
            rawExercises = [...level.exercises];
            break;
          }
        }
      }

      // Filter nach Geschlecht
      let filtered = rawExercises.filter(ex => {
        if (!ex.gender) return true;
        if (gender === 'd' || !gender) return true;
        return ex.gender === gender;
      });

      // Exam Logik (Shuffle & Limit)
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

    initLesson();
  }, [lessonId, lessonType, gender]);

  const currentExercise = lessonQueue[currentExerciseIndex];

  // Helper
  const normalize = (str: string) => {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").toLowerCase().trim();
  };

  const checkAnswer = (playAudioSuccess: (id: string) => void) => {
    let correct = false;
    
    if (currentExercise.type.includes('translate')) {
      const inputNorm = normalize(userInput);
      const answerNorm = normalize(currentExercise.correctAnswer);
      const isAlt = currentExercise.alternativeAnswers?.some(alt => normalize(alt) === inputNorm);
      if (inputNorm === answerNorm || isAlt) correct = true;
    } else if (currentExercise.type === 'multiple_choice') {
      if (selectedOption === currentExercise.correctAnswerIndex) correct = true;
    }

    setIsCorrect(correct);
    
    if (correct) {
      playAudioSuccess(currentExercise.id);
      StorageService.updateStreak();
    } else {
      setMistakes(m => m + 1);
      if (lessonType !== 'exam') StorageService.saveDailyMistake(currentExercise);

      // Wiederholungsschleife
      const newQueue = [...lessonQueue];
      const remaining = newQueue.length - (currentExerciseIndex + 1);
      if (remaining > 0) {
        const offset = Math.floor(Math.random() * remaining) + 1;
        newQueue.splice(currentExerciseIndex + 1 + offset, 0, currentExercise);
      } else {
        newQueue.push(currentExercise);
      }
      setLessonQueue(newQueue);
    }
    setShowFeedback(true);
  };

  const nextExercise = async () => {
    setShowFeedback(false);
    setUserInput('');
    setSelectedOption(null);
    
    if (currentExerciseIndex < lessonQueue.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    } else {
      // Lektion beendet
      const correctFirstTries = Math.max(0, totalQuestions - mistakes);
      const score = totalQuestions > 0 ? (correctFirstTries / totalQuestions) * 100 : 100;
      
      let stars = 0;
      if (score === 100) stars = 3;
      else if (score >= 75) stars = 2;
      else if (score >= 50) stars = 1;

      setEarnedStars(stars);
      setIsLessonFinished(true);

      if (lessonType === 'exam') {
        setExamPassed(true);
        StorageService.markExamPassed(lessonId);
      } else if (lessonId !== 'practice') {
        StorageService.saveLessonScore(lessonId, stars);
      }
    }
  };

  const getSolutionDisplay = () => {
    if (!currentExercise) return "";
    if (currentExercise.type === 'translate_to_de') return `${currentExercise.correctAnswer} = ${currentExercise.question}`;
    if (currentExercise.type === 'multiple_choice' && currentExercise.optionsLanguage === 'de-DE') return `${currentExercise.correctAnswer} = ${currentExercise.audioText}`;
    return currentExercise.correctAnswer;
  };

  return {
    loading,
    currentExercise,
    progressPercent: lessonQueue.length > 0 ? (currentExerciseIndex / lessonQueue.length) * 100 : 0,
    userInput, setUserInput,
    selectedOption, setSelectedOption,
    showFeedback,
    isCorrect,
    isLessonFinished,
    earnedStars,
    checkAnswer,
    nextExercise,
    getSolutionDisplay
  };
};