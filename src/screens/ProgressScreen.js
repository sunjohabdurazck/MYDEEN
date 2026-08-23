// src/screens/ProgressScreen.js — UPGRADED with Segmented Control + Goals + 99 Names
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, usePrayerStore } from '../store';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { BehaviorEngine, STRICTNESS_CONFIG } from '../services/behaviorEngine';
import { AppBlocker } from '../services/appBlocker';
import NudgeCard from '../components/NudgeCard';
import GoalTracker from '../components/GoalTracker';
import HeatmapStreak from '../components/HeatmapStreak';
import WeeklyComparison from '../components/WeeklyComparison';
import NamesOfAllah from '../components/NamesOfAllah';

const { width } = Dimensions.get('window');
const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_EMOJIS = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙' };

const SEGMENTS = [
  { key: 'weekly',  label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'goals',   label: 'Goals' },
  { key: 'names',   label: '99 Names' },
];

function Sparkline({ data, theme: T }) {
  return (
    <View style={sparkStyles.row}>
      {data.map((d, i) => {
        const color = d.percentage === 100 ? T.emerald : d.percentage >= 60 ? T.gold : d.percentage > 0 ? '#f59e0b' : T.border;
        return <View key={i} style={[sparkStyles.dot, { backgroundColor: color }]} />;
      })}
    </View>
  );
}
const sparkStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});

// ── Weekly Stats View ─────────────────────────────────────────────
function WeeklyView({ weeklyData, engineReport, nudges, strictness, profile, navigation, onDismissNudge, T }) {
  const xpInLevel = (profile?.xp || 0) % 500;
  const levelPct  = (xpInLevel / 500) * 100;

  return (
    <>
      {nudges.length > 0 && (
        <View style={styles.nudgesSection}>
          {nudges.map(n => <NudgeCard key={n.id} nudge={n} onDismiss={onDismissNudge} />)}
        </View>
      )}

      {strictness && (
        <TouchableOpacity style={[styles.strictnessBar, { backgroundColor: T.surface, borderColor: T.border }]}
          onPress={() => navigation?.navigate?.('WeeklyReport')} activeOpacity={0.75}>
          <Text style={styles.strictnessEmoji}>{strictness.config.emoji}</Text>
          <View style={styles.strictnessInfo}>
            <Text style={[styles.strictnessTitle, { color: T.text }]}>Lock Mode: {strictness.config.label}</Text>
            <Text style={[styles.strictnessSub, { color: T.muted }]}>{strictness.config.lockMinutes}-min locks · Auto-adjusted</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={T.muted} />
        </TouchableOpacity>
      )}

      <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Text style={[styles.cardLabel, { color: T.muted }]}>LEVEL PROGRESS</Text>
        <View style={styles.levelRow}>
          <Text style={[styles.levelNum, { color: T.gold }]}>Level {profile?.level || 1}</Text>
          {engineReport && (
            <View style={[styles.disciplineChip, {
              backgroundColor: (engineReport.weeklyReport?.disciplineScore || 0) >= 70 ? T.emerald + '20' : '#ef444420',
              borderColor:     (engineReport.weeklyReport?.disciplineScore || 0) >= 70 ? T.emerald + '50' : '#ef444450',
            }]}>
              <Text style={[styles.disciplineScore, { color: (engineReport.weeklyReport?.disciplineScore || 0) >= 70 ? T.emerald : '#ef4444' }]}>
                Score: {engineReport.weeklyReport?.disciplineScore || 0}/100
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.barBg, { backgroundColor: T.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
          <View style={[styles.barFill, { width: `${levelPct}%`, backgroundColor: T.gold }]} />
        </View>
        <Text style={[styles.xpText, { color: T.muted }]}>{xpInLevel} / 500 XP to next level</Text>
      </View>

      <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
        <View style={styles.chartHeader}>
          <Text style={[styles.cardLabel, { color: T.muted }]}>THIS WEEK</Text>
          <Sparkline data={weeklyData} theme={T} />
        </View>
        <View style={styles.chartBars}>
          {weeklyData.map((day, i) => (
            <View key={i} style={styles.barCol}>
              <Text style={[styles.barCount, { color: T.muted }]}>{day.prayed}</Text>
              <View style={[styles.chartBarBg, { backgroundColor: T.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[styles.chartBarFill, { height: `${Math.max(day.percentage, 4)}%`, backgroundColor: day.percentage === 100 ? T.emerald : T.gold }]} />
              </View>
              <Text style={[styles.dayLabel, { color: T.muted }]}>{day.day}</Text>
            </View>
          ))}
        </View>
      </View>

      {engineReport?.missCount && (
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={[styles.cardLabel, { color: T.muted }]}>PRAYER PATTERNS (7 DAYS)</Text>
          {PRAYER_NAMES.map(p => {
            const missed = engineReport.missCount[p] || 0;
            const prayed = engineReport.prayCounts[p] || 0;
            const total  = missed + prayed;
            const rate   = total > 0 ? Math.round((prayed / total) * 100) : 0;
            const color  = rate >= 85 ? T.emerald : rate >= 60 ? T.gold : '#ef4444';
            return (
              <View key={p} style={styles.patternRow}>
                <Text style={styles.patternEmoji}>{PRAYER_EMOJIS[p]}</Text>
                <Text style={[styles.patternName, { color: T.text }]}>{p}</Text>
                <View style={[styles.patternBarBg, { backgroundColor: T.border }]}>
                  <View style={[styles.patternBarFill, { width: `${rate}%`, backgroundColor: color }]} />
                </View>
                <Text style={[styles.patternRate, { color }]}>{prayed}/7</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.statsGrid}>
        {[
          { value: profile?.streak_current || 0, label: 'Current Streak', emoji: '🔥' },
          { value: profile?.streak_best || 0,    label: 'Best Streak',    emoji: '⭐' },
          { value: profile?.level || 1,          label: 'Level',          emoji: '🏆' },
          { value: profile?.xp || 0,             label: 'Total XP',       emoji: '✨' },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={styles.statEmoji}>{s.emoji}</Text>
            <Text style={[styles.statValue, { color: T.gold }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: T.muted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={[styles.fullReportBtn, { backgroundColor: T.gold, marginHorizontal: 16 }]}
        onPress={() => navigation?.navigate?.('WeeklyReport')} activeOpacity={0.85}>
        <Ionicons name="analytics-outline" size={20} color="#0d1120" />
        <Text style={styles.fullReportBtnText}>View Full Discipline Report</Text>
        <Ionicons name="arrow-forward" size={16} color="#0d1120" />
      </TouchableOpacity>
    </>
  );
}

// ── Monthly View ─────────────────────────────────────────────────
function MonthlyView({ weeklyData, profile, T }) {
  const lastWeekData = weeklyData.map(d => ({ ...d, prayed: Math.max(0, (d.prayed || 0) - 1) }));
  const tw = weeklyData.map(d => d.prayed ?? 0);
  const lw = lastWeekData.map(d => d.prayed ?? 0);
  return (
    <>
      <WeeklyComparison thisWeek={tw} lastWeek={lw} />
      <HeatmapStreak streakCount={profile?.streak_current ?? 0} />
    </>
  );
}

// ── Goals View ───────────────────────────────────────────────────
function GoalsView() {
  return <GoalTracker />;
}

// ── Names View ───────────────────────────────────────────────────
function NamesView() {
  return <NamesOfAllah />;
}

// ── MAIN SCREEN ─────────────────────────────────────────────────
export default function ProgressScreen({ navigation }) {
  const { theme: T } = useTheme();
  const { userId, profile } = useAuthStore();
  const { logs } = usePrayerStore();

  const [activeSegment, setActiveSegment] = useState('weekly');
  const [weeklyData,    setWeeklyData]    = useState([]);
  const [nudges,        setNudges]        = useState([]);
  const [strictness,    setStrictness]    = useState(null);
  const [engineReport,  setEngineReport]  = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  const load = useCallback(async () => {
    await loadWeeklyStats();
    await loadBehaviorEngine();
    setLoading(false);
    setRefreshing(false);
  }, [userId, logs, profile]);

  useEffect(() => { load(); }, [load]);

  const loadWeeklyStats = async () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    const { data } = await supabase
      .from('prayer_logs').select('prayer_date, status')
      .eq('user_id', userId())
      .gte('prayer_date', weekStart.toISOString().split('T')[0])
      .lte('prayer_date', today.toISOString().split('T')[0]);
    if (data) {
      const grouped = {};
      data.forEach(log => {
        if (!grouped[log.prayer_date]) grouped[log.prayer_date] = { total: 0, prayed: 0 };
        grouped[log.prayer_date].total++;
        if (log.status === 'prayed') grouped[log.prayer_date].prayed++;
      });
      const DAYS = ['S','M','T','W','T','F','S'];
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
        const ds = d.toISOString().split('T')[0];
        days.push({ date: ds, day: DAYS[d.getDay()], percentage: grouped[ds] ? (grouped[ds].prayed / 5) * 100 : 0, prayed: grouped[ds]?.prayed || 0 });
      }
      setWeeklyData(days);
    }
  };

  const loadBehaviorEngine = async () => {
    try {
      const bypasses = await AppBlocker.getBypassLog();
      const result   = await BehaviorEngine.analyze(logs, bypasses, profile);
      setNudges(result.nudges.slice(0, 2));
      setStrictness({ level: result.strictnessLevel, config: result.strictnessConfig });
      setEngineReport(result);
    } catch (e) { console.warn('BehaviorEngine error:', e); }
  };

  const onRefresh = () => { setRefreshing(true); load(); };
  const handleDismissNudge = (id) => setNudges(prev => prev.filter(n => n.id !== id));

  if (loading) return (
    <View style={[styles.loader, { backgroundColor: T.bg }]}>
      <ActivityIndicator size="large" color={T.gold} />
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: T.bg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.gold} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: T.text }]}>Your Progress</Text>
          <Text style={[styles.headerSub, { color: T.muted }]}>Track your spiritual journey</Text>
        </View>
        <TouchableOpacity
          style={[styles.reportBtn, { backgroundColor: T.gold + '20', borderColor: T.gold + '50' }]}
          onPress={() => navigation?.navigate?.('WeeklyReport')}
          activeOpacity={0.75}
        >
          <Text style={styles.reportBtnEmoji}>📊</Text>
          <Text style={[styles.reportBtnText, { color: T.gold }]}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Control */}
      <View style={[styles.segmentRow, { backgroundColor: T.surface, borderColor: T.border }]}>
        {SEGMENTS.map(seg => (
          <TouchableOpacity
            key={seg.key}
            style={[
              styles.segmentBtn,
              activeSegment === seg.key && { backgroundColor: T.gold },
            ]}
            onPress={() => setActiveSegment(seg.key)}
          >
            <Text style={[
              styles.segmentText,
              { color: T.muted },
              activeSegment === seg.key && { color: '#fff', fontFamily: 'PlusJakartaSans-SemiBold' },
            ]}>
              {seg.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Segment Content */}
      {activeSegment === 'weekly' && (
        <WeeklyView
          weeklyData={weeklyData}
          engineReport={engineReport}
          nudges={nudges}
          strictness={strictness}
          profile={profile}
          navigation={navigation}
          onDismissNudge={handleDismissNudge}
          T={T}
        />
      )}
      {activeSegment === 'monthly' && <MonthlyView weeklyData={weeklyData} profile={profile} T={T} />}
      {activeSegment === 'goals'   && <GoalsView />}
      {activeSegment === 'names'   && <NamesView />}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1 },
  loader:            { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  headerTitle:       { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  headerSub:         { fontSize: 14 },
  reportBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  reportBtnEmoji:    { fontSize: 16 },
  reportBtnText:     { fontSize: 12, fontWeight: '700' },
  // Segmented control
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentText: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium' },
  // Existing
  nudgesSection:     { paddingHorizontal: 16, marginBottom: 4 },
  strictnessBar:     { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 16, borderWidth: 1, gap: 10 },
  strictnessEmoji:   { fontSize: 22 },
  strictnessInfo:    { flex: 1 },
  strictnessTitle:   { fontSize: 14, fontWeight: '700' },
  strictnessSub:     { fontSize: 12, marginTop: 2 },
  card:              { marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 20, borderWidth: 1 },
  cardLabel:         { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  levelRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  levelNum:          { fontSize: 28, fontWeight: '800' },
  disciplineChip:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  disciplineScore:   { fontSize: 12, fontWeight: '700' },
  barBg:             { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 10 },
  barFill:           { height: 10, borderRadius: 5 },
  xpText:            { fontSize: 13 },
  chartHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chartBars:         { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 120 },
  barCol:            { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 },
  barCount:          { fontSize: 10, fontWeight: '600' },
  chartBarBg:        { flex: 1, width: '100%', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  chartBarFill:      { width: '100%', borderRadius: 6, minHeight: 4 },
  dayLabel:          { fontSize: 11, fontWeight: '600' },
  patternRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  patternEmoji:      { fontSize: 16, width: 24 },
  patternName:       { fontSize: 13, fontWeight: '600', width: 56 },
  patternBarBg:      { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  patternBarFill:    { height: 8, borderRadius: 4 },
  patternRate:       { fontSize: 12, fontWeight: '700', width: 30, textAlign: 'right' },
  statsGrid:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  statCard:          { width: (width - 44) / 2, borderRadius: 16, padding: 18, borderWidth: 1, alignItems: 'center', gap: 6 },
  statEmoji:         { fontSize: 24 },
  statValue:         { fontSize: 32, fontWeight: '800' },
  statLabel:         { fontSize: 12 },
  fullReportBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, marginBottom: 16 },
  fullReportBtnText: { color: '#0d1120', fontSize: 16, fontWeight: '800' },
});
