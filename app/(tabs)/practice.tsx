import { Colors } from '@/app/src/constants/theme'; // NEU: Zentrales Theme
import { useColorScheme } from '@/app/src/hooks/useColorScheme';
import { useUserProgress } from '@/app/src/hooks/useUserProgress'; // NEU: Zentraler Hook
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/context/ThemeContext';
import content from '../src/data/content.json';

const courseData = content.courses[0];

export default function PracticeScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme(); 
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light']; // NEU: Einfacher Zugriff
  
  // LOGIK VEREINFACHT:
  const { scores, examScores, mistakesCount } = useUserProgress();
  
  const [selectedLessons, setSelectedLessons] = useState<Record<string, boolean>>({});
  const [questionCount, setQuestionCount] = useState(10);

  const toggleLesson = (id: string) => {
    setSelectedLessons(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  const startPractice = async () => {
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

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const practiceSession = pool.slice(0, questionCount);
    try {
      await AsyncStorage.setItem('currentPracticeSession', JSON.stringify(practiceSession));
      router.push({ pathname: "/lesson", params: { id: 'practice' } });
    } catch (e) { console.error(e); }
  };

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Training 💪</Text>
        <Text style={[styles.subTitle, { color: theme.subText }]}>Wiederhole bekannte Lektionen</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Tages-Fehler:</Text>
        <TouchableOpacity 
            style={[
                styles.mistakeButton, 
                { backgroundColor: theme.mistakeBtnBg, borderColor: theme.mistakeBtnBorder },
                mistakesCount === 0 && { opacity: 0.6, backgroundColor: theme.background, borderColor: theme.border }
            ]} 
            onPress={startMistakePractice}
            disabled={mistakesCount === 0}
        >
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name="bandage" size={24} color={mistakesCount > 0 ? "#ff4444" : theme.icon} style={{marginRight: 10}}/>
                <Text style={[styles.mistakeButtonText, mistakesCount === 0 && {color: theme.subText}]}>
                    Fehler von heute üben ({mistakesCount})
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.icon} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Lektionen auswählen:</Text>
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
          <Text style={{textAlign: 'center', color: theme.subText, fontSize: 12, padding: 10}}>
              Schalte mehr Lektionen frei, um sie hier zu üben.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.sectionTitle }]}>Anzahl der Fragen:</Text>
        <View style={styles.countContainer}>
          {[5, 10, 20, 30].map(num => (
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

        <TouchableOpacity style={styles.startButton} onPress={startPractice}>
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
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  card: { borderRadius: 16, padding: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, paddingHorizontal: 5 },
  label: { fontSize: 16 },
  countContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  countButton: { flex: 1, marginHorizontal: 5, paddingVertical: 15, borderRadius: 12, alignItems: 'center', borderWidth: 2 },
  countText: { fontSize: 18, fontWeight: 'bold' },
  countTextSelected: { color: '#58cc02' },
  startButton: { backgroundColor: '#58cc02', padding: 18, borderRadius: 16, alignItems: 'center', elevation: 3, marginBottom: 40 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  mistakeButton: { 
      padding: 16, borderRadius: 16, 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      borderWidth: 2, marginBottom: 10
  },
  mistakeButtonText: { fontSize: 16, fontWeight: 'bold', color: '#d63031' }
});