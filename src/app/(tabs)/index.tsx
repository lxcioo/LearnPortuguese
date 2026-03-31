import { CustomAlert } from '@/src/view/components/CustomAlert';
import { Colors } from '@/src/view/constants/theme';
import { useTheme } from '@/src/view/context/ThemeContext';
import { useColorScheme } from '@/src/view/hooks/useColorScheme';
import { usePathViewModel } from '@/src/viewmodel/usePathViewModel';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PathScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { isDarkMode } = useTheme();

    const { state, actions, data } = usePathViewModel();
    const scrollViewRef = useRef<ScrollView>(null);
    const insets = useSafeAreaInsets();

    const handleToggleTimeline = () => {
        actions.setIsTimelineExpanded(!state.isTimelineExpanded);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>

            {/* --- HEADER --- */}
            <View style={[styles.header, { borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>LearnPortuguese</Text>
                    <Image source={{ uri: 'https://flagcdn.com/w80/pt.png' }} style={styles.flagImage} />
                </View>

                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    {data.streakData && data.streakData.streakOnIceCount > 0 && (
                        <View style={styles.badgeContainer}>
                            <Ionicons name="snow" size={20} color="#4DA8DA" />
                            <Text style={[styles.badgeText, { color: "#4DA8DA" }]}>{data.streakData.streakOnIceCount}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={handleToggleTimeline}
                        activeOpacity={0.7}
                        style={styles.badgeContainer}
                    >
                        <Ionicons
                            name="flame"
                            size={26}
                            color={data.streak > 0 ? "#ff9600" : theme.icon}
                        />
                        <Text style={[
                            styles.badgeText,
                            { color: data.streak > 0 ? "#ff9600" : theme.icon }
                        ]}>
                            {data.streak}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- LERNPFAD SCROLLVIEW --- */}
            <ScrollView contentContainerStyle={[styles.pathContainer, { paddingBottom: 120 }]}>
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

            {/* --- BOTTOM SHEET KALENDER MODAL --- */}
            {/* statusBarTranslucent stellt sicher, dass das Modal den gesamten Bildschirm füllt */}
            <Modal visible={state.isTimelineExpanded} transparent animationType="slide" onRequestClose={handleToggleTimeline} statusBarTranslucent>
                <View style={styles.sheetOverlay}>
                    <TouchableWithoutFeedback onPress={handleToggleTimeline}>
                        <View style={StyleSheet.absoluteFill} />
                    </TouchableWithoutFeedback>

                    <View style={[
                        styles.bottomSheet,
                        {
                            backgroundColor: theme.card,
                            paddingBottom: Math.max(insets.bottom + 20, 30)
                        }
                    ]}>

                        {/* NEU: Der Füller-Block für die Handynavigation */}
                        <View style={[styles.bottomFiller, { backgroundColor: theme.card }]} />

                        <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />

                        <View style={styles.sheetHeader}>
                            <Text style={[styles.sheetTitle, { color: theme.text }]}>Dein Lern-Kalender</Text>
                            <TouchableOpacity onPress={handleToggleTimeline} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={theme.icon} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: theme.icon, fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
                            Noch {7 - ((data.streakData?.currentStreak || 0) % 7)} Tage in Folge lernen für eine rettende Eisflamme!
                        </Text>

                        <View style={styles.scrollWrapper}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                ref={scrollViewRef}
                                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
                                contentContainerStyle={styles.scrollableDaysRow}
                            >
                                <View style={[styles.connectingLineHorizontal, { backgroundColor: theme.border }]} />

                                {state.pastDays.map((date) => {
                                    const dateStr = date.toISOString().split('T')[0];
                                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                                    const status = data.streakData?.history[dateStr];

                                    let flameColor = theme.border;
                                    let isDone = false;

                                    if (status === 'learned') {
                                        flameColor = "#ff9600";
                                        isDone = true;
                                    } else if (status === 'frozen') {
                                        flameColor = "#4DA8DA";
                                        isDone = true;
                                    }

                                    return (
                                        <View key={dateStr} style={styles.dayItem}>
                                            <View style={[
                                                styles.dayNode,
                                                {
                                                    backgroundColor: isDone ? flameColor : theme.background,
                                                    borderColor: isDone ? flameColor : theme.border
                                                }
                                            ]}>
                                                {isDone ? (
                                                    <Ionicons name={status === 'frozen' ? "snow" : "checkmark"} size={16} color="#fff" />
                                                ) : (
                                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isToday ? theme.text : 'transparent' }} />
                                                )}
                                            </View>
                                            <Text style={[
                                                styles.dayName,
                                                { color: isToday ? theme.text : theme.icon, fontWeight: isToday ? 'bold' : 'normal' }
                                            ]}>
                                                {state.daysOfWeek[date.getDay()]}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* --- PRÜFUNGS MODAL --- */}
            <Modal visible={state.showExamModal} transparent animationType="slide" statusBarTranslucent>
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
    flagImage: {
        width: 28,
        height: 20,
        borderRadius: 4,
        marginLeft: 8
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    badgeText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 6
    },

    // Bottom Sheet
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 12,
        minHeight: 250,
        zIndex: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 20,
        position: 'relative', // Nötig, damit der absolute Füller-Block sich daran orientiert
    },
    // Verhindert, dass der Lernpfad unterhalb des Modals (z.B. hinter der System-Navigation) zu sehen ist
    bottomFiller: {
        position: 'absolute',
        bottom: -200,
        left: 0,
        right: 0,
        height: 200,
    },
    sheetHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sheetTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    closeBtn: {
        padding: 4,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 20,
    },

    scrollWrapper: {
        height: 80,
        marginTop: 10,
        width: '100%',
    },
    scrollableDaysRow: {
        alignItems: 'center',
        position: 'relative',
        paddingHorizontal: 10,
        flexGrow: 1,
    },
    connectingLineHorizontal: {
        position: 'absolute',
        top: 18,
        left: 20,
        right: 20,
        height: 3,
        borderRadius: 2,
        zIndex: 0,
    },
    dayItem: {
        alignItems: 'center',
        zIndex: 1,
        width: 50,
    },
    dayNode: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    dayName: { fontSize: 12 },

    // Lernpfad 
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

    // Prüfungs-Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 5 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    modalText: { fontSize: 16, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
    modalStartBtn: { backgroundColor: '#58cc02', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, width: '100%', alignItems: 'center' },
    modalStartText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});