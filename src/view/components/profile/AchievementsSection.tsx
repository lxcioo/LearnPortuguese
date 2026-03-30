import { Achievement } from '@/src/model/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AchievementsSectionProps = {
  achievements: Achievement[];
  theme: 'light' | 'dark';
  colors: {
    text: string;
    icon: string;
  };
};

export function AchievementsSection({ achievements, theme, colors }: AchievementsSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAll(!showAll);
  };

  const visibleAchievements = showAll ? achievements : achievements.slice(0, 4);

  return (
    <>
      <Text style={[styles.sectionTitle, { color: colors.icon }]}>ERRUNGENSCHAFTEN</Text>
      <View style={styles.achievementsGrid}>
        {visibleAchievements.map((ach) => (
          <View key={ach.id} style={[styles.achievementCard, { backgroundColor: theme === 'dark' ? '#222' : '#f9f9f9', opacity: ach.isUnlocked ? 1 : 0.5 }]}>
            <View style={[styles.iconWrapper, { backgroundColor: ach.isUnlocked ? '#58cc02' : '#ccc' }]}>
              <Ionicons name={ach.icon as any} size={24} color="#fff" />
            </View>
            <Text style={[styles.achTitle, { color: colors.text }]}>{ach.title}</Text>
            <Text style={styles.achDesc} numberOfLines={3}>{ach.description}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.expandBtn, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]} onPress={toggle}>
        <Text style={{ color: colors.text, fontWeight: 'bold' }}>
          {showAll ? 'Weniger anzeigen' : `Alle ${achievements.length} anzeigen`}
        </Text>
        <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} style={{ marginLeft: 5 }} />
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 15, marginLeft: 5, marginTop: 10 },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  achievementCard: { width: '48%', padding: 15, borderRadius: 16, alignItems: 'center', marginBottom: 15 },
  iconWrapper: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  achTitle: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  achDesc: { fontSize: 12, color: '#999', textAlign: 'center' },
  expandBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 12, marginTop: 5 }
});