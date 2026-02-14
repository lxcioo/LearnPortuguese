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
  
  const [selectedLessons, setSelectedLessons] = useState<Record<string, boolean>>({});
  const [questionCount, setQuestionCount] = useState(10);
  
  const [dueCount, setDueCount] = useState(0);
  const [todayMistakeCount, setTodayMistakeCount] = useState(0);
  const [globalStats, setGlobalStats] = useState({ total:0, mastered:0, learning:0, struggling:0, new:0 });

  useFocusEffect(
    useCallback(() => {
      loadSmartData();
    }, [])
  );

  const loadSmartData = async () => {
    const due = await StorageService.getDueExercises();
    setDueCount(due.length);
    const mistakes = await StorageService.getTodayMistakes();
    setTodayMistakeCount(mistakes.length);
    const stats = await StorageService.getGlobalProgressStats();
    setGlobalStats(stats);
  };

  const toggleLesson = (id: string) => {
    setSelectedLessons(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Start Logik ---

  const startLeitnerReview = async () => {
    const exercises = await StorageService.getDueExercises();
    if (exercises.length === 0) {
      Alert.alert("Alles erledigt!", "Keine Übungen sind derzeit fällig.");
      return;
    }
    await StorageService.savePracticeSession(exercises);
    router.push({ pathname: "/lesson", params: { id: 'practice' } });
  };

  const startTodayMistakes = async () => {
      const exercises = await StorageService.getTodayMistakes();
      if (exercises.length === 0) {
          Alert.alert("Sauber!", "Heute noch keine Fehler gemacht.");
          return;
      }
      await StorageService.savePracticeSession(exercises);
      router.push({ pathname: "/lesson", params: { id: 'practice' } });
  };

  // SMART Standard Practice (Freies Training)
  const startStandardPractice = async () => {
    let pool: any[] = [];
    courseData.units.forEach(unit => {
        unit.levels.forEach(level => {
            if (selectedLessons[level.id]) {
                pool = [...pool, ...level.exercises];
            }
        });
    });

    if (pool.length === 0) {
      Alert.alert("Keine Lektion gewählt", "Bitte wähle mindestens eine Lektion aus.");
      return;
    }

    // HIER: Smart Selection statt reinem Random
    const practiceSession = await StorageService.getSmartSelection(pool, questionCount);
    
    // Fallback falls alles gemeistert ist und das Array leer wäre (unwahrscheinlich, aber sicher ist sicher)
    if (practiceSession.length === 0) {
         Alert.alert("Wow!", "Du hast in den gewählten Lektionen alles gemeistert! Wir setzen das Training zurück, damit du weiter üben kannst.");
         // Fallback: Nimm einfach zufällige
         const randomFallback = pool.sort(() => 0.5 - Math.random()).slice(0, questionCount);
         await StorageService.savePracticeSession(randomFallback);
    } else {
         await StorageService.savePracticeSession(practiceSession);
    }
    
    router.push({ pathname: "/lesson", params: { id: 'practice' } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Training 💪</Text>
        <Text style={[styles.subTitle, { color: theme.subText }]}>Smartes Lernen & Wiederholen</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* GLOBAL STATS DIAGRAMM */}
        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Dein Vokabel-Garten:</Text>
        <View style={[styles.statsCard, { backgroundColor: theme.card }]}>
           <View style={{flexDirection: 'row', height: 20, borderRadius: 10, overflow: 'hidden', marginVertical: 10}}>
                {/* Mastered */}
                <View style={{flex: globalStats.mastered, backgroundColor: '#00b894'}} />
                {/* Learning */}
                <View style={{flex: globalStats.learning, backgroundColor: '#74b9ff'}} />
                {/* Struggling */}
                <View style={{flex: globalStats.struggling, backgroundColor: '#ff7675'}} />
                {/* Empty filler if nothing yet */}
                {globalStats.total === 0 && <View style={{flex: 1, backgroundColor: '#dfe6e9'}} />}
           </View>
           <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
               <Text style={{fontSize: 12, color: '#00b894'}}>🏆 Gemeistert: {globalStats.mastered}</Text>
               <Text style={{fontSize: 12, color: '#74b9ff'}}>📚 Aktiv: {globalStats.learning}</Text>
               <Text style={{fontSize: 12, color: '#ff7675'}}>🆘 Probleme: {globalStats.struggling}</Text>
           </View>
           <Text style={{textAlign: 'center', marginTop: 10, color: theme.subText, fontSize: 12}}>
               {globalStats.total} Vokabeln im System entdeckt.
           </Text>
        </View>

        {/* SMART ACTIONS */}
        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Fokus-Übungen:</Text>
        
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} onPress={startLeitnerReview}>
            <View style={styles.iconContainer}><Ionicons name="timer" size={28} color="#1cb0f6" /></View>
            <View style={{flex: 1}}>
                <Text style={[styles.actionTitle, {color: theme.text}]}>Fällige Wiederholungen</Text>
                <Text style={[styles.actionDesc, {color: theme.subText}]}>{dueCount} Vokabeln warten.</Text>
            </View>
            {dueCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{dueCount}</Text></View>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.cardBorder, marginTop: 10 }]} onPress={startTodayMistakes}>
            <View style={styles.iconContainer}><Ionicons name="bandage" size={28} color="#ff4757" /></View>
            <View style={{flex: 1}}>
                <Text style={[styles.actionTitle, {color: theme.text}]}>Heutige Fehler</Text>
                <Text style={[styles.actionDesc, {color: theme.subText}]}>Sofort korrigieren.</Text>
            </View>
            {todayMistakeCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{todayMistakeCount}</Text></View>}
        </TouchableOpacity>

        {/* STANDARD PRACTICE SELECTION */}
        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Freies Training (Smart-Filter):</Text>
        
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          {courseData.units.map((unit, uIndex) => {
              const isUnitUnlocked = uIndex === 0 || examScores[courseData.units[uIndex - 1].id];
              if (!isUnitUnlocked) return null;

              return (
                  <View key={unit.id} style={{marginBottom: 15}}>
                      <View style={{backgroundColor: isDarkMode ? '#333' : '#f0f0f0', padding: 8, borderRadius: 8, marginBottom: 5}}>
                          <Text style={{fontWeight: 'bold', color: theme.sectionTitle}}>{unit.title}</Text>
                      </View>
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
        </View>

        <Text style={[styles.sectionTitle, { color: theme.sectionTitle, fontSize: 16 }]}>Fragen pro Runde:</Text>
        <View style={styles.countContainer}>
          {[5, 10, 20].map(num => (
            <TouchableOpacity key={num} 
              style={[styles.countButton, { backgroundColor: theme.countBtnBg, borderColor: theme.border }, questionCount === num && { borderColor: '#58cc02', backgroundColor: theme.countBtnSelectedBg }]}
              onPress={() => setQuestionCount(num)}
            >
              <Text style={[styles.countText, { color: theme.subText }, questionCount === num && styles.countTextSelected]}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.startButton} onPress={startStandardPractice}>
          <Text style={styles.startButtonText}>TRAINING STARTEN</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 50 : 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  subTitle: { fontSize: 16, marginTop: 5 },
  content: { padding: 20, paddingBottom: 50 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 20 },
  card: { borderRadius: 16, padding: 15, elevation: 2 },
  statsCard: { borderRadius: 16, padding: 15, elevation: 2, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, paddingHorizontal: 5 },
  label: { fontSize: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, elevation: 1 },
  iconContainer: { marginRight: 15, width: 40, alignItems: 'center' },
  actionTitle: { fontSize: 18, fontWeight: 'bold' },
  actionDesc: { fontSize: 14, marginTop: 2 },
  badge: { backgroundColor: '#ff4757', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 10 },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  countContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  countButton: { flex: 1, marginHorizontal: 5, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 2 },
  countText: { fontSize: 16, fontWeight: 'bold' },
  countTextSelected: { color: '#58cc02' },
  startButton: { backgroundColor: '#58cc02', padding: 18, borderRadius: 16, alignItems: 'center', elevation: 3, marginBottom: 40 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});