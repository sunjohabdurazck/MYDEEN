// src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, usePrayerStore } from '../store';
import { requestNotificationPermissions, cancelAllPrayerNotifications } from '../services/notifications';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const { profile, updateProfile } = useAuthStore();
  const { method, setMethod, school, setSchool } = usePrayerStore();
  const { theme, themePreference, setThemePreference } = useTheme();

  const [notifications, setNotifications] = useState(true);
  const [hardcoreMode, setHardcoreMode] = useState(profile?.hardcore_mode || false);
  const [reminderMins, setReminderMins] = useState(10);

  const calculationMethods = [
    { id: 3, name: 'Muslim World League (MWL)' },
    { id: 2, name: 'ISNA' },
    { id: 4, name: 'Umm Al-Qura (Makkah)' },
    { id: 1, name: 'Karachi' },
  ];

  const madhabOptions = [
    { id: 0, name: 'Shafi / Maliki / Hanbali' },
    { id: 1, name: 'Hanafi' },
  ];

  useEffect(() => {
    if (profile) setHardcoreMode(profile.hardcore_mode || false);
  }, [profile]);

  const handleHardcoreToggle = async (value) => {
    setHardcoreMode(value);
    await updateProfile({ hardcore_mode: value });
    Alert.alert(
      value ? 'Hardcore Mode Enabled' : 'Hardcore Mode Disabled',
      value
        ? 'You cannot exit the prayer lock screen until you pray or time runs out.'
        : 'You can now bypass the prayer lock screen if needed.'
    );
  };

  const handleNotificationsToggle = async (value) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        setNotifications(true);
      } else {
        setNotifications(false);
        Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
      }
    } else {
      await cancelAllPrayerNotifications();
      setNotifications(false);
    }
  };

  const T = theme;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: T.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: T.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Appearance ─────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: T.muted }]}>Appearance</Text>

        <Text style={[styles.settingLabel, { color: T.text, marginBottom: 12 }]}>Theme</Text>
        <View style={[styles.themePicker, { backgroundColor: T.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: T.border }]}>
          {[
            { pref: 'light', label: 'Light',  icon: 'sunny-outline' },
            { pref: null,    label: 'System',  icon: 'phone-portrait-outline' },
            { pref: 'dark',  label: 'Dark',    icon: 'moon' },
          ].map(({ pref, label, icon }) => {
            const active = themePreference === pref;
            return (
              <TouchableOpacity
                key={String(pref)}
                style={[
                  styles.themeOption,
                  active && { backgroundColor: T.gold, borderRadius: 10 },
                ]}
                onPress={() => setThemePreference(pref)}
                activeOpacity={0.8}
              >
                <Ionicons name={icon} size={18} color={active ? T.bg : T.muted} />
                <Text style={[styles.themeOptionText, { color: active ? T.bg : T.muted }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.settingHint, { color: T.muted }]}>
          {themePreference === 'dark' ? '🌙 Dark mode — great for night-time' : themePreference === 'light' ? '☀️ Light mode — clean and clear' : '📱 Follows your device setting'}
        </Text>
      </View>

      {/* ── Prayer Settings ──────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: T.muted }]}>Prayer Settings</Text>

        <View style={[styles.settingItem, { borderBottomColor: T.border }]}>
          <Text style={[styles.settingLabel, { color: T.text }]}>Calculation Method</Text>
          <TouchableOpacity style={styles.selectorBtn}>
            <Text style={[styles.selectorText, { color: T.gold }]}>
              {calculationMethods.find(m => m.id === method)?.name || 'MWL'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={T.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.settingItem, { borderBottomColor: T.border }]}>
          <Text style={[styles.settingLabel, { color: T.text }]}>Asr Calculation</Text>
          <TouchableOpacity style={styles.selectorBtn}>
            <Text style={[styles.selectorText, { color: T.gold }]}>
              {madhabOptions.find(m => m.id === school)?.name || 'Standard'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={T.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.settingItem, { borderBottomColor: T.border }]}>
          <Text style={[styles.settingLabel, { color: T.text }]}>Reminder Minutes Before</Text>
          <View style={styles.selectorBtn}>
            <TouchableOpacity onPress={() => setReminderMins(Math.max(0, reminderMins - 5))}>
              <Ionicons name="remove-circle-outline" size={24} color={T.gold} />
            </TouchableOpacity>
            <Text style={[styles.selectorText, { color: T.gold, minWidth: 50, textAlign: 'center' }]}>
              {reminderMins} min
            </Text>
            <TouchableOpacity onPress={() => setReminderMins(reminderMins + 5)}>
              <Ionicons name="add-circle-outline" size={24} color={T.gold} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Notifications ────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: T.muted }]}>Notifications</Text>

        <View style={[styles.settingItem, { borderBottomColor: T.border }]}>
          <Text style={[styles.settingLabel, { color: T.text }]}>Prayer Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: '#374151', true: T.gold }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.settingItem, { borderBottomColor: T.border }]}>
          <Text style={[styles.settingLabel, { color: T.text }]}>Adhan Sound</Text>
          <Switch value={true} trackColor={{ false: '#374151', true: T.gold }} thumbColor="#fff" />
        </View>
      </View>

      {/* ── Discipline ───────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: T.muted }]}>Discipline</Text>

        <View style={[styles.settingItem, { borderBottomColor: T.border }]}>
          <Text style={[styles.settingLabel, { color: T.text }]}>Hardcore Mode</Text>
          <Switch
            value={hardcoreMode}
            onValueChange={handleHardcoreToggle}
            trackColor={{ false: '#374151', true: '#ef4444' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={[styles.settingHint, { color: T.muted }]}>
          When enabled, you cannot exit the prayer lock screen until you pray or time runs out.
        </Text>
      </View>

      {/* ── About ────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: T.muted }]}>About</Text>
        <View style={[styles.settingItem, { borderBottomColor: T.border }]}>
          <Text style={[styles.settingLabel, { color: T.text }]}>Version</Text>
          <Text style={[styles.settingValue, { color: T.muted }]}>1.0.0</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold' },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', textTransform: 'uppercase', marginBottom: 12 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  settingLabel: { fontSize: 16 },
  settingValue: { fontSize: 14 },
  selectorBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectorText: { fontSize: 14 },
  settingHint: { fontSize: 12, marginTop: 8, marginBottom: 8 },
  themePicker: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 8 },
  themeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  themeOptionText: { fontSize: 13, fontWeight: '600' },
});
