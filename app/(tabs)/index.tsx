import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import content from '../../content.json';

const courseData = content.courses[0];

export default function PathScreen() {
  const router = useRouter();
  
  // Wir speichern jetzt scores: { "l1": 3, "l2": 1 }
  const [scores, setScores] = useState({});

  useFocusEffect(
    useCallback(() => {
      const loadProgress = async () => {
        try {
          // Lade die Punkte
          const savedScores = await AsyncStorage.getItem('lessonScores');
          if (savedScores) {
            setScores(JSON.parse(savedScores));
          }
        } catch (e) {
          console.error(e);
        }
      };
      loadProgress();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{courseData.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.pathContainer}>
        {courseData.lessons.map((lesson, index) => {
          
          // Eine Lektion gilt als "bestanden/angefangen", wenn sie einen Score > 0 hat
          // oder wenn es die allererste Lektion ist (die ist immer offen)
          // oder wenn die vorherige Lektion bestanden wurde (Score > 0).
          
          const lessonScore = scores[lesson.id] || 0;
          
          // Logik zum Freischalten:
          // Lektion 1 ist immer frei.
          // Lektion 2 ist frei, wenn Lektion 1 Score > 0 hat.
          const isUnlocked = index === 0 || (scores[courseData.lessons[index - 1].id] > 0);
          
          // Wenn man 3 Sterne hat, ist sie "Gold" abgeschlossen
          const isGold = lessonScore === 3;

          return (
            <View key={lesson.id} style={styles.lessonRow}>
              <TouchableOpacity 
                style={[
                  styles.lessonButton, 
                  { backgroundColor: isUnlocked ? lesson.color : '#e5e5e5' },
                  isGold && styles.goldBorder // Goldener Rand bei 3 Sternen
                ]}
                onPress={() => {
                   if (isUnlocked) router.push({ pathname: "/lesson", params: { id: lesson.id } });
                }}
                disabled={!isUnlocked}
              >
                <Ionicons 
                    name={isGold ? "trophy" : "star"} 
                    size={32} 
                    color="#fff" 
                />
              </TouchableOpacity>
              
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              
              {/* Sterne Anzeige unter dem Titel */}
              {isUnlocked && lessonScore > 0 && (
                <View style={{flexDirection: 'row', marginTop: 4}}>
                   {[1, 2, 3].map(s => (
                       <Ionicons 
                         key={s} 
                         name="star" 
                         size={14} 
                         color={s <= lessonScore ? "#FFD700" : "#ddd"} 
                       />
                   ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 50 : 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  pathContainer: { paddingVertical: 40, alignItems: 'center' },
  lessonRow: { marginBottom: 30, alignItems: 'center' },
  lessonButton: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, marginBottom: 10 },
  goldBorder: { borderWidth: 4, borderColor: '#FFD700' },
  lessonTitle: { fontSize: 18, fontWeight: 'bold', color: '#444' },
});