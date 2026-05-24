import { DiscordService } from '@/src/models/services/DiscordService';
import { Colors } from '@/src/views/constants/theme';
import { useTheme } from '@/src/views/context/ThemeContext';
import { useAudioPlayer } from '@/src/views/hooks/useAudioPlayer';
import { useColorScheme } from '@/src/views/hooks/useColorScheme';
import { useLessonLogic } from '@/src/viewmodels/useLessonLogic';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import Toast from 'react-native-toast-message';

export function useLessonViewModel() {
  const router = useRouter();
  const { id: lessonId, type: lessonType } = useLocalSearchParams<{ id: string, type: string }>();

  const { gender, isDarkMode } = useTheme();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const { playAudio } = useAudioPlayer();

  const logic = useLessonLogic(lessonId, lessonType, gender);

  const [showReportModal, setShowReportModal] = useState(false);
  const [confirmExit, setConfirmExit] = useState<{ visible: boolean; action: any }>({ visible: false, action: null });

  const currentExercise = logic.currentExercise;
  const isTranslate = currentExercise?.type.includes('translate') ?? false;
  const isTranslateToPt = currentExercise?.type === 'translate_to_pt';

  const isExam = lessonType === 'exam';

  const instructionText = isTranslate
    ? (isTranslateToPt ? 'Übersetze ins Portugiesische' : 'Übersetze ins Deutsche')
    : 'Wähle die richtige Lösung';
  const placeholderText = isTranslateToPt ? 'Auf Portugiesisch...' : 'Auf Deutsch...';
  const isCheckButtonDisabled = !logic.userInput && logic.selectedOption === null;
  const showRating = Boolean(logic.isPractice && logic.isCorrect);

  const ratingButtons = [
    { box: 1, label: 'Schwer', sub: '≤ 1 Tag', color: '#ff4757' },
    { box: 2, label: 'Mittel', sub: '3-5 Tage', color: '#ffa502' },
    { box: 3, label: 'Leicht', sub: '10-14 Tage', color: '#1cb0f6' },
  ];

  const handleReportSubmit = async (message: string) => {
    if (!currentExercise) return;
    try {
      const fullMessage = `**Übung ID:** ${currentExercise.id}\n**Frage:** ${currentExercise.question}\n**Antwort:** ${currentExercise.correctAnswer}\n\n**Nachricht:**\n${message}`;
      await DiscordService.sendFeedback("App User (Übung)", fullMessage);
      Toast.show({ type: 'success', text1: 'Gesendet', text2: 'Vielen Dank für dein Feedback!' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Fehler', text2: 'Nachricht konnte nicht gesendet werden.' });
    }
  };

  const executeExit = () => {
    setConfirmExit({ visible: false, action: null });
    if (confirmExit.action) {
        // dispatching navigation actions in expo-router can be tricky, 
        // fallback to standard back if it fails
        try {
            router.back(); 
        } catch (e) {}
    } else {
        router.back();
    }
  };

  return {
    state: {
      loading: logic.loading,
      currentExercise,
      progressPercent: logic.progressPercent,
      userInput: logic.userInput,
      selectedOption: logic.selectedOption,
      activeVocabulary: logic.activeVocabulary,
      fullVocabulary: currentExercise?.vocabulary || [],
      isChecking: logic.isChecking,
      isAIAccepted: logic.isAIAccepted,
      showReportModal,
      confirmExit,
    },
    viewProps: {
      isTranslateExercise: isTranslate,
      instructionText,
      placeholderText,
      isCheckButtonDisabled,
      isExam,
    },
    feedback: {
      show: logic.showFeedback,
      isCorrect: logic.isCorrect,
      solutionData: logic.getSolutionData ? logic.getSolutionData() : { pt: '', de: '' },
    },
    finishScreenData: {
      isFinished: logic.isLessonFinished,
      isPractice: logic.isPractice,
      earnedStars: logic.earnedStars,
    },
    rating: {
      show: showRating,
      buttons: ratingButtons,
    },
    actions: {
      setUserInput: logic.setUserInput,
      setSelectedOption: (index: number) => {
        logic.setSelectedOption(index);
        if (currentExercise) playAudio(`${currentExercise.id}_opt_${index}`);
      },
      checkAnswer: () => logic.checkAnswer(playAudio),
      nextExercise: logic.nextExercise,
      ratePractice: logic.ratePractice,
      playAudio: (id: string) => playAudio(id),
      goBack: () => router.back(),
      setShowReportModal,
      setConfirmExit,
      handleReportSubmit,
      executeExit,
    },
    theme,
    isDarkMode,
  };
}