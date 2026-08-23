// src/components/ChallengeBanner.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function ChallengeBanner({ onPress }) {
  const { theme: T } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.wrapper}>
      <LinearGradient
        colors={['#c9a84c', '#7a5110']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}
      >
        <Text style={styles.icon}>⚔️</Text>
        <View style={styles.textCol}>
          <Text style={styles.title}>Daily Challenge</Text>
          <Text style={styles.sub}>Beat 3 friends · Earn bonus XP</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>🏆 100 XP</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  icon: { fontSize: 26 },
  textCol: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  sub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'PlusJakartaSans-Regular',
    marginTop: 1,
  },
  pill: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
