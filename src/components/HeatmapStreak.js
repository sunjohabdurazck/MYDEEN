// src/components/HeatmapStreak.js
//
// Hardening notes:
// • Date keys use the device's LOCAL date. The original used toISOString()
//   (UTC), which shifts the day by one in many timezones, so cells and
//   "today" could be wrong for hours each day.
// • `data` may be null/non-object; entries may be missing or malformed.
// • Renders a real calendar grid (columns = weeks, rows = weekdays). The
//   original `flexWrap` + `maxHeight` inside a horizontal ScrollView never
//   wrapped, producing one long 91-cell row.
// • Opens scrolled to the most recent week.
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const CELL_SIZE = 10;
const CELL_GAP = 3;
const DAYS_SHOWN = 91; // ~13 weeks
const PRAYERS_PER_DAY = 5;
const GREENS = ['#86efac', '#22c55e', '#10b981']; // levels 1..3

const FALLBACK_THEME = {
  isDark: false,
  text: '#111827',
  muted: '#6b7280',
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

const pad2 = (n) => String(n).padStart(2, '0');

/** YYYY-MM-DD in the device's local timezone. */
function localKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * 0 = nothing, 1–3 = increasing intensity.
 * Supports the original `{ completed: true }` shape, and optionally a
 * per-day prayer count (`count`, `prayers` or `done`) for partial days.
 */
function levelFor(entry) {
  if (!entry || typeof entry !== 'object') return 0;
  if (entry.completed === true) return 3;

  const raw = entry.count ?? entry.prayers ?? entry.done;
  const count = Number(raw);
  if (raw !== undefined && raw !== null && Number.isFinite(count) && count > 0) {
    if (count >= PRAYERS_PER_DAY) return 3;
    return count >= 3 ? 2 : 1;
  }
  return 0;
}

/** Builds weeks (columns) of 7 weekday slots, Sunday on top, ending today. */
function buildWeeks(data) {
  const safeData = data && typeof data === 'object' ? data : {};
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (DAYS_SHOWN - 1));

  const cells = [];
  for (let i = 0; i < start.getDay(); i++) cells.push(null); // align first column

  let completedDays = 0;
  for (let i = 0; i < DAYS_SHOWN; i++) {
    // Constructing from y/m/d avoids DST drift from repeated setDate on one object.
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = localKey(d);
    const level = levelFor(safeData[key]);
    if (level > 0) completedDays++;
    cells.push({ key, level });
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { weeks, completedDays };
}

// ── Component ─────────────────────────────────────────────────
function HeatmapStreak({ data, streakCount = 0 }) {
  const T = useSafeTheme();
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef(null);

  const streak = Math.max(0, Math.floor(Number(streakCount)) || 0);

  // Recomputed on each render of a new local day or new data.
  const todayKey = localKey(new Date());
  const { weeks, completedDays } = useMemo(
    () => buildWeeks(data),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, todayKey]
  );

  const emptyColor = T.isDark ? '#1f2937' : '#e5e7eb';
  const levelColors = useMemo(() => [emptyColor, ...GREENS], [emptyColor]);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  // Show the most recent weeks first.
  const scrollToLatest = useCallback(() => {
    scrollRef.current?.scrollToEnd?.({ animated: false });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggle}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Prayer streak, ${streak} ${streak === 1 ? 'day' : 'days'}`}
        accessibilityHint={expanded ? 'Collapses the heatmap' : 'Expands the heatmap'}
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.fireEmoji}>🔥</Text>
          <View>
            <Text style={[styles.title, { color: T.text }]}>Prayer Streak</Text>
            <Text style={[styles.sub, { color: T.muted }]}>
              {streak}-day streak · tap to {expanded ? 'collapse' : 'expand'}
            </Text>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={T.muted} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.mapWrapper}>
          <Text style={[styles.label, { color: T.muted }]}>3-MONTH HEATMAP</Text>

          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={scrollToLatest}
            accessible
            accessibilityLabel={`Heatmap: ${completedDays} of ${DAYS_SHOWN} days with prayers logged`}
          >
            <View style={styles.heatmapRow}>
              {weeks.map((week, w) => (
                <View key={w} style={styles.weekCol}>
                  {Array.from({ length: 7 }, (_, r) => {
                    const day = week[r];
                    if (!day) return <View key={r} style={styles.cellSpacer} />;
                    return (
                      <View
                        key={day.key}
                        importantForAccessibility="no-hide-descendants"
                        style={[styles.cell, { backgroundColor: levelColors[day.level] }]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.legend}>
            <Text style={[styles.legendText, { color: T.muted }]}>Less</Text>
            {levelColors.map((c, i) => (
              <View key={i} style={[styles.legendCell, { backgroundColor: c }]} />
            ))}
            <Text style={[styles.legendText, { color: T.muted }]}>More</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default memo(HeatmapStreak);

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fireEmoji: { fontSize: 24 },
  title: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold' },
  sub: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', marginTop: 1 },
  mapWrapper: { paddingHorizontal: 14, paddingBottom: 14 },
  label: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-SemiBold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heatmapRow: { flexDirection: 'row', gap: CELL_GAP },
  weekCol: { flexDirection: 'column', gap: CELL_GAP },
  cell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2 },
  cellSpacer: { width: CELL_SIZE, height: CELL_SIZE },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  legendCell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2 },
  legendText: { fontSize: 10, fontFamily: 'PlusJakartaSans-Regular' },
});
