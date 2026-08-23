// src/components/SmartMotivation.js
// ─────────────────────────────────────────────────────────────
// Emotional + Human Feedback layer
// • Smart messages from BehaviorEngine
// • Gentle recovery mode when user fails
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function analyzeBehavior({ todayLogs, yesterdayLogs, streak, weekLogs }) {
  const todayDone = PRAYER_NAMES.filter(p =>
    todayLogs[p] === 'prayed' || todayLogs[p] === 'prayed_late'
  ).length;

  const yesterdayDone = PRAYER_NAMES.filter(p =>
    yesterdayLogs?.[p] === 'prayed' || yesterdayLogs?.[p] === 'prayed_late'
  ).length;

  // Check Fajr improvement
  const fajrThisWeek = weekLogs?.filter(d => d['Fajr'] === 'prayed').length ?? 0;
  const fajrLastWeek = weekLogs?.filter(d => d['Fajr'] === 'prayed').length ?? 0;

  // Recovery mode: failed yesterday
  if (yesterdayDone === 0) {
    return {
      type: 'recovery',
      message: 'Missed yesterday, but today is a fresh start 🌅',
      subtext: 'Every day is a new opportunity. Begin with Fajr.',
      color: '#9ca3af',
      icon: 'refresh',
      isRecovery: true,
    };
  }

  // Near best streak
  if (streak >= 5) {
    return {
      type: 'streak',
      message: `You're on a ${streak}-day streak 🔥`,
      subtext: "Don't break the chain — pray all 5 today.",
      color: '#f59e0b',
      icon: 'flame',
    };
  }

  // Improved Fajr
  if (fajrThisWeek >= 4) {
    return {
      type: 'fajr',
      message: 'You improved Fajr this week 👏',
      subtext: 'The most blessed prayer — keep it up.',
      color: '#c9a84c',
      icon: 'sunny',
    };
  }

  // Doing well today
  if (todayDone >= 3) {
    return {
      type: 'progress',
      message: `${todayDone}/5 prayers done — stay consistent 💪`,
      subtext: "You're making Masha'Allah progress.",
      color: '#10b981',
      icon: 'trending-up',
    };
  }

  // Morning encouragement
  const hour = new Date().getHours();
  if (hour < 10) {
    return {
      type: 'morning',
      message: 'A blessed day begins with Fajr 🌅',
      subtext: 'Start strong. One prayer at a time.',
      color: '#c9a84c',
      icon: 'partly-sunny',
    };
  }

  // Default
  return {
    type: 'default',
    message: 'Stay consistent today 💪',
    subtext: 'Every prayer brings you closer.',
    color: '#9ca3af',
    icon: 'heart',
  };
}

export default function SmartMotivation({
  todayLogs = {},
  yesterdayLogs = {},
  streak = 0,
  weekLogs = [],
}) {
  const { theme: T } = useTheme();
  const slideAnim = useRef(new Animated.Value(-10)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [dismissed, setDismissed] = useState(false);

  const insight = analyzeBehavior({ todayLogs, yesterdayLogs, streak, weekLogs });

  useEffect(() => {
    setDismissed(false);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [todayLogs]);

  if (dismissed) return null;

  return (
    <Animated.View style={[
      styles.card,
      {
        backgroundColor: insight.isRecovery
          ? (T.isDark ? 'rgba(156,163,175,0.08)' : 'rgba(156,163,175,0.08)')
          : (T.isDark ? `${insight.color}10` : `${insight.color}12`),
        borderColor: `${insight.color}30`,
        opacity: opacityAnim,
        transform: [{ translateY: slideAnim }],
      },
    ]}>
      <View style={[styles.iconWrap, { backgroundColor: `${insight.color}20` }]}>
        <Ionicons name={insight.icon + '-outline'} size={16} color={insight.color} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.message, { color: insight.isRecovery ? T.muted : T.text }]}>
          {insight.message}
        </Text>
        <Text style={[styles.subtext, { color: T.muted }]}>
          {insight.subtext}
        </Text>
      </View>

      <TouchableOpacity onPress={() => setDismissed(true)} style={styles.closeBtn}>
        <Ionicons name="close" size={14} color={T.muted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  message: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    marginBottom: 2,
  },
  subtext: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  closeBtn: {
    padding: 4,
  },
});
