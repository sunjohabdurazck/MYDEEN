// src/components/DailyMissions.js
// ─────────────────────────────────────────────────────────────
// Daily Mission System — habit loop engine
// Generates 2–3 missions per day, tracks completion, rewards XP + badge
// ─────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMissionStore } from '../store/missionStore';
import { useTheme } from '../contexts/ThemeContext';

export default function DailyMissions({ todayLogs = {}, onXPEarned }) {
  const { theme: T } = useTheme();
  const { missions, completeMission, getTodayMissions } = useMissionStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [flashId, setFlashId] = useState(null);
  // Track which auto-completed missions we've already notified about
  const notifiedMissions = useRef(new Set());

  // Recompute missions whenever todayLogs changes
  const [localMissions, setLocalMissions] = useState(() => getTodayMissions(todayLogs));

  useEffect(() => {
    const updated = getTodayMissions(todayLogs);
    setLocalMissions(updated);
  }, [todayLogs]);

  const todayMissions = localMissions;
  const allDone = todayMissions.length > 0 && todayMissions.every(m => m.completed);

  // Notify XP earned for auto-completed missions
  useEffect(() => {
    todayMissions.forEach(mission => {
      if (
        mission.completed &&
        mission.autoCompleted &&
        !notifiedMissions.current.has(mission.id)
      ) {
        notifiedMissions.current.add(mission.id);
        onXPEarned?.(mission.xp, mission.label);
      }
    });
  }, [todayMissions]);

  // Pulse the card gently when there are incomplete missions
  useEffect(() => {
    if (allDone) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.01, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [allDone]);

  const handleComplete = (mission) => {
    if (mission.completed) return;
    completeMission(mission.id, todayLogs);
    onXPEarned?.(mission.xp, mission.label);
    // Update local state immediately for responsiveness
    setLocalMissions(prev =>
      prev.map(m => m.id === mission.id ? { ...m, completed: true } : m)
    );
    setFlashId(mission.id);
    setTimeout(() => setFlashId(null), 1200);
  };

  if (todayMissions.length === 0) return null;

  const completedCount = todayMissions.filter(m => m.completed).length;

  return (
    <Animated.View style={[
      styles.card,
      {
        backgroundColor: T.isDark ? '#111827' : '#FAFAF7',
        borderColor: allDone
          ? (T.isDark ? 'rgba(16,185,129,0.35)' : 'rgba(16,185,129,0.4)')
          : (T.isDark ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.3)'),
        transform: [{ scale: pulseAnim }],
      },
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>{allDone ? '🏆' : '🎯'}</Text>
          <View>
            <Text style={[styles.title, { color: T.text }]}>Today's Mission</Text>
            <Text style={[styles.subtitle, { color: T.muted }]}>
              {completedCount}/{todayMissions.length} complete
            </Text>
          </View>
        </View>
        {allDone && (
          <View style={styles.allDoneBadge}>
            <Text style={styles.allDoneText}>All Done!</Text>
          </View>
        )}
      </View>

      {/* Missions */}
      <View style={styles.missionList}>
        {todayMissions.map((mission) => {
          const isFlashing = flashId === mission.id;
          return (
            <TouchableOpacity
              key={mission.id}
              onPress={() => handleComplete(mission)}
              activeOpacity={mission.completed ? 1 : 0.7}
              style={[
                styles.missionRow,
                {
                  backgroundColor: mission.completed
                    ? (T.isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)')
                    : (T.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                  borderColor: mission.completed
                    ? (T.isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.3)')
                    : (T.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'),
                  opacity: isFlashing ? 0.6 : 1,
                },
              ]}
            >
              {/* Check circle */}
              <View style={[
                styles.check,
                mission.completed
                  ? { backgroundColor: '#10b981', borderColor: '#10b981' }
                  : { backgroundColor: 'transparent', borderColor: T.muted },
              ]}>
                {mission.completed && (
                  <Ionicons name="checkmark" size={13} color="#fff" />
                )}
              </View>

              {/* Label */}
              <Text style={styles.missionEmoji}>{mission.emoji}</Text>
              <Text style={[
                styles.missionLabel,
                {
                  color: mission.completed ? T.muted : T.text,
                  textDecorationLine: mission.completed ? 'line-through' : 'none',
                },
              ]}>
                {mission.label}
              </Text>

              {/* XP badge */}
              <View style={[
                styles.xpBadge,
                { backgroundColor: mission.completed ? 'rgba(16,185,129,0.15)' : 'rgba(201,168,76,0.12)' },
              ]}>
                <Text style={[
                  styles.xpBadgeText,
                  { color: mission.completed ? '#10b981' : '#c9a84c' },
                ]}>
                  +{mission.xp} XP
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Total XP available */}
      {!allDone && (
        <View style={styles.footer}>
          <Ionicons name="flash" size={12} color="#c9a84c" />
          <Text style={[styles.footerText, { color: T.muted }]}>
            {todayMissions.filter(m => !m.completed).reduce((sum, m) => sum + m.xp, 0)} XP available
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerEmoji: { fontSize: 22 },
  title: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 1,
  },
  allDoneBadge: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  allDoneText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#10b981',
  },
  missionList: { gap: 8 },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionEmoji: { fontSize: 16 },
  missionLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  xpBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
  },
});
