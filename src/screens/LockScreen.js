// src/screens/LockScreen.js — PRAYER LOCK WITH CONFIRMATION FLOW
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Vibration, Dimensions, StatusBar, AppState,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { usePrayerStore, useAuthStore } from '../store';
import { AppBlocker } from '../services/appBlocker';
import { BehaviorEngine } from '../services/behaviorEngine';

const { width, height } = Dimensions.get('window');

const PRAYER_ICONS = { Fajr: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙' };

const LATE_REASONS = [
  { id: 'sleep',     label: 'Sleep'        },
  { id: 'eat',       label: 'Eat'          },
  { id: 'forget',    label: 'Forgetfulness'},
  { id: 'lazy',      label: 'Laziness'     },
  { id: 'work',      label: 'Work'         },
  { id: 'other',     label: 'Other'        },
];

const STEP_LOCK    = 'lock';
const STEP_CONFIRM = 'confirm';
const STEP_LATE    = 'late';
const STEP_DONE    = 'done';

export default function LockScreen({ navigation, route }) {
  const prayerName  = route.params?.prayer ?? 'Prayer';
  const { markPrayer } = usePrayerStore();
  const { userId, profile: userProfile } = useAuthStore();

  // ── Pull strictness from BehaviorEngine ──────────────────────────────────
  const [strictnessConfig, setStrictnessConfig] = useState(null);
  const hardcoreMode = strictnessConfig?.hardcoreMode ?? userProfile?.hardcore_mode ?? false;

  useEffect(() => {
    BehaviorEngine.getStrictness().then(({ config }) => setStrictnessConfig(config)).catch(() => {});
  }, []);

  const [step, setStep]           = useState(STEP_LOCK);
  const [countdown, setCountdown] = useState(null);
  const [bypassCount, setBypasses] = useState(0);
  const [showWarn, setShowWarn]   = useState(false);
  const [selectedReason, setReason] = useState(null);
  const [prayedLate, setPrayedLate] = useState(false);
  const [streak, setStreak]       = useState(userProfile?.streak_current ?? 0);

  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(height)).current;
  const warnAnim   = useRef(new Animated.Value(0)).current;
  const modalAnim  = useRef(new Animated.Value(height)).current;
  const doneScale  = useRef(new Animated.Value(0.8)).current;
  const doneOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.07, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    return AppBlocker.createBackHandler(hardcoreMode, handleBypassAttempt);
  }, [hardcoreMode]);

  useEffect(() => {
    if (!hardcoreMode) return;
    const sub = AppState.addEventListener('change', (s) => {
      if ((s === 'background' || s === 'inactive') && step === STEP_LOCK) handleBypassAttempt();
    });
    return () => sub.remove();
  }, [hardcoreMode, step]);

  // ── Drift-corrected countdown ─────────────────────────────────
  const timerRef = useRef(null);

  const tick = useCallback(async () => {
    const remaining = await AppBlocker.getRemainingSeconds();
    setCountdown(remaining);

    if (remaining <= 0 && step === STEP_LOCK) {
      navigation.goBack();
      return;
    }

    // Calculate exact delay to next second to avoid drift
    const now = Date.now();
    const msToNextSecond = 1000 - (now % 1000);
    timerRef.current = setTimeout(tick, msToNextSecond);
  }, [navigation, step]);

  useEffect(() => {
    tick();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [tick]);

  useEffect(() => {
    if (step === STEP_CONFIRM || step === STEP_LATE) {
      Animated.spring(modalAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }).start();
    } else if (step === STEP_DONE) {
      Animated.parallel([
        Animated.spring(doneScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(doneOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      Vibration.vibrate(200);
    } else {
      modalAnim.setValue(height);
    }
  }, [step]);

  const handleBypassAttempt = useCallback(async () => {
    if (step !== STEP_LOCK) return;
    Vibration.vibrate([0, 80, 60, 80]);
    const count = await AppBlocker.recordBypassAttempt();
    setBypasses(count ?? 0);
    setShowWarn(true);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 60, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(warnAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(warnAnim, { toValue: 0, duration: 2500, useNativeDriver: true }),
    ]).start(() => setShowWarn(false));
  }, [step]);

  const handlePrayedOnTime = async () => {
    await markPrayer(userId(), prayerName, 'prayed');
    await AppBlocker.stopBlocking();
    setStreak(s => s + 1);
    setStep(STEP_DONE);
  };

  const handlePrayedLate = () => {
    setPrayedLate(true);
    setStep(STEP_LATE);
  };

  const handleSaveReason = async () => {
    if (!selectedReason) return;
    await markPrayer(userId(), prayerName, 'prayed_late', selectedReason);
    await AppBlocker.stopBlocking();
    setStreak(s => s + 1);
    setStep(STEP_DONE);
  };

  const formatTime = (secs) => {
    if (secs === null) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const icon = PRAYER_ICONS[prayerName] ?? '🕌';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <BlurView intensity={20} style={StyleSheet.absoluteFill} />

      {showWarn && (
        <Animated.View style={[styles.warnBanner, { opacity: warnAnim }]}>
          <Text style={styles.warnText}>
            {hardcoreMode ? `⛔ Blocked — ${bypassCount} attempt${bypassCount > 1 ? 's' : ''} recorded` : '⚠️ Focus on your prayer'}
          </Text>
        </Animated.View>
      )}

      {/* Main lock content */}
      <View style={styles.content}>
        <Animated.Text style={[styles.prayerEmoji, { transform: [{ scale: pulseAnim }] }]}>{icon}</Animated.Text>
        <Text style={styles.prayerName}>{prayerName}</Text>
        <Text style={styles.subtitle}>Prayer Time</Text>
        <View style={styles.countdownRing}>
          <Text style={styles.countdownLabel}>Time Remaining</Text>
          <Text style={styles.countdownValue}>{formatTime(countdown)}</Text>
        </View>
        <View style={[styles.statusPill, hardcoreMode ? styles.hardcorePill : styles.softPill]}>
          <Ionicons name={hardcoreMode ? 'lock-closed' : 'lock-open-outline'} size={14} color={hardcoreMode ? '#ef4444' : '#f59e0b'} />
          <Text style={[styles.statusText, hardcoreMode ? styles.hardcoreText : styles.softText]}>
            {hardcoreMode ? 'Hardcore — Cannot Exit' : 'Soft Lock'}
          </Text>
        </View>
        <View style={styles.guidanceBox}>
          <Text style={styles.guidanceText}>
            {'"Indeed, prayer has been decreed upon the believers a decree of specified times." — 4:103'}
          </Text>
        </View>
      </View>

      {/* CTA */}
      {step === STEP_LOCK && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.prayedBtn} onPress={() => setStep(STEP_CONFIRM)} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle" size={24} color="#0d1120" />
            <Text style={styles.prayedText}>I Have Prayed</Text>
          </TouchableOpacity>
          {!hardcoreMode && (
            <TouchableOpacity style={styles.emergencyBtn} onPress={async () => { await AppBlocker.stopBlocking(); navigation.goBack(); }}>
              <Text style={styles.emergencyText}>Emergency Exit</Text>
            </TouchableOpacity>
          )}
          {hardcoreMode && bypassCount > 0 && (
            <Text style={styles.bypassCounter}>🔴 {bypassCount} bypass attempt{bypassCount > 1 ? 's' : ''} logged</Text>
          )}
        </View>
      )}

      {/* Confirmation modal */}
      {(step === STEP_CONFIRM || step === STEP_LATE) && (
        <Animated.View style={[styles.sheet, { transform: [{ translateY: modalAnim }] }]}>
          <View style={styles.sheetHandle} />

          {step === STEP_CONFIRM && (
            <>
              <Text style={styles.sheetTitle}>Have You Prayed {prayerName}?</Text>
              <Text style={styles.sheetSub}>Mark this prayer to keep your streak going.</Text>
              <TouchableOpacity style={styles.tealBtn} onPress={handlePrayedOnTime} activeOpacity={0.88}>
                <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                <Text style={styles.tealBtnText}>I've Prayed On Time</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.grayBtn} onPress={handlePrayedLate} activeOpacity={0.88}>
                <Text style={styles.grayBtnText}>I've Prayed Late</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep(STEP_LOCK)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {step === STEP_LATE && (
            <>
              <Text style={styles.sheetTitle}>Why Was {prayerName} Late?</Text>
              <View style={styles.reasonList}>
                {LATE_REASONS.map((r, i) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.reasonRow, i < LATE_REASONS.length - 1 && styles.reasonBorder]}
                    onPress={() => setReason(r.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.radio, selectedReason === r.id && styles.radioActive]}>
                      {selectedReason === r.id && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.reasonText, selectedReason === r.id && styles.reasonTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.tealBtn, !selectedReason && styles.tealBtnDisabled]}
                onPress={handleSaveReason}
                disabled={!selectedReason}
                activeOpacity={0.88}
              >
                <Text style={styles.tealBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep(STEP_CONFIRM)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      )}

      {/* Done screen */}
      {step === STEP_DONE && (
        <Animated.View style={[styles.doneSheet, { opacity: doneOpacity, transform: [{ scale: doneScale }] }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.doneTitle}>Alhamdulillah! 🌿</Text>
          <Text style={styles.doneSub}>
            You've completed {prayerName}{prayedLate ? ' (late)' : ' on time'}.{'\n'}Next prayer starts soon.
          </Text>
          <Text style={styles.streakLabel}>You haven't lost your pray</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakNum}>{streak}</Text>
            <Text style={styles.streakFire}>🔥</Text>
          </View>
          <Text style={styles.streakWord}>STREAKS!</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.continueTouch}>
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070d1a' },
  warnBanner: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: '#ef444499', padding: 12, alignItems: 'center' },
  warnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  prayerEmoji: { fontSize: 72 },
  prayerName: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 18, color: '#9ca3af', marginTop: -8 },
  countdownRing: { marginTop: 8, borderWidth: 2, borderColor: 'rgba(201,168,76,0.4)', borderRadius: 100, width: 180, height: 180, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,168,76,0.06)', gap: 4 },
  countdownLabel: { color: '#9ca3af', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  countdownValue: { color: '#c9a84c', fontSize: 42, fontWeight: '700' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  hardcorePill: { borderColor: '#ef444455', backgroundColor: '#ef444411' },
  softPill: { borderColor: '#f59e0b55', backgroundColor: '#f59e0b11' },
  statusText: { fontSize: 12, fontWeight: '600' },
  hardcoreText: { color: '#ef4444' },
  softText: { color: '#f59e0b' },
  guidanceBox: { maxWidth: width * 0.85, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  guidanceText: { color: '#9ca3af', fontSize: 13, lineHeight: 20, textAlign: 'center', fontStyle: 'italic' },
  actions: { padding: 24, gap: 12 },
  prayedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#c9a84c', borderRadius: 18, paddingVertical: 18 },
  prayedText: { color: '#0d1120', fontSize: 18, fontWeight: '800' },
  emergencyBtn: { alignItems: 'center', paddingVertical: 12 },
  emergencyText: { color: '#4b5563', fontSize: 14, textDecorationLine: 'underline' },
  bypassCounter: { color: '#ef4444', textAlign: 'center', fontSize: 13 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#f5f5f5', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 44, gap: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: 10 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  sheetSub: { fontSize: 14, color: '#6b7280' },
  tealBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0d9488', borderRadius: 16, paddingVertical: 16, marginTop: 4 },
  tealBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  tealBtnDisabled: { backgroundColor: '#9ca3af' },
  grayBtn: { alignItems: 'center', borderRadius: 16, paddingVertical: 16, backgroundColor: '#e5e7eb' },
  grayBtnText: { color: '#0d9488', fontSize: 17, fontWeight: '600' },
  cancelText: { color: '#0d9488', textAlign: 'center', fontSize: 16, paddingVertical: 4 },
  reasonList: { borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  reasonBorder: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#0d9488' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#0d9488' },
  reasonText: { fontSize: 16, color: '#374151', fontWeight: '500' },
  reasonTextActive: { color: '#0d9488', fontWeight: '700' },
  doneSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#f5f5f5', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 52, alignItems: 'center', gap: 6 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: '#111827', marginTop: 8 },
  doneSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  streakLabel: { color: '#9ca3af', fontSize: 13, marginTop: 16 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakNum: { fontSize: 56, fontWeight: '800', color: '#0d9488' },
  streakFire: { fontSize: 48 },
  streakWord: { color: '#0d9488', fontWeight: '800', letterSpacing: 1.5, fontSize: 14 },
  continueTouch: { marginTop: 20 },
  continueText: { color: '#0d9488', fontSize: 18, fontWeight: '700' },
});
