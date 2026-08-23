// src/components/EndOfDaySummary.js
// ─────────────────────────────────────────────────────────────
// Shows at Isha time or midnight — summarizes the day
// "You prayed 4/5 today • XP earned: +120 • Keep pushing tomorrow"
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useMissionStore } from '../store/missionStore';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function getPrayedCount(logs) {
  return PRAYER_NAMES.filter(p => logs[p] === 'prayed' || logs[p] === 'prayed_late').length;
}

function getIshaTime(timings) {
  if (!timings?.Isha) return null;
  const match = timings.Isha.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  const now = new Date();
  const t = new Date(now);
  t.setHours(parseInt(match[1]), parseInt(match[2]), 0, 0);
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

export default function EndOfDaySummary({ todayLogs = {}, timings, totalPrayerXP = 0 }) {
  const { theme: T } = useTheme();
  const { getTodayMissionXP } = useMissionStore();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const prayedCount = getPrayedCount(todayLogs);
  const missionXP = getTodayMissionXP();
  const totalXP = totalPrayerXP + missionXP;
  const isPerfect = prayedCount === 5;
  const isMissed = prayedCount === 0;

  const getMessage = () => {
    if (isPerfect) return { text: "Masha'Allah — perfect day! 🌟", color: '#10b981' };
    if (prayedCount >= 4) return { text: 'Almost perfect — great effort! 💪', color: '#c9a84c' };
    if (prayedCount >= 2) return { text: 'Keep pushing tomorrow 🌅', color: '#f59e0b' };
    if (isMissed) return { text: "Tomorrow is a new start — don't give up ❤️", color: '#9ca3af' };
    return { text: 'Every prayer counts — stay consistent 🤲', color: '#f59e0b' };
  };

  const msg = getMessage();

  // Check once a minute if we should show
  useEffect(() => {
    if (dismissed) return;
    const check = () => {
      if (shouldShowSummary(timings) && !dismissed) {
        setVisible(true);
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [timings, dismissed]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 60, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setDismissed(true);
    });
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={handleDismiss}>
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <Animated.View style={[
          styles.card,
          {
            backgroundColor: T.isDark ? '#111827' : '#FFFFFF',
            transform: [{ translateY: slideAnim }],
          },
        ]}>
          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
            <Ionicons name="close" size={18} color={T.muted} />
          </TouchableOpacity>

          {/* Icon */}
          <Text style={styles.nightIcon}>{isPerfect ? '🌟' : isMissed ? '🌙' : '📊'}</Text>
          <Text style={[styles.heading, { color: T.text }]}>Day Summary</Text>

          {/* Prayer count */}
          <View style={[styles.statRow, { borderColor: T.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: isPerfect ? '#10b981' : '#c9a84c' }]}>
                {prayedCount}/5
              </Text>
              <Text style={[styles.statLabel, { color: T.muted }]}>Prayers</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: T.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#c9a84c' }]}>+{totalXP}</Text>
              <Text style={[styles.statLabel, { color: T.muted }]}>XP Earned</Text>
            </View>
          </View>

          {/* Prayer breakdown */}
          <View style={styles.prayerRow}>
            {PRAYER_NAMES.map(name => {
              const status = todayLogs[name];
              const done = status === 'prayed' || status === 'prayed_late';
              return (
                <View key={name} style={styles.prayerDot}>
                  <View style={[
                    styles.dot,
                    { backgroundColor: done ? '#10b981' : 'rgba(255,255,255,0.08)' },
                  ]}>
                    <Text style={{ fontSize: 10 }}>{done ? '✓' : '·'}</Text>
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
    paddingBottom: 40,
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
    fontFamily: 'PlusJakartaSans-SemiBold',
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
  statValue: { fontSize: 28, fontFamily: 'PlusJakartaSans-SemiBold' },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', marginTop: 2 },
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
  prayerLabel: { fontSize: 9, fontFamily: 'PlusJakartaSans-SemiBold' },
  message: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
});
