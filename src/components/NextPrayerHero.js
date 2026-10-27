// src/components/NextPrayerHero.js — LIVE COUNTDOWN
//
// Hardening notes:
// • Countdown is DERIVED from a single `now` tick (useMemo) instead of being
//   copied into state. The original could render one frame with the old
//   countdown after `nextPrayer` changed (e.g. a red "urgent" flash).
// • Time parsing is validated (hours 0–23, minutes 0–59, optional AM/PM) and
//   returns `null` for bad input; the original showed "Now" for invalid times.
// • At Fajr time the card shows "Now" (5-min grace) instead of instantly
//   jumping to a ~24h countdown for tomorrow's Fajr. You can also pass
//   `nextPrayer.isTomorrow = true` to be explicit.
// • Targets are built with new Date(y, m, d, h, min), so DST can't skew them.
// • `location.latitude.toFixed` can't throw on strings/null anymore.
// • Interval, animations and app-resume are handled; reduce-motion respected.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, AppState, AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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

const WINDOW_SECS = 2 * 60 * 60;     // progress bar covers the final 2 hours
const FAJR_GRACE_MS = 5 * 60 * 1000; // show "Now" this long after Fajr time
const PRESS_LOCK_MS = 800;           // ignore rapid double taps

// ── Time helpers ──────────────────────────────────────────────

/** Parses "HH:MM", "HH:MM (EDT)", "HH:MM:SS" or "h:mm AM/PM" → { h, min } | null */
function parseHM(timeStr) {
  if (typeof timeStr !== 'string' && typeof timeStr !== 'number') return null;
  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)?/i);
  if (!match) return null;

  let h = Number(match[1]);
  const min = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();

  if (min > 59) return null;
  if (meridiem) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (meridiem === 'pm' ? 12 : 0);
  } else if (h > 23) {
    return null;
  }
  return { h, min };
}

/** Seconds until the prayer, 0 if it is "now"/passed, or null if the time is invalid. */
function computeSecondsLeft(nextPrayer, nowMs) {
  const hm = parseHM(nextPrayer?.time);
  if (!hm) return null;

  const now = new Date(nowMs);
  const at = (dayOffset) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hm.h, hm.min, 0, 0);

  let target = at(0);
  if (nextPrayer.isTomorrow === true) {
    target = at(1);
  } else if (target.getTime() <= nowMs && nextPrayer.name === 'Fajr') {
    // Fajr already passed today: it's either "now" (grace) or tomorrow's Fajr.
    if (nowMs - target.getTime() > FAJR_GRACE_MS) target = at(1);
  }
  return Math.max(0, Math.floor((target.getTime() - nowMs) / 1000));
}

function formatCountdown(secondsLeft) {
  if (secondsLeft === null) return { primary: '--:--', secondary: null };
  if (secondsLeft <= 0) return { primary: '00:00', secondary: null };

  const h = Math.floor(secondsLeft / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = secondsLeft % 60;
  if (h > 0) return { primary: `${h}h ${String(m).padStart(2, '0')}m`, secondary: null };
  return {
    primary: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
    secondary: m < 15 ? 'Hurry — prayer time is near!' : 'Time remaining',
  };
}

function formatPrayerTime(time) {
  const hm = parseHM(time);
  if (!hm) return typeof time === 'string' && time.trim() ? time : '--:--';
  const ampm = hm.h >= 12 ? 'PM' : 'AM';
  const h12 = hm.h % 12 || 12;
  return `${h12}:${String(hm.min).padStart(2, '0')} ${ampm}`;
}

// ── Component ─────────────────────────────────────────────────
function NextPrayerHero({ nextPrayer, timings, location, onLockMode, onMarkDone }) {
  const [now, setNow] = useState(() => Date.now());
  const [reduceMotion, setReduceMotion] = useState(false);
  const [quoteIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const onLockRef = useRef(onLockMode);
  const onDoneRef = useRef(onMarkDone);
  const lastPress = useRef({ lock: 0, done: 0 });
  useEffect(() => {
    onLockRef.current = onLockMode;
    onDoneRef.current = onMarkDone;
  }, [onLockMode, onMarkDone]);

  // ── Reduce-motion preference ──
  useEffect(() => {
    let active = true;
    try {
      AccessibilityInfo.isReduceMotionEnabled?.()
        .then((v) => active && setReduceMotion(!!v))
        .catch(() => {});
    } catch (e) {
      // ignore
    }
    return () => { active = false; };
  }, []);

  // ── Entrance animation ──
  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      return undefined;
    }
    const anim = Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, fadeAnim, scaleAnim]);

  // ── Pulse loop ──
  useEffect(() => {
    if (reduceMotion) {
      pulseAnim.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 1200, useNativeDriver: true }),
    ]));
    loop.start();
    return () => { loop.stop(); pulseAnim.setValue(1); };
  }, [reduceMotion, pulseAnim]);

  // ── Clock tick: one interval, plus an instant resync when the app resumes ──
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    const sub = AppState.addEventListener?.('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(id);
      sub?.remove?.();
    };
  }, []);

  const secondsLeft = useMemo(
    () => computeSecondsLeft(nextPrayer, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nextPrayer?.name, nextPrayer?.time, nextPrayer?.isTomorrow, now]
  );

  const guardedPress = useCallback((key, ref) => {
    const t = Date.now();
    if (t - lastPress.current[key] < PRESS_LOCK_MS) return;
    lastPress.current[key] = t;
    try {
      ref.current?.();
    } catch (e) {
      console.warn(`NextPrayerHero: ${key} handler threw`, e);
    }
  }, []);
  const handleLock = useCallback(() => guardedPress('lock', onLockRef), [guardedPress]);
  const handleDone = useCallback(() => guardedPress('done', onDoneRef), [guardedPress]);

  if (!nextPrayer?.name) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Loading prayer times…</Text>
      </View>
    );
  }

  const hasTime  = secondsLeft !== null;
  const isUrgent = hasTime && secondsLeft > 0 && secondsLeft < 10 * 60; // < 10 minutes
  const isPassed = hasTime && secondsLeft === 0;
  const { primary, secondary } = formatCountdown(secondsLeft);
  const gradientColors = isUrgent
    ? ['rgba(239,68,68,0.18)', 'rgba(201,168,76,0.06)']
    : ['rgba(201,168,76,0.10)', 'rgba(16,185,129,0.04)'];

  // Progress: fraction of the final 2-hour window that has passed
  const progress = hasTime ? Math.min(1, Math.max(0, 1 - secondsLeft / WINDOW_SECS)) : 0;

  const lat = Number(location?.latitude);
  const lon = Number(location?.longitude);
  const hasLocation =
    location?.latitude != null && location?.longitude != null &&
    Number.isFinite(lat) && Number.isFinite(lon);

  const prayerLabel = nextPrayer.name;
  const spokenCountdown = !hasTime
    ? 'time unavailable'
    : isPassed
    ? 'now'
    : `in ${Math.floor(secondsLeft / 3600)} hours ${Math.floor((secondsLeft % 3600) / 60)} minutes`;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.nextLabel}>NEXT PRAYER</Text>
          {hasLocation && (
            <View style={styles.locationBadge}>
              <Ionicons name="location-outline" size={11} color={THEME.muted} />
              <Text style={styles.locationText}>{lat.toFixed(1)}°, {lon.toFixed(1)}°</Text>
            </View>
          )}
        </View>

        {/* Prayer name */}
        <Animated.View style={[styles.prayerBlock, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.prayerEmoji}>{PRAYER_ICONS[prayerLabel] ?? '🕌'}</Text>
          <Text style={styles.prayerName}>{prayerLabel}</Text>
          {!!PRAYER_ARABIC[prayerLabel] && (
            <Text style={styles.prayerArabic}>{PRAYER_ARABIC[prayerLabel]}</Text>
          )}
        </Animated.View>

        {/* Prayer time */}
        <Text style={styles.prayerTime}>{formatPrayerTime(nextPrayer.time)}</Text>

        {/* Countdown (labelled per render but not a live region, to avoid per-second announcements) */}
        <View
          style={styles.timerBlock}
          accessible
          accessibilityLabel={`${prayerLabel} prayer ${spokenCountdown}`}
        >
          {!!secondary && (
            <Text style={[styles.timerLabel, isUrgent && { color: THEME.red }]}>{secondary}</Text>
          )}
          <Text
            style={[styles.timerValue, isUrgent && { color: THEME.red }, isPassed && { color: THEME.emerald }]}
          >
            {isPassed ? 'Now' : primary}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, {
              width: `${progress * 100}%`,
              backgroundColor: isUrgent ? THEME.red : THEME.gold,
            }]}
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.focusBtn, isUrgent && styles.focusBtnUrgent]}
            onPress={handleLock}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Start Focus Mode"
          >
            <Ionicons name="lock-closed" size={18} color="#fff" />
            <Text style={styles.focusBtnText}>Focus Mode</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.prayedBtn}
            onPress={handleDone}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${prayerLabel} as prayed`}
          >
            <Ionicons name="checkmark-circle" size={18} color={THEME.bg} />
            <Text style={styles.prayedBtnText}>I’ve Prayed</Text>
          </TouchableOpacity>
        </View>

        {/* Quote */}
        <View style={styles.quoteRow}>
          <Text style={styles.quoteIcon}>☽</Text>
          <Text style={styles.quoteText} numberOfLines={2}>{QUOTES[quoteIndex] ?? QUOTES[0]}</Text>
        </View>

      </LinearGradient>
    </Animated.View>
  );
}

export default memo(NextPrayerHero);

// ── Styles ────────────────────────────────────────────────────
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
  prayerEmoji:  { fontSize: 52, lineHeight: 64, marginBottom: 6 },
  prayerName:   { fontSize: 38, fontWeight: '800', color: THEME.text, letterSpacing: -0.5 },
  prayerArabic: { fontSize: 20, lineHeight: 34, color: THEME.gold, marginTop: 2 },

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
