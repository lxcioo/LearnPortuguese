import content from '@/src/model/data/content';
import { LeitnerService } from '@/src/model/services/LeitnerService';
import { ProgressService } from '@/src/model/services/ProgressService';
import { StreakService } from '@/src/model/services/StreakService';
import { Course, Exercise, Unit } from '@/src/model/types/index';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';

const courseData = content.courses[0] as Course;

const normalizeText = (str: string, removeArticle: boolean = false) => {
  if (!str) return "";
  let lowerStr = str.toLowerCase().trim();

  if (removeArticle) {
    const articles = ["o ", "a ", "os ", "as ", "um ", "uma ", "uns ", "umas ", "der ", "die ", "das ", "ein ", "eine ", "einen ", "einem ", "einer "];
    for (const article of articles) {
      if (lowerStr.startsWith(article)) {
        lowerStr = lowerStr.substring(article.length).trim();
        break;
      }
    }
  }

  return lowerStr.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
    .replace(/\s+/g, "");
};

// HIER GEÄNDERT: Wir brauchen practiceMode nicht mehr, da wir jetzt ALLES im Practice bewerten
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
  const [lessonError, setLessonError] = useState<string | null>(null);

  const isPractice = lessonId === 'practice';

  useEffect(() => {
    const fetchExercises = async () => {
      let rawExercises: Exercise[] = [];

      if (isPractice) {
        const session = await LeitnerService.getPracticeSession();
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
      if (filtered.length === 0) setLessonError("Keine Übungen gefunden!");
      }

      setLessonQueue(filtered);
      setTotalQuestions(filtered.length);
      setLoading(false);
    };

    fetchExercises();
  }, [lessonId, lessonType, gender]);

  const currentExercise = lessonQueue[currentExerciseIndex];

  const checkAnswer = (playAudio: (id: string) => void) => {
    if (!currentExercise) return;

    let correct = false;

    if (currentExercise.type.includes('translate')) {
      const inputNorm = normalizeText(userInput);
      const answerNorm = normalizeText(currentExercise.correctAnswer);
      const isAlt = currentExercise.alternativeAnswers?.some(alt => normalizeText(alt) === inputNorm);

      if (inputNorm === answerNorm || isAlt) correct = true;
      else {
        const inputSoft = normalizeText(userInput, true);
        const answerSoft = normalizeText(currentExercise.correctAnswer, true);
        const isAltSoft = currentExercise.alternativeAnswers?.some(alt => normalizeText(alt, true) === inputSoft);
        if (inputSoft === answerSoft || isAltSoft) correct = true;
      }
    } else if (currentExercise.type === 'multiple_choice') {
      if (selectedOption === currentExercise.correctAnswerIndex) correct = true;
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playAudio(currentExercise.id);

      // Im Übungsbereich gibt es pro richtiger Antwort +1 auf den Streak-Zähler
      if (isPractice) StreakService.updateStreak();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMistakes(prev => prev + 1);
      playAudio(currentExercise.id);
    }

    if (!isPractice) {
      LeitnerService.trackResult(currentExercise, correct, 'lesson');

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
    } else {
      if (!correct) {
        LeitnerService.trackResult(currentExercise, false, 'practice');
      }
    }
  };

  // REGEL 3: Wird aufgerufen, wenn der Nutzer im Übungsbereich "Schwer/Mittel/Leicht" drückt
  const ratePractice = (boxRating: number) => {
    if (!currentExercise) return;
    LeitnerService.trackResult(currentExercise, true, 'practice', boxRating);
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

    // FIX: Wenn der Lernpfad abgeschlossen wird, bekommt man GARANTIERT sofort den Streak (+15)
    if (!isPractice) {
      StreakService.updateStreak(true);
    }

    if (lessonType === 'exam') {
      ProgressService.markExamPassed(lessonId);
    } else if (!isPractice) {
      ProgressService.saveLessonScore(lessonId, stars);
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
    getSolutionDisplay, lessonError, setLessonError
  };
};