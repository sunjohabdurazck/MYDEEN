// src/components/JuzTracker.js
//
// Hardening notes:
// • `completedJuz` is validated (array of integers 1–30); bad input can't crash
//   `new Set(...)` and a string like "12" is no longer split into "1","2".
// • The tracker re-syncs when `completedJuz` changes (e.g. data loads later).
//   The original read the prop only once, so late-loaded progress was ignored.
// • New optional `onChange(sortedJuzArray, juzNumber, isCompleted)` so toggles
//   can be saved. Previously progress lived only in local state and was lost
//   on unmount.
// • Grid is 6 columns × 5 rows. The original `width: '13%'` × 7 + gaps
//   overflowed on most phones and wrapped unevenly.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const TOTAL_JUZ = 30;
const COLUMNS = 6;
const HEX6 = /^#[0-9a-f]{6}$/i;
const EMPTY = Object.freeze([]); // stable default (a new [] each render would re-trigger effects)

const JUZ_NAMES = [
  'Alif-Lam-Mim', 'Sayaqūl', 'Tilkal-Rusul', 'Lan Tanalū', 'Wal-Muhsanāt',
  'Lā Yuhibbullāh', "Wa Idha Sami'ū", 'Wa Lau Annanā', "Qāl-il-Mala'", 'Wa-Alamu',
  "Ya'tazerūna", 'Wa Mā Min Dābbah', "Wa Mā Ubarri'u", 'Rubamā', 'Subhānallazī',
  'Qāl Alam', 'Iqtaraba', 'Qad Aflaha', 'Wa Qālallazīna', "A'man Khalaq",
  'Utlu Mā Ūhiya', 'Wa Man Yaqnut', 'Wa Mā Liya', 'Famān Azlam', 'Ilahe Yuruddu',
  'Hā Mīm', 'Qāla Fama Khatbukum', "Qad Sami'allāh", 'Tabāraka-llazī', 'Amma',
];

// Rows of juz numbers: [[1..6], [7..12], ...]
const ROWS = Array.from({ length: TOTAL_JUZ / COLUMNS }, (_, r) =>
  Array.from({ length: COLUMNS }, (_, c) => r * COLUMNS + c + 1)
);

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

function withAlpha(color, alphaHex, fallback) {
  return typeof color === 'string' && HEX6.test(color) ? `${color}${alphaHex}` : fallback;
}

/** Returns a sorted, de-duplicated array of integers in 1..30. */
function normalizeJuz(list) {
  if (!Array.isArray(list)) return [];
  const out = new Set();
  list.forEach((v) => {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 1 && n <= TOTAL_JUZ) out.add(n);
  });
  return [...out].sort((a, b) => a - b);
}

// ── Single juz cell ───────────────────────────────────────────
const JuzCell = memo(function JuzCell({ juz, done, onToggle, T }) {
  const name = JUZ_NAMES[juz - 1];
  return (
    <TouchableOpacity
      style={[
        styles.juzCell,
        { borderColor: done ? T.gold : T.border },
        done && { backgroundColor: withAlpha(T.gold, '22', 'rgba(201,168,76,0.13)') },
      ]}
      onPress={() => onToggle(juz)}
      activeOpacity={0.75}
      hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={`Juz ${juz}, ${name}`}
    >
      <Text style={[styles.juzNum, { color: done ? T.gold : T.muted }]}>{juz}</Text>
      {done && <Ionicons name="checkmark" size={9} color={T.gold} />}
    </TouchableOpacity>
  );
});

// ── Tracker ───────────────────────────────────────────────────
function JuzTracker({ completedJuz = EMPTY, onChange }) {
  const T = useSafeTheme();

  // Content-based key: re-sync only when the actual values change,
  // not when the parent passes a fresh array with the same contents.
  const normalizedProp = useMemo(() => normalizeJuz(completedJuz), [completedJuz]);
  const propKey = normalizedProp.join(',');

  const [completed, setCompleted] = useState(() => new Set(normalizedProp));
  const completedRef = useRef(completed); // lets rapid taps build on the latest value
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Sync when the parent's data changes (e.g. loaded from server).
  useEffect(() => {
    const next = new Set(normalizedProp);
    completedRef.current = next;
    setCompleted(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propKey]);

  const toggleJuz = useCallback((juz) => {
    const next = new Set(completedRef.current);
    const nowDone = !next.has(juz);
    if (nowDone) next.add(juz);
    else next.delete(juz);

    completedRef.current = next;
    setCompleted(next);

    try {
      onChangeRef.current?.([...next].sort((a, b) => a - b), juz, nowDone);
    } catch (e) {
      console.warn('JuzTracker: onChange threw', e);
    }
  }, []);

  const completedCount = completed.size;
  const pct = Math.round((completedCount / TOTAL_JUZ) * 100);
  const isKhatam = completedCount === TOTAL_JUZ;

  return (
    <View style={[styles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: T.text }]}>📖 Quran Khatam Tracker</Text>
          <Text style={[styles.sub, { color: T.muted }]}>Tap a juz to mark complete</Text>
        </View>
        <Text
          style={[styles.count, { color: T.gold }]}
          accessibilityLabel={`${completedCount} of ${TOTAL_JUZ} juz completed`}
        >
          {completedCount}/{TOTAL_JUZ}
        </Text>
      </View>

      <View
        style={[styles.progressBar, { backgroundColor: T.border }]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Quran completion"
        accessibilityValue={{ min: 0, max: TOTAL_JUZ, now: completedCount }}
      >
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: T.gold }]} />
      </View>
      <Text style={[styles.pct, { color: T.muted }]}>
        {isKhatam ? 'Masha’Allah — khatam complete!' : `${pct}% complete`}
      </Text>

      {/* Juz grid: 5 rows × 6 columns, cells share each row equally */}
      <View style={styles.grid}>
        {ROWS.map((row, r) => (
          <View key={r} style={styles.gridRow}>
            {row.map((juz) => (
              <JuzCell
                key={juz}
                juz={juz}
                done={completed.has(juz)}
                onToggle={toggleJuz}
                T={T}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export default memo(JuzTracker);

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  headerText: { flexShrink: 1 },
  title: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold' },
  sub: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', marginTop: 2 },
  count: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold' },
  progressBar: { height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  pct: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    textAlign: 'right',
    marginBottom: 12,
  },
  grid: { gap: 6 },
  gridRow: { flexDirection: 'row', gap: 6 },
  juzCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  juzNum: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold' },
});
