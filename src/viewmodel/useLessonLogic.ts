import content from '@/src/model/data/content';
import { DiscordService } from '@/src/model/services/DiscordService';
import { LeitnerService } from '@/src/model/services/LeitnerService';
import { ProgressService } from '@/src/model/services/ProgressService';
import { StreakService } from '@/src/model/services/StreakService';
import { Course, Exercise, Unit } from '@/src/model/types/index';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import Fuse from 'fuse.js';
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

// --- KI-FALLBACK FUNKTION (GOOGLE GEMINI 3.1 FLASH-LITE MIT 10s TIMEOUT) ---
const checkWithAI = async (userInput: string, correctAnswer: string): Promise<boolean> => {
  // 1. AbortController für den Timeout aufsetzen
  const controller = new AbortController();

  // 2. Timer starten: Nach exakt 10.000 Millisekunden (10 Sekunden) wird das Signal zum Abbruch gesendet
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const apiKey = "AIzaSyBSRm18zqlyecZpo8-cSyW2326urAbdIxM".trim();
    const prompt = `Du bist ein strenger, aber fairer Lehrer für europäisches Portugiesisch. Der Schüler hat "${userInput}" geschrieben. Die offizielle Musterlösung lautet "${correctAnswer}". Bedeutet die Eingabe des Schülers im Kontext faktisch das Gleiche und ist grammatikalisch vertretbar? Antworte AUSSCHLIESSLICH mit dem Wort "true" oder "false". Keine Erklärungen.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      }),
      signal: controller.signal // 3. Hier übergeben wir das Abbruch-Signal an den fetch-Befehl
    });

    // 4. Wenn die Antwort rechtzeitig ankam, stoppen wir den 10s-Timer, damit er nicht im Hintergrund weiterläuft
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Fehler ${response.status}:`, errorText);
      return false;
    }

    const data = await response.json();
    const answerText = data.candidates[0].content.parts[0].text.toLowerCase();

    return answerText.includes('true');
  } catch (error: any) {
    // Sicherstellen, dass der Timer auch bei einem Fehler aufgeräumt wird
    clearTimeout(timeoutId);

    // Prüfen, ob der Fehler unser eigener 10-Sekunden-Timeout war
    if (error.name === 'AbortError') {
      console.log("KI-Abfrage Timeout: Die Internetverbindung war zu langsam (>10s). Nutze Offline-Fallback.");
    } else {
      console.error("KI-Abfrage komplett fehlgeschlagen:", error);
    }

    return false; // Fallback auf normale Auswertung
  }
};

export const useLessonLogic = (lessonId: string, lessonType: string, gender: string | null) => {
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
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
  const [seenVocabGlobal, setSeenVocabGlobal] = useState<Record<string, string>>({});
  const [activeVocabulary, setActiveVocabulary] = useState<any[]>([]);

  const [isAIAccepted, setIsAIAccepted] = useState(false);

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

  // HIER WAR DER FEHLER: Diese Zeile hat in der letzten Version gefehlt!
  const currentExercise = lessonQueue[currentExerciseIndex];

  const checkAnswer = async (playAudio: (id: string) => void) => {
    if (!currentExercise || isChecking) return;

    setIsChecking(true);
    let correct = false;

    if (currentExercise.type.includes('translate')) {
      const inputNorm = normalizeText(userInput);
      const answerNorm = normalizeText(currentExercise.correctAnswer);
      const altAnswers = currentExercise.alternativeAnswers || [];

      // --- STUFE 1: Exakter Match (mit Typisierung 'a: string') ---
      const exactMatches = [answerNorm, ...altAnswers.map((a: string) => normalizeText(a))];
      if (exactMatches.includes(inputNorm)) {
        correct = true;
      } else {
        const inputSoft = normalizeText(userInput, true);
        const softMatches = [
          normalizeText(currentExercise.correctAnswer, true),
          ...altAnswers.map((a: string) => normalizeText(a, true))
        ];
        if (softMatches.includes(inputSoft)) {
          correct = true;
        } else {
          // --- STUFE 2: Fuzzy Matching (Tippfehler verzeihen, offline) ---
          const validOptions = [currentExercise.correctAnswer, ...altAnswers].map(text => ({ text: normalizeText(text) }));
          const fuse = new Fuse(validOptions, {
            keys: ['text'],
            includeScore: true,
            threshold: 0.25,
          });

          const results = fuse.search(inputNorm);
          if (results.length > 0 && results[0].score !== undefined && results[0].score <= 0.25) {
            correct = true;
          } else {
            // --- STUFE 3: KI Fallback (Synonyme, online) ---
            const networkState = await Network.getNetworkStateAsync();
            if (networkState.isConnected && networkState.isInternetReachable) {
              console.log("Stufe 1 & 2 fehlgeschlagen. Frage KI...");
              correct = await checkWithAI(userInput, currentExercise.correctAnswer);

              if (correct) {
                // 1. Wir merken uns für das UI, dass die KI diese Antwort gerettet hat
                setIsAIAccepted(true);

                // 2. Wir feuern den Webhook im Hintergrund ab (ohne 'await', damit es nicht blockiert)
                const discordMessage = `🤖 **KI hat alternative Antwort akzeptiert:**\n**Übung ID:** ${currentExercise.id}\n**Frage:** ${currentExercise.question}\n**Offizielle Lösung:** ${currentExercise.correctAnswer}\n**User Eingabe:** ${userInput}`;

                DiscordService.sendFeedback("KI Auto-Approve", discordMessage)
                  .catch(e => console.error("Discord Webhook Fehler:", e));
              }
            }
          }
        }
      }
    } else if (currentExercise.type === 'multiple_choice') {
      if (selectedOption === currentExercise.correctAnswerIndex) correct = true;
    }

    // --- ERGEBNIS VERARBEITEN ---
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

    setIsChecking(false);
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
    setIsAIAccepted(false);
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
    activeVocabulary,
    isChecking,
    isAIAccepted,
  };
};