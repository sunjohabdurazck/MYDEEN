// src/components/StreakDisplay.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function StreakDisplay({ streak, bestStreak }) {
  const { theme: T } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: T.surface }]}>
      <View style={styles.streakItem}>
        <View style={styles.fireIcon}>
          <Ionicons name="flame" size={24} color="#f97316" />
        </View>
        <Text style={[styles.streakNumber, { color: T.text }]}>{streak}</Text>
        <Text style={[styles.streakLabel, { color: T.muted }]}>Current Streak</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: T.border }]} />

      <View style={styles.streakItem}>
        <View style={styles.trophyIcon}>
          <Ionicons name="trophy" size={24} color="#fbbf24" />
        </View>
        <Text style={[styles.streakNumber, { color: T.text }]}>{bestStreak}</Text>
        <Text style={[styles.streakLabel, { color: T.muted }]}>Best Streak</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderRadius: 20, padding: 16, marginBottom: 16 },
  streakItem: { flex: 1, alignItems: 'center' },
  fireIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(249,115,22,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  trophyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(251,191,36,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  streakNumber: { fontSize: 28, fontFamily: 'PlusJakartaSans-Bold' },
  streakLabel: { fontSize: 12, marginTop: 4 },
  divider: { width: 1, marginHorizontal: 16 },
});
