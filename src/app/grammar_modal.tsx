import content from '@/src/model/data/content'; // Passe den Pfad an, falls dein Content woanders liegt
import { Colors } from '@/src/view/constants/theme';
import { useTheme } from '@/src/view/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GrammarModal() {
  const { theme } = useTheme();
  const currentColors = Colors[theme];
  const router = useRouter();

  // Wir holen uns die ID des Kapitels, auf das geklickt wurde
  const { unitId } = useLocalSearchParams<{ unitId: string }>();

  // Wir suchen das passende Kapitel im Datenstamm
  const courseData = content.courses[0];
  const unit = courseData.units.find(u => u.id === unitId);

  if (!unit || !unit.grammarGuide) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]}>
        <Text style={{ color: currentColors.text, textAlign: 'center', marginTop: 50 }}>
          Keine Grammatik für dieses Kapitel gefunden.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentColors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={currentColors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentColors.text }]}>Tipps & Grammatik</Text>
        <View style={{ width: 28 }} /> {/* Platzhalter für Symmetrie */}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.unitTitle, { color: unit.color }]}>{unit.title}</Text>

        {unit.grammarGuide.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={[styles.sectionHeading, { color: currentColors.text }]}>{section.heading}</Text>
            <Text style={[styles.explanation, { color: currentColors.text }]}>{section.explanation}</Text>

            {section.examples && section.examples.length > 0 && (
              <View style={[styles.examplesContainer, { backgroundColor: theme === 'dark' ? '#222' : '#f0f5f0', borderColor: unit.color }]}>
                {section.examples.map((example, i) => (
                  <View key={i} style={styles.exampleRow}>
                    <Ionicons name="bulb-outline" size={16} color={unit.color} style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={[styles.exampleText, { color: currentColors.text }]}>{example}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Platzhalter am Ende zum bequemen Scrollen */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  closeBtn: { padding: 5, marginLeft: -5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  unitTitle: { fontSize: 24, fontWeight: '900', marginBottom: 25, textAlign: 'center' },
  section: { marginBottom: 30 },
  sectionHeading: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  explanation: { fontSize: 16, lineHeight: 24, marginBottom: 15 },
  examplesContainer: { padding: 15, borderRadius: 12, borderLeftWidth: 4 },
  exampleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  exampleText: { fontSize: 15, flex: 1, fontWeight: '500' }
});