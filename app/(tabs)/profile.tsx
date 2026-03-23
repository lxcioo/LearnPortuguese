import { Colors } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { useUserProgress } from '@/src/hooks/useUserProgress';
import { StorageService } from '@/src/services/StorageService';
import { Achievement, UserProfile } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { theme, gender } = useTheme();
  const currentColors = Colors[theme];
  const { scores, streak } = useUserProgress();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      StorageService.getUserProfile().then(setProfile);
    }, [])
  );

  // --- LOGIK: Fortschritt & Level (Mit Absturzsicherung) ---
  const safeScores = scores || {};
  const totalStars = Object.values(safeScores).reduce<number>((sum, stars) => sum + (typeof stars === 'number' ? stars : 0), 0);
  const safeStreak = typeof streak === 'number' ? streak : 0;
  const totalXP = (totalStars * 10) + (safeStreak * 5);
  
  const currentLevel = Math.floor(totalXP / 100) + 1;
  const xpForNextLevel = 100;
  const currentLevelXP = totalXP % 100;
  const progressPercent = (currentLevelXP / xpForNextLevel) * 100;

  // --- LOGIK: Gendern ---
  let studentTitle = 'Portugiesisch-Schüler';
  if (gender === 'f') studentTitle = 'Portugiesisch-Schülerin';
  if (gender === 'd') studentTitle = 'Portugiesisch-Schüler*in';

  // --- LOGIK: Errungenschaften ---
  const achievements: Achievement[] = [
    {
      id: 'first_steps',
      title: 'Erste Schritte',
      description: 'Schließe deine erste Lektion ab.',
      icon: 'footsteps',
      isUnlocked: Object.keys(safeScores).length > 0,
    },
    {
      id: 'perfectionist',
      title: 'Perfektionist',
      description: 'Hole 3 Sterne in einer Lektion.',
      icon: 'star',
      isUnlocked: Object.values(safeScores).some(stars => stars === 3),
    },
    {
      id: 'on_fire',
      title: 'Feuer & Flamme',
      description: 'Erreiche eine 7-Tage-Lernserie.',
      icon: 'flame',
      isUnlocked: safeStreak >= 7,
    }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>Profil</Text>
        <Ionicons 
          name="settings-outline" 
          size={28} 
          color={currentColors.text} 
          onPress={() => router.push('/settings_modal')} 
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.userInfoContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.name?.trim() ? profile.name.trim().charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: currentColors.text }]}>{profile?.name?.trim() || 'Gast'}</Text>
          <Text style={{ color: currentColors.icon }}>Level {currentLevel} {studentTitle}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme === 'dark' ? '#222' : '#f9f9f9' }]}>
          <View style={styles.levelHeader}>
            <Text style={[styles.cardTitle, { color: currentColors.text }]}>Level {currentLevel}</Text>
            <Text style={{ color: currentColors.icon }}>{currentLevelXP} / {xpForNextLevel} XP</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressHint}>Noch {xpForNextLevel - currentLevelXP} XP bis Level {currentLevel + 1}!</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: currentColors.icon, marginTop: 20 }]}>ERRUNGENSCHAFTEN</Text>
        <View style={styles.achievementsGrid}>
          {achievements.map((ach) => (
            <View key={ach.id} style={[styles.achievementCard, { backgroundColor: theme === 'dark' ? '#222' : '#f9f9f9', opacity: ach.isUnlocked ? 1 : 0.5 }]}>
              <View style={[styles.iconWrapper, { backgroundColor: ach.isUnlocked ? '#58cc02' : '#ccc' }]}>
                <Ionicons name={ach.icon as any} size={24} color="#fff" />
              </View>
              <Text style={[styles.achTitle, { color: currentColors.text }]}>{ach.title}</Text>
              <Text style={styles.achDesc} numberOfLines={3}>{ach.description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  content: { padding: 20 },
  userInfoContainer: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#58cc02', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  card: { padding: 20, borderRadius: 16, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'flex-end' },
  progressBarBackground: { height: 12, backgroundColor: '#e0e0e0', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#58cc02', borderRadius: 6 },
  progressHint: { fontSize: 13, color: '#999', marginTop: 10, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 15, marginLeft: 5 },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  achievementCard: { width: '48%', padding: 15, borderRadius: 16, alignItems: 'center', marginBottom: 15 },
  iconWrapper: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  achTitle: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  achDesc: { fontSize: 12, color: '#999', textAlign: 'center' }
});