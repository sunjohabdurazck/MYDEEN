// src/components/NextPrayerHero.js — LIVE COUNTDOWN (fixed)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const THEME = {
  bg: '#0d1120', surface: '#111827', gold: '#c9a84c',
  emerald: '#10b981', red: '#ef4444', orange: '#f59e0b',
  text: '#f9fafb', muted: '#9ca3af', border: 'rgba(255,255,255,0.07)',
};

const PRAYER_ARABIC = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
const PRAYER_ICONS  = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌙', Isha: '⭐' };

const QUOTES = [
  'Indeed, prayer has been decreed upon the believers a decree of specified times. — 4:103',
  'Prayer is the pillar of religion. — Prophet Muhammad ﷺ',
  'Verily, in the remembrance of Allah do hearts find rest. — 13:28',
  'The five prayers erase sins as water removes dirt. — Prophet Muhammad ﷺ',
  'Pray as if it is your last prayer. — Prophet Muhammad ﷺ',
  'Indeed, prayer prohibits immorality and wrongdoing. — 29:45',
];

// ── Parse "HH:MM" or "HH:MM (EDT)" → target Date (today or tomorrow) ─────────
function parsePrayerTime(timeStr, isTomorrow = false) {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const d = new Date();
  if (isTomorrow) d.setDate(d.getDate() + 1);
  d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return d;
}

// ── Compute live seconds remaining from the actual prayer time ─────────────────
function computeSecondsLeft(nextPrayer) {
  if (!nextPrayer?.time) return 0;
  let target = parsePrayerTime(nextPrayer.time);
  if (!target) return 0;
  // If time has already passed today and this is Fajr (wrapping overnight)
  if (target <= new Date() && nextPrayer.name === 'Fajr') {
    target = parsePrayerTime(nextPrayer.time, true);
  }
  return Math.max(0, Math.floor((target - Date.now()) / 1000));
}

export default function NextPrayerHero({ nextPrayer, timings, location, onLockMode, onMarkDone }) {
  const [secondsLeft, setSecondsLeft] = useState(() => computeSecondsLeft(nextPrayer));
  const [quoteIndex]  = useState(() => Math.floor(Math.random() * QUOTES.length));

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevPrayer = useRef(null);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulse loop
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 1200, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Live countdown — recomputes every second from actual prayer time ─────────
  useEffect(() => {
    // Reset immediately when prayer changes
    if (prevPrayer.current !== nextPrayer?.name) {
      setSecondsLeft(computeSecondsLeft(nextPrayer));
      prevPrayer.current = nextPrayer?.name ?? null;
    }
    const id = setInterval(() => {
      setSecondsLeft(computeSecondsLeft(nextPrayer));
    }, 1000);
    return () => clearInterval(id);
  }, [nextPrayer?.name, nextPrayer?.time]);

  // Format countdown display
  const formatCountdown = useCallback(() => {
    if (secondsLeft <= 0) return { primary: '00:00', secondary: null };
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;
    if (h > 0) {
      return { primary: `${h}h ${String(m).padStart(2,'0')}m`, secondary: null };
    }
    return {
      primary: `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`,
      secondary: m < 15 ? 'Hurry — prayer time is near!' : 'Time remaining',
    };
  }, [secondsLeft]);

  const formatPrayerTime = useCallback(() => {
    if (!nextPrayer?.time) return '--:--';
    const match = nextPrayer.time.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return nextPrayer.time;
    let h = parseInt(match[1]);
    const m = match[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }, [nextPrayer?.time]);

  if (!nextPrayer?.name) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Loading prayer times…</Text>
      </View>
    );
  }

  const isUrgent  = secondsLeft > 0 && secondsLeft < 10 * 60; // < 10 minutes
  const isPassed  = secondsLeft === 0;
  const { primary, secondary } = formatCountdown();
  const gradientColors = isUrgent
    ? ['rgba(239,68,68,0.18)', 'rgba(201,168,76,0.06)']
    : ['rgba(201,168,76,0.10)', 'rgba(16,185,129,0.04)'];

  // Progress: what fraction of the 2-hour window has passed
  const windowSecs = 2 * 60 * 60;
  const progress = Math.min(1, Math.max(0, 1 - (secondsLeft / windowSecs)));

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.nextLabel}>NEXT PRAYER</Text>
          {location && (
            <View style={styles.locationBadge}>
              <Ionicons name="location-outline" size={11} color={THEME.muted} />
              <Text style={styles.locationText}>{location.latitude?.toFixed(1)}°, {location.longitude?.toFixed(1)}°</Text>
            </View>
          )}
        </View>

        {/* Prayer name */}
        <Animated.View style={[styles.prayerBlock, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.prayerEmoji}>{PRAYER_ICONS[nextPrayer.name]}</Text>
          <Text style={styles.prayerName}>{nextPrayer.name}</Text>
          <Text style={styles.prayerArabic}>{PRAYER_ARABIC[nextPrayer.name]}</Text>
        </Animated.View>

        {/* Prayer time */}
        <Text style={styles.prayerTime}>{formatPrayerTime()}</Text>

        {/* Countdown */}
        <View style={styles.timerBlock}>
          {secondary && <Text style={[styles.timerLabel, isUrgent && { color: THEME.red }]}>{secondary}</Text>}
          <Text style={[styles.timerValue, isUrgent && { color: THEME.red }, isPassed && { color: THEME.emerald }]}>
            {isPassed ? 'Now' : primary}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {
            width: `${progress * 100}%`,
            backgroundColor: isUrgent ? THEME.red : THEME.gold,
          }]} />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.focusBtn, isUrgent && styles.focusBtnUrgent]} onPress={onLockMode} activeOpacity={0.8}>
            <Ionicons name="lock-closed" size={18} color="#fff" />
            <Text style={styles.focusBtnText}>Focus Mode</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.prayedBtn} onPress={onMarkDone} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={18} color={THEME.bg} />
            <Text style={styles.prayedBtnText}>I've Prayed</Text>
          </TouchableOpacity>
        </View>

        {/* Quote */}
        <View style={styles.quoteRow}>
          <Text style={styles.quoteIcon}>☽</Text>
          <Text style={styles.quoteText} numberOfLines={2}>{QUOTES[quoteIndex]}</Text>
        </View>

      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginVertical: 10, borderRadius: 24, overflow: 'hidden' },
  gradient:  { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: THEME.border },
  placeholder: { marginHorizontal: 16, marginVertical: 10, padding: 40, backgroundColor: THEME.surface, borderRadius: 24, alignItems: 'center' },
  placeholderText: { color: THEME.muted, fontSize: 14 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  nextLabel: { fontSize: 11, fontWeight: '800', color: THEME.gold, letterSpacing: 2 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  locationText: { fontSize: 10, color: THEME.muted },

  prayerBlock:  { alignItems: 'center', marginBottom: 10 },
  prayerEmoji:  { fontSize: 52, marginBottom: 6 },
  prayerName:   { fontSize: 38, fontWeight: '800', color: THEME.text, letterSpacing: -0.5 },
  prayerArabic: { fontSize: 20, color: THEME.gold, marginTop: 2 },

  prayerTime: { textAlign: 'center', fontSize: 17, color: THEME.muted, marginBottom: 18 },

  timerBlock: { alignItems: 'center', marginBottom: 14 },
  timerLabel: { fontSize: 11, color: THEME.muted, marginBottom: 4, letterSpacing: 0.5 },
  timerValue: { fontSize: 52, fontWeight: '800', color: THEME.gold, letterSpacing: 1, lineHeight: 58 },

  progressTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 3, overflow: 'hidden', marginBottom: 20 },
  progressFill:  { height: 5, borderRadius: 3 },

  actions:      { flexDirection: 'row', gap: 10, marginBottom: 16 },
  focusBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: 'rgba(239,68,68,0.14)', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.28)' },
  focusBtnUrgent: { backgroundColor: 'rgba(239,68,68,0.28)', borderColor: THEME.red },
  focusBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  prayedBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: THEME.gold, paddingVertical: 14, borderRadius: 14 },
  prayedBtnText: { fontSize: 14, fontWeight: '800', color: THEME.bg },

  quoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: THEME.border },
  quoteIcon: { fontSize: 12, color: THEME.gold, marginTop: 2 },
  quoteText: { flex: 1, fontSize: 11, color: THEME.muted, fontStyle: 'italic', lineHeight: 17 },
});
