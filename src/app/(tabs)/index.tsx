import { CustomAlert } from '@/src/view/components/CustomAlert';
import { Colors } from '@/src/view/constants/theme';
import { useTheme } from '@/src/view/context/ThemeContext';
import { useColorScheme } from '@/src/view/hooks/useColorScheme';
import { usePathViewModel } from '@/src/viewmodel/usePathViewModel';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, LayoutAnimation, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PathScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { isDarkMode } = useTheme();

    // MVVM Integration
    const { state, actions, data } = usePathViewModel();

    // UI-spezifische Animation bleibt in der View
    const handleToggleTimeline = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        actions.setIsTimelineExpanded(!state.isTimelineExpanded);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
            <View style={[styles.headerContainer, { borderBottomColor: theme.cardBorder }]}>
                <TouchableOpacity style={styles.header} onPress={handleToggleTimeline} activeOpacity={0.7}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>Lernpfad</Text>
                        <Ionicons name={state.isTimelineExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.icon} style={{ marginRight: 10 }} />
                        <Image source={{ uri: 'https://flagcdn.com/w80/pt.png' }} style={styles.flagImage} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        {data.streakData && data.streakData.streakOnIceCount > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="flame" size={16} color="#4DA8DA" />
                                <Text style={[styles.iceText, { color: "#4DA8DA" }]}>{data.streakData.streakOnIceCount}</Text>
                            </View>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="flame" size={24} color={data.streak > 0 ? "#ff9600" : theme.icon} />
                            <Text style={[styles.streakText, { color: data.streak > 0 ? "#ff9600" : "#bbb" }]}>{data.streak}</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {state.isTimelineExpanded && (
                    <View style={styles.timelineContainer}>
                        <View style={styles.daysRow}>
                            {state.last7Days.map((date) => {
                                const dateStr = date.toISOString().split('T')[0];
                                const isToday = dateStr === new Date().toISOString().split('T')[0];
                                const status = data.streakData?.history[dateStr];

                                let flameColor = theme.border;
                                if (status === 'learned') flameColor = "#ff9600";
                                else if (status === 'frozen') flameColor = "#4DA8DA";

                                return (
                                    <View key={dateStr} style={styles.dayItem}>
                                        <Text style={[styles.dayName, { color: isToday ? theme.text : theme.icon, fontWeight: isToday ? 'bold' : 'normal' }]}>
                                            {state.daysOfWeek[date.getDay()]}
                                        </Text>
                                        <View style={[styles.flameCircle, { backgroundColor: status ? flameColor + '20' : theme.background, borderColor: status ? flameColor : theme.border }]}>
                                            <Ionicons name="flame" size={14} color={flameColor} />
                                        </View>
                                        {isToday ? <View style={[styles.todayDot, { backgroundColor: theme.text }]} /> : <View style={styles.todayDotPlaceholder} />}
                                    </View>
                                );
                            })}
                        </View>
                        <View style={styles.streakProgressContainer}>
                            <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                                <View style={[styles.progressBarFill, { width: `${(((data.streakData?.currentStreak || 0) % 7) / 7) * 100}%` }]} />
                            </View>
                            <Ionicons name="flame" size={18} color="#4DA8DA" style={{ marginLeft: 8 }} />
                        </View>
                    </View>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.pathContainer}>
                {data.courseData.units.map((unit, unitIndex) => {
                    const isUnitUnlocked = unitIndex === 0 || data.examScores[data.courseData.units[unitIndex - 1].id];
                    const allLevelsDone = unit.levels.every(l => (data.scores[l.id] || 0) > 0);
                    const isExamUnlocked = isUnitUnlocked && allLevelsDone;
                    const isExamPassed = data.examScores[unit.id];

                    return (
                        <View key={unit.id} style={styles.unitContainer}>
                            <View style={[styles.unitHeader, { backgroundColor: isUnitUnlocked ? unit.color : theme.cardBorder }]}>
                                <Text style={styles.unitTitle}>{unit.title}</Text>
                                <Text style={styles.unitSubtitle}>{unit.levels.length} Lektionen + Prüfung</Text>
                                {unit.grammarGuide && unit.grammarGuide.length > 0 && (
                                    <TouchableOpacity
                                        style={styles.grammarButton}
                                        onPress={() => router.push({ pathname: '/grammar_modal', params: { unitId: unit.id } })}
                                    >
                                        <Ionicons name="book" size={16} color="#fff" style={{ marginRight: 6 }} />
                                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Tipps & Grammatik</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={styles.levelsContainer}>
                                {unit.levels.map((level, lvlIndex) => {
                                    const score = data.scores[level.id] || 0;
                                    const isLevelUnlocked = isUnitUnlocked && (lvlIndex === 0 || (data.scores[unit.levels[lvlIndex - 1].id] || 0) > 0);

                                    const lockedBorder = theme.cardBorder;
                                    const lockedIcon = theme.cardBorder;
                                    const bgColor = score > 0 ? unit.color : theme.background;

                                    return (
                                        <View key={level.id} style={styles.levelWrapper}>
                                            {lvlIndex < unit.levels.length - 1 && (
                                                <View style={[styles.connectorLine, { backgroundColor: (data.scores[level.id] || 0) > 0 ? unit.color : theme.border }]} />
                                            )}

                                            <TouchableOpacity
                                                style={[styles.levelButton, { borderColor: isLevelUnlocked ? unit.color : lockedBorder, backgroundColor: bgColor }]}
                                                onPress={() => {
                                                    if (isLevelUnlocked) router.push({ pathname: "/lesson", params: { id: level.id, type: 'normal' } });
                                                    else actions.showAlert("Gesperrt", "Schließe erst die vorherige Lektion ab.");
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons
                                                    name={score === 3 ? "checkmark-circle" : (isLevelUnlocked ? "book" : "lock-closed")}
                                                    size={24}
                                                    color={score > 0 ? "#fff" : (isLevelUnlocked ? unit.color : lockedIcon)}
                                                />
                                            </TouchableOpacity>
                                            <Text style={[styles.levelTitle, { color: theme.text }]}>{level.title}</Text>
                                            <View style={{ flexDirection: 'row' }}>
                                                {[1, 2, 3].map(s => <Ionicons key={s} name="star" size={12} color={s <= score ? "#FFD700" : theme.border} />)}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            <View style={styles.examWrapper}>
                                <View style={[styles.connectorLineVertical, { backgroundColor: isExamUnlocked ? unit.color : theme.border }]} />
                                <TouchableOpacity
                                    style={[
                                        styles.examButton,
                                        {
                                            backgroundColor: isExamPassed ? '#FFD700' : (isExamUnlocked ? theme.background : theme.border),
                                            borderColor: isExamPassed ? '#FFD700' : (isExamUnlocked ? unit.color : theme.cardBorder)
                                        }
                                    ]}
                                    onPress={() => {
                                        if (isExamUnlocked) {
                                            actions.setSelectedUnitId(unit.id);
                                            actions.setShowExamModal(true);
                                        } else {
                                            actions.showAlert("Prüfung gesperrt", "Du musst erst alle Lektionen oben mit mindestens 1 Stern abschließen.");
                                        }
                                    }}
                                >
                                    <Ionicons name="trophy" size={40} color={isExamPassed ? "#fff" : (isExamUnlocked ? unit.color : "#aaa")} />
                                </TouchableOpacity>
                                <Text style={[styles.levelTitle, { fontWeight: '900', marginTop: 5, color: theme.text }]}>PRÜFUNG</Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            <Modal visible={state.showExamModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <Ionicons name="trophy" size={60} color="#FFD700" style={{ marginBottom: 20 }} />
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Abschlussprüfung</Text>
                        <Text style={[styles.modalText, { color: theme.icon }]}>
                            Bist du bereit? Wir stellen dir **30 Fragen** aus dem gesamten Kapitel.
                            {"\n\n"}
                            Du musst bestehen, um das nächste Kapitel freizuschalten.
                        </Text>
                        <TouchableOpacity style={styles.modalStartBtn} onPress={actions.startExam}>
                            <Text style={styles.modalStartText}>JETZT STARTEN</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => actions.setShowExamModal(false)} style={{ marginTop: 15 }}>
                            <Text style={{ color: '#999' }}>Abbrechen</Text>
                        </TouchableOpacity>
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

// [Das StyleSheet bleibt genau wie in deiner index.tsx]
const styles = StyleSheet.create({
    container: { flex: 1 },
    headerContainer: { borderBottomWidth: 1 },
    header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 50 : 20, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: 'bold' },
    flagImage: { width: 30, height: 20, borderRadius: 3 },
    streakText: { fontSize: 18, fontWeight: 'bold', marginLeft: 4 },
    iceText: { fontSize: 14, fontWeight: 'bold', marginLeft: 2 },
    timelineContainer: { paddingHorizontal: 20, paddingBottom: 15, overflow: 'hidden' },
    daysRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dayItem: { alignItems: 'center' },
    dayName: { fontSize: 10, marginBottom: 4 },
    flameCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
    todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
    todayDotPlaceholder: { width: 4, height: 4, marginTop: 4 },
    streakProgressContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    progressBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#4DA8DA', borderRadius: 3 },
    pathContainer: { paddingTop: 20, paddingBottom: 100 },
    unitContainer: { marginBottom: 40 },
    unitHeader: { padding: 20, paddingTop: 30, borderBottomRightRadius: 30, borderBottomLeftRadius: 30, marginBottom: 30 },
    unitTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    unitSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 5 },
    grammarButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginTop: 15 },
    levelsContainer: { alignItems: 'center', gap: 30 },
    levelWrapper: { alignItems: 'center', position: 'relative', zIndex: 1 },
    connectorLine: { position: 'absolute', top: 30, height: 40, width: 6, zIndex: -1 },
    levelButton: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
    levelTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    examWrapper: { alignItems: 'center', marginTop: 30 },
    connectorLineVertical: { height: 40, width: 6, marginBottom: -5 },
    examButton: { width: 90, height: 90, borderRadius: 45, borderWidth: 6, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 5 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    modalText: { fontSize: 16, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
    modalStartBtn: { backgroundColor: '#58cc02', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, width: '100%', alignItems: 'center' },
    modalStartText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});