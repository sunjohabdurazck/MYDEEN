// src/components/EndOfDaySummary.js
// ─────────────────────────────────────────────────────────────
// Shows at Isha time or after 10 PM — summarizes the day
// "You prayed 4/5 today • XP earned: +120 • Keep pushing tomorrow"
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Platform, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useMissionStore } from '../store/missionStore';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Même logique de police que dans le reste du projet (system-ui sur le web)
const font = (name) => (Platform.OS === 'web' ? 'system-ui' : name);

// Le driver natif n'existe pas sur le web
const USE_NATIVE = Platform.OS !== 'web';

// Valeurs de repli si une couleur du thème est absente
const FALLBACK_THEME = {
  text: '#ffffff',
  muted: '#8b93a7',
  isDark: true,
};

// Jour local (et non UTC) : sert à ne montrer le résumé qu'une fois par jour
const getDayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

// Mémorisé tant que l'app est ouverte : si l'écran est recréé (navigation),
// le résumé ne réapparaît pas après avoir été fermé.
let dismissedDay = null;

function getPrayedCount(logs) {
  if (!logs || typeof logs !== 'object') return 0;
  return PRAYER_NAMES.filter(p => logs[p] === 'prayed' || logs[p] === 'prayed_late').length;
}

function getIshaTime(timings) {
  const raw = timings?.Isha;
  if (!raw) return null;
  const match = String(raw).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const t = new Date();
  t.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  return t;
}

function shouldShowSummary(timings) {
  const ishaTime = getIshaTime(timings);
  const now = new Date();
  // Show after Isha OR after 10 PM
  if (ishaTime && now >= ishaTime) return true;
  if (now.getHours() >= 22) return true;
  return false;
}

function getMessage(prayedCount) {
  if (prayedCount === 5) return { text: "Masha'Allah — perfect day! 🌟", color: '#10b981' };
  if (prayedCount >= 4) return { text: 'Almost perfect — great effort! 💪', color: '#c9a84c' };
  if (prayedCount >= 2) return { text: 'Keep pushing tomorrow 🌅', color: '#f59e0b' };
  if (prayedCount === 0) return { text: "Tomorrow is a new start — don't give up ❤️", color: '#9ca3af' };
  return { text: 'Every prayer counts — stay consistent 🤲', color: '#f59e0b' };
}

export default function EndOfDaySummary({ todayLogs, timings, totalPrayerXP = 0 }) {
  const themeCtx = useTheme();
  const T = useMemo(() => ({ ...FALLBACK_THEME, ...(themeCtx?.theme || {}) }), [themeCtx?.theme]);
  const insets = useSafeAreaInsets();
  const missionStore = useMissionStore();

  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);
  const isClosing = useRef(false);

  const logs = todayLogs && typeof todayLogs === 'object' ? todayLogs : {};
  const prayedCount = getPrayedCount(logs);

  // XP des missions : protégé si le store ou la fonction est absent(e)
  let missionXP = 0;
  try {
    missionXP = Number(missionStore?.getTodayMissionXP?.()) || 0;
  } catch (e) {
    missionXP = 0;
  }
  const totalXP = Math.max(0, Math.round((Number(totalPrayerXP) || 0) + missionXP));

  const isPerfect = prayedCount === 5;
  const isMissed = prayedCount === 0;
  const msg = useMemo(() => getMessage(prayedCount), [prayedCount]);

  const dividerColor = T.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const emptyDotColor = T.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Check once a minute if we should show
  useEffect(() => {
    const check = () => {
      if (dismissedDay === getDayKey()) return;
      if (isClosing.current) return;
      if (shouldShowSummary(timings)) setVisible(true);
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [timings]);

  // Animation d'entrée
  useEffect(() => {
    if (!visible) return undefined;
    slideAnim.setValue(60);
    opacityAnim.setValue(0);
    const anim = Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: USE_NATIVE }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: USE_NATIVE }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [visible, slideAnim, opacityAnim]);

  const handleDismiss = useCallback(() => {
    if (isClosing.current) return; // évite un double appui
    isClosing.current = true;
    dismissedDay = getDayKey(); // mémorisé tout de suite, même si l'animation est interrompue

    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 60, duration: 250, useNativeDriver: USE_NATIVE }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: USE_NATIVE }),
    ]).start(() => {
      isClosing.current = false;
      if (isMounted.current) setVisible(false);
    });
  }, [slideAnim, opacityAnim]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        {/* Toucher en dehors de la carte ferme le résumé */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleDismiss}
          accessibilityLabel="Close summary"
        />

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: T.isDark ? '#111827' : '#FFFFFF',
              paddingBottom: 28 + Math.max(insets.bottom, 12),
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Close */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={18} color={T.muted} />
          </TouchableOpacity>

          {/* Icon */}
          <Text style={styles.nightIcon}>{isPerfect ? '🌟' : isMissed ? '🌙' : '📊'}</Text>
          <Text style={[styles.heading, { color: T.text }]}>Day Summary</Text>

          {/* Prayer count */}
          <View style={[styles.statRow, { borderColor: dividerColor }]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: isPerfect ? '#10b981' : '#c9a84c' }]}>
                {prayedCount}/5
              </Text>
              <Text style={[styles.statLabel, { color: T.muted }]}>Prayers</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#c9a84c' }]}>+{totalXP}</Text>
              <Text style={[styles.statLabel, { color: T.muted }]}>XP Earned</Text>
            </View>
          </View>

          {/* Prayer breakdown */}
          <View style={styles.prayerRow}>
            {PRAYER_NAMES.map(name => {
              const status = logs[name];
              const done = status === 'prayed' || status === 'prayed_late';
              return (
                <View key={name} style={styles.prayerDot}>
                  <View style={[styles.dot, { backgroundColor: done ? '#10b981' : emptyDotColor }]}>
                    <Text style={[styles.dotText, { color: done ? '#ffffff' : T.muted }]}>
                      {done ? '✓' : '·'}
                    </Text>
                  </View>
                  <Text style={[styles.prayerLabel, { color: T.muted }]}>{name[0]}</Text>
                </View>
              );
            })}
          </View>

          {/* Motivational message */}
          <Text style={[styles.message, { color: msg.color }]}>{msg.text}</Text>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: isPerfect ? '#10b981' : '#c9a84c' }]}
            onPress={handleDismiss}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.doneBtnText}>Jazakallah Khair 🤲</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    alignItems: 'center',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    padding: 4,
  },
  nightIcon: { fontSize: 48, marginBottom: 8 },
  heading: {
    fontSize: 22,
    fontFamily: font('PlusJakartaSans-SemiBold'),
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 18,
    width: '100%',
    marginBottom: 20,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  divider: { width: 1 },
  statValue: { fontSize: 28, fontFamily: font('PlusJakartaSans-SemiBold') },
  statLabel: { fontSize: 11, fontFamily: font('PlusJakartaSans-Regular'), marginTop: 2 },
  prayerRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  prayerDot: { alignItems: 'center', gap: 4 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { fontSize: 12, fontWeight: '700' },
  prayerLabel: { fontSize: 9, fontFamily: font('PlusJakartaSans-SemiBold') },
  message: {
    fontSize: 15,
    fontFamily: font('PlusJakartaSans-Medium'),
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  doneBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 18,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: font('PlusJakartaSans-SemiBold'),
  },
});
