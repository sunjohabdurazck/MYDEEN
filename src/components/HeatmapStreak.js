// src/components/HeatmapStreak.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const CELL_SIZE = 10;
const CELL_GAP = 3;
const DAYS_SHOWN = 91; // ~13 weeks

export default function HeatmapStreak({ data = {}, streakCount = 0 }) {
  const { theme: T } = useTheme();
  const [expanded, setExpanded] = useState(false);

  // Build last DAYS_SHOWN days array
  const days = [];
  const today = new Date();
  for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, completed: data[key]?.completed ?? false });
  }

  const cellColor = (completed) => {
    if (completed) return '#10b981';
    return T.isDark ? '#1f2937' : '#e5e7eb';
  };

  return (
    <View style={[styles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.fireEmoji}>🔥</Text>
          <View>
            <Text style={[styles.title, { color: T.text }]}>Prayer Streak</Text>
            <Text style={[styles.sub, { color: T.muted }]}>{streakCount}-day streak · tap to expand</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={T.muted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.mapWrapper}>
          <Text style={[styles.label, { color: T.muted }]}>3-MONTH HEATMAP</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.heatmapRow}>
              {days.map((day, i) => (
                <View
                  key={day.key}
                  style={[
                    styles.cell,
                    { backgroundColor: cellColor(day.completed) },
                  ]}
                />
              ))}
            </View>
          </ScrollView>
          <View style={styles.legend}>
            <Text style={[styles.legendText, { color: T.muted }]}>Less</Text>
            {['#e5e7eb', '#86efac', '#22c55e', '#10b981'].map((c, i) => (
              <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />
            ))}
            <Text style={[styles.legendText, { color: T.muted }]}>More</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fireEmoji: { fontSize: 24 },
  title: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold' },
  sub: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', marginTop: 1 },
  mapWrapper: { paddingHorizontal: 14, paddingBottom: 14 },
  label: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-SemiBold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heatmapRow: { flexDirection: 'row', gap: CELL_GAP, flexWrap: 'wrap', maxHeight: (CELL_SIZE + CELL_GAP) * 7 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 10, fontFamily: 'PlusJakartaSans-Regular' },
});
