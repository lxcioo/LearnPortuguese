import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <--- AsyncStorage dazu
import { useFocusEffect, useRouter } from 'expo-router'; // <--- useFocusEffect dazu
import React, { useCallback, useState } from 'react'; // <--- useCallback dazu
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { courseData } from '../../data';

export default function PathScreen() {
  const router = useRouter();
  const [completedLessons, setCompletedLessons] = useState([]);

// Wird jedes Mal ausgeführt, wenn der Screen sichtbar wird
useFocusEffect(
  useCallback(() => {
    const loadProgress = async () => {
      try {
        const data = await AsyncStorage.getItem('completedLessons');
        if (data) {
          setCompletedLessons(JSON.parse(data));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadProgress();
  }, [])
);

  // Funktion zum Starten einer Lektion
  const startLesson = (lessonId) => {
    // Navigiere zur Datei 'lesson' und übergebe die ID
    router.push({ pathname: "/lesson", params: { id: lessonId } });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.flag}>🇵🇹</Text>
        <Text style={styles.courseTitle}>{courseData.title}</Text>
        {/* Temporärer Reset Button */}
        <TouchableOpacity onPress={async () => {
          await AsyncStorage.clear();
          setCompletedLessons([]); // UI sofort leeren
          alert("Fortschritt zurückgesetzt!");
        }}>
          <Ionicons name="trash-outline" size={24} color="red" style={{marginLeft: 20}}/>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Der Pfad */}
        <View style={styles.pathContainer}>
          
          {courseData.lessons.map((lesson, index) => {
            // "Schlängeln" Logik: Wir schieben Buttons nach links oder rechts
            // Index 0: Mitte, 1: Links, 2: Mitte, 3: Rechts, ...
            let marginLeft = 0;
            if (index % 4 === 1) marginLeft = -60; // Links
            if (index % 4 === 3) marginLeft = 60;  // Rechts

            return (
              <View key={lesson.id} style={{ alignItems: 'center', marginLeft: marginLeft, marginBottom: 40 }}>
                
{/* Logik: Ist die Lektion fertig? */}
                {(() => {
                  const isCompleted = completedLessons.includes(lesson.id);
                  const buttonColor = isCompleted ? '#ffc800' : (lesson.color || '#58cc02'); // Gold oder Originalfarbe

                  return (
                    <TouchableOpacity 
                      style={[styles.circleButton, { backgroundColor: buttonColor }]} 
                      onPress={() => startLesson(lesson.id)}
                      activeOpacity={0.7}
                    >
                      {/* Wenn fertig: Haken, sonst Stern */}
                      <Ionicons name={isCompleted ? "checkmark-outline" : "star"} size={32} color="white" />
                    </TouchableOpacity>
                  );
                })()}

                {/* Titel unter dem Button */}
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                
              </View>
            );
          })}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  header: { 
    padding: 15, borderBottomWidth: 1, borderColor: '#f0f0f0', 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center' 
  },
  flag: { fontSize: 30, marginRight: 10 },
  courseTitle: { fontSize: 20, fontWeight: 'bold', color: '#afafaf', textTransform: 'uppercase' },
  
  scrollContent: { paddingVertical: 50 },
  pathContainer: { alignItems: 'center' },
  
  circleButton: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    // 3D Effekt (Schatten unten)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 8, // Für Android Schatten
    borderBottomWidth: 6,
    borderBottomColor: 'rgba(0,0,0,0.2)', // Dunklerer Rand unten
    marginBottom: 10,
  },
  lessonTitle: { fontSize: 16, fontWeight: 'bold', color: '#4b4b4b' },
});