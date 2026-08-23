// src/components/AIResponseCard.js
// ─────────────────────────────────────────────────────────────
// AI Trust Layer UI
// • Source badge at the TOP (📖 Based on Quran/Hadith)
// • Inline Quran ref validation (valid = tappable, invalid = "unverified")
// • Unverified fallback message
// ─────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import {
  annotateQuranRefs,
  getSourceBadge,
  parseVerifiedResponse,
} from '../services/aiTrustLayer';

// ── Source Badge ──────────────────────────────────────────────
function SourceBadge({ badge }) {
  const { theme: T } = useTheme();
  if (!badge) return null;
  return (
    <View style={[styles.sourceBadge, { backgroundColor: `${badge.color}15`, borderColor: `${badge.color}35` }]}>
      <Text style={styles.sourceBadgeEmoji}>{badge.emoji}</Text>
      <Text style={[styles.sourceBadgeText, { color: badge.color }]}>{badge.label}</Text>
    </View>
  );
}

// ── Annotated text with validated refs ───────────────────────
function AnnotatedText({ text, onRefPress, textStyle }) {
  const { theme: T } = useTheme();
  const segments = annotateQuranRefs(text);

  return (
    <Text style={textStyle}>
      {segments.map((seg, i) => {
        if (!seg.isRef) return <Text key={i}>{seg.text}</Text>;

        if (seg.valid) {
          return (
            <Text
              key={i}
              style={[styles.validRef, { color: '#c9a84c' }]}
              onPress={() => onRefPress?.(seg.surah, seg.ayah)}
            >
              [{seg.text}]
            </Text>
          );
        }

        // Invalid ref — show "unverified"
        return (
          <Text key={i} style={styles.invalidRef}>
            {seg.text}
            <Text style={styles.unverifiedTag}> (unverified)</Text>
          </Text>
        );
      })}
    </Text>
  );
}

// ── Main AI Response Card ─────────────────────────────────────
export default function AIResponseCard({
  responseText,
  isVerifiedMode = false,
  isLoading = false,
  onRefPress,          // (surah, ayah) => void — navigate to Quran
  onConsultScholar,    // () => void
}) {
  const { theme: T } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: T.isDark ? '#111827' : '#F9F9F6', borderColor: T.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]}>
        <View style={styles.loadingRow}>
          <Ionicons name="hourglass-outline" size={14} color={T.muted} />
          <Text style={[styles.loadingText, { color: T.muted }]}>Searching Islamic sources…</Text>
        </View>
      </View>
    );
  }

  if (!responseText) return null;

  // Parse if verified mode
  const parsed = isVerifiedMode ? parseVerifiedResponse(responseText) : {
    verified: true,
    source: null,
    answer: responseText,
    sourceType: 'unknown',
  };

  // Not verified — show fallback
  if (isVerifiedMode && parsed.verified === false) {
    return (
      <View style={[styles.card, styles.unverifiedCard, { backgroundColor: T.isDark ? '#111827' : '#F9F9F6', borderColor: 'rgba(156,163,175,0.3)' }]}>
        <View style={styles.unverifiedHeader}>
          <Ionicons name="shield-outline" size={16} color="#9ca3af" />
          <Text style={[styles.unverifiedTitle, { color: '#9ca3af' }]}>Cannot Verify</Text>
        </View>
        <Text style={[styles.unverifiedMessage, { color: T.muted }]}>
          {parsed.message || "I cannot confidently answer this. Please consult a qualified scholar."}
        </Text>
        {onConsultScholar && (
          <TouchableOpacity style={styles.scholarBtn} onPress={onConsultScholar}>
            <Text style={styles.scholarBtnText}>Find a Scholar 🕌</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Get source badge
  const badge = getSourceBadge(parsed.sourceType, parsed.source);
  const answerText = parsed.answer || responseText;

  return (
    <View style={[styles.card, { backgroundColor: T.isDark ? '#111827' : '#F9F9F6', borderColor: T.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }]}>

      {/* ── SOURCE FIRST (top of card) ── */}
      {badge && <SourceBadge badge={badge} />}

      {/* Source reference text */}
      {parsed.source && (
        <View style={[styles.sourceRef, { borderColor: T.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <Ionicons name="book-outline" size={12} color={T.muted} />
          <Text style={[styles.sourceRefText, { color: T.muted }]}>{parsed.source}</Text>
        </View>
      )}

      {/* ── ANSWER with annotated Quran refs ── */}
      <AnnotatedText
        text={answerText}
        onRefPress={onRefPress}
        textStyle={[styles.answerText, { color: T.text }]}
      />

      {/* Verified mode indicator */}
      {isVerifiedMode && (
        <View style={styles.verifiedFooter}>
          <Ionicons name="shield-checkmark" size={11} color="#10b981" />
          <Text style={styles.verifiedFooterText}>Verified Mode ON</Text>
        </View>
      )}
    </View>
  );
}

// ── Verified Mode Toggle ─────────────────────────────────────
export function VerifiedModeToggle({ enabled, onToggle }) {
  const { theme: T } = useTheme();
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[
        styles.toggleBtn,
        {
          backgroundColor: enabled
            ? 'rgba(16,185,129,0.12)'
            : (T.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
          borderColor: enabled ? 'rgba(16,185,129,0.35)' : 'transparent',
        },
      ]}
      activeOpacity={0.7}
    >
      <Ionicons
        name={enabled ? 'shield-checkmark' : 'shield-outline'}
        size={14}
        color={enabled ? '#10b981' : T.muted}
      />
      <Text style={[styles.toggleText, { color: enabled ? '#10b981' : T.muted }]}>
        Verified Mode
      </Text>
    </TouchableOpacity>
  );
}

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
    fontFamily: 'PlusJakartaSans-SemiBold',
    textDecorationLine: 'underline',
  },
  invalidRef: { color: '#9ca3af' },
  unverifiedTag: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#ef4444',
  },

  verifiedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  verifiedFooterText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#10b981',
  },

  // Unverified card
  unverifiedCard: {},
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
    color: '#c9a84c',
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
