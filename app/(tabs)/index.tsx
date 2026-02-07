import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert, Image, Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet, Text,
  TouchableOpacity,
  View
} from 'react-native';
import content from '../../content.json';

// FIX: Wir greifen jetzt auf 'units' zu, nicht mehr direkt auf lessons
const courseData = content.courses[0];

export default function PathScreen() {
  const router = useRouter();
  
  const [scores, setScores] = useState<Record<string, number>>({});
  const [examScores, setExamScores] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);
  
  // Modal State
  const [showExamModal, setShowExamModal] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadProgress = async () => {
        try {
          const savedScores = await AsyncStorage.getItem('lessonScores');
          if (savedScores) setScores(JSON.parse(savedScores));

          // NEU: Prüfungsergebnisse laden
          const savedExams = await AsyncStorage.getItem('examScores');
          if (savedExams) setExamScores(JSON.parse(savedExams));

          const streakDataStr = await AsyncStorage.getItem('streakData');
          if (streakDataStr) {
            const { currentStreak, lastStreakDate } = JSON.parse(streakDataStr);
            const today = new Date().toDateString();
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastStreakDate === today || lastStreakDate === yesterday.toDateString()) {
                setStreak(currentStreak);
            } else {
                setStreak(0);
            }
          }
        } catch (e) { console.error(e); }
      };
      loadProgress();
    }, [])
  );

  const startExam = () => {
      if (selectedUnitId) {
          setShowExamModal(false);
          // Wir starten die Lektion mit dem Typ 'exam'
          router.push({ pathname: "/lesson", params: { id: selectedUnitId, type: 'exam' } });
      }
  };

  const performReset = async () => {
    await AsyncStorage.clear(); // Alles löschen
    setScores({});
    setExamScores({});
    setStreak(0);
  };

  const resetProgress = () => {
      Alert.alert(
        "Alles löschen?", 
        "Wirklich alles zurücksetzen?", 
        [{ text: "Abbrechen" }, { text: "Löschen", style: "destructive", onPress: performReset }]
      );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.headerTitle}>Lernpfad</Text>
            <Image source={{ uri: 'https://flagcdn.com/w80/pt.png' }} style={styles.flagImage}/>
        </View>
        <View style={{flexDirection: 'row', gap: 15, alignItems: 'center'}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="flame" size={24} color={streak > 0 ? "#ff9600" : "#ddd"} />
                <Text style={[styles.streakText, {color: streak > 0 ? "#ff9600" : "#bbb"}]}>{streak}</Text>
            </View>
            <TouchableOpacity onPress={resetProgress}><Ionicons name="trash-outline" size={24} color="#ff4444" /></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.pathContainer}>
        {courseData.units.map((unit, unitIndex) => {
            
            // Prüfen ob Unit freigeschaltet ist (Vorherige Unit Exam bestanden?)
            const isUnitUnlocked = unitIndex === 0 || examScores[courseData.units[unitIndex - 1].id];
            
            // Haben alle Levels in dieser Unit mind. 1 Stern?
            const allLevelsDone = unit.levels.every(l => (scores[l.id] || 0) > 0);
            const isExamUnlocked = isUnitUnlocked && allLevelsDone;
            const isExamPassed = examScores[unit.id];

            return (
                <View key={unit.id} style={styles.unitContainer}>
                    <View style={[styles.unitHeader, {backgroundColor: isUnitUnlocked ? unit.color : '#ccc'}]}>
                        <Text style={styles.unitTitle}>{unit.title}</Text>
                        <Text style={styles.unitSubtitle}>{unit.levels.length} Lektionen + Prüfung</Text>
                    </View>
                    
                    <View style={styles.levelsContainer}>
                        {/* Die 3 kleinen Kreise */}
                        {unit.levels.map((level, lvlIndex) => {
                            const score = scores[level.id] || 0;
                            // Level Logik: Erstes immer offen, sonst wenn davor > 0
                            const isLevelUnlocked = isUnitUnlocked && (lvlIndex === 0 || (scores[unit.levels[lvlIndex - 1].id] || 0) > 0);

                            return (
                                <View key={level.id} style={styles.levelWrapper}>
                                    {/* Verbindungslinie (außer beim letzten Level) */}
                                    {lvlIndex < unit.levels.length - 1 && (
                                        <View style={[styles.connectorLine, {backgroundColor: (scores[level.id] || 0) > 0 ? unit.color : '#e0e0e0'}]} />
                                    )}
                                    
                                    <TouchableOpacity 
                                        style={[styles.levelButton, { borderColor: isLevelUnlocked ? unit.color : '#ccc', backgroundColor: score > 0 ? unit.color : '#fff' }]}
                                        onPress={() => {
                                            if(isLevelUnlocked) router.push({ pathname: "/lesson", params: { id: level.id, type: 'normal' } });
                                            else Alert.alert("Gesperrt", "Schließe erst die vorherige Lektion ab.");
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons 
                                            name={score === 3 ? "checkmark-circle" : (isLevelUnlocked ? "book" : "lock-closed")} 
                                            size={24} 
                                            color={score > 0 ? "#fff" : (isLevelUnlocked ? unit.color : "#ccc")} 
                                        />
                                    </TouchableOpacity>
                                    <Text style={styles.levelTitle}>{level.title}</Text>
                                    <View style={{flexDirection: 'row'}}>
                                        {[1,2,3].map(s => <Ionicons key={s} name="star" size={12} color={s <= score ? "#FFD700" : "#eee"} />)}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Der POKAL (Prüfung) */}
                    <View style={styles.examWrapper}>
                        <View style={[styles.connectorLineVertical, {backgroundColor: isExamUnlocked ? unit.color : '#e0e0e0'}]} />
                        <TouchableOpacity 
                            style={[
                                styles.examButton, 
                                { backgroundColor: isExamPassed ? '#FFD700' : (isExamUnlocked ? '#fff' : '#e5e5e5'), borderColor: isExamPassed ? '#FFD700' : (isExamUnlocked ? unit.color : '#ccc') }
                            ]}
                            onPress={() => {
                                if (isExamUnlocked) {
                                    setSelectedUnitId(unit.id);
                                    setShowExamModal(true);
                                } else {
                                    Alert.alert("Prüfung gesperrt", "Du musst erst alle Lektionen oben mit mindestens 1 Stern abschließen.");
                                }
                            }}
                        >
                            <Ionicons name="trophy" size={40} color={isExamPassed ? "#fff" : (isExamUnlocked ? unit.color : "#aaa")} />
                        </TouchableOpacity>
                        <Text style={[styles.levelTitle, {fontWeight: '900', marginTop: 5}]}>PRÜFUNG</Text>
                    </View>
                </View>
            );
        })}
      </ScrollView>

      {/* MODAL FÜR PRÜFUNG */}
      <Modal visible={showExamModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Ionicons name="trophy" size={60} color="#FFD700" style={{marginBottom: 20}} />
                <Text style={styles.modalTitle}>Abschlussprüfung</Text>
                <Text style={styles.modalText}>
                    Bist du bereit? Wir stellen dir **30 Fragen** aus dem gesamten Kapitel.
                    {"\n\n"}
                    Du musst bestehen, um das nächste Kapitel freizuschalten.
                </Text>
                <TouchableOpacity style={styles.modalStartBtn} onPress={startExam}>
                    <Text style={styles.modalStartText}>JETZT STARTEN</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowExamModal(false)} style={{marginTop: 15}}>
                    <Text style={{color: '#999'}}>Abbrechen</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 50 : 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginRight: 10 },
  flagImage: { width: 30, height: 20, borderRadius: 3 },
  streakText: { fontSize: 18, fontWeight: 'bold', marginLeft: 4 },
  
  pathContainer: { paddingBottom: 100 },
  unitContainer: { marginBottom: 40 },
  unitHeader: { padding: 20, paddingTop: 30, borderBottomRightRadius: 30, borderBottomLeftRadius: 30, marginBottom: 30 },
  unitTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  unitSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 5 },
  
  levelsContainer: { alignItems: 'center', gap: 30 }, // Abstand zwischen den kleinen Kreisen
  levelWrapper: { alignItems: 'center', position: 'relative', zIndex: 1 },
  connectorLine: { position: 'absolute', top: 30, height: 40, width: 6, zIndex: -1, backgroundColor: '#ccc' }, // Vertikale Linie
  
  levelButton: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 5, backgroundColor: '#fff' },
  levelTitle: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 2 },
  
  examWrapper: { alignItems: 'center', marginTop: 30 },
  connectorLineVertical: { height: 40, width: 6, backgroundColor: '#ccc', marginBottom: -5 },
  examButton: { width: 90, height: 90, borderRadius: 45, borderWidth: 6, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '85%', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  modalText: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 20, lineHeight: 22 },
  modalStartBtn: { backgroundColor: '#58cc02', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, width: '100%', alignItems: 'center' },
  modalStartText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});