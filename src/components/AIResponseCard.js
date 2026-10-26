// src/components/AIResponseCard.js
// ─────────────────────────────────────────────────────────────
// AI Trust Layer UI
// • Source badge at the TOP (📖 Based on Quran/Hadith)
// • Inline Quran ref validation (valid = tappable, invalid = "unverified")
// • Unverified fallback message
//
// Hardening notes:
// • Every call into the trust-layer service is wrapped in try/catch.
// • In Verified Mode, a parse failure FAILS CLOSED (shows "Cannot Verify")
//   instead of showing an unchecked answer as if it were verified.
// • Theme/badge/segment data is validated before use.
// ─────────────────────────────────────────────────────────────
import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import {
  annotateQuranRefs,
  getSourceBadge,
  parseVerifiedResponse,
} from '../services/aiTrustLayer';

// ── Constants ─────────────────────────────────────────────────
const GOLD = '#c9a84c';
const GREEN = '#10b981';
const GRAY = '#9ca3af';
const RED = '#ef4444';
const HEX6 = /^#[0-9a-f]{6}$/i;

const FALLBACK_THEME = {
  isDark: false,
  text: '#111827',
  muted: '#6b7280',
};

const DEFAULT_MESSAGE =
  'I cannot confidently answer this. Please consult a qualified scholar.';

// ── Helpers ───────────────────────────────────────────────────

/** Never crashes if the context/provider is missing or incomplete. */
function useSafeTheme() {
  let ctx;
  try {
    ctx = useTheme();
  } catch (e) {
    ctx = null;
  }
  return { ...FALLBACK_THEME, ...(ctx?.theme || {}) };
}

/** Appends a hex alpha (e.g. '15') only if color is a valid #RRGGBB. */
function withAlpha(color, alphaHex, fallback) {
  return typeof color === 'string' && HEX6.test(color)
    ? `${color}${alphaHex}`
    : fallback;
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

/** Always returns a valid array of segments, even if the service throws. */
function safeAnnotate(text) {
  try {
    const result = annotateQuranRefs(text);
    if (Array.isArray(result) && result.length > 0) {
      return result.filter((s) => s && typeof s === 'object');
    }
  } catch (e) {
    // fall through to plain text
  }
  return [{ text, isRef: false }];
}

/** Returns a normalized parse result. Fails closed in verified mode. */
function safeParse(responseText, isVerifiedMode) {
  if (!isVerifiedMode) {
    return {
      verified: true,
      source: null,
      answer: responseText,
      sourceType: 'unknown',
      message: null,
    };
  }
  try {
    const parsed = parseVerifiedResponse(responseText);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (e) {
    // fall through
  }
  return { verified: false, message: DEFAULT_MESSAGE };
}

function safeBadge(sourceType, source) {
  try {
    const badge = getSourceBadge(sourceType, source);
    if (badge && typeof badge === 'object' && badge.label) return badge;
  } catch (e) {
    // ignore
  }
  return null;
}

// ── Source Badge ──────────────────────────────────────────────
const SourceBadge = memo(function SourceBadge({ badge }) {
  if (!badge) return null;
  const color = HEX6.test(badge.color || '') ? badge.color : GOLD;
  return (
    <View
      style={[
        styles.sourceBadge,
        {
          backgroundColor: withAlpha(color, '15', 'rgba(201,168,76,0.08)'),
          borderColor: withAlpha(color, '35', 'rgba(201,168,76,0.2)'),
        },
      ]}
      accessible
      accessibilityLabel={`Source: ${toText(badge.label)}`}
    >
      {!!badge.emoji && <Text style={styles.sourceBadgeEmoji}>{badge.emoji}</Text>}
      <Text style={[styles.sourceBadgeText, { color }]}>{toText(badge.label)}</Text>
    </View>
  );
});

// ── Annotated text with validated refs ───────────────────────
const AnnotatedText = memo(function AnnotatedText({ text, onRefPress, textStyle }) {
  const segments = useMemo(() => safeAnnotate(text), [text]);

  return (
    <Text style={textStyle} selectable>
      {segments.map((seg, i) => {
        const key = `${i}-${toText(seg.text).length}`;
        const segText = toText(seg.text);

        if (!seg.isRef) return <Text key={key}>{segText}</Text>;

        const canNavigate =
          seg.valid &&
          typeof onRefPress === 'function' &&
          Number.isFinite(Number(seg.surah)) &&
          Number.isFinite(Number(seg.ayah));

        if (seg.valid) {
          return (
            <Text
              key={key}
              style={styles.validRef}
              accessibilityRole={canNavigate ? 'link' : undefined}
              accessibilityLabel={`Quran reference ${segText}`}
              onPress={
                canNavigate
                  ? () => onRefPress(Number(seg.surah), Number(seg.ayah))
                  : undefined
              }
            >
              [{segText}]
            </Text>
          );
        }

        // Invalid ref — show "unverified"
        return (
          <Text key={key} style={styles.invalidRef}>
            {segText}
            <Text style={styles.unverifiedTag}> (unverified)</Text>
          </Text>
        );
      })}
    </Text>
  );
});

// ── Main AI Response Card ─────────────────────────────────────
function AIResponseCard({
  responseText,
  isVerifiedMode = false,
  isLoading = false,
  onRefPress, // (surah, ayah) => void — navigate to Quran
  onConsultScholar, // () => void
}) {
  const T = useSafeTheme();

  const text = useMemo(() => toText(responseText).trim(), [responseText]);

  // Hooks must run before any early return.
  const parsed = useMemo(
    () => (text ? safeParse(text, isVerifiedMode) : null),
    [text, isVerifiedMode]
  );

  const badge = useMemo(
    () => (parsed && parsed.verified !== false ? safeBadge(parsed.sourceType, parsed.source) : null),
    [parsed]
  );

  const handleScholar = useCallback(() => {
    try {
      onConsultScholar?.();
    } catch (e) {
      // never let a parent callback crash the card
    }
  }, [onConsultScholar]);

  const cardColors = {
    backgroundColor: T.isDark ? '#111827' : '#F9F9F6',
    borderColor: T.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
  };
  const dividerColor = T.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // ── Loading ──
  if (isLoading) {
    return (
      <View style={[styles.card, cardColors]} accessibilityLiveRegion="polite">
        <View style={styles.loadingRow}>
          <Ionicons name="hourglass-outline" size={14} color={T.muted} />
          <Text style={[styles.loadingText, { color: T.muted }]}>
            Searching Islamic sources…
          </Text>
        </View>
      </View>
    );
  }

  if (!parsed) return null;

  // ── Not verified → fallback ──
  if (isVerifiedMode && parsed.verified === false) {
    return (
      <View
        style={[styles.card, cardColors, { borderColor: 'rgba(156,163,175,0.3)' }]}
        accessibilityRole="alert"
      >
        <View style={styles.unverifiedHeader}>
          <Ionicons name="shield-outline" size={16} color={GRAY} />
          <Text style={[styles.unverifiedTitle, { color: GRAY }]}>Cannot Verify</Text>
        </View>
        <Text style={[styles.unverifiedMessage, { color: T.muted }]}>
          {toText(parsed.message) || DEFAULT_MESSAGE}
        </Text>
        {typeof onConsultScholar === 'function' && (
          <TouchableOpacity
            style={styles.scholarBtn}
            onPress={handleScholar}
            accessibilityRole="button"
            accessibilityLabel="Find a scholar"
          >
            <Text style={styles.scholarBtnText}>Find a Scholar 🕌</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const answerText = toText(parsed.answer).trim() || text;
  const sourceText = toText(parsed.source).trim();

  return (
    <View style={[styles.card, cardColors]}>
      {/* ── SOURCE FIRST (top of card) ── */}
      {badge && <SourceBadge badge={badge} />}

      {!!sourceText && (
        <View style={[styles.sourceRef, { borderColor: dividerColor }]}>
          <Ionicons name="book-outline" size={12} color={T.muted} />
          <Text style={[styles.sourceRefText, { color: T.muted }]}>{sourceText}</Text>
        </View>
      )}

      {/* ── ANSWER with annotated Quran refs ── */}
      <AnnotatedText
        text={answerText}
        onRefPress={onRefPress}
        textStyle={[styles.answerText, { color: T.text }]}
      />

      {isVerifiedMode && (
        <View style={[styles.verifiedFooter, { borderTopColor: dividerColor }]}>
          <Ionicons name="shield-checkmark" size={11} color={GREEN} />
          <Text style={styles.verifiedFooterText}>Verified Mode ON</Text>
        </View>
      )}
    </View>
  );
}

export default memo(AIResponseCard);

// ── Verified Mode Toggle ─────────────────────────────────────
export const VerifiedModeToggle = memo(function VerifiedModeToggle({
  enabled = false,
  onToggle,
}) {
  const T = useSafeTheme();

  return (
    <TouchableOpacity
      onPress={typeof onToggle === 'function' ? onToggle : undefined}
      disabled={typeof onToggle !== 'function'}
      style={[
        styles.toggleBtn,
        {
          backgroundColor: enabled
            ? 'rgba(16,185,129,0.12)'
            : T.isDark
            ? 'rgba(255,255,255,0.05)'
            : 'rgba(0,0,0,0.05)',
          borderColor: enabled ? 'rgba(16,185,129,0.35)' : 'transparent',
        },
      ]}
      activeOpacity={0.7}
      accessibilityRole="switch"
      accessibilityLabel="Verified Mode"
      accessibilityState={{ checked: !!enabled }}
    >
      <Ionicons
        name={enabled ? 'shield-checkmark' : 'shield-outline'}
        size={14}
        color={enabled ? GREEN : T.muted}
      />
      <Text style={[styles.toggleText, { color: enabled ? GREEN : T.muted }]}>
        Verified Mode
      </Text>
    </TouchableOpacity>
  );
});

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  sourceBadgeEmoji: { fontSize: 13 },
  sourceBadgeText: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold' },

  sourceRef: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  sourceRefText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', flex: 1 },

  answerText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 22,
  },
  validRef: {
    color: GOLD,
    fontFamily: 'PlusJakartaSans-SemiBold',
    textDecorationLine: 'underline',
  },
  invalidRef: { color: GRAY },
  unverifiedTag: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    color: RED,
  },

  verifiedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  verifiedFooterText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    color: GREEN,
  },

  // Unverified card
  unverifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  unverifiedTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  unverifiedMessage: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 20,
    marginBottom: 14,
  },
  scholarBtn: {
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  scholarBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: GOLD,
  },

  // Toggle
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
  },

  // Loading
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular' },
});
