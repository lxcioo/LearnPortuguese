import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export function useUserProgress() {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [examScores, setExamScores] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Scores laden
      const savedScores = await AsyncStorage.getItem('lessonScores');
      setScores(savedScores ? JSON.parse(savedScores) : {});

      // 2. Prüfungen laden
      const savedExams = await AsyncStorage.getItem('examScores');
      setExamScores(savedExams ? JSON.parse(savedExams) : {});

      // 3. Streak berechnen
      const streakDataStr = await AsyncStorage.getItem('streakData');
      if (streakDataStr) {
        const { currentStreak, lastStreakDate } = JSON.parse(streakDataStr);
        const today = new Date().toDateString();
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastStreakDate === today || lastStreakDate === yesterday.toDateString()) {
            setStreak(currentStreak);
        } else {
            setStreak(0);
        }
      } else {
        setStreak(0);
      }

      // 4. Tagesfehler laden
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
          setMistakesCount(0);
      }

    } catch (e) {
      console.error("Fehler beim Laden des Fortschritts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lädt Daten neu, wenn der Screen den Fokus bekommt
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return { scores, examScores, streak, mistakesCount, loading, reload: loadData };
}