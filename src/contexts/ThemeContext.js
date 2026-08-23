// src/contexts/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@deen_theme_preference';

// Light & dark palettes
export const LIGHT_THEME = {
  isDark: false,
  bg: '#f5f5f0',
  surface: '#ffffff',
  card: '#f0ede6',
  gold: '#b8860b',
  emerald: '#059669',
  text: '#1a1a2e',
  muted: '#6b7280',
  border: 'rgba(0,0,0,0.08)',
  tabBar: '#ffffff',
  tabBarBorder: 'rgba(0,0,0,0.08)',
  header: '#ffffff',
  inputBg: '#f0ede6',
};

export const DARK_THEME = {
  isDark: true,
  bg: '#0d1120',
  surface: '#111827',
  card: '#1f2937',
  gold: '#c9a84c',
  emerald: '#10b981',
  text: '#f9fafb',
  muted: '#9ca3af',
  border: 'rgba(255,255,255,0.07)',
  tabBar: '#0d1120',
  tabBarBorder: 'rgba(255,255,255,0.06)',
  header: '#0d1120',
  inputBg: '#111827',
};

const ThemeContext = createContext({
  theme: DARK_THEME,
  themePreference: null, // null = system, 'dark', 'light'
  setThemePreference: async () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  // Default is light per user requirement
  const [themePreference, setThemePref] = useState(null); // null = system
  const [theme, setTheme] = useState(LIGHT_THEME); // start light until loaded
  const [loaded, setLoaded] = useState(false);

  // Load stored preference on mount
  useEffect(() => {
    (async () => {
      try {
        let stored;
        if (Platform.OS === 'web') {
          stored = localStorage.getItem(STORAGE_KEY);
        } else {
          stored = await AsyncStorage.getItem(STORAGE_KEY);
        }
        if (stored !== null && stored !== undefined) {
          const pref = JSON.parse(stored); // 'dark', 'light', or null
          setThemePref(pref);
          applyTheme(pref, systemScheme);
        } else {
          // First launch — use system, default light if system unknown
          applyTheme(null, systemScheme);
        }
      } catch {
        applyTheme(null, systemScheme);
      }
      setLoaded(true);
    })();
  }, []);

  // React to system scheme changes when preference is system
  useEffect(() => {
    if (loaded && themePreference === null) {
      applyTheme(null, systemScheme);
    }
  }, [systemScheme, loaded]);

  const applyTheme = (pref, sysScheme) => {
    if (pref === 'dark') {
      setTheme(DARK_THEME);
    } else if (pref === 'light') {
      setTheme(LIGHT_THEME);
    } else {
      // System default — default light if system unknown
      setTheme(sysScheme === 'dark' ? DARK_THEME : LIGHT_THEME);
    }
  };

  const setThemePreference = async (pref) => {
    setThemePref(pref);
    applyTheme(pref, systemScheme);
    try {
      const value = JSON.stringify(pref);
      if (Platform.OS === 'web') {
        localStorage.setItem(STORAGE_KEY, value);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, value);
      }
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
