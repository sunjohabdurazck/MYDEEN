// src/components/NudgeCard.js — Smart Behavioral Nudge Card
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const NUDGE_COLORS = {
  warning: { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  icon: '#ef4444' },
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: '#10b981' },
  alert:   { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '#f59e0b' },
  tip:     { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', icon: '#6366f1' },
  reminder:{ bg: 'rgba(201,168,76,0.12)', border: 'rgba(201,168,76,0.3)', icon: '#c9a84c' },
};

export default function NudgeCard({ nudge, onDismiss, style }) {
  const { theme: T } = useTheme();
  const slideAnim  = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim,  { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const colors = NUDGE_COLORS[nudge.type] || NUDGE_COLORS.reminder;

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim,  { toValue: -20, duration: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0,  duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss?.(nudge.id));
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: colors.bg, borderColor: colors.border },
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
        style,
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.emoji}>{nudge.emoji}</Text>
        <View style={styles.content}>
          <Text style={[styles.title, { color: T.text }]}>{nudge.title}</Text>
          <Text style={[styles.body,  { color: T.muted }]}>{nudge.body}</Text>
        </View>
        {!nudge.persistent && (
          <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={16} color={T.muted} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card:    { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  row:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  emoji:   { fontSize: 22, marginTop: 1 },
  content: { flex: 1 },
  title:   { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  body:    { fontSize: 13, lineHeight: 18 },
  closeBtn: { padding: 2, marginTop: 2 },
});
