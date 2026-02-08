import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
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

const courseData = content.courses[0];

export default function PathScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
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
          // WICHTIG: Wenn null (durch Reset), dann leeres Objekt setzen
          setScores(savedScores ? JSON.parse(savedScores) : {});

          const savedExams = await AsyncStorage.getItem('examScores');
          setExamScores(savedExams ? JSON.parse(savedExams) : {});

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
          } else {
            setStreak(0); // Reset handling
          }
        } catch (e) { console.error(e); }
      };
      loadProgress();
    }, [])
  );

  const startExam = () => {
      if (selectedUnitId) {
          setShowExamModal(false);
          router.push({ pathname: "/lesson", params: { id: selectedUnitId, type: 'exam' } });
      }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#f0f0f0' }]}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Lernpfad</Text>
            <Image source={{ uri: 'https://flagcdn.com/w80/pt.png' }} style={styles.flagImage}/>
        </View>
        <View style={{flexDirection: 'row', gap: 15, alignItems: 'center'}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="flame" size={24} color={streak > 0 ? "#ff9600" : (colorScheme === 'dark' ? '#555' : '#ddd')} />
                <Text style={[styles.streakText, {color: streak > 0 ? "#ff9600" : "#bbb"}]}>{streak}</Text>
            </View>
            {/* RESET BUTTON ENTFERNT (Jetzt in Settings) */}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.pathContainer}>
        {courseData.units.map((unit, unitIndex) => {
            const isUnitUnlocked = unitIndex === 0 || examScores[courseData.units[unitIndex - 1].id];
            const allLevelsDone = unit.levels.every(l => (scores[l.id] || 0) > 0);
            const isExamUnlocked = isUnitUnlocked && allLevelsDone;
            const isExamPassed = examScores[unit.id];

            return (
                <View key={unit.id} style={styles.unitContainer}>
                    <View style={[styles.unitHeader, {backgroundColor: isUnitUnlocked ? unit.color : (colorScheme === 'dark' ? '#333' : '#ccc')}]}>
                        <Text style={styles.unitTitle}>{unit.title}</Text>
                        <Text style={styles.unitSubtitle}>{unit.levels.length} Lektionen + Prüfung</Text>
                    </View>
                    
                    <View style={styles.levelsContainer}>
                        {unit.levels.map((level, lvlIndex) => {
                            const score = scores[level.id] || 0;
                            const isLevelUnlocked = isUnitUnlocked && (lvlIndex === 0 || (scores[unit.levels[lvlIndex - 1].id] || 0) > 0);
                            
                            // Farben für Dark Mode anpassen
                            const lockedBorder = colorScheme === 'dark' ? '#444' : '#ccc';
                            const lockedIcon = colorScheme === 'dark' ? '#444' : '#ccc';
                            const bgColor = score > 0 ? unit.color : (colorScheme === 'dark' ? '#222' : '#fff');

                            return (
                                <View key={level.id} style={styles.levelWrapper}>
                                    {lvlIndex < unit.levels.length - 1 && (
                                        <View style={[styles.connectorLine, {backgroundColor: (scores[level.id] || 0) > 0 ? unit.color : (colorScheme === 'dark' ? '#444' : '#e0e0e0')}]} />
                                    )}
                                    
                                    <TouchableOpacity 
                                        style={[styles.levelButton, { borderColor: isLevelUnlocked ? unit.color : lockedBorder, backgroundColor: bgColor }]}
                                        onPress={() => {
                                            if(isLevelUnlocked) router.push({ pathname: "/lesson", params: { id: level.id, type: 'normal' } });
                                            else Alert.alert("Gesperrt", "Schließe erst die vorherige Lektion ab.");
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
                                    <View style={{flexDirection: 'row'}}>
                                        {[1,2,3].map(s => <Ionicons key={s} name="star" size={12} color={s <= score ? "#FFD700" : (colorScheme === 'dark' ? '#444' : '#eee')} />)}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.examWrapper}>
                        <View style={[styles.connectorLineVertical, {backgroundColor: isExamUnlocked ? unit.color : (colorScheme === 'dark' ? '#444' : '#e0e0e0')}]} />
                        <TouchableOpacity 
                            style={[
                                styles.examButton, 
                                { 
                                  backgroundColor: isExamPassed ? '#FFD700' : (isExamUnlocked ? (colorScheme === 'dark' ? '#222' : '#fff') : (colorScheme === 'dark' ? '#333' : '#e5e5e5')), 
                                  borderColor: isExamPassed ? '#FFD700' : (isExamUnlocked ? unit.color : (colorScheme === 'dark' ? '#444' : '#ccc')) 
                                }
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
                        <Text style={[styles.levelTitle, {fontWeight: '900', marginTop: 5, color: theme.text }]}>PRÜFUNG</Text>
                    </View>
                </View>
            );
        })}
      </ScrollView>

      {/* MODAL FÜR PRÜFUNG */}
      <Modal visible={showExamModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#222' : '#fff' }]}>
                <Ionicons name="trophy" size={60} color="#FFD700" style={{marginBottom: 20}} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Abschlussprüfung</Text>
                <Text style={[styles.modalText, { color: theme.icon }]}>
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
  container: { flex: 1 },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 50 : 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginRight: 10 },
  flagImage: { width: 30, height: 20, borderRadius: 3 },
  streakText: { fontSize: 18, fontWeight: 'bold', marginLeft: 4 },
  
  pathContainer: { paddingBottom: 100 },
  unitContainer: { marginBottom: 40 },
  unitHeader: { padding: 20, paddingTop: 30, borderBottomRightRadius: 30, borderBottomLeftRadius: 30, marginBottom: 30 },
  unitTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  unitSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 5 },
  
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