import { Colors } from '@/src/view/constants/theme';
import { useTheme } from '@/src/view/context/ThemeContext';
import { useAudioPlayer } from '@/src/view/hooks/useAudioPlayer';
import { useColorScheme } from '@/src/view/hooks/useColorScheme';
import { useLessonLogic } from '@/src/viewmodel/useLessonLogic';
import { useLocalSearchParams, useRouter } from 'expo-router';

// This ViewModel encapsulates all presentation logic for the LessonScreen.
// It fetches raw data from the model (useLessonLogic) and prepares it for the View.
export function useLessonViewModel() {
  const router = useRouter();
  const { id: lessonId, type: lessonType } = useLocalSearchParams<{ id: string, type: string }>();

  const { gender, isDarkMode } = useTheme();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const { playAudio } = useAudioPlayer();

  // 1. Get raw data and core logic from the Model layer
  const logic = useLessonLogic(lessonId, lessonType, gender);

  // 2. Derive state and compute values specifically for the View's needs
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

  // 3. Return a clean, structured interface for the View
  return {
    // Raw state for the view to display
    state: {
      loading: logic.loading,
      currentExercise,
      progressPercent: logic.progressPercent,
      userInput: logic.userInput,
      selectedOption: logic.selectedOption,
      activeVocabulary: logic.activeVocabulary, // <--- GEFILTERT FÜR DEN SATZ
      fullVocabulary: currentExercise?.vocabulary || [], // <--- KOMPLETT (Neu)
    },
    // Pre-computed props for UI elements
    viewProps: {
      isTranslateExercise: isTranslate,
      instructionText,
      placeholderText,
      isCheckButtonDisabled,
      isExam,
    },
    // Data for the feedback modal
    feedback: {
      show: logic.showFeedback,
      isCorrect: logic.isCorrect,
      solutionData: logic.getSolutionData ? logic.getSolutionData() : { pt: '', de: '' },
    },
    // Data for the finish screen (View will use this to determine routing/alerts)
    finishScreenData: {
      isFinished: logic.isLessonFinished,
      isPractice: logic.isPractice,
      earnedStars: logic.earnedStars,
    },
    // Data for the rating component
    rating: {
      show: showRating,
      buttons: ratingButtons,
    },
    // All actions the view can trigger
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
    },
    theme,
    isDarkMode,
  };
}