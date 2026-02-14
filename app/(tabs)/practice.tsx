import { Colors } from '@/src/constants/theme';
import { useColorScheme } from '@/src/hooks/useColorScheme';
import { useUserProgress } from '@/src/hooks/useUserProgress';
import { StorageService } from '@/src/services/StorageService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';
import content from '../../src/data/content.json';

const courseData = content.courses[0];

export default function PracticeScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme(); 
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const { scores, examScores } = useUserProgress();
  
  // Box 0..6 -> 7 Elemente
  const [dailyStats, setDailyStats] = useState({ wordsLearned: 0, mistakesMade: 0 });
  const [leitnerCounts, setLeitnerCounts] = useState([0,0,0,0,0,0,0]);
  
  const [dueCount, setDueCount] = useState(0);
  const [todayMistakeCount, setTodayMistakeCount] = useState(0);
  
  const [selectedLessons, setSelectedLessons] = useState<Record<string, boolean>>({});
  const [questionCount, setQuestionCount] = useState<number | 'all'>(10);
  const [trainingMode, setTrainingMode] = useState<'random' | 'leitner'>('random');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const daily = await StorageService.getDailyStats();
    setDailyStats({ wordsLearned: daily.wordsLearned, mistakesMade: daily.mistakesMade });
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
      router.push({ pathname: "/lesson", params: { id: 'practice' } });
  };

  const startLeitnerReview = async () => {
      const exercises = await StorageService.getLeitnerDue();
      if (exercises.length === 0) {
          Alert.alert("Alles erledigt!", "Für jetzt keine fälligen Wiederholungen.");
          return;
      }
      await StorageService.savePracticeSession(exercises);
      router.push({ pathname: "/lesson", params: { id: 'practice' } });
  };

  const startArchEnemies = async () => {
      const exercises = await StorageService.getArchEnemies();
      if (exercises.length === 0) {
          Alert.alert("Zu wenig Daten", "Noch keine 'Erzfeinde' gesammelt.");
          return;
      }
      await StorageService.savePracticeSession(exercises);
      router.push({ pathname: "/lesson", params: { id: 'practice' } });
  };

  const startFreeTraining = async () => {
      let pool: any[] = [];
      courseData.units.forEach(unit => {
          unit.levels.forEach(level => {
              if (selectedLessons[level.id]) pool = [...pool, ...level.exercises];
          });
      });

      if (pool.length === 0) {
        Alert.alert("Keine Lektion gewählt", "Bitte wähle unten mindestens eine Lektion aus.");
        return;
      }

      const session = await StorageService.getSmartSelection(pool, trainingMode, questionCount);
      await StorageService.savePracticeSession(session);
      router.push({ pathname: "/lesson", params: { id: 'practice' } });
  };

  const getMaxLeitner = () => Math.max(1, ...leitnerCounts);
  const getMaxDaily = () => Math.max(1, dailyStats.wordsLearned, dailyStats.mistakesMade);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Übungsbereich 🧠</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Statistik Heute:</Text>
        <View style={[styles.card, { backgroundColor: theme.card, flexDirection: 'row', alignItems: 'flex-end', height: 150, justifyContent: 'space-around', paddingBottom: 20 }]}>
            <View style={{alignItems: 'center'}}>
                <View style={{width: 40, height: (dailyStats.wordsLearned / getMaxDaily()) * 100, backgroundColor: '#58cc02', minHeight: 10, borderRadius: 5}}/>
                <Text style={{color: theme.subText, marginTop: 5}}>Aktivität</Text>
                <Text style={{fontWeight: 'bold', color: theme.text}}>{dailyStats.wordsLearned}</Text>
            </View>
            <View style={{alignItems: 'center'}}>
                <View style={{width: 40, height: (dailyStats.mistakesMade / getMaxDaily()) * 100, backgroundColor: '#ff4757', minHeight: 10, borderRadius: 5}}/>
                <Text style={{color: theme.subText, marginTop: 5}}>Fehler</Text>
                <Text style={{fontWeight: 'bold', color: theme.text}}>{dailyStats.mistakesMade}</Text>
            </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Leitner System (Lernstand):</Text>
        <View style={[styles.card, { backgroundColor: theme.card, height: 180, justifyContent: 'flex-end', paddingBottom: 10 }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 130}}>
                {/* Zeige Box 1 bis 6 */}
                {[1, 2, 3, 4, 5, 6].map(box => (
                    <View key={box} style={{alignItems: 'center', flex: 1}}>
                        <Text style={{fontSize: 9, color: theme.subText, marginBottom: 2}}>{leitnerCounts[box] || 0}</Text>
                        <View style={{
                            width: 12, 
                            height: (leitnerCounts[box] / getMaxLeitner()) * 100, 
                            backgroundColor: box === 6 ? '#FFD700' : '#1cb0f6', // Box 6 ist Gold
                            minHeight: 5, 
                            borderRadius: 3
                        }}/>
                        <Text style={{color: theme.text, fontSize: 10, marginTop: 5}}>{box===6 ? '★' : box}</Text>
                    </View>
                ))}
            </View>
            <Text style={{textAlign: 'center', fontSize: 10, color: theme.subText, marginTop: 10}}>Box 1 (10min) → Box 6 (30 Tage)</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Was möchtest du üben?</Text>

        <TouchableOpacity style={[styles.optionBtn, {backgroundColor: theme.card, borderColor: theme.cardBorder}]} onPress={startTodayMistakes}>
            <View>
                 <View style={styles.optionContent}>
                    <Ionicons name="bandage" size={24} color="#ff4757" style={{marginRight: 10}}/>
                    <Text style={[styles.optionText, {color: theme.text}]}>Heutige Fehler</Text>
                </View>
                <Text style={styles.optionDesc}>Korrigiere alles, was heute schief ging.</Text>
            </View>
            {todayMistakeCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{todayMistakeCount}</Text></View>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionBtn, {backgroundColor: theme.card, borderColor: theme.cardBorder}]} onPress={startLeitnerReview}>
             <View>
                <View style={styles.optionContent}>
                    <Ionicons name="infinite" size={24} color="#1cb0f6" style={{marginRight: 10}}/>
                    <Text style={[styles.optionText, {color: theme.text}]}>Leitner System</Text>
                </View>
                <Text style={styles.optionDesc}>Deine fälligen Wiederholungen für jetzt.</Text>
            </View>
            {dueCount > 0 && <View style={[styles.badge, {backgroundColor: '#1cb0f6'}]}><Text style={styles.badgeText}>{dueCount}</Text></View>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.optionBtn, {backgroundColor: theme.card, borderColor: theme.cardBorder}]} onPress={startArchEnemies}>
             <View>
                <View style={styles.optionContent}>
                    <Ionicons name="flame" size={24} color="#ffa502" style={{marginRight: 10}}/>
                    <Text style={[styles.optionText, {color: theme.text}]}>Erzfeinde</Text>
                </View>
                <Text style={styles.optionDesc}>Deine Top 20 Fehler aller Zeiten.</Text>
            </View>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Freies Training:</Text>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={{fontWeight: 'bold', marginBottom: 5, color: theme.text}}>1. Lektionen wählen:</Text>
            <Text style={{color: theme.subText, fontSize: 12, marginBottom: 10}}>Wähle Themenbereiche aus, aus denen Vokabeln kommen sollen.</Text>
            {courseData.units.map((unit, uIndex) => {
                const isUnitUnlocked = uIndex === 0 || examScores[courseData.units[uIndex - 1].id];
                if (!isUnitUnlocked) return null;
                return (
                    <View key={unit.id}>
                         <Text style={{color: theme.subText, fontSize: 12, marginTop: 5}}>{unit.title}</Text>
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

            <Text style={{fontWeight: 'bold', marginTop: 20, marginBottom: 5, color: theme.text}}>2. Modus wählen:</Text>
            <Text style={{color: theme.subText, fontSize: 12, marginBottom: 10}}>Zufall mischt bunt durch. Leitner bevorzugt fällige & unbekannte Wörter aus deiner Auswahl.</Text>
            <View style={styles.modeContainer}>
                <TouchableOpacity style={[styles.modeBtn, trainingMode === 'random' && styles.modeBtnActive]} onPress={() => setTrainingMode('random')}>
                    <Text style={[styles.modeText, trainingMode === 'random' && styles.modeTextActive]}>Zufall 🎲</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modeBtn, trainingMode === 'leitner' && styles.modeBtnActive]} onPress={() => setTrainingMode('leitner')}>
                    <Text style={[styles.modeText, trainingMode === 'leitner' && styles.modeTextActive]}>Leitner 🧠</Text>
                </TouchableOpacity>
            </View>

            <Text style={{fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: theme.text}}>3. Anzahl Vokabeln:</Text>
            <View style={styles.countContainer}>
                <TouchableOpacity style={[styles.countBtn, questionCount === 'all' && styles.countBtnActive]} onPress={() => setQuestionCount('all')}>
                    <Text style={[styles.countText, questionCount === 'all' && styles.countTextActive]}>Alle</Text>
                </TouchableOpacity>
                {[5, 10, 20].map(num => (
                    <TouchableOpacity key={num} style={[styles.countBtn, questionCount === num && styles.countBtnActive]} onPress={() => setQuestionCount(num)}>
                        <Text style={[styles.countText, questionCount === num && styles.countTextActive]}>{num}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={startFreeTraining}>
                <Text style={styles.startBtnText}>STARTEN</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 50 : 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  content: { padding: 20, paddingBottom: 50 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 20 },
  card: { borderRadius: 16, padding: 15, elevation: 2, marginBottom: 10 },
  optionBtn: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
      padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 
  },
  optionContent: { flexDirection: 'row', alignItems: 'center' },
  optionText: { fontSize: 16, fontWeight: '600' },
  optionDesc: { fontSize: 12, color: '#888', marginTop: 2, maxWidth: 220 },
  badge: { 
      backgroundColor: '#ff4757', paddingHorizontal: 10, paddingVertical: 4, 
      borderRadius: 12, minWidth: 24, alignItems: 'center' 
  },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  label: { fontSize: 14 },
  modeContainer: { flexDirection: 'row', gap: 10 },
  modeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#58cc02', borderColor: '#58cc02' },
  modeText: { color: '#555' },
  modeTextActive: { color: '#fff', fontWeight: 'bold' },
  countContainer: { flexDirection: 'row', gap: 10 },
  countBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  countBtnActive: { backgroundColor: '#58cc02', borderColor: '#58cc02' },
  countText: { color: '#555' },
  countTextActive: { color: '#fff', fontWeight: 'bold' },
  startBtn: { backgroundColor: '#58cc02', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});