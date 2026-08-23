// src/components/JuzTracker.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const JUZ_NAMES = [
  'Alif-Lam-Mim','Sayaqūl','Tilkal-Rusul','Lan Tanalū','Wal-Muhsanāt',
  'Lā Yuhibbullāh','Wa Idha Sami\'ū','Wa Lau Annanā','Qāl-il-Mala\'','Wa-Alamu',
  'Ya\'tazerūna','Wa Mā Min Dābbah','Wa Mā Ubarri\'u','Rubamā','Subhānallazī',
  'Qāl Alam','Iqtaraba','Qad Aflaha','Wa Qālallazīna','A\'man Khalaq',
  'Utlu Mā Ūhiya','Wa Man Yaqnut','Wa Mā Liya','Famān Azlam','Ilahe Yuruddu',
  'Hā Mīm','Qāla Fama Khatbukum','Qad Sami\'allāh','Tabāraka-llazī','Amma',
];

export default function JuzTracker({ completedJuz: initialCompleted = [] }) {
  const { theme: T } = useTheme();
  const [completed, setCompleted] = useState(new Set(initialCompleted));

  const toggleJuz = (juzNum) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(juzNum)) next.delete(juzNum);
      else next.add(juzNum);
      return next;
    });
  };

  const completedCount = completed.size;
  const pct = Math.round((completedCount / 30) * 100);

  return (
    <View style={[styles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: T.text }]}>📖 Quran Khatam Tracker</Text>
          <Text style={[styles.sub, { color: T.muted }]}>Tap a juz to mark complete</Text>
        </View>
        <Text style={[styles.count, { color: T.gold }]}>{completedCount}/30</Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: T.border }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: T.gold }]} />
      </View>
      <Text style={[styles.pct, { color: T.muted }]}>{pct}% complete</Text>

      {/* Juz grid */}
      <View style={styles.grid}>
        {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => {
          const done = completed.has(juz);
          return (
            <TouchableOpacity
              key={juz}
              style={[
                styles.juzCell,
                { borderColor: done ? T.gold : T.border },
                done && { backgroundColor: T.gold + '22' },
              ]}
              onPress={() => toggleJuz(juz)}
              activeOpacity={0.75}
            >
              <Text style={[styles.juzNum, { color: done ? T.gold : T.muted }]}>{juz}</Text>
              {done && <Ionicons name="checkmark" size={9} color={T.gold} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold' },
  sub: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', marginTop: 2 },
  count: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold' },
  progressBar: { height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  pct: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', textAlign: 'right', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  juzCell: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  juzNum: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold' },
});
