import { Achievement } from '@/src/model/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { LayoutAnimation, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

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
  const [selectedAch, setSelectedAch] = useState<Achievement | null>(null);

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
          <TouchableOpacity 
            key={ach.id} 
            style={[styles.achievementCard, { backgroundColor: theme === 'dark' ? '#222' : '#f9f9f9', opacity: ach.isUnlocked ? 1 : 0.5 }]}
            onPress={() => setSelectedAch(ach)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, { backgroundColor: ach.isUnlocked ? '#58cc02' : '#ccc' }]}>
              <Ionicons name={ach.icon as any} size={24} color="#fff" />
            </View>
            <Text style={[styles.achTitle, { color: colors.text }]}>{ach.title}</Text>
            <Text style={styles.achDesc} numberOfLines={3}>{ach.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.expandBtn, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]} onPress={toggle}>
        <Text style={{ color: colors.text, fontWeight: 'bold' }}>
          {showAll ? 'Weniger anzeigen' : `Alle ${achievements.length} anzeigen`}
        </Text>
        <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text} style={{ marginLeft: 5 }} />
      </TouchableOpacity>

      {/* DETAIL MODAL */}
      <Modal visible={!!selectedAch} transparent={true} animationType="fade" onRequestClose={() => setSelectedAch(null)}>
        <TouchableWithoutFeedback onPress={() => setSelectedAch(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme === 'dark' ? '#1C1C1E' : '#FFFFFF' }]}>
                
                <View style={[styles.modalIconWrapper, { backgroundColor: selectedAch?.isUnlocked ? '#58cc02' : '#ccc' }]}>
                  <Ionicons name={selectedAch?.icon as any} size={50} color="#fff" />
                </View>
                
                <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedAch?.title}</Text>
                <Text style={[styles.modalDesc, { color: colors.icon }]}>{selectedAch?.description}</Text>
                
                <View style={[styles.statusContainer, { backgroundColor: theme === 'dark' ? '#333' : '#f0f0f0' }]}>
                  {selectedAch?.isUnlocked ? (
                    <>
                      <Ionicons name="checkmark-circle" size={24} color="#58cc02" />
                      <Text style={[styles.statusText, { color: '#58cc02' }]}>
                        Freigeschaltet {selectedAch?.unlockedAt ? `am ${selectedAch.unlockedAt}` : ''}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={24} color="#999" />
                      <Text style={[styles.statusText, { color: '#999' }]}>Noch nicht erreicht</Text>
                    </>
                  )}
                </View>

                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedAch(null)}>
                  <Text style={styles.closeModalText}>Schließen</Text>
                </TouchableOpacity>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  expandBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 12, marginTop: 5 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 340, padding: 30, borderRadius: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 15, shadowOffset: { width: 0, height: 10 } },
  modalIconWrapper: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  modalDesc: { fontSize: 16, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, width: '100%', justifyContent: 'center' },
  statusText: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  closeModalBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#58cc02' },
  closeModalText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});