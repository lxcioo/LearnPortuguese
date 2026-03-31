import { CustomAlert } from '@/src/view/components/CustomAlert';
import { Colors } from '@/src/view/constants/theme';
import { useTheme } from '@/src/view/context/ThemeContext';
import { useColorScheme } from '@/src/view/hooks/useColorScheme';
import { usePracticeViewModel } from '@/src/viewmodel/usePracticeViewModel';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BOX_COLORS = ["", "#ff4757", "#ffa502", "#1cb0f6", "#FFD700"];

export default function PracticeScreen() {
    const { isDarkMode } = useTheme();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    // MVVM: Die gesamte Logik kommt aus dem ViewModel
    const { state, actions, data } = usePracticeViewModel();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.header, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Übungsbereich 🧠</Text>
            </View>

            {/* HIER IST DIE ÄNDERUNG: paddingBottom: 120 hinzugefügt */}
            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 }]}>
                <Text style={[styles.sectionTitle, { color: theme.sectionTitle, marginTop: 0 }]}>Dein Langzeit-Gedächtnis</Text>
                <View style={[styles.card, { backgroundColor: theme.card, height: 180, justifyContent: 'flex-end', paddingBottom: 15 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 }}>
                        {[1, 2, 3, 4].map(box => (
                            <TouchableOpacity
                                key={box}
                                style={{ alignItems: 'center', flex: 1 }}
                                onPress={() => actions.openBoxDetails(box)}
                                activeOpacity={0.7}
                            >
                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.subText, marginBottom: 4 }}>{state.leitnerCounts[box] || 0}</Text>
                                <View style={{
                                    width: 24,
                                    height: (state.leitnerCounts[box] / state.maxLeitner) * 100,
                                    backgroundColor: BOX_COLORS[box],
                                    minHeight: 10,
                                    borderRadius: 6
                                }} />
                                <Text style={{ color: theme.text, fontSize: 12, fontWeight: 'bold', marginTop: 8 }}>{state.boxLabels[box]}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Jetzt trainieren</Text>

                <TouchableOpacity style={[styles.optionBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={actions.startLeitnerReview}>
                    <View>
                        <View style={styles.optionContent}>
                            <Ionicons name="fitness" size={24} color="#58cc02" style={{ marginRight: 10 }} />
                            <Text style={[styles.optionText, { color: theme.text }]}>Tägliches Workout</Text>
                        </View>
                        <Text style={styles.optionDesc}>Dein intelligentes Leitner-System.</Text>
                    </View>
                    {state.dueCount > 0 && <View style={[styles.badge, { backgroundColor: '#58cc02' }]}><Text style={styles.badgeText}>{state.dueCount} fällig</Text></View>}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.optionBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={actions.startTodayMistakes}>
                    <View>
                        <View style={styles.optionContent}>
                            <Ionicons name="bandage" size={24} color="#ff4757" style={{ marginRight: 10 }} />
                            <Text style={[styles.optionText, { color: theme.text }]}>Heutige Fehler</Text>
                        </View>
                        <Text style={styles.optionDesc}>Korrigiere alles, was heute schief ging.</Text>
                    </View>
                    {state.todayMistakeCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{state.todayMistakeCount}</Text></View>}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.optionBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={actions.startArchEnemies}>
                    <View>
                        <View style={styles.optionContent}>
                            <Ionicons name="flame" size={24} color="#ffa502" style={{ marginRight: 10 }} />
                            <Text style={[styles.optionText, { color: theme.text }]}>Erzfeinde</Text>
                        </View>
                        <Text style={styles.optionDesc}>Deine Top 20 Fehler aller Zeiten.</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.optionBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={() => actions.setFreeTrainingModalVisible(true)}>
                    <View>
                        <View style={styles.optionContent}>
                            <Ionicons name="options" size={24} color="#1cb0f6" style={{ marginRight: 10 }} />
                            <Text style={[styles.optionText, { color: theme.text }]}>Gezielt üben</Text>
                        </View>
                        <Text style={styles.optionDesc}>Lektionen und Menge selbst wählen.</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={state.isFreeTrainingModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.headerTitle, { color: theme.text }]}>Gezielt üben</Text>
                            <TouchableOpacity onPress={() => actions.setFreeTrainingModalVisible(false)}>
                                <Ionicons name="close" size={28} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>1. Lektionen wählen:</Text>
                        <ScrollView style={{ maxHeight: 250, marginBottom: 20 }}>
                            {data.courseData.units.map((unit, uIndex) => {
                                const isUnitUnlocked = uIndex === 0 || data.examScores[data.courseData.units[uIndex - 1].id];
                                if (!isUnitUnlocked) return null;
                                return (
                                    <View key={unit.id}>
                                        <Text style={{ color: theme.subText, fontSize: 12, marginTop: 10 }}>{unit.title}</Text>
                                        {unit.levels.map((level, lIndex) => {
                                            const isLevelUnlocked = lIndex === 0 || (data.scores[unit.levels[lIndex - 1].id] || 0) > 0;
                                            if (!isLevelUnlocked) return null;
                                            return (
                                                <View key={level.id} style={[styles.row, { borderBottomColor: theme.cardBorder }]}>
                                                    <Text style={[styles.label, { color: theme.text }]}>{level.title}</Text>
                                                    <Switch value={!!state.selectedLessons[level.id]} onValueChange={() => actions.toggleLesson(level.id)}
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
                            <TouchableOpacity style={[styles.countBtn, state.questionCount === 'all' && styles.countBtnActive]} onPress={() => { actions.setQuestionCount('all'); actions.setCustomCountText(''); }}>
                                <Text style={[styles.countText, state.questionCount === 'all' && styles.countTextActive]}>Alle</Text>
                            </TouchableOpacity>

                            {[15, 20].map(num => (
                                <TouchableOpacity key={num} style={[styles.countBtn, state.questionCount === num && styles.countBtnActive]} onPress={() => { actions.setQuestionCount(num); actions.setCustomCountText(''); }}>
                                    <Text style={[styles.countText, state.questionCount === num && styles.countTextActive]}>{num}</Text>
                                </TouchableOpacity>
                            ))}

                            <TextInput
                                style={[styles.customInput, { color: theme.text, borderColor: theme.border }, state.isCustomActive && styles.countBtnActive]}
                                placeholder="Eigene..."
                                placeholderTextColor="#999"
                                keyboardType="numeric"
                                value={state.customCountText}
                                onChangeText={(text) => {
                                    actions.setCustomCountText(text);
                                    const parsed = parseInt(text);
                                    if (!isNaN(parsed) && parsed > 0) actions.setQuestionCount(parsed);
                                    else actions.setQuestionCount(15);
                                }}
                            />
                        </View>

                        <TouchableOpacity style={styles.startBtn} onPress={actions.startFreeTraining}>
                            <Text style={styles.startBtnText}>STARTEN</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={state.isBoxModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background, height: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.headerTitle, { color: theme.text }]}>{state.selectedBoxLabel}</Text>
                                <Text style={{ color: theme.subText, fontSize: 13 }}>{state.boxVocabList.length} Vokabeln in diesem Fach</Text>
                            </View>
                            <TouchableOpacity onPress={() => actions.setBoxModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ marginTop: 15 }} showsVerticalScrollIndicator={false}>
                            {state.boxVocabList.map((ex, index) => (
                                <View key={`${ex.id}-${index}`} style={[styles.vocabCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                                    <View style={styles.vocabContent}>
                                        <Text style={[styles.vocabQuestion, { color: theme.text }]}>{ex.question}</Text>
                                        <Text style={[styles.vocabAnswer, { color: theme.subText }]}>{ex.correctAnswer}</Text>
                                    </View>
                                    <Ionicons name={ex.type === 'listen' ? 'headset' : 'language'} size={20} color={theme.border} />
                                </View>
                            ))}
                            <View style={{ height: 30 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            <CustomAlert
                visible={state.alertConfig.visible}
                title={state.alertConfig.title}
                message={state.alertConfig.message}
                onClose={actions.hideAlert}
                isDarkMode={isDarkMode}
            />
        </SafeAreaView>
    );
}

// [StyleSheet bleibt 1:1 gleich, behalte das alte StyleSheet aus practice.tsx]
const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        height: 70, // Erzwingt überall auf den Millimeter genau die gleiche Höhe
        paddingHorizontal: 20, // Nur noch Abstand nach links und rechts
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold'
    },
    content: { padding: 20, paddingBottom: 50 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 20 },
    card: { borderRadius: 16, padding: 15, elevation: 2, marginBottom: 10 },
    optionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
    optionContent: { flexDirection: 'row', alignItems: 'center' },
    optionText: { fontSize: 16, fontWeight: '600' },
    optionDesc: { fontSize: 12, color: '#888', marginTop: 2, maxWidth: 220 },
    badge: { backgroundColor: '#ff4757', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, minWidth: 24, alignItems: 'center' },
    badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
    label: { fontSize: 14 },
    countContainer: { flexDirection: 'row', gap: 10 },
    countBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
    countBtnActive: { backgroundColor: '#58cc02', borderColor: '#58cc02' },
    countText: { color: '#555', fontWeight: '600' },
    countTextActive: { color: '#fff', fontWeight: 'bold' },
    customInput: { flex: 1.2, padding: 12, borderRadius: 8, borderWidth: 1, textAlign: 'center', fontWeight: 'bold' },
    startBtn: { backgroundColor: '#58cc02', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30, marginBottom: 20 },
    startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    vocabCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    vocabContent: { flex: 1, paddingRight: 10 },
    vocabQuestion: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
    vocabAnswer: { fontSize: 15, fontStyle: 'italic' },
    closeBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 20 },
});