// src/screens/HomeScreen.js — UPDATED with WeatherWidget, ChallengeBanner, RamadanMode
import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, AppState, Animated, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { usePrayerStore, useAuthStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';

// Core components
import PrayerCard from '../components/PrayerCard';
import NextPrayerHero from '../components/NextPrayerHero';
import QuickActions from '../components/QuickActions';
import DailyProgressBar from '../components/DailyProgressBar';
import DailyMissions from '../components/DailyMissions';
import SmartMotivation from '../components/SmartMotivation';

// New components
import WeatherWidget from '../components/WeatherWidget';
import ChallengeBanner from '../components/ChallengeBanner';
import RamadanMode from '../components/RamadanMode';
import FastingCountdown from '../components/FastingCountdown';

// Services
import { BehaviorEngine } from '../services/behaviorEngine';
import { AppBlocker } from '../services/appBlocker';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Même logique de police que dans AppNavigator (system-ui sur le web)
const font = (name) => (Platform.OS === 'web' ? 'system-ui' : name);

// Valeurs de repli si une couleur du thème est absente
const FALLBACK_THEME = {
  bg: '#0d1120',
  surface: '#1a1f2e',
  text: '#ffffff',
  muted: '#8b93a7',
  gold: '#c9a84c',
  orange: '#f59e0b',
  border: 'rgba(255,255,255,0.08)',
  isDark: true,
};

// Clé de date (identique à ta logique d'origine, pour rester compatible avec le store)
const dateKey = (date) => date.toISOString().slice(0, 10);

export default function HomeScreen({ navigation }) {
  const themeCtx = useTheme();
  const T = useMemo(() => ({ ...FALLBACK_THEME, ...(themeCtx?.theme || {}) }), [themeCtx?.theme]);
  const insets = useSafeAreaInsets();

  const {
    timings, nextPrayer, hijri, logs: rawLogs, isLoading,
    fetchPrayerTimes, refreshNextPrayer, markPrayer, getTodayCount, location, setLocation,
  } = usePrayerStore();
  const { profile, userId } = useAuthStore();

  const logs = rawLogs || {};
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);
  const isLocating = useRef(false);

  const [extrasOpen, setExtrasOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(true);

  const today = dateKey(new Date());
  const todayLogs = logs[today] ?? {};

  const missedCount = useMemo(() => getMissedCount(todayLogs), [todayLogs]);
  const weekLogs = useMemo(() => getLast7DaysLogs(logs), [logs]);

  const getUserId = useCallback(
    () => (typeof userId === 'function' ? userId() : userId),
    [userId]
  );

  const initLocation = useCallback(async () => {
    if (isLocating.current) return; // évite les appels simultanés
    isLocating.current = true;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Permission refusée : on charge quand même les horaires par défaut
        await fetchPrayerTimes?.();
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      if (!isMounted.current) return;
      setLocation?.(coords);
      await fetchPrayerTimes?.(coords);
    } catch (e) {
      console.warn('Location error:', e?.message);
      try {
        await fetchPrayerTimes?.();
      } catch (err) {
        console.warn('Prayer times error:', err?.message);
      }
    } finally {
      isLocating.current = false;
    }
  }, [fetchPrayerTimes, setLocation]);

  useEffect(() => {
    isMounted.current = true;
    initLocation();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => refreshNextPrayer?.(), 60_000);
    return () => clearInterval(interval);
  }, [refreshNextPrayer]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshNextPrayer?.();
        if (!timings) initLocation();
      }
    });
    return () => sub?.remove?.();
  }, [timings, refreshNextPrayer, initLocation]);

  const handleMarkPrayer = useCallback(async (name, status) => {
    if (!name) return;
    try {
      await markPrayer?.(getUserId(), name, status);
    } catch (e) {
      console.warn('Mark prayer error:', e?.message);
    }
  }, [markPrayer, getUserId]);

  const handleLockMode = async () => {
    try {
      const { config } = (await BehaviorEngine.getStrictness()) || {};
      await AppBlocker.startBlocking(
        nextPrayer?.name ?? 'Prayer',
        config?.lockMinutes ?? 20,
        config?.hardcoreMode ?? false
      );
    } catch (e) {
      console.warn('Lock start error:', e);
    }
    navigation.navigate('Lock', { prayer: nextPrayer?.name });
  };

  const donePrayers = typeof getTodayCount === 'function' ? getTodayCount() : 0;

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim, backgroundColor: T.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8 }]}
        refreshControl={
          <RefreshControl
            refreshing={!!isLoading}
            onRefresh={initLocation}
            tintColor={T.gold}
            colors={[T.gold]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            {!!hijri?.formatted && (
              <Text style={[styles.hijriDate, { color: T.muted }]}>{hijri.formatted}</Text>
            )}
            <Text style={[styles.greeting, { color: T.text }]} numberOfLines={1}>
              {getGreeting()}, {profile?.display_name?.split(' ')[0] ?? 'Muslim'} 👋
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: T.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => navigation.navigate('Settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={22} color={T.muted} />
          </TouchableOpacity>
        </View>

        {/* WEATHER WIDGET */}
        <WeatherWidget location={location} />

        {/* RAMADAN MODE — auto shows during Ramadan or 30 days before */}
        <RamadanMode onOpenHub={() => navigation.navigate('RamadanHub')} />

        {/* NEXT PRAYER HERO */}
        <NextPrayerHero
          nextPrayer={nextPrayer}
          timings={timings}
          location={location}
          onLockMode={handleLockMode}
          onMarkDone={() => handleMarkPrayer(nextPrayer?.name, 'prayed')}
        />

        {/* FASTING COUNTDOWN — self-hides when not Ramadan */}
        <FastingCountdown suhoorTime={timings?.Fajr} iftarTime={timings?.Maghrib} />

        {/* DAILY PROGRESS */}
        <View style={styles.section}>
          <DailyProgressBar
            done={donePrayers}
            total={5}
            streak={profile?.streak_current ?? 0}
            totalXP={profile?.total_xp ?? 0}
          />
        </View>

        {/* QUICK ACTIONS */}
        <QuickActions navigation={navigation} />

        {/* DAILY MISSIONS (collapsible) */}
        <TouchableOpacity
          style={styles.sectionHeaderRow}
          onPress={() => setMissionsOpen(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={[styles.sectionTitle, styles.sectionTitleInline, { color: T.muted }]}>🎯 Daily Missions</Text>
          <Ionicons name={missionsOpen ? 'chevron-up' : 'chevron-down'} size={16} color={T.muted} />
        </TouchableOpacity>
        {missionsOpen && (
          <DailyMissions
            todayLogs={todayLogs}
            onXPEarned={(xp, label) => {
              console.log(`🎯 Mission complete: +${xp} XP for ${label}`);
            }}
          />
        )}

        {/* TODAY'S PRAYERS */}
        <Text style={[styles.sectionTitle, { color: T.muted }]}>Today's Prayers</Text>
        <View style={styles.prayerList}>
          {PRAYER_NAMES.map(name => {
            const status = todayLogs[name] ?? 'pending';
            const isPrayed = status === 'prayed' || status === 'prayed_late';
            const prayerTime = timings?.[name];
            const timeStarted = prayerTime ? isPrayerTimeStarted(prayerTime) : false;
            return (
              <PrayerCard
                key={name}
                name={name}
                time={prayerTime}
                status={status}
                isNext={nextPrayer?.name === name}
                onPress={isPrayed ? undefined : (timeStarted ? () => handleMarkPrayer(name, 'prayed') : undefined)}
                onLongPress={isPrayed ? undefined : (() => handleMarkPrayer(name, 'missed'))}
                locked={isPrayed}
              />
            );
          })}
        </View>

        {/* MISSED PRAYERS */}
        {missedCount > 0 && (
          <View style={[styles.qadaCard, {
            backgroundColor: T.isDark ? 'rgba(245,158,11,0.08)' : 'rgba(234,88,12,0.08)',
            borderColor: T.isDark ? 'rgba(245,158,11,0.25)' : 'rgba(234,88,12,0.25)',
          }]}>
            <Ionicons name="alert-circle" size={18} color={T.orange} />
            <Text style={[styles.qadaText, { color: T.orange }]}>
              {missedCount} missed prayer{missedCount > 1 ? 's' : ''} — tap to make Qada
            </Text>
          </View>
        )}

        {/* SMART MOTIVATION */}
        <SmartMotivation
          todayLogs={todayLogs}
          yesterdayLogs={logs[getYesterdayString()] ?? {}}
          streak={profile?.streak_current || 0}
          weekLogs={weekLogs}
        />

        {/* EXTRAS (collapsible) */}
        <TouchableOpacity style={styles.extrasToggle} onPress={() => setExtrasOpen(v => !v)} activeOpacity={0.7}>
          <View style={[styles.extrasToggleInner, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[styles.extrasToggleText, { color: T.muted }]}>
              {extrasOpen ? '▲ Show Less' : '✨ More Features'}
            </Text>
          </View>
        </TouchableOpacity>

        {extrasOpen && (
          <ChallengeBanner onPress={() => navigation.navigate('Missions')} />
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </Animated.View>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function getLast7DaysLogs(logs) {
  const weekLogs = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    weekLogs.push(logs?.[dateKey(date)] || {});
  }
  return weekLogs;
}

function getYesterdayString() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateKey(yesterday);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getMissedCount(logs) {
  return Object.values(logs || {}).filter(s => s === 'missed').length;
}

function isPrayerTimeStarted(timeStr) {
  if (!timeStr) return false;
  const match = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return false;
  const now = new Date();
  const prayerH = parseInt(match[1], 10);
  const prayerM = parseInt(match[2], 10);
  if (now.getHours() > prayerH) return true;
  if (now.getHours() === prayerH && now.getMinutes() >= prayerM) return true;
  return false;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, marginBottom: 12,
  },
  headerText: { flex: 1, paddingRight: 12 },
  hijriDate: { fontSize: 12, fontFamily: font('PlusJakartaSans-Regular'), marginBottom: 2 },
  greeting: { fontSize: 22, fontFamily: font('PlusJakartaSans-SemiBold') },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: {
    fontSize: 13, fontFamily: font('PlusJakartaSans-SemiBold'), letterSpacing: 0.8,
    textTransform: 'uppercase', paddingHorizontal: 20, marginBottom: 8, marginTop: 8,
  },
  // Dans la ligne repliable, le padding est déjà fourni par sectionHeaderRow
  sectionTitleInline: { paddingHorizontal: 0, marginBottom: 0, marginTop: 0 },
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginTop: 8, marginBottom: 8,
  },
  prayerList: { paddingHorizontal: 16, gap: 8 },
  qadaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  qadaText: { fontSize: 14, fontFamily: font('PlusJakartaSans-Medium'), flex: 1 },
  extrasToggle: { alignItems: 'center', marginVertical: 10, paddingHorizontal: 16 },
  extrasToggleInner: { paddingHorizontal: 22, paddingVertical: 9, borderRadius: 22, borderWidth: 1 },
  extrasToggleText: { fontSize: 13, fontFamily: font('PlusJakartaSans-Medium') },
});
