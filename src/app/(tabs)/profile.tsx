import { AchievementsSection } from '@/src/view/components/profile/AchievementsSection';
import { Colors } from '@/src/view/constants/theme';
import { useTheme } from '@/src/view/context/ThemeContext';
import { useProfileViewModel } from '@/src/viewmodel/useProfileViewModel';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ==========================================
// VIEW
// ==========================================
// A "dumb" component that only displays data from the ViewModel.
export default function ProfileScreen() {
  const { theme } = useTheme();
  const currentColors = Colors[theme];
  const { profile, studentTitle, levelInfo, dailyStats, achievements, actions } = useProfileViewModel();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>Profil</Text>
        <Ionicons name="settings-outline" size={28} color={currentColors.text} onPress={actions.navigateToSettings} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.userInfoContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.name?.trim()?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: currentColors.text }]}>{profile?.name?.trim() || 'Gast'}</Text>
          <Text style={{ color: currentColors.icon }}>Level {levelInfo.currentLevel} {studentTitle}</Text>
        </View>

        {/* LEVEL ANZEIGE */}
        <View style={[styles.card, { backgroundColor: theme === 'dark' ? '#222' : '#f9f9f9' }]}>
          <View style={styles.levelHeader}>
            <Text style={[styles.cardTitle, { color: currentColors.text }]}>Level {levelInfo.currentLevel}</Text>
            <Text style={{ color: currentColors.icon }}>{levelInfo.currentLevelXP} / {levelInfo.xpForNextLevel} XP</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${levelInfo.progressPercent}%` }]} />
          </View>
          <Text style={styles.progressHint}>Noch {levelInfo.xpForNextLevel - levelInfo.currentLevelXP} XP bis Level {levelInfo.currentLevel + 1}!</Text>
        </View>

        {/* STATISTIK HEUTE */}
        <Text style={[styles.sectionTitle, { color: currentColors.icon, marginTop: 10 }]}>STATISTIK HEUTE</Text>
        <View style={[styles.card, { backgroundColor: theme === 'dark' ? '#222' : '#f9f9f9', flexDirection: 'row', alignItems: 'flex-end', height: 120, justifyContent: 'space-around', paddingBottom: 20 }]}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 40, height: dailyStats.wordsLearnedHeight, backgroundColor: '#58cc02', minHeight: 10, borderRadius: 5 }} />
            <Text style={{ color: currentColors.icon, marginTop: 5 }}>Erfolge</Text>
            <Text style={{ fontWeight: 'bold', color: currentColors.text }}>{dailyStats.wordsLearned}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 40, height: dailyStats.mistakesMadeHeight, backgroundColor: '#ff4757', minHeight: 10, borderRadius: 5 }} />
            <Text style={{ color: currentColors.icon, marginTop: 5 }}>Fehler</Text>
            <Text style={{ fontWeight: 'bold', color: currentColors.text }}>{dailyStats.mistakesMade}</Text>
          </View>
        </View>

        {/* ERRUNGENSCHAFTEN */}
        <AchievementsSection achievements={achievements} theme={theme} colors={currentColors} />

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
});