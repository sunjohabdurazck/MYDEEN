// src/store/missionStore.js
// ─────────────────────────────────────────────────────────────
// Daily Mission System Store
// Generates 2–3 missions per day, persists completion state,
// awards XP + badges on completion.
// ─────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const getStorage = () =>
  Platform.OS === 'web'
    ? {
        getItem: async (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
        setItem: async (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
        removeItem: async (k) => { try { localStorage.removeItem(k); } catch {} },
      }
    : AsyncStorage;

// ── Mission definitions pool ────────────────────────────────
const MISSION_POOL = [
  // Prayer missions
  {
    id: 'all_5_prayers',
    emoji: '🕌',
    label: 'Pray all 5 prayers',
    xp: 50,
    badge: '🏅',
    type: 'prayer',
    check: (logs) => {
      const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      return prayers.every(p => logs[p] === 'prayed' || logs[p] === 'prayed_late');
    },
    weight: 10, // always include this one
  },
  {
    id: 'no_bypass',
    emoji: '🚫',
    label: 'No app bypass today',
    xp: 30,
    badge: '🛡️',
    type: 'discipline',
    check: (_logs, state) => state?.bypassCount === 0,
    weight: 8,
  },
  {
    id: 'read_quran',
    emoji: '📖',
    label: 'Read 1 page of Quran',
    xp: 20,
    badge: '📘',
    type: 'quran',
    check: (_logs, state) => (state?.quranPagesRead ?? 0) >= 1,
    weight: 8,
  },
  {
    id: 'pray_fajr_on_time',
    emoji: '🌅',
    label: 'Pray Fajr on time',
    xp: 25,
    badge: '⭐',
    type: 'prayer',
    check: (logs) => logs['Fajr'] === 'prayed',
    weight: 7,
  },
  {
    id: 'pray_isha',
    emoji: '🌙',
    label: 'Pray Isha tonight',
    xp: 20,
    badge: '🌟',
    type: 'prayer',
    check: (logs) => logs['Isha'] === 'prayed' || logs['Isha'] === 'prayed_late',
    weight: 6,
  },
  {
    id: 'three_prayers',
    emoji: '✅',
    label: 'Pray at least 3 prayers',
    xp: 15,
    badge: '💪',
    type: 'prayer',
    check: (logs) => {
      const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      return prayers.filter(p => logs[p] === 'prayed' || logs[p] === 'prayed_late').length >= 3;
    },
    weight: 5,
  },
];

// ── Deterministic daily mission selector (2–3 missions) ──────
// Uses date as seed so missions are same throughout the day
function generateDailyMissions(dateStr) {
  // Simple hash of date string → always same missions for same day
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const seededRandom = (max) => {
    hash = ((hash * 1664525) + 1013904223) & 0xffffffff;
    return Math.abs(hash) % max;
  };

  // Always include "all 5 prayers" mission
  const selected = [MISSION_POOL[0]];

  // Pick 1–2 more from the rest (non-prayer types first for variety)
  const pool = MISSION_POOL.slice(1);
  const count = 1 + (seededRandom(2)); // 1 or 2 more

  const shuffled = [...pool].sort(() => seededRandom(100) - 50);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    selected.push(shuffled[i]);
  }

  return selected.map(m => ({ ...m, completed: false, completedAt: null }));
}

// ── Store ─────────────────────────────────────────────────────
export const useMissionStore = create(
  persist(
    (set, get) => ({
      // { 'YYYY-MM-DD': Mission[] }
      dailyMissions: {},
      // XP earned from missions today (separate from prayer XP)
      missionXP: {},
      // Earned badges { missionId: badge emoji }
      badges: [],

      // Returns today's missions, generating them if needed
      // Also auto-checks completion against current prayer logs
      getTodayMissions: (todayLogs = {}) => {
        const today = new Date().toISOString().slice(0, 10);
        const { dailyMissions } = get();

        if (!dailyMissions[today]) {
          // Generate fresh missions for today
          const generated = generateDailyMissions(today);
          set(state => ({
            dailyMissions: { ...state.dailyMissions, [today]: generated },
          }));
          return generated;
        }

        // Auto-complete missions that are now satisfied by prayer logs
        const missions = dailyMissions[today].map(m => {
          if (m.completed) return m;
          const nowDone = m.check ? m.check(todayLogs) : false;
          return nowDone ? { ...m, completed: true, completedAt: new Date().toISOString(), autoCompleted: true } : m;
        });

        // Persist if anything changed
        const changed = missions.some((m, i) => m.completed !== dailyMissions[today][i]?.completed);
        if (changed) {
          set(state => ({
            dailyMissions: { ...state.dailyMissions, [today]: missions },
          }));
        }

        return missions;
      },

      // Manually complete a mission (for non-auto missions)
      completeMission: (missionId, todayLogs = {}) => {
        const today = new Date().toISOString().slice(0, 10);
        const { dailyMissions, badges } = get();
        const missions = dailyMissions[today];
        if (!missions) return;

        const updated = missions.map(m => {
          if (m.id !== missionId || m.completed) return m;
          return { ...m, completed: true, completedAt: new Date().toISOString() };
        });

        const mission = MISSION_POOL.find(m => m.id === missionId);
        const newBadges = mission?.badge && !badges.includes(mission.badge)
          ? [...badges, mission.badge]
          : badges;

        // Accumulate mission XP for today
        const prevXP = get().missionXP[today] ?? 0;
        const earnedXP = mission?.xp ?? 0;

        set(state => ({
          dailyMissions: { ...state.dailyMissions, [today]: updated },
          badges: newBadges,
          missionXP: { ...state.missionXP, [today]: prevXP + earnedXP },
        }));
      },

      getTodayMissionXP: () => {
        const today = new Date().toISOString().slice(0, 10);
        return get().missionXP[today] ?? 0;
      },

      // Clean up missions older than 7 days to avoid bloat
      pruneOldMissions: () => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        set(state => {
          const pruned = {};
          for (const [date, missions] of Object.entries(state.dailyMissions)) {
            if (date >= cutoffStr) pruned[date] = missions;
          }
          return { dailyMissions: pruned };
        });
      },
    }),
    {
      name: 'mission-store',
      storage: createJSONStorage(() => getStorage()),
      partialize: state => ({
        dailyMissions: state.dailyMissions,
        missionXP: state.missionXP,
        badges: state.badges,
      }),
    }
  )
);
