// src/components/BadgeGrid.js
// ─────────────────────────────────────────────────────────────
// Achievements grid.
// • Uses the `earnedBadges` prop if provided, otherwise loads from Supabase.
// • Safe against: missing theme values, non-array data, missing userId,
//   Supabase `{ error }` responses (which do NOT throw), unmounts,
//   stale responses, and unstable array props causing refetch loops.
// ─────────────────────────────────────────────────────────────
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';

export const BADGES = [
  { slug: 'first_prayer',  name: 'First Step',     icon: '🕌', description: 'Logged first prayer' },
  { slug: 'perfect_day',   name: 'Perfect Day',    icon: '⭐', description: 'All 5 prayers on time' },
  { slug: '7_day_streak',  name: 'Week Warrior',   icon: '🔥', description: '7 day streak' },
  { slug: '30_day_streak', name: 'Monthly Master', icon: '🏆', description: '30 day streak' },
  { slug: 'quran_khatam',  name: 'Quran Completer', icon: '📖', description: 'Completed full Quran' },
  { slug: 'fajr_hero',     name: 'Fajr Hero',      icon: '🌅', description: 'Prayed Fajr 30 days straight' },
  { slug: 'tahajjud',      name: 'Night Vigil',    icon: '🌙', description: 'Prayed Tahajjud 10 times' },
  { slug: 'dhikr_master',  name: 'Dhikr Master',   icon: '📿', description: '1000 total dhikr' },
];

// ── Layout constants ──────────────────────────────────────────
const COLUMNS = 3;
const GAP = 12;
const H_PADDING = 12;
const HEX6 = /^#[0-9a-f]{6}$/i;

const FALLBACK_THEME = {
  text: '#111827',
  muted: '#6b7280',
  gold: '#c9a84c',
  surface: '#F9F9F6',
  border: 'rgba(0,0,0,0.08)',
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

/** Appends hex alpha only if color is a valid #RRGGBB. */
function withAlpha(color, alphaHex, fallback) {
  return typeof color === 'string' && HEX6.test(color)
    ? `${color}${alphaHex}`
    : fallback;
}

/** Keeps only string slugs; always returns an array. */
function normalizeSlugs(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((s) => typeof s === 'string');
}

/** Reads the user id whether the store exposes a function or a plain value. */
function resolveUserId(userId) {
  try {
    const id = typeof userId === 'function' ? userId() : userId;
    return id ? String(id) : null;
  } catch (e) {
    return null;
  }
}

// ── Single badge ──────────────────────────────────────────────
const BadgeCard = memo(function BadgeCard({ badge, earned, size, T }) {
  return (
    <View
      accessible
      accessibilityLabel={`${badge.name}. ${badge.description}. ${earned ? 'Earned' : 'Locked'}`}
      style={[
        styles.badgeCard,
        {
          width: size,
          minHeight: size,
          backgroundColor: earned ? withAlpha(T.gold, '0D', T.surface) : T.surface,
          borderColor: earned ? T.gold : T.border,
        },
      ]}
    >
      <Text style={styles.badgeEmoji}>{badge.icon}</Text>
      <Text
        numberOfLines={2}
        style={[styles.badgeName, { color: earned ? T.gold : T.muted }]}
      >
        {badge.name}
      </Text>
      <Text numberOfLines={3} style={[styles.badgeDesc, { color: T.muted }]}>
        {badge.description}
      </Text>
      {!earned && <View pointerEvents="none" style={styles.lockedOverlay} />}
    </View>
  );
});

// ── Grid ──────────────────────────────────────────────────────
function BadgeGrid({ earnedBadges: earnedBadgesProp }) {
  const T = useSafeTheme();
  const { width } = useWindowDimensions();
  const auth = useAuthStore();
  const userIdSource = auth?.userId;

  const hasProp = earnedBadgesProp !== undefined && earnedBadgesProp !== null;

  const [fetchedBadges, setFetchedBadges] = useState([]);
  const [loading, setLoading] = useState(!hasProp);
  const [error, setError] = useState(false);
  const requestId = useRef(0); // ignores stale responses

  const loadBadges = useCallback(async () => {
    const myRequest = ++requestId.current;
    const uid = resolveUserId(userIdSource);

    if (!uid) {
      setFetchedBadges([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      // Supabase returns { data, error } — it does not throw on query errors.
      const { data, error: dbError } = await supabase
        .from('user_badges')
        .select('badge_slug')
        .eq('user_id', uid);

      if (myRequest !== requestId.current) return; // stale or unmounted

      if (dbError) throw dbError;

      const slugs = Array.isArray(data)
        ? data.map((b) => b?.badge_slug).filter((s) => typeof s === 'string')
        : [];
      setFetchedBadges(slugs);
    } catch (err) {
      if (myRequest !== requestId.current) return;
      console.warn('BadgeGrid: failed to load badges', err);
      setError(true);
    } finally {
      if (myRequest === requestId.current) setLoading(false);
    }
  }, [userIdSource]);

  useEffect(() => {
    if (hasProp) {
      // Parent supplies data: no fetching needed. Invalidate any in-flight request.
      requestId.current++;
      setLoading(false);
      setError(false);
      return undefined;
    }

    loadBadges();
    return () => {
      requestId.current++; // marks request as stale on unmount / dependency change
    };
  }, [hasProp, loadBadges]);

  // Derive earned set from the prop directly (no state copy, no sync effect).
  const earnedSet = useMemo(
    () => new Set(normalizeSlugs(hasProp ? earnedBadgesProp : fetchedBadges)),
    [hasProp, earnedBadgesProp, fetchedBadges]
  );

  // Responsive card size so 3 columns always fit, even on small screens.
  const cardSize = useMemo(() => {
    const usable = (Number.isFinite(width) ? width : 360) - H_PADDING * 2 - GAP * (COLUMNS - 1);
    return Math.max(80, Math.floor(usable / COLUMNS));
  }, [width]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: T.text }]}>Achievements</Text>

      {loading ? (
        <ActivityIndicator
          size="small"
          color={T.gold}
          style={styles.loader}
          accessibilityLabel="Loading achievements"
        />
      ) : (
        <>
          {error && !hasProp && (
            <View style={styles.errorRow}>
              <Text style={[styles.errorText, { color: T.muted }]}>
                Couldn’t load your achievements.
              </Text>
              <TouchableOpacity
                onPress={loadBadges}
                accessibilityRole="button"
                accessibilityLabel="Retry loading achievements"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.retryText, { color: T.gold }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.grid}>
            {BADGES.map((badge) => (
              <BadgeCard
                key={badge.slug}
                badge={badge}
                earned={earnedSet.has(badge.slug)}
                size={cardSize}
                T={T}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

export default memo(BadgeGrid);

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  loader: { marginVertical: 20 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: H_PADDING,
    gap: GAP,
  },
  badgeCard: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    position: 'relative',
    borderWidth: 1,
    overflow: 'hidden',
  },
  badgeEmoji: { fontSize: 32, marginBottom: 8 },
  badgeName: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    textAlign: 'center',
  },
  badgeDesc: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  errorText: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular' },
  retryText: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold' },
});
