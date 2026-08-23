// src/navigation/AppNavigator.js - Expo SDK 54 Compatible
import React from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
// ✅ Use native-stack for Expo (works on web too)
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';

// ── Screens ───────────────────────────────────────────────────
import HomeScreen from '../screens/HomeScreen';
import QuranScreen from '../screens/QuranScreen';
import SurahScreen from '../screens/SurahScreen';
import AIChatScreen from '../screens/AIChatScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import QiblaScreen from '../screens/QiblaScreen';
import TasbihScreen from '../screens/TasbihScreen';
import AuthScreen from '../screens/AuthScreen';
import LockScreen from '../screens/LockScreen';
import WeeklyReportScreen from '../screens/WeeklyReportScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import MosqueFinderScreen from '../screens/MosqueFinderScreen';
import MissionsScreen from '../screens/MissionsScreen';
import RamadanHub from '../screens/RamadanHub';

// Use NativeStack for better Expo compatibility
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── TAB ICONS ─────────────────────────────────────────────────
const TAB_CONFIG = {
  Home:     { active: 'home',           inactive: 'home-outline' },
  Quran:    { active: 'book',           inactive: 'book-outline' },
  Missions: { active: 'trophy',         inactive: 'trophy-outline' },
  AIChat:   { active: 'chatbubble',     inactive: 'chatbubble-outline' },
  Progress: { active: 'bar-chart',      inactive: 'bar-chart-outline' },
  Profile:  { active: 'person-circle',  inactive: 'person-circle-outline' },
};

// ── QURAN STACK ───────────────────────────────────────────────
function QuranStack() {
  const { theme: T } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: T.bg },
        headerTintColor: T.text,
        headerTitleStyle: { fontFamily: Platform.OS === 'web' ? 'system-ui' : 'PlusJakartaSans-SemiBold' },
        contentStyle: { backgroundColor: T.bg },
      }}
    >
      <Stack.Screen name="QuranList" component={QuranScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Surah"
        component={SurahScreen}
        options={({ route }) => ({
          title: route.params?.surahName ?? 'Surah',
          headerBackTitle: 'Quran',
        })}
      />
    </Stack.Navigator>
  );
}

// ── HOME STACK (for modals) ──
function HomeStack() {
  const { theme: T } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: T.bg },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="RamadanHub"
        component={RamadanHub}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Qibla"   
        component={QiblaScreen}   
        options={{ 
          presentation: 'modal', 
          headerShown: true, 
          title: 'Qibla Direction', 
          headerStyle: { backgroundColor: T.bg }, 
          headerTintColor: T.text 
        }} 
      />
      <Stack.Screen 
        name="Tasbih" 
        component={TasbihScreen}   
        options={{ 
          presentation: 'modal', 
          headerShown: true, 
          title: 'Tasbih', 
          headerStyle: { backgroundColor: T.bg }, 
          headerTintColor: T.text 
        }} 
      />
      <Stack.Screen 
        name="MosqueFinder" 
        component={MosqueFinderScreen} 
        options={{ 
          presentation: 'modal', 
          headerShown: true, 
          title: 'Nearby Mosques', 
          headerStyle: { backgroundColor: T.bg }, 
          headerTintColor: T.text 
        }} 
      />
    </Stack.Navigator>
  );
}

// ── MAIN BOTTOM TABS ──
function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar || theme.surface,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          paddingTop: 6,
          height: Platform.OS === 'ios' ? 85 : 72,
        },
        tabBarActiveTintColor: theme.gold,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: Platform.OS === 'web' ? 'system-ui' : 'PlusJakartaSans-Medium',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          const cfg = TAB_CONFIG[route.name];
          if (!cfg) return null;
          const iconName = focused ? cfg.active : cfg.inactive;
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: 'Home' }} />
      <Tab.Screen name="Quran" component={QuranStack} options={{ title: 'Quran' }} />
      <Tab.Screen name="Missions" component={MissionsScreen} options={{ title: 'Goals' }} />
      <Tab.Screen name="AIChat" component={AIChatScreen} options={{ title: 'Deen AI' }} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── ROOT NAVIGATOR ──
export default function AppNavigator() {
  const { session, isLoading } = useAuthStore();
  const { theme } = useTheme();

  // Safety check for theme
  if (!theme) {
    return (
      <View style={[styles.loader, { backgroundColor: '#0d1120' }]}>
        <ActivityIndicator size="large" color="#c9a84c" />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.gold} />
      </View>
    );
  }

  const navTheme = {
    dark: theme.isDark || false,
    colors: {
      background: theme.bg || '#0d1120',
      card: theme.surface || '#1a1f2e',
      text: theme.text || '#ffffff',
      border: 'transparent',
      notification: theme.gold || '#c9a84c',
      primary: theme.gold || '#c9a84c',
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false, 
          contentStyle: { backgroundColor: theme.bg } 
        }}
      >
        {!session ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="Lock" 
              component={LockScreen} 
              options={{ presentation: 'modal' }} 
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen} 
              options={{ presentation: 'modal' }} 
            />
            <Stack.Screen 
              name="WeeklyReport" 
              component={WeeklyReportScreen} 
              options={{ 
                presentation: 'modal', 
                headerShown: true, 
                title: 'Discipline Report',
                headerStyle: { backgroundColor: 'transparent' }, 
                headerTintColor: '#c9a84c' 
              }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
});