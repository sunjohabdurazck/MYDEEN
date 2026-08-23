// src/screens/RamadanHub.js
// Full Ramadan dashboard — accessible any time to prep, but Ramadan features only show during Ramadan
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../store';
import {
  isRamadan, getRamadanDay, getRamadanLength, daysUntilRamadan,
} from '../utils/dateUtils';
import FastingCountdown from '../components/FastingCountdown';

const DAILY_GOALS = [
  { id: 'fast',     label: 'Fast kept today',     icon: '🌙', color: '#8b5cf6' },
  { id: 'taraweeh', label: 'Prayed Taraweeh',      icon: '🕌', color: '#c9a84c' },
  { id: 'quran',    label: '20 Quran pages',       icon: '📖', color: '#10b981' },
  { id: 'dua',      label: 'Made dua at iftar',    icon: '🤲', color: '#6366f1' },
];

const DUAS_FOR_RAMADAN = [
  {
    ar: '\u0627\u0644\u0644\u0651\u064e\u0647\u064f\u0645\u0651\u064e \u0625\u0650\u0646\u0651\u0650\u064a \u0644\u064e\u0643\u064e \u0635\u064f\u0645\u0652\u062a\u064f \u0648\u064e\u0628\u0650\u0643\u064e \u0622\u0645\u064e\u0646\u062a\u064f \u0648\u064e\u0639\u064e\u0644\u064e\u064a\u0643\u064e \u062a\u064e\u0648\u064e\u0643\u0651\u064e\u0644\u062a\u064f',
    transliteration: "Allahumma inni laka sumtu wa bika amantu wa 'alayka tawakkaltu wa 'ala rizqika aftartu",
    translation: 'O Allah! For You I have fasted, in You I believe, upon You I rely, and with Your sustenance I break my fast.',
  },
  {
    ar: '\u0630\u064e\u0647\u064e\u0628\u064e \u0627\u0644\u0638\u0651\u064e\u0645\u064e\u0623\u064f \u0648\u064e\u0627\u0628\u0652\u062a\u064e\u0644\u0651\u064e\u062a\u0650 \u0627\u0644\u0652\u0639\u064f\u0631\u064f\u0648\u0642\u064f \u0648\u064e\u062b\u064e\u0628\u064e\u062a\u064e \u0627\u0644\u0623\u064e\u062c\u0652\u0631\u064f \u0625\u0650\u0646\u0652 \u0634\u064e\u0627\u0621\u064e \u0627\u0644\u0644\u0651\u064e\u0647\u064f',
    transliteration: "Dhahaba az-zama' wabtallatil-urooq wa thabat al-ajru insha'Allah",
    translation: 'The thirst has gone, the veins are moistened, and the reward is established, if Allah wills.',
  },
];

function CountdownBanner({ theme: T }) {
  const days = daysUntilRamadan();
  if (isRamadan() || days === null) return null;
  return (
    <View style={[styles.countdownBanner, { backgroundColor: T.isDark ? '#1a3a2a' : '#f0fdf4', borderColor: '#2d6a4f' }]}>
      <Text style={styles.countdownMoon}>🌙</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.countdownTitle, { color: T.text }]}>Ramadan in {days} day{days !== 1 ? 's' : ''}</Text>
        <Text style={[styles.countdownSub, { color: T.muted }]}>Set your goals and prepare now</Text>
      </View>
    </View>
  );
}

function RamadanStats({ day, totalDays, theme: T }) {
  const remaining = totalDays - day;
  return (
    <View style={[styles.statsRow, { backgroundColor: T.isDark ? '#0d2a1c' : '#f0fdf4', borderColor: '#2d6a4f' }]}>
      {[
        { value: day,       label: 'Day',        icon: '📅' },
        { value: remaining, label: 'Remaining',   icon: '⏳' },
        { value: totalDays, label: 'Total Days',  icon: '🌙' },
      ].map(stat => (
        <View key={stat.label} style={styles.statBox}>
          <Text style={styles.statEmoji}>{stat.icon}</Text>
          <Text style={[styles.statValue, { color: T.gold }]}>{stat.value}</Text>
          <Text style={[styles.statLabel, { color: T.muted }]}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

function DailyChecklist({ theme: T }) {
  const [checked, setChecked] = useState(new Set());

  const toggle = (id) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <View style={[styles.section, { backgroundColor: T.surface, borderColor: T.border }]}>
      <Text style={[styles.sectionTitle, { color: T.text }]}>☑️ Daily Checklist</Text>
      {DAILY_GOALS.map(goal => {
        const done = checked.has(goal.id);
        return (
          <TouchableOpacity
            key={goal.id}
            style={[styles.checkRow, { borderBottomColor: T.border }]}
            onPress={() => toggle(goal.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkBox, { borderColor: done ? goal.color : T.border, backgroundColor: done ? goal.color + '22' : 'transparent' }]}>
              {done && <Ionicons name="checkmark" size={14} color={goal.color} />}
            </View>
            <Text style={styles.checkEmoji}>{goal.icon}</Text>
            <Text style={[styles.checkLabel, { color: done ? T.muted : T.text }]}>{goal.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function DuaSection({ theme: T }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={[styles.section, { backgroundColor: T.surface, borderColor: T.border }]}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setExpanded(v => !v)}
      >
        <Text style={[styles.sectionTitle, { color: T.text }]}>🤲 Ramadan Duas</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={T.muted} />
      </TouchableOpacity>
      {expanded && DUAS_FOR_RAMADAN.map((dua, i) => (
        <View key={i} style={[styles.duaCard, { borderTopColor: T.border }]}>
          <Text style={[styles.duaArabic, { color: T.gold }]}>{dua.ar}</Text>
          <Text style={[styles.duaLatin, { color: T.muted }]}>{dua.transliteration}</Text>
          <Text style={[styles.duaTranslation, { color: T.text }]}>"{dua.translation}"</Text>
        </View>
      ))}
    </View>
  );
}

function PrepSection({ theme: T }) {
  const tips = [
    '📖 Set a Quran reading schedule (e.g. 4 pages after each prayer)',
    '🌙 Plan your Suhoor meals in advance',
    '🤲 Choose specific duas you want to focus on',
    '👥 Join a Taraweeh group or online community',
    '📿 Set a daily dhikr target (e.g. 100 Subhanallah)',
  ];
  return (
    <View style={[styles.section, { backgroundColor: T.surface, borderColor: T.border }]}>
      <Text style={[styles.sectionTitle, { color: T.text }]}>🎯 Preparation Tips</Text>
      {tips.map((tip, i) => (
        <Text key={i} style={[styles.tip, { color: T.muted }]}>{tip}</Text>
      ))}
    </View>
  );
}

export default function RamadanHub({ navigation }) {
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const ramadanActive = isRamadan();
  const ramadanDay = getRamadanDay();
  const totalDays = getRamadanLength();

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: T.text }]}>
            {ramadanActive ? '🌙 Ramadan Hub' : '🌙 Ramadan Prep'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Countdown (if not Ramadan yet) */}
        <CountdownBanner theme={T} />

        {/* Active Ramadan content */}
        {ramadanActive && (
          <>
            <RamadanStats day={ramadanDay ?? 1} totalDays={totalDays} theme={T} />
            <FastingCountdown />
            <DailyChecklist theme={T} />
          </>
        )}

        {/* Duas — always available */}
        <DuaSection theme={T} />

        {/* Prep tips — always visible */}
        {!ramadanActive && <PrepSection theme={T} />}

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold' },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  countdownMoon: { fontSize: 32 },
  countdownTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans-SemiBold' },
  countdownSub: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-around',
  },
  statBox: { alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 20 },
  statValue: { fontSize: 22, fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular' },
  section: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  sectionTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', padding: 14, paddingBottom: 8 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkEmoji: { fontSize: 18 },
  checkLabel: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans-Medium' },
  duaCard: { padding: 14, borderTopWidth: 1, gap: 6 },
  duaArabic: { fontSize: 18, fontFamily: 'System', lineHeight: 28, textAlign: 'right' },
  duaLatin: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', fontStyle: 'italic' },
  duaTranslation: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', lineHeight: 19 },
  tip: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', paddingHorizontal: 14, paddingVertical: 6, lineHeight: 20 },
});
