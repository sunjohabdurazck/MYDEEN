// src/components/RamadanMode.js
// Automatically shows only during Ramadan, or within 30 days before it.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import {
  isRamadan, isRamadanApproaching, daysUntilRamadan,
  getRamadanDay, getRamadanLength,
} from '../utils/dateUtils';

export default function RamadanMode({ onOpenHub }) {
  const { theme: T } = useTheme();
  const [ramadanActive] = useState(isRamadan());
  const [approaching] = useState(isRamadanApproaching(30));
  const [daysLeft] = useState(daysUntilRamadan());
  const [ramadanDay] = useState(getRamadanDay());
  const [totalDays] = useState(getRamadanLength());

  // Don't render anything if not Ramadan and not approaching
  if (!ramadanActive && !approaching) return null;

  // Countdown teaser (within 30 days)
  if (!ramadanActive && approaching) {
    return (
      <TouchableOpacity
        style={[styles.teaser, { backgroundColor: T.isDark ? '#1a3a2a' : '#f0fdf4', borderColor: '#2d6a4f' }]}
        onPress={onOpenHub}
        activeOpacity={0.88}
      >
        <Text style={styles.moonEmoji}>🌙</Text>
        <View style={styles.teaserText}>
          <Text style={[styles.teaserTitle, { color: T.text }]}>Ramadan in {daysLeft} days</Text>
          <Text style={[styles.teaserSub, { color: T.muted }]}>Start preparing your goals →</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={T.muted} />
      </TouchableOpacity>
    );
  }

  // Full Ramadan widget (during Ramadan)
  const remaining = totalDays - (ramadanDay ?? 1);

  return (
    <TouchableOpacity
      style={[styles.widget, { backgroundColor: T.isDark ? '#0d2a1c' : '#f0fdf4', borderColor: '#2d6a4f' }]}
      onPress={onOpenHub}
      activeOpacity={0.88}
    >
      <View style={styles.widgetHeader}>
        <Text style={styles.bigMoon}>🌙✨</Text>
        <View style={styles.widgetTitles}>
          <Text style={[styles.widgetTitle, { color: T.text }]}>Ramadan Mubarak</Text>
          <Text style={[styles.widgetSub, { color: T.muted }]}>Day {ramadanDay} of {totalDays} · {remaining} days remaining</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={T.muted} />
      </View>

      {/* Day progress bar */}
      <View style={[styles.progressBar, { backgroundColor: T.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${((ramadanDay ?? 1) / totalDays) * 100}%`, backgroundColor: '#10b981' },
          ]}
        />
      </View>

      <Text style={[styles.tapHint, { color: T.muted }]}>Tap to open Ramadan Hub</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  teaser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  moonEmoji: { fontSize: 22 },
  teaserText: { flex: 1 },
  teaserTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold' },
  teaserSub: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', marginTop: 1 },
  widget: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  widgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  bigMoon: { fontSize: 28 },
  widgetTitles: { flex: 1 },
  widgetTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold' },
  widgetSub: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', marginTop: 2 },
  progressBar: { height: 5, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  tapHint: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', textAlign: 'right' },
});
