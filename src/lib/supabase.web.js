// src/lib/supabase.web.js - SIMPLIFIED WORKING VERSION
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Simple web storage
const webStorage = {
  getItem: (key) => {
    const value = localStorage.getItem(key);
    return Promise.resolve(value);
  },
  setItem: (key, value) => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};

// Create client directly (not lazy)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: webStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// Simple db object
export const db = {
  profiles: () => supabase.from('profiles'),
  prayerLogs: () => supabase.from('prayer_logs'),
  quranProgress: () => supabase.from('quran_progress'),
  bookmarks: () => supabase.from('bookmarks'),
  tasbih: () => supabase.from('tasbih_sessions'),
  fasting: () => supabase.from('fasting_logs'),
  friendships: () => supabase.from('friendships'),
  badges: () => supabase.from('user_badges'),
  aiChats: () => supabase.from('ai_chats'),
  aiSessions: () => supabase.from('ai_sessions'),
  aiMessages: () => supabase.from('ai_messages'),
};

// No-op for web
export const subscribeFriendPrayers = () => ({ unsubscribe: () => {} });
export const subscribeProfile = () => ({ unsubscribe: () => {} });