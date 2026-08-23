// src/screens/MissionsScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../store';

const MISSIONS = [
  {
    id: 'm1', category: 'prayer',
    name: 'Prayer Warrior',
    description: 'Pray all 5 prayers on time for 7 days',
    xp: 500, progress: 5, target: 7,
    icon: '🕌', color: '#c9a84c',
  },
  {
    id: 'm2', category: 'quran',
    name: 'Quran Reciter',
    description: 'Read 30 pages of Quran this month',
    xp: 300, progress: 12, target: 30,
    icon: '📖', color: '#10b981',
  },
  {
    id: 'm3', category: 'special',
    name: 'Tahajjud Champion',
    description: 'Pray Tahajjud 10 times',
    xp: 400, progress: 3, target: 10,
    icon: '⭐', color: '#6366f1',
  },
  {
    id: 'm4', category: 'dhikr',
    name: 'Dhikr Master',
    description: 'Complete 5000 total dhikr counts',
    xp: 200, progress: 2340, target: 5000,
    icon: '📿', color: '#f59e0b',
  },
  {
    id: 'm5', category: 'special',
    name: 'Fasting Hero',
    description: 'Complete 10 voluntary fasting days',
    xp: 350, progress: 4, target: 10,
    icon: '🌙', color: '#8b5cf6',
  },
  {
    id: 'm6', category: 'social',
    name: 'Community Pillar',
    description: 'Answer 5 friends\' questions',
    xp: 150, progress: 2, target: 5,
    icon: '👥', color: '#ec4899',
  },
  {
    id: 'm7', category: 'prayer',
    name: 'Fajr Devotee',
    description: 'Pray Fajr on time for 14 consecutive days',
    xp: 600, progress: 14, target: 14,
    icon: '🌅', color: '#c9a84c',
  },
  {
    id: 'm8', category: 'quran',
    name: 'Memorizer',
    description: 'Memorize 5 new surahs',
    xp: 1000, progress: 1, target: 5,
    icon: '🧠', color: '#10b981',
  },
];

const CATEGORIES = [
  { key: 'all',    label: 'All',    icon: '✨' },
  { key: 'prayer', label: 'Prayer', icon: '🕌' },
  { key: 'quran',  label: 'Quran',  icon: '📖' },
  { key: 'special',label: 'Special',icon: '⭐' },
  { key: 'social', label: 'Social', icon: '👥' },
];

function MissionCard({ mission, theme: T }) {
  const pct = Math.min(100, (mission.progress / mission.target) * 100);
  const isComplete = mission.progress >= mission.target;

  return (
    <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
      <View style={styles.cardTop}>
        <Text style={styles.missionIcon}>{mission.icon}</Text>
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={[styles.missionName, { color: T.text }]}>{mission.name}</Text>
            {isComplete && (
              <View style={[styles.completeBadge, { backgroundColor: mission.color + '22' }]}>
                <Ionicons name="checkmark-circle" size={14} color={mission.color} />
                <Text style={[styles.completeText, { color: mission.color }]}>Done</Text>
              </View>
            )}
          </View>
          <Text style={[styles.missionDesc, { color: T.muted }]}>{mission.description}</Text>
        </View>
        <View style={[styles.xpChip, { backgroundColor: mission.color + '18', borderColor: mission.color + '44' }]}>
          <Text style={[styles.xpText, { color: mission.color }]}>+{mission.xp}</Text>
          <Text style={[styles.xpLabel, { color: mission.color }]}>XP</Text>
        </View>
      </View>

      <View style={styles.cardProgress}>
        <View style={[styles.progressBar, { backgroundColor: T.border }]}>
          <View
            style={[styles.progressFill, { width: `${pct}%`, backgroundColor: mission.color }]}
          />
        </View>
        <Text style={[styles.progressText, { color: T.muted }]}>
          {mission.progress}/{mission.target}
        </Text>
      </View>
    </View>
  );
}

export default function MissionsScreen() {
  const { theme: T } = useTheme();
  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = filter === 'all'
    ? MISSIONS
    : MISSIONS.filter(m => m.category === filter);

  const active = filtered.filter(m => m.progress < m.target);
  const completed = filtered.filter(m => m.progress >= m.target);

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} tintColor={T.gold} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: T.text }]}>🏆 Missions</Text>
            <Text style={[styles.headerSub, { color: T.muted }]}>
              {completed.length} completed · {active.length} active
            </Text>
          </View>
          <View style={[styles.xpBadge, { backgroundColor: T.gold + '18', borderColor: T.gold + '33' }]}>
            <Text style={[styles.xpBadgeText, { color: T.gold }]}>{profile?.total_xp ?? 0} XP</Text>
          </View>
        </View>

        {/* Daily Bonus */}
        <View style={[styles.bonusBanner, { backgroundColor: T.gold + '14', borderColor: T.gold + '44' }]}>
          <Text style={styles.bonusEmoji}>⚡</Text>
          <View style={styles.bonusContent}>
            <Text style={[styles.bonusTitle, { color: T.text }]}>7-Day Completion Bonus</Text>
            <Text style={[styles.bonusDesc, { color: T.muted }]}>
              Complete all daily missions 7 days in a row
            </Text>
          </View>
          <Text style={[styles.bonusXp, { color: T.gold }]}>+1000 XP</Text>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.filterChip,
                { borderColor: T.border, backgroundColor: T.surface },
                filter === cat.key && { backgroundColor: T.gold, borderColor: T.gold },
              ]}
              onPress={() => setFilter(cat.key)}
            >
              <Text style={styles.filterIcon}>{cat.icon}</Text>
              <Text style={[
                styles.filterLabel,
                { color: T.muted },
                filter === cat.key && { color: '#fff' },
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Missions */}
        {active.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: T.muted }]}>ACTIVE</Text>
            {active.map(m => <MissionCard key={m.id} mission={m} theme={T} />)}
          </>
        )}

        {/* Completed Missions */}
        {completed.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: T.muted }]}>COMPLETED ✅</Text>
            {completed.map(m => <MissionCard key={m.id} mission={m} theme={T} />)}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerTitle: { fontSize: 24, fontFamily: 'PlusJakartaSans-Bold' },
  headerSub: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', marginTop: 2 },
  xpBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  xpBadgeText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold' },
  bonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  bonusEmoji: { fontSize: 24 },
  bonusContent: { flex: 1 },
  bonusTitle: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold' },
  bonusDesc: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', marginTop: 1 },
  bonusXp: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold' },
  filterRow: { marginBottom: 14 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterIcon: { fontSize: 14 },
  filterLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium' },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardTop: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  missionIcon: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  missionName: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold' },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  completeText: { fontSize: 10, fontFamily: 'PlusJakartaSans-SemiBold' },
  missionDesc: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', marginTop: 2, lineHeight: 17 },
  xpChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Bold' },
  xpLabel: { fontSize: 9, fontFamily: 'PlusJakartaSans-Regular' },
  cardProgress: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: { flex: 1, height: 6, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', minWidth: 40, textAlign: 'right' },
});
