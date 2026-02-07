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

const courseData = content.courses[0];

export default function PracticeScreen() {
  const router = useRouter();
  
  // FIX: Typen hinzugefügt
  const [scores, setScores] = useState<Record<string, number>>({});
  const [selectedLessons, setSelectedLessons] = useState<Record<string, boolean>>({});
  const [questionCount, setQuestionCount] = useState(10);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const savedScores = await AsyncStorage.getItem('lessonScores');
        if (savedScores) setScores(JSON.parse(savedScores));
      };
      loadData();
    }, [])
  );

  // FIX: Parameter Typ (string)
  const toggleLesson = (id: string) => {
    setSelectedLessons(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const startPractice = async () => {
    // FIX: Wir sagen, pool ist eine Liste von "irgendwas" (any[])
    let pool: any[] = [];
    courseData.lessons.forEach(lesson => {
      if (selectedLessons[lesson.id]) {
        pool = [...pool, ...lesson.exercises];
      }
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
        <Text style={styles.sectionTitle}>Lektionen auswählen:</Text>
        <View style={styles.card}>
          {courseData.lessons.map((lesson, index) => {
            const isUnlocked = index === 0 || (scores[courseData.lessons[index - 1].id] > 0);
            
            if (!isUnlocked) return null;

            return (
              <View key={lesson.id} style={styles.row}>
                <Text style={styles.label}>{lesson.title}</Text>
                <Switch 
                  value={!!selectedLessons[lesson.id]} 
                  onValueChange={() => toggleLesson(lesson.id)}
                  trackColor={{ false: "#eee", true: "#58cc02" }}
                />
              </View>
            );
          })}
        </View>

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
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#444', marginBottom: 10, marginTop: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingHorizontal: 10 },
  label: { fontSize: 16, color: '#333' },
  countContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  countButton: { flex: 1, backgroundColor: '#fff', marginHorizontal: 5, paddingVertical: 15, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#e5e5e5' },
  countButtonSelected: { borderColor: '#58cc02', backgroundColor: '#ddf4ff' },
  countText: { fontSize: 18, fontWeight: 'bold', color: '#777' },
  countTextSelected: { color: '#58cc02' },
  startButton: { backgroundColor: '#58cc02', padding: 18, borderRadius: 16, alignItems: 'center', elevation: 3 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});