// src/components/FastingCountdown.js — only visible during Ramadan
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { isRamadan } from '../utils/dateUtils';

export default function FastingCountdown({ suhoorTime, iftarTime }) {
  const { theme: T } = useTheme();
  const [timeLeft, setTimeLeft] = useState('');
  const [label, setLabel] = useState('');

  const computeCountdown = () => {
    if (!suhoorTime && !iftarTime) return;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    // Parse times
    const parse = (t) => {
      if (!t) return null;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const sMin = parse(suhoorTime) ?? 270;  // default 4:30 AM
    const iMin = parse(iftarTime)  ?? 1068; // default 17:48

    let targetMin, lbl;
    if (nowMin < sMin) {
      targetMin = sMin;
      lbl = '🌙 Suhoor ends in';
    } else if (nowMin < iMin) {
      targetMin = iMin;
      lbl = '🍽️ Iftar in';
    } else {
      targetMin = sMin + 1440; // next day suhoor
      lbl = '🌙 Suhoor ends in';
    }

    let diff = (targetMin - nowMin) * 60 - now.getSeconds();
    if (diff < 0) diff += 86400;

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    setLabel(lbl);
    setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
  };

  useEffect(() => {
    if (!isRamadan()) return;
    computeCountdown();
    const timer = setInterval(computeCountdown, 1000);
    return () => clearInterval(timer);
  }, [suhoorTime, iftarTime]);

  if (!isRamadan()) return null;

  return (
    <View style={[styles.container, { backgroundColor: T.isDark ? '#0d2a1c' : '#f0fdf4', borderColor: '#2d6a4f' }]}>
      <Text style={[styles.label, { color: T.muted }]}>{label || '🌙 Fasting'}</Text>
      <Text style={[styles.time, { color: '#10b981' }]}>{timeLeft || '--:--:--'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium' },
  time: { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', letterSpacing: 1 },
});
