import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type FinishScreenProps = {
  isPractice?: boolean;
  earnedStars: number;
  onGoBack: () => void;
  backgroundColor: string;
};

export function FinishScreen({ isPractice, earnedStars, onGoBack, backgroundColor }: FinishScreenProps) {
  return (
    <SafeAreaView style={[styles.container, styles.centerContent, { backgroundColor }]}>
      <Text style={styles.finishTitle}>{isPractice ? "Training beendet!" : "Lektion beendet!"}</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3].map((star, index) => (
          <Animated.View key={star} entering={ZoomIn.delay(index * 200).springify()}>
            <Ionicons name={star <= (earnedStars ?? 0) ? "star" : "star-outline"} size={60} color="#FFD700" />
          </Animated.View>
        ))}
      </View>
      <TouchableOpacity style={styles.checkButton} onPress={onGoBack}>
        <Text style={styles.checkButtonText}>ZUR ÜBERSICHT</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  finishTitle: { fontSize: 32, fontWeight: 'bold', color: '#58cc02', marginBottom: 20, textAlign: 'center' },
  starsContainer: { flexDirection: 'row', marginBottom: 30, gap: 10, justifyContent: 'center' },
  checkButton: { backgroundColor: '#58cc02', padding: 16, borderRadius: 16, alignItems: 'center', width: '90%' },
  checkButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
});