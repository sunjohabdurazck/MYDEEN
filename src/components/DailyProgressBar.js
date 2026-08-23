// src/components/DailyProgressBar.js — PREMIUM (XP tiers, clean streak, no clutter)
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const THEME = {
  bg: '#0d1120', surface: '#111827', gold: '#c9a84c',
  emerald: '#10b981', orange: '#f59e0b', red: '#ef4444',
  text: '#f9fafb', muted: '#9ca3af', border: 'rgba(255,255,255,0.07)',
};

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_ICONS = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌙', Isha: '⭐' };

// XP per prayer × streak multiplier
function calcXP(done, streak) {
  const base = done * 20;                            // 20 XP per prayer
  const bonus = done === 5 ? 50 : 0;                // 50 XP bonus for perfect day
  const multiplier = streak >= 30 ? 2.0
    : streak >= 14 ? 1.5
    : streak >= 7  ? 1.25
    : streak >= 3  ? 1.1
    : 1.0;
  return Math.round((base + bonus) * multiplier);
}

// Total XP needed for next level (simple curve)
function xpForLevel(level) { return level * 200; }

function totalXPToLevel(profile) {
  // Profile carries total_xp; we derive level from that
  return profile?.total_xp ?? 0;
}

function levelFromXP(xp) {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, remaining, needed: xpForLevel(level) };
}

const STREAK_TIER = (s) => {
  if (s >= 365) return { label: '365+ Day Legend', color: '#a78bfa', icon: '👑' };
  if (s >= 100) return { label: `${s} Day Streak`,  color: '#f59e0b', icon: '🏆' };
  if (s >= 30)  return { label: `${s} Day Streak`,  color: '#10b981', icon: '🔥' };
  if (s >= 7)   return { label: `${s} Day Streak`,  color: '#f59e0b', icon: '🔥' };
  if (s >= 1)   return { label: `${s} Day Streak`,  color: THEME.muted, icon: '🌱' };
  return { label: 'Start your streak', color: THEME.muted, icon: '🌱' };
};

const MESSAGES = [
  { min: 5, text: "Masha'Allah — perfect day!", color: THEME.emerald },
  { min: 4, text: 'Almost there — one more prayer!', color: THEME.gold },
  { min: 3, text: 'Halfway there — keep going!', color: THEME.gold },
  { min: 2, text: 'Good start — stay consistent!', color: THEME.orange },
  { min: 1, text: 'Begin your journey with prayer', color: THEME.orange },
  { min: 0, text: 'Start your day with Fajr', color: THEME.muted },
];

function getMessage(done) {
  return MESSAGES.find(m => done >= m.min) || MESSAGES[MESSAGES.length - 1];
}

export default function DailyProgressBar({ done = 0, total = 5, streak = 0, totalXP = 0 }) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const xpGainAnim   = useRef(new Animated.Value(0)).current;
  const [showXPFlash, setShowXPFlash] = useState(false);
  const prevDone = useRef(done);

  const pct         = total > 0 ? (done / total) * 100 : 0;
  const isComplete  = done === total && total > 0;
  const progressColor = isComplete ? THEME.emerald : THEME.gold;
  const xpEarned    = calcXP(done, streak);
  const { level, remaining, needed } = levelFromXP(totalXP);
  const levelPct    = needed > 0 ? Math.round((remaining / needed) * 100) : 0;
  const streakInfo  = STREAK_TIER(streak);
  const msg         = getMessage(done);

  // Animate progress bar
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: pct,
      tension: 60,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  // Flash XP gain when done increases
  useEffect(() => {
    if (done > prevDone.current) {
      setShowXPFlash(true);
      Animated.sequence([
        Animated.timing(xpGainAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(xpGainAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(xpGainAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start(() => setShowXPFlash(false));
    }
    prevDone.current = done;
  }, [done]);

  return (
    <View style={styles.container}>

      {/* ── Top row: prayers + streak ── */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Today's Prayers</Text>
          <Text style={[styles.subtitle, { color: msg.color }]}>{msg.text}</Text>
        </View>
        {streak > 0 && (
          <View style={[styles.streakBadge, { borderColor: streakInfo.color + '40', backgroundColor: streakInfo.color + '12' }]}>
            <Text style={styles.streakIcon}>{streakInfo.icon}</Text>
            <Text style={[styles.streakText, { color: streakInfo.color }]}>{streakInfo.label}</Text>
          </View>
        )}
      </View>

      {/* ── Prayer dots ── */}
      <View style={styles.dotsRow}>
        {PRAYERS.map((name, i) => {
          const done_i = i < done;
          return (
            <View key={name} style={styles.dotWrap}>
              <View style={[
                styles.dot,
                done_i
                  ? { backgroundColor: progressColor + '22', borderColor: progressColor }
                  : { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: THEME.border },
              ]}>
                <Text style={styles.dotEmoji}>{done_i ? '✅' : PRAYER_ICONS[name]}</Text>
              </View>
              <Text style={[styles.dotLabel, { color: done_i ? progressColor : THEME.muted }]}>{name}</Text>
            </View>
          );
        })}
      </View>

      {/* ── Prayer progress bar ── */}
      <View style={styles.barTrack}>
        <Animated.View
          style={[styles.barFill, {
            width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            backgroundColor: progressColor,
          }]}
        />
      </View>
      <Text style={[styles.barLabel, { color: progressColor }]}>{done}/{total} prayers</Text>

      {/* ── XP + Level ── */}
      <View style={[styles.xpRow, { borderTopColor: THEME.border }]}>
        {/* Today's XP */}
        <View style={styles.xpBlock}>
          <Text style={styles.xpValue}>+{xpEarned}</Text>
          <Text style={styles.xpLabel}>Today's XP</Text>
        </View>

        {/* Level progress */}
        <View style={styles.levelBlock}>
          <View style={styles.levelHeader}>
            <Text style={[styles.levelTag, { color: THEME.gold }]}>Lvl {level}</Text>
            <Text style={[styles.levelPct, { color: THEME.muted }]}>{levelPct}%</Text>
          </View>
          <View style={styles.levelTrack}>
            <View style={[styles.levelFill, { width: `${levelPct}%` }]} />
          </View>
          <Text style={[styles.levelSub, { color: THEME.muted }]}>{remaining}/{needed} XP</Text>
        </View>

        {/* Total XP */}
        <View style={styles.xpBlock}>
          <Text style={styles.xpValue}>{totalXP.toLocaleString()}</Text>
          <Text style={styles.xpLabel}>Total XP</Text>
        </View>
      </View>

      {/* ── Floating XP flash ── */}
      {showXPFlash && (
        <Animated.View style={[styles.xpFlash, {
          opacity: xpGainAnim,
          transform: [{ translateY: xpGainAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) }],
        }]}>
          <Text style={styles.xpFlashText}>+20 XP</Text>
        </Animated.View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
  },

  topRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title:    { fontSize: 15, fontWeight: '700', color: THEME.text, marginBottom: 2 },
  subtitle: { fontSize: 12 },

  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, maxWidth: 150 },
  streakIcon:  { fontSize: 13 },
  streakText:  { fontSize: 11, fontWeight: '700' },

  dotsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  dotWrap: { alignItems: 'center', gap: 5 },
  dot:     { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotEmoji: { fontSize: 18 },
  dotLabel: { fontSize: 9, fontWeight: '600' },

  barTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  barFill:  { height: 6, borderRadius: 3 },
  barLabel: { fontSize: 11, fontWeight: '700', textAlign: 'right', marginBottom: 14 },

  xpRow:     { flexDirection: 'row', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, gap: 12 },
  xpBlock:   { alignItems: 'center', flex: 1 },
  xpValue:   { fontSize: 18, fontWeight: '800', color: THEME.gold },
  xpLabel:   { fontSize: 9, color: THEME.muted, marginTop: 2, fontWeight: '600', letterSpacing: 0.5 },

  levelBlock:  { flex: 2 },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  levelTag:    { fontSize: 13, fontWeight: '800' },
  levelPct:    { fontSize: 11 },
  levelTrack:  { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  levelFill:   { height: 5, borderRadius: 3, backgroundColor: THEME.gold },
  levelSub:    { fontSize: 9, textAlign: 'center' },

  xpFlash: {
    position: 'absolute',
    right: 16,
    bottom: 60,
    backgroundColor: THEME.gold,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  xpFlashText: { fontSize: 13, fontWeight: '800', color: THEME.bg },
});
