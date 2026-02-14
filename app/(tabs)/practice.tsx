import { Colors } from '@/src/constants/theme';
import { useColorScheme } from '@/src/hooks/useColorScheme';
import { useUserProgress } from '@/src/hooks/useUserProgress';
import { StorageService } from '@/src/services/StorageService'; // NEU
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
  
  // Neue States für Smart Practice
  const [dueCount, setDueCount] = useState(0);
  const [stats, setStats] = useState<{date: string, correct: number, wrong: number}[]>([]);

  // Daten laden bei Fokus
  useFocusEffect(
    useCallback(() => {
      loadSmartData();
    }, [])
  );

  const loadSmartData = async () => {
    const due = await StorageService.getDueExercises();
    setDueCount(due.length);
    const weeklyStats = await StorageService.getWeeklyStats();
    setStats(weeklyStats);
  };

  const toggleLesson = (id: string) => {
    setSelectedLessons(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- NEU: Startmethoden für verschiedene Modi ---

  const startLeitnerReview = async () => {
    const exercises = await StorageService.getDueExercises();
    if (exercises.length === 0) {
      Alert.alert("Alles erledigt!", "Für heute gibt es keine fälligen Wiederholungen.");
      return;
    }
    // Session speichern & starten
    await StorageService.savePracticeSession(exercises);
    router.push({ pathname: "/lesson", params: { id: 'practice' } });
  };

  const startHardMode = async () => {
    const exercises = await StorageService.getHardModeExercises();
    if (exercises.length === 0) {
        Alert.alert("Zu wenig Fehler", "Du hast noch keine 'Problemfälle' gesammelt. Weiter so!");
        return;
    }
    await StorageService.savePracticeSession(exercises);
    router.push({ pathname: "/lesson", params: { id: 'practice' } });
  };

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

    // Mischen
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const practiceSession = pool.slice(0, questionCount);
    try {
      await StorageService.savePracticeSession(practiceSession);
      router.push({ pathname: "/lesson", params: { id: 'practice' } });
    } catch (e) { console.error(e); }
  };

  // --- Helper für Statistik-Balken ---
  const getMaxVal = () => Math.max(1, ...stats.map(s => s.correct + s.wrong));

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Training 💪</Text>
        <Text style={[styles.subTitle, { color: theme.subText }]}>Wiederhole & verbessere dich</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* STATISTIK SECTION */}
        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Dein Lernverlauf (7 Tage):</Text>
        <View style={[styles.statsCard, { backgroundColor: theme.card }]}>
           <View style={styles.chartContainer}>
              {stats.map((day, index) => {
                  const total = day.correct + day.wrong;
                  const max = getMaxVal();
                  const heightPercent = total > 0 ? (total / max) * 100 : 5; // Min 5% Höhe
                  const correctShare = total > 0 ? (day.correct / total) : 0;
                  
                  return (
                      <View key={index} style={styles.barColumn}>
                          <View style={[styles.barContainer, { height: 100 }]}>
                             {/* Falsch Teil (oben) */}
                             <View style={{ flex: 1 - correctShare, backgroundColor: '#ff6b6b', opacity: total === 0 ? 0 : 1 }} />
                             {/* Richtig Teil (unten) */}
                             <View style={{ flex: correctShare, backgroundColor: '#58cc02', opacity: total === 0 ? 0 : 1 }} />
                             
                             {/* Leerer Platzhalter für korrekte Gesamthöhe */}
                             <View style={{ 
                                 position: 'absolute', bottom: 0, width: '100%', 
                                 height: `${100 - heightPercent}%`, 
                                 backgroundColor: theme.card 
                             }} />
                          </View>
                          <Text style={{ fontSize: 10, color: theme.subText, marginTop: 4 }}>
                              {day.date.slice(8)} {/* Nur Tag anzeigen */}
                          </Text>
                      </View>
                  )
              })}
              {stats.length === 0 && <Text style={{color: theme.subText}}>Noch keine Daten vorhanden.</Text>}
           </View>
           <View style={styles.legend}>
               <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 15}}>
                   <View style={{width: 10, height: 10, backgroundColor: '#58cc02', marginRight: 5, borderRadius: 2}}/>
                   <Text style={{color: theme.subText, fontSize: 12}}>Richtig</Text>
               </View>
               <View style={{flexDirection: 'row', alignItems: 'center'}}>
                   <View style={{width: 10, height: 10, backgroundColor: '#ff6b6b', marginRight: 5, borderRadius: 2}}/>
                   <Text style={{color: theme.subText, fontSize: 12}}>Falsch</Text>
               </View>
           </View>
        </View>

        {/* SMART PRACTICE SECTION */}
        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Intelligentes Üben:</Text>
        
        {/* Leitner Button */}
        <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]} 
            onPress={startLeitnerReview}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="infinite" size={28} color="#1cb0f6" />
            </View>
            <View style={{flex: 1}}>
                <Text style={[styles.actionTitle, {color: theme.text}]}>Spaced Repetition</Text>
                <Text style={[styles.actionDesc, {color: theme.subText}]}>
                    {dueCount > 0 ? `${dueCount} Übungen sind heute fällig.` : "Alles erledigt für heute!"}
                </Text>
            </View>
            {dueCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{dueCount}</Text>
                </View>
            )}
            <Ionicons name="chevron-forward" size={24} color={theme.icon} />
        </TouchableOpacity>

        {/* Hard Mode Button */}
        <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.cardBorder, marginTop: 10 }]} 
            onPress={startHardMode}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="flame" size={28} color="#ff4757" />
            </View>
            <View style={{flex: 1}}>
                <Text style={[styles.actionTitle, {color: theme.text}]}>Hard Mode</Text>
                <Text style={[styles.actionDesc, {color: theme.subText}]}>Deine häufigsten Fehler üben.</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.icon} />
        </TouchableOpacity>


        {/* STANDARD PRACTICE SECTION */}
        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Freies Training:</Text>
        
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
                                <Switch 
                                value={!!selectedLessons[level.id]} 
                                onValueChange={() => toggleLesson(level.id)}
                                trackColor={{ false: theme.border, true: "#58cc02" }}
                                thumbColor={"#fff"}
                                />
                            </View>
                          );
                      })}
                  </View>
              );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.sectionTitle, fontSize: 16 }]}>Anzahl der Fragen:</Text>
        <View style={styles.countContainer}>
          {[5, 10, 20].map(num => (
            <TouchableOpacity 
              key={num} 
              style={[
                  styles.countButton, 
                  { backgroundColor: theme.countBtnBg, borderColor: theme.border },
                  questionCount === num && { borderColor: '#58cc02', backgroundColor: theme.countBtnSelectedBg }
              ]}
              onPress={() => setQuestionCount(num)}
            >
              <Text style={[styles.countText, { color: theme.subText }, questionCount === num && styles.countTextSelected]}>
                {num}
              </Text>
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
  
  // Cards & Rows
  card: { borderRadius: 16, padding: 15, elevation: 2 },
  statsCard: { borderRadius: 16, padding: 15, elevation: 2, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, paddingHorizontal: 5 },
  label: { fontSize: 16 },
  
  // Action Buttons (Smart Practice)
  actionButton: { 
      flexDirection: 'row', alignItems: 'center', 
      padding: 16, borderRadius: 16, borderWidth: 1, elevation: 1
  },
  iconContainer: { marginRight: 15, width: 40, alignItems: 'center' },
  actionTitle: { fontSize: 18, fontWeight: 'bold' },
  actionDesc: { fontSize: 14, marginTop: 2 },
  badge: { backgroundColor: '#ff4757', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 10 },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  // Stats Chart
  chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, paddingTop: 10 },
  barColumn: { alignItems: 'center', width: 20 },
  barContainer: { width: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  legend: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },

  // Count Selection
  countContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  countButton: { flex: 1, marginHorizontal: 5, paddingVertical: 10, borderRadius: 12, alignItems: 'center', borderWidth: 2 },
  countText: { fontSize: 16, fontWeight: 'bold' },
  countTextSelected: { color: '#58cc02' },
  
  startButton: { backgroundColor: '#58cc02', padding: 18, borderRadius: 16, alignItems: 'center', elevation: 3, marginBottom: 40 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});