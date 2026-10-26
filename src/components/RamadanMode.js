// src/components/RamadanMode.js
// Affiché automatiquement pendant le Ramadan, ou dans les 30 jours qui le précèdent.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import {
  isRamadan,
  isRamadanApproaching,
  daysUntilRamadan,
  getRamadanDay,
  getRamadanLength,
} from '../utils/dateUtils';

const APPROACH_WINDOW_DAYS = 30;
const DEFAULT_RAMADAN_LENGTH = 30;

const FALLBACK = {
  text: '#111827',
  muted: '#6b7280',
  border: '#d1d5db',
  isDark: false,
};

const toInt = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Calcule tout le statut en une seule passe, sans jamais lever d'erreur
const computeStatus = () => {
  try {
    const active = Boolean(isRamadan());
    const approaching = !active && Boolean(isRamadanApproaching(APPROACH_WINDOW_DAYS));

    if (!active && !approaching) {
      return { mode: 'none', daysLeft: null, day: 1, total: DEFAULT_RAMADAN_LENGTH };
    }

    if (approaching) {
      const d = toInt(daysUntilRamadan());
      return {
        mode: 'approaching',
        daysLeft: d !== null ? Math.max(0, d) : null,
        day: 1,
        total: DEFAULT_RAMADAN_LENGTH,
      };
    }

    const rawTotal = toInt(getRamadanLength());
    const total = rawTotal !== null && rawTotal >= 1 ? rawTotal : DEFAULT_RAMADAN_LENGTH;
    const rawDay = toInt(getRamadanDay());
    const day = Math.min(total, Math.max(1, rawDay !== null ? rawDay : 1));

    return { mode: 'active', daysLeft: null, day, total };
  } catch (e) {
    return { mode: 'none', daysLeft: null, day: 1, total: DEFAULT_RAMADAN_LENGTH };
  }
};

const isSameStatus = (a, b) =>
  a.mode === b.mode && a.daysLeft === b.daysLeft && a.day === b.day && a.total === b.total;

// Millisecondes jusqu'à 00:00:05 le lendemain
const msUntilNextMidnight = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  return Math.max(1000, next.getTime() - now.getTime());
};

export default function RamadanMode({ onOpenHub }) {
  const themeCtx = useTheme();
  const T = { ...FALLBACK, ...((themeCtx && themeCtx.theme) || {}) };

  const [status, setStatus] = useState(computeStatus);

  const refresh = useCallback(() => {
    const next = computeStatus();
    setStatus((prev) => (isSameStatus(prev, next) ? prev : next));
  }, []);

  // Met à jour le statut à minuit et quand l'app revient au premier plan
  useEffect(() => {
    let timer = null;
    const schedule = () => {
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, msUntilNextMidnight());
    };
    schedule();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      if (timer) clearTimeout(timer);
      if (subscription && typeof subscription.remove === 'function') subscription.remove();
    };
  }, [refresh]);

  const handlePress = useCallback(() => {
    if (typeof onOpenHub === 'function') onOpenHub();
  }, [onOpenHub]);

  const canPress = typeof onOpenHub === 'function';

  const progressPct = useMemo(() => {
    if (status.mode !== 'active' || status.total <= 0) return 0;
    return Math.max(0, Math.min(100, (status.day / status.total) * 100));
  }, [status]);

  if (status.mode === 'none') return null;

  // Teaser : compte à rebours avant le Ramadan
  if (status.mode === 'approaching') {
    const title =
      status.daysLeft === null
        ? 'Ramadan is approaching'
        : status.daysLeft === 0
        ? 'Ramadan starts today'
        : `Ramadan in ${plural(status.daysLeft, 'day')}`;

    return (
      <TouchableOpacity
        style={[
          styles.teaser,
          { backgroundColor: T.isDark ? '#1a3a2a' : '#f0fdf4', borderColor: '#2d6a4f' },
        ]}
        onPress={handlePress}
        disabled={!canPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`${title}. Start preparing your goals.`}
      >
        <Text style={styles.moonEmoji}>🌙</Text>
        <View style={styles.teaserText}>
          <Text style={[styles.teaserTitle, { color: T.text }]}>{title}</Text>
          <Text style={[styles.teaserSub, { color: T.muted }]}>Start preparing your goals →</Text>
        </View>
        {canPress && <Ionicons name="chevron-forward" size={18} color={T.muted} />}
      </TouchableOpacity>
    );
  }

  // Widget complet pendant le Ramadan
  const remaining = Math.max(0, status.total - status.day);

  return (
    <TouchableOpacity
      style={[
        styles.widget,
        { backgroundColor: T.isDark ? '#0d2a1c' : '#f0fdf4', borderColor: '#2d6a4f' },
      ]}
      onPress={handlePress}
      disabled={!canPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`Ramadan Mubarak. Day ${status.day} of ${status.total}, ${plural(
        remaining,
        'day'
      )} remaining.`}
    >
      <View style={styles.widgetHeader}>
        <Text style={styles.bigMoon}>🌙✨</Text>
        <View style={styles.widgetTitles}>
          <Text style={[styles.widgetTitle, { color: T.text }]}>Ramadan Mubarak</Text>
          <Text style={[styles.widgetSub, { color: T.muted }]}>
            Day {status.day} of {status.total} · {plural(remaining, 'day')} remaining
          </Text>
        </View>
        {canPress && <Ionicons name="chevron-forward" size={18} color={T.muted} />}
      </View>

      <View style={[styles.progressBar, { backgroundColor: T.border }]}>
        <View
          style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: '#10b981' }]}
        />
      </View>

      {canPress && (
        <Text style={[styles.tapHint, { color: T.muted }]}>Tap to open Ramadan Hub</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  teaser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  moonEmoji: { fontSize: 22 },
  teaserText: { flex: 1 },
  teaserTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold' },
  teaserSub: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', marginTop: 1 },
  widget: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  widgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  bigMoon: { fontSize: 28 },
  widgetTitles: { flex: 1 },
  widgetTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold' },
  widgetSub: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', marginTop: 2 },
  progressBar: { height: 5, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  tapHint: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', textAlign: 'right' },
});
