import content from '@/src/model/data/content';
import { LeitnerService } from '@/src/model/services/LeitnerService';
import { useUserProgress } from '@/src/viewmodel/hooks/useUserProgress';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

const BOX_LABELS = ["", "Schwer", "Mittel", "Leicht", "⭐"];

export function usePracticeViewModel() {
    const router = useRouter();
    const { scores, examScores } = useUserProgress();
    const courseData = content.courses[0];

    const [leitnerCounts, setLeitnerCounts] = useState([0, 0, 0, 0, 0]);
    const [dueCount, setDueCount] = useState(0);
    const [todayMistakeCount, setTodayMistakeCount] = useState(0);

    const [isFreeTrainingModalVisible, setFreeTrainingModalVisible] = useState(false);
    const [selectedLessons, setSelectedLessons] = useState<Record<string, boolean>>({});

    const [questionCount, setQuestionCount] = useState<number | 'all'>(15);
    const [customCountText, setCustomCountText] = useState('');

    const [isBoxModalVisible, setBoxModalVisible] = useState(false);
    const [selectedBoxLabel, setSelectedBoxLabel] = useState("");
    const [boxVocabList, setBoxVocabList] = useState<any[]>([]);

    useFocusEffect(
        useCallback(() => {
            const loadData = async () => {
                const leitner = await LeitnerService.getLeitnerStats();
                setLeitnerCounts(leitner);
                const dueExercises = await LeitnerService.getLeitnerDue();
                setDueCount(dueExercises.length);
                const todayMistakes = await LeitnerService.getTodayMistakes();
                setTodayMistakeCount(todayMistakes.length);
            };
            loadData();
        }, [])
    );

    const openBoxDetails = async (boxIndex: number) => {
        if (leitnerCounts[boxIndex] === 0) {
            Alert.alert("Leer", `Du hast aktuell keine Vokabeln im Bereich "${BOX_LABELS[boxIndex]}".`);
            return;
        }
        const exercises = await LeitnerService.getVocabForBox(boxIndex);
        setBoxVocabList(exercises);
        setSelectedBoxLabel(BOX_LABELS[boxIndex]);
        setBoxModalVisible(true);
    };

    const toggleLesson = (id: string) => {
        setSelectedLessons(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const startTodayMistakes = async () => {
        const exercises = await LeitnerService.getTodayMistakes();
        if (exercises.length === 0) {
            Alert.alert("Super!", "Keine offenen Fehler von heute.");
            return;
        }
        await LeitnerService.savePracticeSession(exercises);
        router.push({ pathname: "/lesson", params: { id: 'practice', source: 'practice' } });
    };

    const startLeitnerReview = async () => {
        const exercises = await LeitnerService.getLeitnerDue();
        if (exercises.length === 0) {
            Alert.alert("Alles erledigt!", "Für jetzt keine fälligen Wiederholungen.");
            return;
        }
        await LeitnerService.savePracticeSession(exercises);
        router.push({ pathname: "/lesson", params: { id: 'practice', source: 'practice' } });
    };

    const startArchEnemies = async () => {
        const exercises = await LeitnerService.getArchEnemies();
        if (exercises.length === 0) {
            Alert.alert("Zu wenig Daten", "Noch keine 'Erzfeinde' gesammelt.");
            return;
        }
        await LeitnerService.savePracticeSession(exercises);
        router.push({ pathname: "/lesson", params: { id: 'practice', source: 'practice' } });
    };

    const startFreeTraining = async () => {
        let pool: any[] = [];
        courseData.units.forEach(unit => {
            unit.levels.forEach(level => {
                if (selectedLessons[level.id]) pool = [...pool, ...level.exercises];
            });
        });

        if (pool.length === 0) {
            Alert.alert("Keine Lektion gewählt", "Bitte wähle mindestens eine Lektion aus.");
            return;
        }

        setFreeTrainingModalVisible(false);
        const session = await LeitnerService.getFreeTrainingSelection(pool, questionCount);
        await LeitnerService.savePracticeSession(session);

        router.push({ pathname: "/lesson", params: { id: 'practice', source: 'practice' } });
    };

    const getMaxLeitner = () => Math.max(1, ...leitnerCounts.slice(1));
    const isCustomActive = typeof questionCount === 'number' && questionCount !== 15 && questionCount !== 20;

    return {
        state: {
            leitnerCounts, dueCount, todayMistakeCount,
            isFreeTrainingModalVisible, selectedLessons,
            questionCount, customCountText, isCustomActive,
            isBoxModalVisible, selectedBoxLabel, boxVocabList,
            boxLabels: BOX_LABELS,
            maxLeitner: getMaxLeitner()
        },
        actions: {
            setFreeTrainingModalVisible,
            setQuestionCount,
            setCustomCountText,
            setBoxModalVisible,
            openBoxDetails,
            toggleLesson,
            startTodayMistakes,
            startLeitnerReview,
            startArchEnemies,
            startFreeTraining
        },
        data: { courseData, scores, examScores }
    };
}