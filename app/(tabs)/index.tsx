import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert, Image,
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
  const [toastMessage, setToastMessage] = useState(null);

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

  // --- DIE NEUE RESET LOGIK (Funktioniert auch im Browser) ---
  const performReset = async () => {
    await AsyncStorage.removeItem('lessonScores');
    await AsyncStorage.removeItem('completedLessons');
    setScores({});
  };

  const resetProgress = () => {
    // Spezial-Fall für Web Browser
    if (Platform.OS === 'web') {
        const confirm = window.confirm("Möchtest du wirklich den gesamten Fortschritt löschen?");
        if (confirm) {
            performReset();
        }
    } else {
        // Normaler Fall für Handy (iOS/Android)
        Alert.alert(
          "Fortschritt löschen",
          "Möchtest du wirklich wieder bei Null anfangen?",
          [
            { text: "Abbrechen", style: "cancel" },
            { 
              text: "Löschen", 
              style: "destructive", 
              onPress: performReset 
            }
          ]
        );
    }
  };

  const showLockedMessage = () => {
    setToastMessage("Hole erst mind. 1 Stern in der vorherigen Lektion! ⭐");
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.headerTitle}>Aprender Português</Text>
            {/* Echte Bild-Flagge statt Emoji (Windows Fix) */}
            <Image 
                source={{ uri: 'https://flagcdn.com/w80/pt.png' }} 
                style={styles.flagImage}
            />
        </View>
        
        {/* Mülleimer Icon für Reset */}
        <TouchableOpacity onPress={resetProgress} style={styles.resetButton}>
           <Ionicons name="trash-outline" size={24} color="#ff4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.pathContainer}>
        {courseData.lessons.map((lesson, index) => {
          
          const lessonScore = scores[lesson.id] || 0;
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
                activeOpacity={0.7}
                onPress={() => {
                   if (isUnlocked) {
                     router.push({ pathname: "/lesson", params: { id: lesson.id } });
                   } else {
                     showLockedMessage();
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
  
  header: { 
    padding: 20, 
    paddingTop: Platform.OS === 'android' ? 50 : 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginRight: 10 },
  flagImage: { width: 30, height: 20, borderRadius: 3 }, // Style für die Flagge
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

  toastContainer: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(50, 50, 50, 0.9)', 
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    zIndex: 100, 
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  }
});