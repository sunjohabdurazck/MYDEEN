// src/lib/supabase.js
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Use lazy-loading version for web
  module.exports = require('./supabase.web');
} else {
  // Native version
  require('react-native-url-polyfill/auto');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const { createClient } = require('@supabase/supabase-js');
  const { AppState } = require('react-native');

  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      debug: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
    },
  });

  // Auto-refresh on app foreground
  AppState.addEventListener('change', (state) => {
    if (state === 'active') client.auth.startAutoRefresh();
    else client.auth.stopAutoRefresh();
  });

  const db = {
    profiles:      () => client.from('profiles'),
    prayerLogs:    () => client.from('prayer_logs'),
    quranProgress: () => client.from('quran_progress'),
    bookmarks:     () => client.from('bookmarks'),
    tasbih:        () => client.from('tasbih_sessions'),
    fasting:       () => client.from('fasting_logs'),
    friendships:   () => client.from('friendships'),
    badges:        () => client.from('user_badges'),
    aiSessions:    () => client.from('ai_sessions'),
    aiMessages:    () => client.from('ai_messages'),
    aiChats:       () => client.from('ai_chats'),
    userActivity:  () => client.from('user_activity'),
  };

  const subscribeFriendPrayers = (friendId, callback) => {
    return client.channel(`friend_prayers_${friendId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'prayer_logs', filter: `user_id=eq.${friendId}`,
      }, callback)
      .subscribe();
  };

  const subscribeProfile = (userId, callback) => {
    return client.channel(`profile_${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}`,
      }, callback)
      .subscribe();
  };

  // CommonJS export (used by module.exports consumers)
  module.exports = {
    supabase: client,
    db,
    subscribeFriendPrayers,
    subscribeProfile,
  };
}
