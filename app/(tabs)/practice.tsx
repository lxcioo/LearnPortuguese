import { Colors } from '@/src/constants/theme';
import { useColorScheme } from '@/src/hooks/useColorScheme';
import { useUserProgress } from '@/src/hooks/useUserProgress';
import { StorageService } from '@/src/services/StorageService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import content from '../../src/data/content';

const courseData = content.courses[0];
const BOX_LABELS = ["", "Schwer", "Mittel", "Leicht", "⭐"];
const BOX_COLORS = ["", "#ff4757", "#ffa502", "#1cb0f6", "#FFD700"];

export default function PracticeScreen() {
    const router = useRouter();
    const { isDarkMode } = useTheme();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const { scores, examScores } = useUserProgress();

    const [leitnerCounts, setLeitnerCounts] = useState([0, 0, 0, 0, 0]);
    const [dueCount, setDueCount] = useState(0);
    const [todayMistakeCount, setTodayMistakeCount] = useState(0);

    const [isFreeTrainingModalVisible, setFreeTrainingModalVisible] = useState(false);
    const [selectedLessons, setSelectedLessons] = useState<Record<string, boolean>>({});

    // NEU: Frageanzahl Logik
    const [questionCount, setQuestionCount] = useState<number | 'all'>(15);
    const [customCountText, setCustomCountText] = useState('');

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        const leitner = await StorageService.getLeitnerStats();
        setLeitnerCounts(leitner);
        const dueExercises = await StorageService.getLeitnerDue();
        setDueCount(dueExercises.length);
        const todayMistakes = await StorageService.getTodayMistakes();
        setTodayMistakeCount(todayMistakes.length);
    };

    const toggleLesson = (id: string) => {
        setSelectedLessons(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const startTodayMistakes = async () => {
        const exercises = await StorageService.getTodayMistakes();
        if (exercises.length === 0) {
            Alert.alert("Super!", "Keine offenen Fehler von heute.");
            return;
        }
        await StorageService.savePracticeSession(exercises);
        router.push({ pathname: "/lesson", params: { id: 'practice', source: 'practice' } });
    };

    const startLeitnerReview = async () => {
        const exercises = await StorageService.getLeitnerDue();
        if (exercises.length === 0) {
            Alert.alert("Alles erledigt!", "Für jetzt keine fälligen Wiederholungen.");
            return;
        }
        await StorageService.savePracticeSession(exercises);
        router.push({ pathname: "/lesson", params: { id: 'practice', source: 'practice' } });
    };

    const startArchEnemies = async () => {
        const exercises = await StorageService.getArchEnemies();
        if (exercises.length === 0) {
            Alert.alert("Zu wenig Daten", "Noch keine 'Erzfeinde' gesammelt.");
            return;
        }
        await StorageService.savePracticeSession(exercises);
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
        const session = await StorageService.getFreeTrainingSelection(pool, questionCount);
        await StorageService.savePracticeSession(session);

        router.push({ pathname: "/lesson", params: { id: 'practice', source: 'practice' } });
    };

    const getMaxLeitner = () => Math.max(1, ...leitnerCounts.slice(1));

    // Helfer für das Custom-Input Feld
    const isCustomActive = typeof questionCount === 'number' && questionCount !== 15 && questionCount !== 20;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Übungsbereich 🧠</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* LEITNER CHART VISUALISIERUNG */}
                <Text style={[styles.sectionTitle, { color: theme.sectionTitle, marginTop: 0 }]}>Dein Langzeit-Gedächtnis</Text>
                <View style={[styles.card, { backgroundColor: theme.card, height: 180, justifyContent: 'flex-end', paddingBottom: 15 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 }}>
                        {[1, 2, 3, 4].map(box => (
                            <View key={box} style={{ alignItems: 'center', flex: 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.subText, marginBottom: 4 }}>{leitnerCounts[box] || 0}</Text>
                                <View style={{
                                    width: 24,
                                    height: (leitnerCounts[box] / getMaxLeitner()) * 100,
                                    backgroundColor: BOX_COLORS[box],
                                    minHeight: 10,
                                    borderRadius: 6
                                }} />
                                <Text style={{ color: theme.text, fontSize: 12, fontWeight: 'bold', marginTop: 8 }}>{BOX_LABELS[box]}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Jetzt trainieren</Text>

                <TouchableOpacity style={[styles.optionBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={startLeitnerReview}>
                    <View>
                        <View style={styles.optionContent}>
                            <Ionicons name="fitness" size={24} color="#58cc02" style={{ marginRight: 10 }} />
                            <Text style={[styles.optionText, { color: theme.text }]}>Tägliches Workout</Text>
                        </View>
                        <Text style={styles.optionDesc}>Dein intelligentes Leitner-System.</Text>
                    </View>
                    {dueCount > 0 && <View style={[styles.badge, { backgroundColor: '#58cc02' }]}><Text style={styles.badgeText}>{dueCount} fällig</Text></View>}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.optionBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={startTodayMistakes}>
                    <View>
                        <View style={styles.optionContent}>
                            <Ionicons name="bandage" size={24} color="#ff4757" style={{ marginRight: 10 }} />
                            <Text style={[styles.optionText, { color: theme.text }]}>Heutige Fehler</Text>
                        </View>
                        <Text style={styles.optionDesc}>Korrigiere alles, was heute schief ging.</Text>
                    </View>
                    {todayMistakeCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{todayMistakeCount}</Text></View>}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.optionBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={startArchEnemies}>
                    <View>
                        <View style={styles.optionContent}>
                            <Ionicons name="flame" size={24} color="#ffa502" style={{ marginRight: 10 }} />
                            <Text style={[styles.optionText, { color: theme.text }]}>Erzfeinde</Text>
                        </View>
                        <Text style={styles.optionDesc}>Deine Top 20 Fehler aller Zeiten.</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.optionBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={() => setFreeTrainingModalVisible(true)}>
                    <View>
                        <View style={styles.optionContent}>
                            <Ionicons name="options" size={24} color="#1cb0f6" style={{ marginRight: 10 }} />
                            <Text style={[styles.optionText, { color: theme.text }]}>Gezielt üben</Text>
                        </View>
                        <Text style={styles.optionDesc}>Lektionen und Menge selbst wählen.</Text>
                    </View>
                </TouchableOpacity>

            </ScrollView>

            {/* --- MODAL FÜR FREIES TRAINING --- */}
            <Modal visible={isFreeTrainingModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.headerTitle, { color: theme.text }]}>Gezielt üben</Text>
                            <TouchableOpacity onPress={() => setFreeTrainingModalVisible(false)}>
                                <Ionicons name="close" size={28} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>1. Lektionen wählen:</Text>
                        <ScrollView style={{ maxHeight: 250, marginBottom: 20 }}>
                            {courseData.units.map((unit, uIndex) => {
                                const isUnitUnlocked = uIndex === 0 || examScores[courseData.units[uIndex - 1].id];
                                if (!isUnitUnlocked) return null;
                                return (
                                    <View key={unit.id}>
                                        <Text style={{ color: theme.subText, fontSize: 12, marginTop: 10 }}>{unit.title}</Text>
                                        {unit.levels.map((level, lIndex) => {
                                            const isLevelUnlocked = lIndex === 0 || (scores[unit.levels[lIndex - 1].id] || 0) > 0;
                                            if (!isLevelUnlocked) return null;
                                            return (
                                                <View key={level.id} style={[styles.row, { borderBottomColor: theme.cardBorder }]}>
                                                    <Text style={[styles.label, { color: theme.text }]}>{level.title}</Text>
                                                    <Switch value={!!selectedLessons[level.id]} onValueChange={() => toggleLesson(level.id)}
                                                        trackColor={{ false: theme.border, true: "#58cc02" }} thumbColor={"#fff"} />
                                                </View>
                                            );
                                        })}
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <Text style={[styles.sectionTitle, { color: theme.sectionTitle, marginTop: 0 }]}>2. Anzahl Vokabeln:</Text>
                        <View style={styles.countContainer}>
                            <TouchableOpacity style={[styles.countBtn, questionCount === 'all' && styles.countBtnActive]} onPress={() => { setQuestionCount('all'); setCustomCountText(''); }}>
                                <Text style={[styles.countText, questionCount === 'all' && styles.countTextActive]}>Alle</Text>
                            </TouchableOpacity>

                            {[15, 20].map(num => (
                                <TouchableOpacity key={num} style={[styles.countBtn, questionCount === num && styles.countBtnActive]} onPress={() => { setQuestionCount(num); setCustomCountText(''); }}>
                                    <Text style={[styles.countText, questionCount === num && styles.countTextActive]}>{num}</Text>
                                </TouchableOpacity>
                            ))}

                            {/* Eigene Anzahl Input */}
                            <TextInput
                                style={[
                                    styles.customInput,
                                    { color: theme.text, borderColor: theme.border },
                                    isCustomActive && styles.countBtnActive
                                ]}
                                placeholder="Eigene..."
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                                value={customCountText}
                                onChangeText={(text) => {
                                    setCustomCountText(text);
                                    const parsed = parseInt(text);
                                    if (!isNaN(parsed) && parsed > 0) {
                                        setQuestionCount(parsed);
                                    } else {
                                        setQuestionCount(15); // Fallback
                                    }
                                }}
                            />
                        </View>

                        <TouchableOpacity style={styles.startBtn} onPress={startFreeTraining}>
                            <Text style={styles.startBtnText}>STARTEN</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingTop: Platform.OS === 'android' ? 50 : 20, borderBottomWidth: 1 },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    content: { padding: 20, paddingBottom: 50 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 20 },
    card: { borderRadius: 16, padding: 15, elevation: 2, marginBottom: 10 },
    optionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
    optionContent: { flexDirection: 'row', alignItems: 'center' },
    optionText: { fontSize: 16, fontWeight: '600' },
    optionDesc: { fontSize: 12, color: '#888', marginTop: 2, maxWidth: 220 },
    badge: { backgroundColor: '#ff4757', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, minWidth: 24, alignItems: 'center' },
    badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
    label: { fontSize: 14 },
    countContainer: { flexDirection: 'row', gap: 10 },
    countBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
    countBtnActive: { backgroundColor: '#1cb0f6', borderColor: '#1cb0f6' },
    countText: { color: '#555', fontWeight: '600' },
    countTextActive: { color: '#fff', fontWeight: 'bold' },
    customInput: { flex: 1.2, padding: 12, borderRadius: 8, borderWidth: 1, textAlign: 'center', fontWeight: 'bold' },
    startBtn: { backgroundColor: '#1cb0f6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30, marginBottom: 20 },
    startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});