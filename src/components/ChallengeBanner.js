// src/components/ChallengeBanner.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

const DEFAULT_GRADIENT = ['#c9a84c', '#7a5110'];

export default function ChallengeBanner({
  onPress,
  title = 'Daily Challenge',
  friendsCount = 3,
  xp = 100,
  subtitle,
  disabled = false,
  style,
}) {
  const { theme: T } = useTheme();

  const gradient = disabled
    ? ['#8a8a8a', '#5a5a5a']
    : T?.challengeGradient || DEFAULT_GRADIENT;

  const sub =
    subtitle || `Beat ${friendsCount} friends · Earn bonus XP`;

  return (
    <View style={[styles.shadowWrapper, style]}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={`${title}. ${sub}. ${xp} XP`}
        style={styles.touchable}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <View style={styles.iconBox}>
            <Text style={styles.icon}>⚔️</Text>
          </View>

          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {sub}
            </Text>
          </View>

          <View style={styles.pill}>
            <Text style={styles.pillText}>🏆 {xp} XP</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    // Ombre (iOS + Android)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  touchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    minHeight: 56,
  },
  iconBox: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 26,
  },
  textCol: {
    flex: 2,
  },
  title: {
    fontSize: 14,
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
    fontFamily: 'PlusJakartaSans-Bold',
  },
});