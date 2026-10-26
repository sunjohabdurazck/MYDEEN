// src/components/FastingCountdown.js — visible uniquement pendant le Ramadan
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { isRamadan } from '../utils/dateUtils';

const DEFAULT_SUHOOR_MIN = 4 * 60 + 30; // 04:30
const DEFAULT_IFTAR_MIN = 17 * 60 + 48; // 17:48
const DAY_SEC = 86400;

// Appel sécurisé : ne plante jamais, même si isRamadan() lève une erreur
const safeIsRamadan = () => {
  try {
    return Boolean(isRamadan());
  } catch (e) {
    return false;
  }
};

// Accepte "04:35", "4:35", "04:35 (BST)", "5:48 PM"... sinon renvoie le fallback
const parseTime = (t, fallback) => {
  if (typeof t !== 'string') return fallback;
  const match = t.match(/(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)?/i);
  if (!match) return fallback;

  let h = Number(match[1]);
  const m = Number(match[2]);
  const meridiem = match[3] ? match[3].toUpperCase() : null;

  if (meridiem === 'PM' && h < 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return fallback;

  return h * 60 + m;
};

const pad = (n) => String(n).padStart(2, '0');

const formatDuration = (totalSec) => {
  const safe = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

// Fonction pure : facile à tester, aucun setState dedans
const computeCountdown = (suhoorTime, iftarTime, now = new Date()) => {
  let sMin = parseTime(suhoorTime, DEFAULT_SUHOOR_MIN);
  let iMin = parseTime(iftarTime, DEFAULT_IFTAR_MIN);

  // Données incohérentes (suhoor après iftar) → valeurs par défaut
  if (sMin >= iMin) {
    sMin = DEFAULT_SUHOOR_MIN;
    iMin = DEFAULT_IFTAR_MIN;
  }

  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const sSec = sMin * 60;
  const iSec = iMin * 60;

  let targetSec;
  let label;
  if (nowSec < sSec) {
    targetSec = sSec;
    label = '🌙 Suhoor ends in';
  } else if (nowSec < iSec) {
    targetSec = iSec;
    label = '🍽️ Iftar in';
  } else {
    targetSec = sSec + DAY_SEC; // suhoor du lendemain
    label = '🌙 Suhoor ends in';
  }

  return { label, timeLeft: formatDuration(targetSec - nowSec) };
};

export default function FastingCountdown({ suhoorTime, iftarTime }) {
  const themeCtx = useTheme();
  const T = (themeCtx && themeCtx.theme) || {};
  const isDark = Boolean(T.isDark);

  const [ramadan, setRamadan] = useState(safeIsRamadan);
  const [countdown, setCountdown] = useState(() => computeCountdown(suhoorTime, iftarTime));
  const mountedRef = useRef(true);

  const tick = useCallback(() => {
    if (!mountedRef.current) return;
    try {
      setRamadan(safeIsRamadan());
      setCountdown(computeCountdown(suhoorTime, iftarTime));
    } catch (e) {
      // on garde l'ancien affichage plutôt que de planter
    }
  }, [suhoorTime, iftarTime]);

  useEffect(() => {
    mountedRef.current = true;
    tick();
    const timer = setInterval(tick, 1000);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [tick]);

  if (!ramadan) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#0d2a1c' : '#f0fdf4', borderColor: '#2d6a4f' },
      ]}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`${countdown.label} ${countdown.timeLeft}`}
    >
      <Text style={[styles.label, { color: T.muted || '#6b7280' }]}>
        {countdown.label || '🌙 Fasting'}
      </Text>
      <Text style={[styles.time, { color: '#10b981' }]}>
        {countdown.timeLeft || '--:--:--'}
      </Text>
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
  time: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'], // chiffres de largeur fixe : pas de tremblement
  },
});
