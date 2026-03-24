import { Colors } from '@/src/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import { useUserProgress } from '@/src/hooks/useUserProgress';
import { StorageService } from '@/src/services/StorageService';
import { Achievement, UserProfile } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ProfileScreen() {
  const { theme, gender } = useTheme();
  const currentColors = Colors[theme];
  const { scores, streak, examScores, streakData } = useUserProgress();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dailyStats, setDailyStats] = useState({ wordsLearned: 0, mistakesMade: 0 });
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  useFocusEffect(
    useCallback(() => {
      StorageService.getUserProfile().then(setProfile);
      StorageService.getDailyStats().then(setDailyStats);
    }, [])
  );

  const safeScores = scores || {};
  const safeExamScores = examScores || {};

  const totalStars = Object.values(safeScores).reduce<number>((sum, stars) => sum + (typeof stars === 'number' ? stars : 0), 0);
  const safeStreak = typeof streak === 'number' ? streak : 0;
  const totalXP = (totalStars * 10) + (safeStreak * 5);

  const currentLevel = Math.floor(totalXP / 100) + 1;
  const xpForNextLevel = 100;
  const currentLevelXP = totalXP % 100;
  const progressPercent = (currentLevelXP / xpForNextLevel) * 100;

  let studentTitle = 'Portugiesisch-Schüler';
  if (gender === 'f') studentTitle = 'Portugiesisch-Schülerin';
  if (gender === 'd') studentTitle = 'Portugiesisch-Schüler*in';

  const completedLessonsCount = Object.keys(safeScores).length;
  const threeStarLessonsCount = Object.values(safeScores).filter(s => s === 3).length;
  const passedExamsCount = Object.keys(safeExamScores).length;
  const usedIce = streakData ? Object.values(streakData.history || {}).includes('frozen') : false;

  const achievements: Achievement[] = [
    { id: 'les_1', title: 'Erste Schritte', description: '1 Lektion abgeschlossen.', icon: 'footsteps', isUnlocked: completedLessonsCount >= 1 },
    { id: 'les_5', title: 'Aufwärmphase', description: '5 Lektionen abgeschlossen.', icon: 'walk', isUnlocked: completedLessonsCount >= 5 },
    { id: 'les_10', title: 'Fleißig', description: '10 Lektionen abgeschlossen.', icon: 'bicycle', isUnlocked: completedLessonsCount >= 10 },
    { id: 'les_25', title: 'Halbzeit', description: '25 Lektionen abgeschlossen.', icon: 'car', isUnlocked: completedLessonsCount >= 25 },
    { id: 'les_50', title: 'Lernmaschine', description: '50 Lektionen abgeschlossen.', icon: 'airplane', isUnlocked: completedLessonsCount >= 50 },
    { id: 'streak_7', title: 'Feuer & Flamme', description: '7-Tage-Lernserie.', icon: 'flame', isUnlocked: safeStreak >= 7 },
    { id: 'streak_14', title: 'Dranbleiber', description: '14-Tage-Lernserie.', icon: 'flame', isUnlocked: safeStreak >= 14 },
    { id: 'streak_30', title: 'Gewohnheitstier', description: '30-Tage-Lernserie.', icon: 'flame', isUnlocked: safeStreak >= 30 },
    { id: 'streak_50', title: 'Eiserner Wille', description: '50-Tage-Lernserie.', icon: 'flame', isUnlocked: safeStreak >= 50 },
    { id: 'streak_100', title: 'Hundert-Tage-Club', description: '100-Tage-Lernserie.', icon: 'flame', isUnlocked: safeStreak >= 100 },
    { id: 'streak_365', title: 'Ein ganzes Jahr!', description: '365-Tage-Lernserie.', icon: 'flame', isUnlocked: safeStreak >= 365 },
    { id: 'perf_1', title: 'Perfektionist', description: '1 Lektion mit 3 Sternen.', icon: 'star', isUnlocked: threeStarLessonsCount >= 1 },
    { id: 'perf_5', title: 'Streber', description: '5 Lektionen mit 3 Sternen.', icon: 'star', isUnlocked: threeStarLessonsCount >= 5 },
    { id: 'perf_10', title: 'Meisterhaft', description: '10 Lektionen mit 3 Sternen.', icon: 'star', isUnlocked: threeStarLessonsCount >= 10 },
    { id: 'perf_25', title: 'Makellos', description: '25 Lektionen mit 3 Sternen.', icon: 'star', isUnlocked: threeStarLessonsCount >= 25 },
    { id: 'stars_10', title: 'Sternensammler', description: 'Sammle insgesamt 10 Sterne.', icon: 'sparkles', isUnlocked: totalStars >= 10 },
    { id: 'stars_50', title: 'Sternenflotte', description: 'Sammle insgesamt 50 Sterne.', icon: 'sparkles', isUnlocked: totalStars >= 50 },
    { id: 'stars_100', title: 'Galaxie', description: 'Sammle insgesamt 100 Sterne.', icon: 'sparkles', isUnlocked: totalStars >= 100 },
    { id: 'exam_1', title: 'Prüfling', description: 'Bestehe 1 Prüfung.', icon: 'trophy', isUnlocked: passedExamsCount >= 1 },
    { id: 'exam_3', title: 'Experte', description: 'Bestehe 3 Prüfungen.', icon: 'trophy', isUnlocked: passedExamsCount >= 3 },
    { id: 'exam_5', title: 'Champion', description: 'Bestehe 5 Prüfungen.', icon: 'trophy', isUnlocked: passedExamsCount >= 5 },
    { id: 'ice', title: 'Gerettet!', description: 'Nutze eine Eisflamme um deinen Streak zu retten.', icon: 'snow', isUnlocked: usedIce }
  ];

  const visibleAchievements = showAllAchievements ? achievements : achievements.slice(0, 4);

  const toggleAchievements = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAllAchievements(!showAllAchievements);
  };

  const getMaxDaily = () => Math.max(1, dailyStats.wordsLearned, dailyStats.mistakesMade);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>Profil</Text>
        <Ionicons name="settings-outline" size={28} color={currentColors.text} onPress={() => router.push('/settings_modal')} />
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

        {/* LEVEL ANZEIGE */}
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

        {/* NEU HIER: STATISTIK HEUTE */}
        <Text style={[styles.sectionTitle, { color: currentColors.icon, marginTop: 10 }]}>STATISTIK HEUTE</Text>
        <View style={[styles.card, { backgroundColor: theme === 'dark' ? '#222' : '#f9f9f9', flexDirection: 'row', alignItems: 'flex-end', height: 120, justifyContent: 'space-around', paddingBottom: 20 }]}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 40, height: (dailyStats.wordsLearned / getMaxDaily()) * 100, backgroundColor: '#58cc02', minHeight: 10, borderRadius: 5 }} />
            <Text style={{ color: currentColors.icon, marginTop: 5 }}>Aktivität</Text>
            <Text style={{ fontWeight: 'bold', color: currentColors.text }}>{dailyStats.wordsLearned}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 40, height: (dailyStats.mistakesMade / getMaxDaily()) * 100, backgroundColor: '#ff4757', minHeight: 10, borderRadius: 5 }} />
            <Text style={{ color: currentColors.icon, marginTop: 5 }}>Fehler</Text>
            <Text style={{ fontWeight: 'bold', color: currentColors.text }}>{dailyStats.mistakesMade}</Text>
          </View>
        </View>

        {/* ERRUNGENSCHAFTEN */}
        <Text style={[styles.sectionTitle, { color: currentColors.icon, marginTop: 10 }]}>ERRUNGENSCHAFTEN</Text>
        <View style={styles.achievementsGrid}>
          {visibleAchievements.map((ach) => (
            <View key={ach.id} style={[styles.achievementCard, { backgroundColor: theme === 'dark' ? '#222' : '#f9f9f9', opacity: ach.isUnlocked ? 1 : 0.5 }]}>
              <View style={[styles.iconWrapper, { backgroundColor: ach.isUnlocked ? '#58cc02' : '#ccc' }]}>
                <Ionicons name={ach.icon as any} size={24} color="#fff" />
              </View>
              <Text style={[styles.achTitle, { color: currentColors.text }]}>{ach.title}</Text>
              <Text style={styles.achDesc} numberOfLines={3}>{ach.description}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[styles.expandBtn, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]} onPress={toggleAchievements}>
          <Text style={{ color: currentColors.text, fontWeight: 'bold' }}>
            {showAllAchievements ? 'Weniger anzeigen' : `Alle ${achievements.length} anzeigen`}
          </Text>
          <Ionicons name={showAllAchievements ? 'chevron-up' : 'chevron-down'} size={18} color={currentColors.text} style={{ marginLeft: 5 }} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
  achDesc: { fontSize: 12, color: '#999', textAlign: 'center' },
  expandBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 12, marginTop: 5 }
});