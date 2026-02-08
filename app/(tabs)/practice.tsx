import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert, Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import content from '../../content.json';

// Zugriff auf die neuen Units
const courseData = content.courses[0];

export default function PracticeScreen() {
  const router = useRouter();
  
  const [scores, setScores] = useState<Record<string, number>>({});
  const [examScores, setExamScores] = useState<Record<string, boolean>>({});
  const [selectedLessons, setSelectedLessons] = useState<Record<string, boolean>>({});
  const [questionCount, setQuestionCount] = useState(10);
  const [mistakesCount, setMistakesCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
            // 1. Scores laden (für Freischaltung)
            const savedScores = await AsyncStorage.getItem('lessonScores');
            setScores(savedScores ? JSON.parse(savedScores) : {});

            const savedExams = await AsyncStorage.getItem('examScores');
            setExamScores(savedExams ? JSON.parse(savedExams) : {});

            // 2. Fehler von heute laden
            const dailyMistakesStr = await AsyncStorage.getItem('dailyMistakes');
            if (dailyMistakesStr) {
                const data = JSON.parse(dailyMistakesStr);
                const today = new Date().toDateString();
                if (data.date === today) {
                    setMistakesCount(data.exercises.length);
                } else {
                    setMistakesCount(0);
                }
            } else {
                // FIX: Wenn Reset gedrückt wurde (Storage leer), dann auch Anzeige auf 0 setzen
                setMistakesCount(0);
            }
        } catch(e) { console.error(e); }
      };
      loadData();
    }, [])
  );

  const toggleLesson = (id: string) => {
    setSelectedLessons(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Funktion: Nur Fehler üben
  const startMistakePractice = async () => {
      if (mistakesCount === 0) {
          Alert.alert("Perfekt!", "Du hast heute noch keine Fehler gemacht.");
          return;
      }
      
      try {
        const dailyMistakesStr = await AsyncStorage.getItem('dailyMistakes');
        if (dailyMistakesStr) {
            const data = JSON.parse(dailyMistakesStr);
            await AsyncStorage.setItem('currentPracticeSession', JSON.stringify(data.exercises));
            router.push({ pathname: "/lesson", params: { id: 'practice' } });
        }
      } catch(e) { console.error(e); }
  };

  // Funktion: Normale Übung starten
  const startPractice = async () => {
    let pool: any[] = [];
    
    // Durchsuche alle Units und Levels nach ausgewählten Lektionen
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

    // Mischen (Fisher-Yates Shuffle)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Nur die gewünschte Anzahl nehmen
    const practiceSession = pool.slice(0, questionCount);

    try {
      await AsyncStorage.setItem('currentPracticeSession', JSON.stringify(practiceSession));
      router.push({ pathname: "/lesson", params: { id: 'practice' } });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Training 💪</Text>
        <Text style={styles.subTitle}>Wiederhole bekannte Lektionen</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* --- TAGES FEHLER BUTTON --- */}
        <Text style={styles.sectionTitle}>Tages-Fehler:</Text>
        <TouchableOpacity 
            style={[styles.mistakeButton, mistakesCount === 0 && styles.mistakeButtonDisabled]} 
            onPress={startMistakePractice}
            disabled={mistakesCount === 0}
        >
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="bandage" size={24} color={mistakesCount > 0 ? "#ff4444" : "#ccc"} style={{marginRight: 10}}/>
                <Text style={[styles.mistakeButtonText, mistakesCount === 0 && {color: '#999'}]}>
                    Fehler von heute üben ({mistakesCount})
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={mistakesCount > 0 ? "#333" : "#ccc"} />
        </TouchableOpacity>

        {/* --- LEKTIONEN AUSWAHL --- */}
        <Text style={styles.sectionTitle}>Lektionen auswählen:</Text>
        <View style={styles.card}>
          {courseData.units.map((unit, uIndex) => {
              
              // Prüfen ob Unit generell freigeschaltet ist
              const isUnitUnlocked = uIndex === 0 || examScores[courseData.units[uIndex - 1].id];
              
              if (!isUnitUnlocked) return null;

              return (
                  <View key={unit.id} style={{marginBottom: 15}}>
                      <View style={{backgroundColor: '#f0f0f0', padding: 8, borderRadius: 8, marginBottom: 5}}>
                          <Text style={{fontWeight: 'bold', color: '#555'}}>{unit.title}</Text>
                      </View>
                      
                      {unit.levels.map((level, lIndex) => {
                          // Prüfen ob Level freigeschaltet ist
                          // Logik: Erstes Level immer offen (wenn Unit offen), sonst muss vorheriges Level > 0 sein
                          const isLevelUnlocked = lIndex === 0 || (scores[unit.levels[lIndex - 1].id] || 0) > 0;
                          
                          if (!isLevelUnlocked) return null;

                          return (
                            <View key={level.id} style={styles.row}>
                                <Text style={styles.label}>{level.title}</Text>
                                <Switch 
                                value={!!selectedLessons[level.id]} 
                                onValueChange={() => toggleLesson(level.id)}
                                trackColor={{ false: "#eee", true: "#58cc02" }}
                                />
                            </View>
                          );
                      })}
                  </View>
              );
          })}
          {/* Fallback falls alles leer ist (z.B. ganz am Anfang) */}
          <Text style={{textAlign: 'center', color: '#999', fontSize: 12, padding: 10}}>
              Schalte mehr Lektionen frei, um sie hier zu üben.
          </Text>
        </View>

        {/* --- ANZAHL FRAGEN --- */}
        <Text style={styles.sectionTitle}>Anzahl der Fragen:</Text>
        <View style={styles.countContainer}>
          {[5, 10, 20, 30].map(num => (
            <TouchableOpacity 
              key={num} 
              style={[styles.countButton, questionCount === num && styles.countButtonSelected]}
              onPress={() => setQuestionCount(num)}
            >
              <Text style={[styles.countText, questionCount === num && styles.countTextSelected]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.startButton} onPress={startPractice}>
          <Text style={styles.startButtonText}>TRAINING STARTEN</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 50 : 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subTitle: { fontSize: 16, color: '#777', marginTop: 5 },
  content: { padding: 20, paddingBottom: 50 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#444', marginBottom: 10, marginTop: 10 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9f9f9', paddingHorizontal: 5 },
  label: { fontSize: 16, color: '#333' },
  
  countContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  countButton: { flex: 1, backgroundColor: '#fff', marginHorizontal: 5, paddingVertical: 15, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#e5e5e5' },
  countButtonSelected: { borderColor: '#58cc02', backgroundColor: '#ddf4ff' },
  countText: { fontSize: 18, fontWeight: 'bold', color: '#777' },
  countTextSelected: { color: '#58cc02' },
  
  startButton: { backgroundColor: '#58cc02', padding: 18, borderRadius: 16, alignItems: 'center', elevation: 3, marginBottom: 40 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  mistakeButton: { 
      backgroundColor: '#fff', padding: 16, borderRadius: 16, 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderWidth: 2, borderColor: '#ffdfe0', marginBottom: 10
  },
  mistakeButtonDisabled: { borderColor: '#eee', backgroundColor: '#f9f9f9' },
  mistakeButtonText: { fontSize: 16, fontWeight: 'bold', color: '#d63031' }
});