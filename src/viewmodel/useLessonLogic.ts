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

  // --- NEUE STATES FÜR VOKABELN ---
  const [seenVocabGlobal, setSeenVocabGlobal] = useState<Record<string, string>>({});
  const [activeVocabulary, setActiveVocabulary] = useState<any[]>([]);

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

      // 1. Nach Geschlecht filtern
      let filtered = rawExercises.filter(ex =>
        !ex.gender || !gender || gender === 'd' || ex.gender === gender
      );

      // Übungsbereich zufällig umdrehen
      if (isPractice) {
        filtered = filtered.map(ex => {
          if (ex.type.includes('translate') && Math.random() > 0.5) {
            const isOriginalToPt = ex.type === 'translate_to_pt';
            let newCorrectAnswer = ex.question;
            if (isOriginalToPt) {
              newCorrectAnswer = newCorrectAnswer.replace(/\s*\(.*?\)\s*/g, '').trim();
            }
            return {
              ...ex,
              type: isOriginalToPt ? 'translate_to_de' : 'translate_to_pt',
              question: ex.correctAnswer,
              correctAnswer: newCorrectAnswer,
              alternativeAnswers: isOriginalToPt ? [ex.question] : []
            };
          }
          return ex;
        });
      }

      // Prüfungslogik (Mischen & Limitieren)
      if (lessonType === 'exam') {
        for (let i = filtered.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }
        filtered = filtered.slice(0, 30);
        if (filtered.length === 0) setLessonError("Keine Übungen gefunden!");
      }

      // Vokabeln laden
      // const seen = await ProgressService.getSeenVocabulary();
      // setSeenVocabGlobal(seen);

      setLessonQueue(filtered);
      setTotalQuestions(filtered.length);
      setLoading(false);
    };

    fetchExercises();
  }, [lessonId, lessonType, gender]);

  // NEUER VOKABEL-FILTER
  /* useEffect(() => {
    if (loading || !lessonQueue[currentExerciseIndex]) return;

    const currentEx = lessonQueue[currentExerciseIndex];

    if (!currentEx.vocabulary || currentEx.vocabulary.length === 0) {
      setActiveVocabulary([]);
      return;
    }

    const newActiveVocab: any[] = [];
    const newWordsToSave: Record<string, string> = {};

    currentEx.vocabulary.forEach(v => {
      // 1. Wir machen beide Wörter klein und entfernen Leerzeichen
      const w1 = v.text.toLowerCase().trim();
      const w2 = v.translation.toLowerCase().trim();

      // 2. Wir sortieren sie alphabetisch und verbinden sie.
      // So wird aus "Até" + "Bis" IMMER "até_bis", egal in welcher Reihenfolge!
      const key = [w1, w2].sort().join('_');

      if (!seenVocabGlobal[key]) {
        // Fall 1: Diese Wortkombination ist KOMPLETT NEU
        newActiveVocab.push(v);
        newWordsToSave[key] = currentEx.id;
      } else if (seenVocabGlobal[key] === currentEx.id) {
        // Fall 2: Kombination ist bekannt, und wir sind in der URSPRUNGS-ÜBUNG
        newActiveVocab.push(v);
      }
      // Fall 3: Kombination ist bekannt und aus einer anderen Übung -> ignorieren!
    });

    setActiveVocabulary(newActiveVocab);

    if (Object.keys(newWordsToSave).length > 0) {
      setSeenVocabGlobal(prev => ({ ...prev, ...newWordsToSave }));
      ProgressService.saveNewVocabulary(newWordsToSave);
    }
  }, [currentExerciseIndex, loading, lessonQueue]);
  */

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

    if (!isPractice) {
      StreakService.updateStreak(true);
    }

    if (lessonType === 'exam') {
      ProgressService.markExamPassed(lessonId);
    } else if (!isPractice) {
      ProgressService.saveLessonScore(lessonId, stars);
    }
  };

  const getSolutionData = useCallback(() => {
    if (!currentExercise) return { pt: "", de: "" };

    let pt = "";
    let de = "";

    if (currentExercise.type === 'translate_to_de') {
      pt = currentExercise.question;
      de = currentExercise.correctAnswer;
    } else if (currentExercise.type === 'translate_to_pt') {
      pt = currentExercise.correctAnswer;
      de = currentExercise.question;
    } else if (currentExercise.type === 'multiple_choice') {
      if (currentExercise.optionsLanguage === 'de-DE') {
        pt = currentExercise.audioText || currentExercise.question;
        de = currentExercise.correctAnswer;
      } else {
        pt = currentExercise.audioText || currentExercise.correctAnswer;
        de = currentExercise.question;
      }
    } else {
      pt = currentExercise.correctAnswer;
      de = currentExercise.question;
    }

    return { pt, de };
  }, [currentExercise]);

  const progressPercent = lessonQueue.length > 0 ? (currentExerciseIndex / lessonQueue.length) * 100 : 0;

  return {
    loading, currentExercise, progressPercent,
    userInput, setUserInput, selectedOption, setSelectedOption,
    showFeedback, isCorrect, isLessonFinished, earnedStars,
    checkAnswer, nextExercise, ratePractice, isPractice,
    getSolutionData, lessonError, setLessonError,
    activeVocabulary // Gefiltertes Array wird zurückgegeben
  };
};