// src/store/index.js - FIXED VERSION
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getPrayerTimes, getNextPrayer, getMonthlyPrayerTimes, getHijriDate } from '../services/aladhan';
import { getChapters, getVersesByChapter, TRANSLATIONS, RECITERS } from '../services/quran';
import { supabase, db, subscribeProfile } from '../lib/supabase';

// ============================================================
// WEB STORAGE FALLBACK
// ============================================================

// Web localStorage adapter for Zustand persist
const webStorage = {
  getItem: async (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('Failed to get from localStorage:', error);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },
  removeItem: async (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  },
};

// Conditional storage based on platform
const getStorage = () => {
  if (Platform.OS === 'web') {
    return webStorage;
  }
  return AsyncStorage;
};

// ============================================================
// usePrayerStore
// ============================================================
export const usePrayerStore = create(
  persist(
    (set, get) => ({
      timings: null,
      nextPrayer: null,
      hijri: null,
      monthlyTimings: null,
      logs: {},
      location: null,
      method: 3,
      school: 0,
      isLoading: false,
      error: null,

      setLocation: (location) => set({ location }),
      setMethod: (method) => set({ method }),
      setSchool: (school) => set({ school }),

      fetchPrayerTimes: async (location) => {
        const loc = location ?? get().location;
        if (!loc) {
          console.warn('No location available for prayer times');
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const [timings, hijri] = await Promise.all([
            getPrayerTimes({ ...loc, method: get().method, school: get().school }),
            getHijriDate(),
          ]);
          const next = getNextPrayer(timings);
          set({ timings, nextPrayer: next, hijri, isLoading: false });
        } catch (e) {
          console.error('Fetch prayer times error:', e);
          set({ error: e.message, isLoading: false });
        }
      },

      fetchMonthlyTimings: async () => {
        const loc = get().location;
        if (!loc) return;
        const now = new Date();
        try {
          const data = await getMonthlyPrayerTimes({
            ...loc,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            method: get().method,
          });
          set({ monthlyTimings: data });
        } catch (e) {
          console.warn('Monthly timings fetch failed:', e.message);
        }
      },

      refreshNextPrayer: () => {
        const { timings } = get();
        if (!timings) return;
        const next = getNextPrayer(timings);
        set({ nextPrayer: next });
      },

      markPrayer: async (userId, prayerName, status = 'prayed') => {
        const today = new Date().toISOString().slice(0, 10);
        set(state => ({
          logs: {
            ...state.logs,
            [today]: { ...state.logs[today], [prayerName]: status },
          },
        }));

        if (!userId) {
          console.warn('No user ID provided, skipping Supabase update');
          return;
        }

        const { error } = await db.prayerLogs().upsert(
          {
            user_id: userId,
            prayer_name: prayerName,
            prayer_date: today,
            status,
            prayed_at: status === 'prayed' ? new Date().toISOString() : null,
          },
          { onConflict: 'user_id,prayer_name,prayer_date' }
        );

        if (error) {
          console.error('Failed to log prayer:', error.message);
          set(state => ({
            logs: {
              ...state.logs,
              [today]: { ...state.logs[today], [prayerName]: 'pending' },
            },
          }));
        }
      },

      loadLogs: async (userId, fromDate, toDate) => {
        if (!userId) return;
        
        const { data, error } = await db.prayerLogs()
          .select('prayer_name,prayer_date,status')
          .eq('user_id', userId)
          .gte('prayer_date', fromDate)
          .lte('prayer_date', toDate);

        if (error) {
          console.warn('Failed to load logs:', error.message);
          return;
        }

        const logs = {};
        data.forEach(({ prayer_date, prayer_name, status }) => {
          if (!logs[prayer_date]) logs[prayer_date] = {};
          logs[prayer_date][prayer_name] = status;
        });
        set({ logs });
      },

      getTodayCount: () => {
        const today = new Date().toISOString().slice(0, 10);
        const todayLogs = get().logs[today] ?? {};
        return Object.values(todayLogs).filter(s => s === 'prayed').length;
      },

      // Reset store (useful for logout)
      reset: () => {
        set({
          timings: null,
          nextPrayer: null,
          hijri: null,
          monthlyTimings: null,
          logs: {},
          location: null,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'prayer-store',
      storage: createJSONStorage(() => getStorage()),
      partialize: state => ({
        timings: state.timings,
        hijri: state.hijri,
        logs: state.logs,
        location: state.location,
        method: state.method,
        school: state.school,
      }),
    }
  )
);

// ============================================================
// useQuranStore - FIXED VERSION
// ============================================================
export const useQuranStore = create(
  persist(
    (set, get) => ({
      chapters: [],
      currentSurah: null,
      verses: [],
      currentAyah: 1,
      translationId: 'en.sahih', // Use Sahih International as default
      reciterId: RECITERS.Mishary_Alafasy,
      isPlaying: false,
      bookmarks: [],
      progress: {},
      lastRead: null, // { surahId, surahName, surahNameArabic, ayah, totalVerses }
      isLoading: false,
      error: null,

      setTranslation: (id) => set({ translationId: id }),
      setReciter: (id) => set({ reciterId: id }),
      setLastRead: (data) => set({ lastRead: data }),

      fetchChapters: async (language = 'en') => {
        if (get().chapters.length > 0) return;
        set({ isLoading: true, error: null });
        try {
          const chapters = await getChapters(language);
          set({ chapters, isLoading: false });
        } catch (e) {
          console.error('Failed to fetch chapters:', e);
          set({ error: e.message, isLoading: false });
        }
      },

      // FIXED: loadSurah with proper translation handling
      loadSurah: async (surahId) => {
        set({ isLoading: true, error: null, currentSurah: null, verses: [], currentAyah: 1 });
        try {
          // Get chapter info
          const chapter = get().chapters.find(c => c.id === surahId);
          
          // Get verses with translation
          const translationId = get().translationId;
          console.log(`Loading surah ${surahId} with translation: ${translationId}`);
          
          const result = await getVersesByChapter(surahId, translationId, { perPage: 300 });
          
          if (!result.verses || result.verses.length === 0) {
            throw new Error('No verses returned');
          }
          
          // Get saved progress position
          const savedAyah = get().progress[surahId]?.lastAyah ?? 1;
          
          set({ 
            currentSurah: chapter || { id: surahId, name: `Surah ${surahId}`, versesCount: result.verses.length },
            verses: result.verses,
            currentAyah: savedAyah,
            isLoading: false,
            error: null
          });
          
          console.log(`Loaded ${result.verses.length} verses for surah ${surahId}`);
          
        } catch (e) {
          console.error('Failed to load surah:', e);
          set({ 
            error: e.message || 'Failed to load surah',
            isLoading: false,
            verses: []
          });
        }
      },

      setCurrentAyah: (ayah) => {
        const { currentSurah } = get();
        if (!currentSurah) return;
        set(state => ({
          currentAyah: ayah,
          progress: {
            ...state.progress,
            [currentSurah.id]: {
              lastAyah: ayah,
              completed: ayah >= (currentSurah.versesCount || state.verses.length),
              lastRead: new Date().toISOString(),
            },
          },
        }));
      },

      saveProgressToSupabase: async (userId) => {
        const { progress, currentSurah, currentAyah } = get();
        if (!userId || !currentSurah) return;
        
        try {
          await db.quranProgress().upsert(
            {
              user_id: userId,
              surah: currentSurah.id,
              last_ayah: currentAyah,
              completed: currentAyah >= (currentSurah.versesCount || get().verses.length),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,surah' }
          );
        } catch (error) {
          console.error('Failed to save progress:', error);
        }
      },

      addBookmark: async (userId, { surahId, ayahId, note }) => {
        const bm = { 
          id: Date.now().toString(),
          type: 'ayah', 
          surah: surahId, 
          ayah: ayahId, 
          note: note || `Verse ${ayahId}`,
          createdAt: new Date().toISOString(),
        };
        
        set(state => ({ bookmarks: [...state.bookmarks, bm] }));
        
        if (userId) {
          try {
            await db.bookmarks().insert({ 
              user_id: userId, 
              type: 'ayah', 
              surah: surahId, 
              ayah: ayahId, 
              note: note || `Verse ${ayahId}`
            });
          } catch (error) {
            console.error('Failed to save bookmark:', error);
          }
        }
      },

      removeBookmark: async (userId, bookmarkId) => {
        set(state => ({ 
          bookmarks: state.bookmarks.filter(b => b.id !== bookmarkId) 
        }));
        
        if (userId) {
          try {
            await db.bookmarks().delete().eq('id', bookmarkId);
          } catch (error) {
            console.error('Failed to remove bookmark:', error);
          }
        }
      },

      loadBookmarks: async (userId) => {
        if (!userId) return;
        
        try {
          const { data, error } = await db.bookmarks()
            .select('*')
            .eq('user_id', userId)
            .eq('type', 'ayah');
            
          if (error) throw error;
          
          if (data) {
            const formattedBookmarks = data.map(item => ({
              id: item.id,
              type: item.type,
              surah: item.surah,
              ayah: item.ayah,
              note: item.note,
              createdAt: item.created_at,
            }));
            set({ bookmarks: formattedBookmarks });
          }
        } catch (error) {
          console.error('Failed to load bookmarks:', error);
        }
      },

      // Helper to get verse by number
      getVerse: (verseNumber) => {
        const { verses } = get();
        return verses.find(v => v.verseNumber === verseNumber);
      },

      // Helper to check if a verse is bookmarked
      isVerseBookmarked: (surahId, ayahId) => {
        const { bookmarks } = get();
        return bookmarks.some(b => b.surah === surahId && b.ayah === ayahId);
      },

      reset: () => {
        set({
          chapters: [],
          currentSurah: null,
          verses: [],
          currentAyah: 1,
          isPlaying: false,
          bookmarks: [],
          progress: {},
          lastRead: null,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'quran-store',
      storage: createJSONStorage(() => getStorage()),
      partialize: state => ({
        chapters: state.chapters,
        progress: state.progress,
        translationId: state.translationId,
        reciterId: state.reciterId,
        bookmarks: state.bookmarks,
        lastRead: state.lastRead,
      }),
    }
  )
);

// ============================================================
// useAuthStore
// ============================================================
export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  profileSubscription: null,

  initialize: async () => {
    set({ isLoading: true });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await get().loadProfile(session.user.id);
        
        // Only subscribe to realtime on native (web may not need it)
        if (Platform.OS !== 'web') {
          const sub = subscribeProfile(session.user.id, ({ new: profile }) => {
            set({ profile });
          });
          set({ profileSubscription: sub });
        }
        
        set({ session, user: session.user, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        set({ session, user: session.user });
        await get().loadProfile(session.user.id);
      } else {
        get().profileSubscription?.unsubscribe();
        set({ session: null, user: null, profile: null, profileSubscription: null });
      }
    });
  },

  loadProfile: async (userId) => {
    try {
      const { data, error } = await db.profiles().select('*').eq('id', userId).single();
      if (error) throw error;
      if (data) set({ profile: data });
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  },

  signUp: async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName } },
    });
    if (error) throw error;
    return data;
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signInWithGoogle: async () => {
    const redirectTo = Platform.OS === 'web' 
      ? window.location.origin 
      : 'deenapp://auth/callback';
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    get().profileSubscription?.unsubscribe();
    await supabase.auth.signOut();
    
    // Reset other stores on logout
    usePrayerStore.getState().reset();
    useQuranStore.getState().reset();
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return { error: 'No profile found' };
    
    try {
      const { data, error } = await db.profiles()
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
        .select()
        .single();
      
      if (!error && data) set({ profile: data });
      return { data, error };
    } catch (error) {
      return { error };
    }
  },

  isAuthenticated: () => !!get().session,
  userId: () => get().user?.id,
}));