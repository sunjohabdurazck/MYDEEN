// src/screens/WeeklyReportScreen.js — Discipline Coach Dashboard
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore, usePrayerStore } from '../store';
import { BehaviorEngine, STRICTNESS, STRICTNESS_CONFIG } from '../services/behaviorEngine';
import { AppBlocker } from '../services/appBlocker';
import NudgeCard from '../components/NudgeCard';

const { width } = Dimensions.get('window');
const PRAYER_EMOJIS = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙' };

// ─── STRICTNESS SELECTOR ─────────────────────────────────────────────────────
function StrictnessSelector({ current, onChange }) {
  const { theme: T } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
      <Text style={[styles.cardLabel, { color: T.muted }]}>LOCK INTENSITY</Text>
      <Text style={[styles.cardSubtitle, { color: T.muted }]}>Auto-adjusted based on your patterns</Text>
      <View style={styles.strictnessRow}>
        {Object.entries(STRICTNESS_CONFIG).map(([level, config]) => {
          const lvl = parseInt(level);
          const isActive = lvl === current;
          return (
            <TouchableOpacity
              key={level}
              onPress={() => onChange(lvl)}
              style={[
                styles.strictnessBtn,
                { borderColor: isActive ? T.gold : T.border },
                isActive && { backgroundColor: T.gold + '20' },
              ]}
              activeOpacity={0.75}
            >
              <Text style={styles.strictnessEmoji}>{config.emoji}</Text>
              <Text style={[styles.strictnessLabel, { color: isActive ? T.gold : T.muted }]}>
                {config.label}
              </Text>
              <Text style={[styles.strictnessMins, { color: T.muted }]}>
                {config.lockMinutes}m
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.strictnessDesc, { color: T.muted }]}>
        {STRICTNESS_CONFIG[current]?.description}
      </Text>
    </View>
  );
}

// ─── PRAYER HEATMAP ROW ───────────────────────────────────────────────────────
function PrayerHeatRow({ stat, theme: T }) {
  const rate = stat.rate;
  const color = rate >= 85 ? T.emerald : rate >= 60 ? T.gold : '#ef4444';
  return (
    <View style={styles.heatRow}>
      <Text style={styles.heatEmoji}>{PRAYER_EMOJIS[stat.name]}</Text>
      <Text style={[styles.heatName, { color: T.text }]}>{stat.name}</Text>
      <View style={[styles.heatBarBg, { backgroundColor: T.border }]}>
        <View style={[styles.heatBarFill, { width: `${rate}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.heatPct, { color }]}>{rate}%</Text>
      {stat.bypassed > 0 && (
        <View style={styles.bypassBadge}>
          <Ionicons name="lock-open-outline" size={10} color="#f59e0b" />
          <Text style={styles.bypassCount}>{stat.bypassed}</Text>
        </View>
      )}
    </View>
  );
}

// ─── DISCIPLINE SCORE RING ───────────────────────────────────────────────────
function DisciplineScore({ score, theme: T }) {
  const color = score >= 80 ? T.emerald : score >= 60 ? T.gold : '#ef4444';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Improving' : 'Needs Work';
  return (
    <View style={[styles.scoreCard, { backgroundColor: T.surface, borderColor: T.border }]}>
      <View style={[styles.scoreRing, { borderColor: color }]}>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
        <Text style={[styles.scoreMax, { color: T.muted }]}>/100</Text>
      </View>
      <View style={styles.scoreInfo}>
        <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
        <Text style={[styles.scoreTitle, { color: T.text }]}>Discipline Score</Text>
        <Text style={[styles.scoreDesc, { color: T.muted }]}>
          Based on completion rate and bypass history
        </Text>
      </View>
    </View>
  );
}

// ─── DAILY BARS ───────────────────────────────────────────────────────────────
function DailyBars({ days, theme: T }) {
  return (
    <View style={styles.dailyBars}>
      {days.map((d, i) => {
        const color = d.percentage === 100 ? T.emerald : d.percentage >= 60 ? T.gold : '#ef4444';
        return (
          <View key={i} style={styles.dayCol}>
            <Text style={[styles.dayPct, { color: T.muted }]}>{d.prayed}</Text>
            <View style={[styles.dayBarBg, { backgroundColor: T.border }]}>
              <View style={[styles.dayBarFill, { height: `${Math.max(d.percentage, 4)}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.dayLabel, { color: T.muted }]}>{d.day}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── PATTERN CHIP ─────────────────────────────────────────────────────────────
function PatternChip({ pattern, theme: T }) {
  const isPositive = pattern.severity === 'positive';
  const bg     = isPositive ? 'rgba(16,185,129,0.12)' : pattern.severity === 'high' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)';
  const border = isPositive ? 'rgba(16,185,129,0.3)'  : pattern.severity === 'high' ? 'rgba(239,68,68,0.3)'  : 'rgba(245,158,11,0.3)';
  const color  = isPositive ? T.emerald                : pattern.severity === 'high' ? '#ef4444'               : '#f59e0b';
  return (
    <View style={[styles.patternChip, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.patternText, { color }]}>{pattern.message}</Text>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function WeeklyReportScreen({ navigation }) {
  const { theme: T } = useTheme();
  const { logs }     = usePrayerStore();
  const { profile }  = useAuthStore();

  const [report,     setReport]     = useState(null);
  const [nudges,     setNudges]     = useState([]);
  const [strictness, setStrictness] = useState(STRICTNESS.GENTLE);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const bypasses = await AppBlocker.getBypassLog();
      const result   = await BehaviorEngine.analyze(logs, bypasses, profile);
      setReport(result.weeklyReport);
      setNudges(result.nudges.slice(0, 3));
      setStrictness(result.strictnessLevel);
    } catch (e) {
      console.warn('WeeklyReport load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [logs, profile]);

  useEffect(() => { load(); }, [load]);

  const handleDismissNudge = (id) => setNudges(prev => prev.filter(n => n.id !== id));

  const handleStrictnessChange = async (level) => {
    await BehaviorEngine.setStrictness(level);
    setStrictness(level);
  };

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: T.bg }]}>
        <ActivityIndicator size="large" color={T.gold} />
        <Text style={[styles.loaderText, { color: T.muted }]}>Analyzing your patterns…</Text>
      </View>
    );
  }

  const r = report;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: T.bg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.gold} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: T.text }]}>Weekly Report</Text>
          <Text style={[styles.headerSub,   { color: T.muted }]}>Your personal discipline coach</Text>
        </View>
        <View style={[styles.coachBadge, { backgroundColor: T.surface, borderColor: T.border }]}>
          <Text style={styles.coachEmoji}>🤖</Text>
          <Text style={[styles.coachLabel, { color: T.gold }]}>Coach</Text>
        </View>
      </View>

      {/* Smart Nudges */}
      {nudges.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: T.muted }]}>INSIGHTS FOR YOU</Text>
          {nudges.map(n => (
            <NudgeCard key={n.id} nudge={n} onDismiss={handleDismissNudge} />
          ))}
        </View>
      )}

      {/* Discipline Score + Trend */}
      {r && (
        <>
          <View style={[styles.trendRow, { paddingHorizontal: 16 }]}>
            <DisciplineScore score={r.disciplineScore} theme={T} />
            <View style={[styles.trendCard, { backgroundColor: T.surface, borderColor: T.border }]}>
              <Text style={[styles.trendIcon, { color: r.trend === 'up' ? T.emerald : r.trend === 'down' ? '#ef4444' : T.muted }]}>
                {r.trend === 'up' ? '📈' : r.trend === 'down' ? '📉' : '➡️'}
              </Text>
              <Text style={[styles.trendDelta, { color: r.trend === 'up' ? T.emerald : r.trend === 'down' ? '#ef4444' : T.muted }]}>
                {r.trend === 'up' ? '+' : r.trend === 'down' ? '-' : ''}{r.trendDelta}
              </Text>
              <Text style={[styles.trendLabel, { color: T.muted }]}>vs last week</Text>
              <Text style={[styles.trendTotal, { color: T.gold }]}>{r.weekTotal}/{r.weekMax}</Text>
              <Text style={[styles.trendSublabel, { color: T.muted }]}>prayers this week</Text>
            </View>
          </View>

          {/* Daily Breakdown */}
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[styles.cardLabel, { color: T.muted }]}>DAILY BREAKDOWN</Text>
            <DailyBars days={r.dailyBreakdown} theme={T} />
            <View style={styles.bestWorstRow}>
              <View style={[styles.bestWorstChip, { backgroundColor: T.emerald + '15' }]}>
                <Text style={[styles.bestWorstLabel, { color: T.emerald }]}>Best: {r.bestDay?.day} ({r.bestDay?.prayed}/5)</Text>
              </View>
              <View style={[styles.bestWorstChip, { backgroundColor: '#ef444415' }]}>
                <Text style={[styles.bestWorstLabel, { color: '#ef4444' }]}>Worst: {r.worstDay?.day} ({r.worstDay?.prayed}/5)</Text>
              </View>
            </View>
          </View>

          {/* Per-Prayer Breakdown */}
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[styles.cardLabel, { color: T.muted }]}>PRAYER PERFORMANCE</Text>
            {r.prayerStats.map(stat => (
              <PrayerHeatRow key={stat.name} stat={stat} theme={T} />
            ))}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <Ionicons name="lock-open-outline" size={12} color="#f59e0b" />
                <Text style={[styles.legendText, { color: T.muted }]}> = bypass attempts</Text>
              </View>
            </View>
          </View>

          {/* Detected Patterns */}
          {r.patterns.length > 0 && (
            <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
              <Text style={[styles.cardLabel, { color: T.muted }]}>DETECTED PATTERNS</Text>
              <View style={styles.patternsWrap}>
                {r.patterns.map((p, i) => <PatternChip key={i} pattern={p} theme={T} />)}
              </View>
            </View>
          )}

          {/* Coach Insights */}
          {r.insights.length > 0 && (
            <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}>
              <Text style={[styles.cardLabel, { color: T.muted }]}>COACH ANALYSIS</Text>
              {r.insights.map((ins, i) => (
                <View key={i} style={[styles.insightRow, i < r.insights.length - 1 && { borderBottomWidth: 1, borderBottomColor: T.border }]}>
                  <Text style={styles.insightEmoji}>{ins.emoji}</Text>
                  <Text style={[styles.insightText, { color: T.text }]}>{ins.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Strictness Selector */}
          <View style={{ paddingHorizontal: 16 }}>
            <StrictnessSelector current={strictness} onChange={handleStrictnessChange} />
          </View>

          {/* Streak */}
          {r.streak > 0 && (
            <View style={[styles.streakCard, { backgroundColor: T.gold + '15', borderColor: T.gold + '40' }]}>
              <Text style={styles.streakFire}>🔥</Text>
              <View>
                <Text style={[styles.streakNum, { color: T.gold }]}>{r.streak} Day Streak</Text>
                <Text style={[styles.streakSub, { color: T.muted }]}>
                  {r.streak < 3 ? 'Building momentum…' : r.streak < 7 ? 'Keep it going!' : r.streak < 30 ? 'MashaAllah — a true habit!' : 'SubhanAllah — legendary!'}
                </Text>
              </View>
            </View>
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const BAR_HEIGHT = 100;

const styles = StyleSheet.create({
  container:     { flex: 1 },
  loader:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText:    { fontSize: 14 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 8 },
  headerTitle:   { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  headerSub:     { fontSize: 14 },
  coachBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  coachEmoji:    { fontSize: 18 },
  coachLabel:    { fontSize: 12, fontWeight: '700' },

  section:       { paddingHorizontal: 16, marginBottom: 8, marginTop: 8 },
  sectionLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  card:          { marginHorizontal: 16, marginBottom: 12, padding: 18, borderRadius: 20, borderWidth: 1 },
  cardLabel:     { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  cardSubtitle:  { fontSize: 12, marginBottom: 14 },

  // Trend + Score row
  trendRow:      { flexDirection: 'row', gap: 12, marginBottom: 12 },
  scoreCard:     { flex: 1.4, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, gap: 12 },
  scoreRing:     { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  scoreNumber:   { fontSize: 22, fontWeight: '900' },
  scoreMax:      { fontSize: 10 },
  scoreInfo:     { flex: 1 },
  scoreLabel:    { fontSize: 14, fontWeight: '800' },
  scoreTitle:    { fontSize: 12, fontWeight: '600', marginTop: 2 },
  scoreDesc:     { fontSize: 10, marginTop: 2, lineHeight: 14 },
  trendCard:     { flex: 1, padding: 14, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  trendIcon:     { fontSize: 22 },
  trendDelta:    { fontSize: 22, fontWeight: '800' },
  trendLabel:    { fontSize: 10, textAlign: 'center' },
  trendTotal:    { fontSize: 18, fontWeight: '800', marginTop: 6 },
  trendSublabel: { fontSize: 10, textAlign: 'center' },

  // Daily bars
  dailyBars:     { flexDirection: 'row', gap: 6, height: BAR_HEIGHT, marginBottom: 12 },
  dayCol:        { flex: 1, alignItems: 'center', height: '100%', gap: 4 },
  dayPct:        { fontSize: 10, fontWeight: '600' },
  dayBarBg:      { flex: 1, width: '100%', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  dayBarFill:    { width: '100%', borderRadius: 6, minHeight: 4 },
  dayLabel:      { fontSize: 10, fontWeight: '600' },
  bestWorstRow:  { flexDirection: 'row', gap: 8 },
  bestWorstChip: { flex: 1, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center' },
  bestWorstLabel:{ fontSize: 11, fontWeight: '700' },

  // Prayer heat
  heatRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  heatEmoji:     { fontSize: 18, width: 28 },
  heatName:      { fontSize: 13, fontWeight: '600', width: 56 },
  heatBarBg:     { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  heatBarFill:   { height: 8, borderRadius: 4 },
  heatPct:       { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
  bypassBadge:   { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8 },
  bypassCount:   { fontSize: 10, color: '#f59e0b', fontWeight: '700' },
  legendRow:     { flexDirection: 'row', marginTop: 4 },
  legendItem:    { flexDirection: 'row', alignItems: 'center' },
  legendText:    { fontSize: 11 },

  // Patterns
  patternsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  patternChip:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  patternText:   { fontSize: 12, fontWeight: '600' },

  // Insights
  insightRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  insightEmoji:  { fontSize: 20, marginTop: 1 },
  insightText:   { flex: 1, fontSize: 13, lineHeight: 20 },

  // Strictness
  strictnessRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  strictnessBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, gap: 2 },
  strictnessEmoji:{ fontSize: 18 },
  strictnessLabel:{ fontSize: 10, fontWeight: '700' },
  strictnessMins: { fontSize: 9 },
  strictnessDesc: { fontSize: 12, lineHeight: 18, fontStyle: 'italic' },

  // Streak
  streakCard:    { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, borderWidth: 1 },
  streakFire:    { fontSize: 36 },
  streakNum:     { fontSize: 22, fontWeight: '800' },
  streakSub:     { fontSize: 13, marginTop: 2 },
});
