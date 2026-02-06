import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
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
  
  const [scores, setScores] = useState({});
  const [toastMessage, setToastMessage] = useState(null); // Für das Popup

  // Daten laden, wenn der Screen sichtbar wird
  useFocusEffect(
    useCallback(() => {
      const loadProgress = async () => {
        try {
          const savedScores = await AsyncStorage.getItem('lessonScores');
          if (savedScores) {
            setScores(JSON.parse(savedScores));
          }
        } catch (e) { console.error(e); }
      };
      loadProgress();
    }, [])
  );

  // RESET FUNKTION
  const resetProgress = () => {
    Alert.alert(
      "Fortschritt zurücksetzen",
      "Möchtest du wirklich wieder bei Null anfangen?",
      [
        { text: "Abbrechen", style: "cancel" },
        { 
          text: "Zurücksetzen", 
          style: "destructive", 
          onPress: async () => {
            await AsyncStorage.removeItem('lessonScores');
            await AsyncStorage.removeItem('completedLessons'); // Sicherheitshalber auch das alte löschen
            setScores({});
          }
        }
      ]
    );
  };

  // POPUP FUNKTION (Toast)
  const showLockedMessage = () => {
    setToastMessage("Hole erst mind. 1 Stern in der vorherigen Lektion! ⭐");
    // Nach 2,5 Sekunden wieder ausblenden
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER: Titel + Reset Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aprender Português 🇵🇹</Text>
        
        <TouchableOpacity onPress={resetProgress} style={styles.resetButton}>
           <Ionicons name="refresh" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.pathContainer}>
        {courseData.lessons.map((lesson, index) => {
          
          const lessonScore = scores[lesson.id] || 0;
          
          // Logik: Lektion 1 ist immer frei. Andere brauchen > 0 Punkte im Vorgänger.
          const isUnlocked = index === 0 || (scores[courseData.lessons[index - 1].id] > 0);
          const isGold = lessonScore === 3;

          return (
            <View key={lesson.id} style={styles.lessonRow}>
              <TouchableOpacity 
                style={[
                  styles.lessonButton, 
                  { backgroundColor: isUnlocked ? lesson.color : '#e5e5e5' },
                  isGold && styles.goldBorder
                ]}
                // WICHTIG: Wir deaktivieren den Button NICHT (kein disabled prop),
                // damit wir den Klick abfangen können für die Nachricht.
                activeOpacity={0.7}
                onPress={() => {
                   if (isUnlocked) {
                     router.push({ pathname: "/lesson", params: { id: lesson.id } });
                   } else {
                     showLockedMessage(); // Zeige Popup
                   }
                }}
              >
                <Ionicons 
                    name={isUnlocked ? (isGold ? "trophy" : "star") : "lock-closed"} 
                    size={32} 
                    color={isUnlocked ? "#fff" : "#aaa"} 
                />
              </TouchableOpacity>
              
              <Text style={[styles.lessonTitle, !isUnlocked && {color: '#ccc'}]}>
                {lesson.title}
              </Text>
              
              {/* Sterne Anzeige */}
              {isUnlocked && lessonScore > 0 && (
                <View style={{flexDirection: 'row', marginTop: 4}}>
                   {[1, 2, 3].map(s => (
                       <Ionicons 
                         key={s} 
                         name="star" 
                         size={14} 
                         color={s <= lessonScore ? "#FFD700" : "#eee"} 
                       />
                   ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* DAS POPUP (TOAST) - Schwebt unten über allem */}
      {toastMessage && (
        <View style={styles.toastContainer}>
           <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  
  // Header Styles angepasst
  header: { 
    padding: 20, 
    paddingTop: Platform.OS === 'android' ? 50 : 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0', 
    flexDirection: 'row', // Nebeneinander
    justifyContent: 'space-between', // Platz dazwischen
    alignItems: 'center' 
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  resetButton: { padding: 5 },

  pathContainer: { paddingVertical: 40, alignItems: 'center' },
  lessonRow: { marginBottom: 30, alignItems: 'center' },
  
  lessonButton: { 
    width: 80, height: 80, borderRadius: 40, 
    justifyContent: 'center', alignItems: 'center', 
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, shadowRadius: 4, marginBottom: 10 
  },
  goldBorder: { borderWidth: 4, borderColor: '#FFD700' },
  lessonTitle: { fontSize: 18, fontWeight: 'bold', color: '#444' },

  // Toast Styles (Das schwebende Popup)
  toastContainer: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(50, 50, 50, 0.9)', // Dunkelgrau, leicht transparent
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    zIndex: 100, // Ganz oben
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  }
});