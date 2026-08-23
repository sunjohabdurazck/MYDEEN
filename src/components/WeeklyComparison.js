// src/components/WeeklyComparison.js
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const CHART_HEIGHT = 100;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Bar({ thisWeekVal, lastWeekVal, day, theme: T }) {
  const maxVal = 5;
  const thisH = Math.round((thisWeekVal / maxVal) * CHART_HEIGHT);
  const lastH = Math.round((lastWeekVal / maxVal) * CHART_HEIGHT);

  return (
    <View style={styles.barGroup}>
      <View style={styles.barPair}>
        <View style={[styles.bar, { height: Math.max(lastH, 4), backgroundColor: T.muted + '66' }]} />
        <View style={[styles.bar, { height: Math.max(thisH, 4), backgroundColor: T.gold }]} />
      </View>
      <Text style={[styles.dayLabel, { color: T.muted }]}>{day}</Text>
    </View>
  );
}

export default function WeeklyComparison({ thisWeek, lastWeek }) {
  const { theme: T } = useTheme();

  const tw = thisWeek || [];
  const lw = lastWeek || [];

  // Show loading state when no data provided
  if (!tw.length || !lw.length) {
    return (
      <View style={[styles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Text style={[styles.title, { color: T.text }]}>📈 Week over Week</Text>
        <ActivityIndicator size="small" color={T.gold} style={{ marginVertical: 20 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
      <Text style={[styles.title, { color: T.text }]}>📈 Week over Week</Text>

      <View style={[styles.chartArea, { height: CHART_HEIGHT + 24 }]}>
        {DAYS.map((day, i) => (
          <Bar
            key={day}
            day={day}
            thisWeekVal={tw[i] ?? 0}
            lastWeekVal={lw[i] ?? 0}
            theme={T}
          />
        ))}
      </View>

      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: T.gold }]} />
        <Text style={[styles.legendText, { color: T.muted }]}>This week</Text>
        <View style={[styles.legendDot, { backgroundColor: T.muted + '66' }]} />
        <Text style={[styles.legendText, { color: T.muted }]}>Last week</Text>
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
  title: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', marginBottom: 12 },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barGroup: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 4 },
  bar: { width: 8, borderRadius: 4 },
  dayLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans-Regular' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', marginRight: 8 },
});
