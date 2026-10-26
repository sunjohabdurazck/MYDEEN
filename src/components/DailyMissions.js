// src/components/DailyMissions.js
// ─────────────────────────────────────────────────────────────
// Daily Mission System — habit loop engine
// Generates 2–3 missions per day, tracks completion, rewards XP + badge
//
// Hardening notes:
// • Missions are DERIVED (useMemo) instead of copied into state by an effect.
//   The original `todayLogs = {}` default created a new object every render,
//   which re-triggered the effect → setState → re-render → infinite loop.
// • Store/callback calls are wrapped in try/catch; XP is only awarded if
//   completeMission succeeds, and never twice for the same mission.
// • Timers and animations are cleaned up; reduce-motion is respected.
// ─────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMissionStore } from '../store/missionStore';
import { useTheme } from '../contexts/ThemeContext';

// ── Constants ─────────────────────────────────────────────────
const EMPTY_LOGS = Object.freeze({}); // stable reference for the default prop
const GOLD = '#c9a84c';
const GREEN = '#10b981';
const FLASH_MS = 1200;

const FALLBACK_THEME = {
  isDark: false,
  text: '#111827',
  muted: '#6b7280',
};

// ── Helpers ───────────────────────────────────────────────────
function useSafeTheme() {
  let ctx;
  try {
    ctx = useTheme();
  } catch (e) {
    ctx = null;
  }
  return { ...FALLBACK_THEME, ...(ctx?.theme || {}) };
}

function toText(value) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  try {
    return String(value);
  } catch (e) {
    return '';
  }
}

/** Validates & normalizes whatever the store returns. Never throws. */
function normalizeMissions(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  raw.forEach((m) => {
    if (!m || typeof m !== 'object' || m.id === undefined || m.id === null) return;
    const id = String(m.id);
    if (seen.has(id)) return; // duplicate ids would break React keys
    seen.add(id);
    const xp = Number(m.xp);
    out.push({
      ...m,
      id,
      label: toText(m.label),
      emoji: toText(m.emoji),
      xp: Number.isFinite(xp) && xp > 0 ? xp : 0,
      completed: !!m.completed,
      autoCompleted: !!m.autoCompleted,
    });
  });
  return out;
}

// ── Component ─────────────────────────────────────────────────
export default function DailyMissions({ todayLogs = EMPTY_LOGS, onXPEarned }) {
  const T = useSafeTheme();

  const store = useMissionStore() || {};
  const { missions, completeMission, getTodayMissions } = store;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [flashId, setFlashId] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Locally-completed ids, for instant UI feedback before the store catches up.
  const [optimisticDone, setOptimisticDone] = useState(() => new Set());

  // Missions we've already awarded/notified XP for (auto OR manual).
  const notifiedMissions = useRef(new Set());
  // Missions currently being completed (blocks rapid double taps).
  const pendingMissions = useRef(new Set());
  const flashTimer = useRef(null);
  const mounted = useRef(true);

  // Keep the latest callback without re-running effects when its identity changes.
  const onXPEarnedRef = useRef(onXPEarned);
  useEffect(() => {
    onXPEarnedRef.current = onXPEarned;
  }, [onXPEarned]);

  const notifyXP = useCallback((xp, label) => {
    try {
      onXPEarnedRef.current?.(xp, label);
    } catch (e) {
      console.warn('DailyMissions: onXPEarned threw', e);
    }
  }, []);

  // ── Derive today's missions (no effect → no render loop) ──
  // `missions` is a dependency so store updates recompute the list.
  const baseMissions = useMemo(() => {
    if (typeof getTodayMissions !== 'function') return [];
    try {
      return normalizeMissions(getTodayMissions(todayLogs || EMPTY_LOGS));
    } catch (e) {
      console.warn('DailyMissions: getTodayMissions failed', e);
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getTodayMissions, todayLogs, missions]);

  const todayMissions = useMemo(
    () =>
      baseMissions.map((m) =>
        optimisticDone.has(m.id) && !m.completed ? { ...m, completed: true } : m
      ),
    [baseMissions, optimisticDone]
  );

  const completedCount = useMemo(
    () => todayMissions.filter((m) => m.completed).length,
    [todayMissions]
  );
  const allDone = todayMissions.length > 0 && completedCount === todayMissions.length;
  const xpAvailable = useMemo(
    () => todayMissions.filter((m) => !m.completed).reduce((sum, m) => sum + m.xp, 0),
    [todayMissions]
  );

  // Drop optimistic ids that no longer exist (e.g. day rolled over).
  useEffect(() => {
    setOptimisticDone((prev) => {
      if (prev.size === 0) return prev;
      const ids = new Set(baseMissions.map((m) => m.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [baseMissions]);

  // ── Notify XP for auto-completed missions (once each) ──
  useEffect(() => {
    todayMissions.forEach((mission) => {
      if (
        mission.completed &&
        mission.autoCompleted &&
        !notifiedMissions.current.has(mission.id)
      ) {
        notifiedMissions.current.add(mission.id);
        notifyXP(mission.xp, mission.label);
      }
    });
  }, [todayMissions, notifyXP]);

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
    return () => {
      active = false;
    };
  }, []);

  // ── Gentle pulse while there are incomplete missions ──
  const shouldPulse = todayMissions.length > 0 && !allDone && !reduceMotion;
  useEffect(() => {
    if (!shouldPulse) {
      pulseAnim.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.01, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      pulseAnim.setValue(1);
    };
  }, [shouldPulse, pulseAnim]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  // ── Manual completion ──
  const handleComplete = useCallback(
    (mission) => {
      if (!mission || mission.completed) return;
      if (pendingMissions.current.has(mission.id)) return; // double-tap guard
      if (typeof completeMission !== 'function') return;

      pendingMissions.current.add(mission.id);
      try {
        completeMission(mission.id, todayLogs || EMPTY_LOGS);
      } catch (e) {
        // Store failed → don't award XP or mark as done.
        console.warn('DailyMissions: completeMission failed', e);
        pendingMissions.current.delete(mission.id);
        return;
      }
      pendingMissions.current.delete(mission.id);

      // Award XP once, even if the store later reports it as autoCompleted.
      if (!notifiedMissions.current.has(mission.id)) {
        notifiedMissions.current.add(mission.id);
        notifyXP(mission.xp, mission.label);
      }

      // Instant UI feedback.
      setOptimisticDone((prev) => {
        const next = new Set(prev);
        next.add(mission.id);
        return next;
      });

      setFlashId(mission.id);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => {
        if (mounted.current) setFlashId(null);
      }, FLASH_MS);
    },
    [completeMission, todayLogs, notifyXP]
  );

  if (todayMissions.length === 0) return null;

  const dividerColor = T.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: T.isDark ? '#111827' : '#FAFAF7',
          borderColor: allDone
            ? T.isDark
              ? 'rgba(16,185,129,0.35)'
              : 'rgba(16,185,129,0.4)'
            : T.isDark
            ? 'rgba(201,168,76,0.2)'
            : 'rgba(201,168,76,0.3)',
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>{allDone ? '🏆' : '🎯'}</Text>
          <View>
            <Text style={[styles.title, { color: T.text }]}>Today’s Mission</Text>
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
              disabled={mission.completed}
              activeOpacity={mission.completed ? 1 : 0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: mission.completed, disabled: mission.completed }}
              accessibilityLabel={`${mission.label}, plus ${mission.xp} XP`}
              style={[
                styles.missionRow,
                {
                  backgroundColor: mission.completed
                    ? T.isDark
                      ? 'rgba(16,185,129,0.08)'
                      : 'rgba(16,185,129,0.06)'
                    : T.isDark
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(0,0,0,0.03)',
                  borderColor: mission.completed
                    ? T.isDark
                      ? 'rgba(16,185,129,0.25)'
                      : 'rgba(16,185,129,0.3)'
                    : T.isDark
                    ? 'rgba(255,255,255,0.07)'
                    : 'rgba(0,0,0,0.07)',
                  opacity: isFlashing ? 0.6 : 1,
                },
              ]}
            >
              {/* Check circle */}
              <View
                style={[
                  styles.check,
                  mission.completed
                    ? { backgroundColor: GREEN, borderColor: GREEN }
                    : { backgroundColor: 'transparent', borderColor: T.muted },
                ]}
              >
                {mission.completed && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>

              {/* Label */}
              {!!mission.emoji && <Text style={styles.missionEmoji}>{mission.emoji}</Text>}
              <Text
                style={[
                  styles.missionLabel,
                  {
                    color: mission.completed ? T.muted : T.text,
                    textDecorationLine: mission.completed ? 'line-through' : 'none',
                  },
                ]}
              >
                {mission.label}
              </Text>

              {/* XP badge */}
              <View
                style={[
                  styles.xpBadge,
                  {
                    backgroundColor: mission.completed
                      ? 'rgba(16,185,129,0.15)'
                      : 'rgba(201,168,76,0.12)',
                  },
                ]}
              >
                <Text
                  style={[styles.xpBadgeText, { color: mission.completed ? GREEN : GOLD }]}
                >
                  +{mission.xp} XP
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Total XP available */}
      {!allDone && (
        <View style={[styles.footer, { borderTopColor: dividerColor }]}>
          <Ionicons name="flash" size={12} color={GOLD} />
          <Text style={[styles.footerText, { color: T.muted }]}>{xpAvailable} XP available</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────
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
    color: GREEN,
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
  },
  footerText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
  },
});
