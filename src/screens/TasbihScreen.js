// src/screens/TasbihScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Vibration, Share, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

const DEFAULT_DHIKRS = [
  { text: 'Subhanallah',       arabic: 'سُبْحَانَ اللَّهِ',          target: 33  },
  { text: 'Alhamdulillah',     arabic: 'الْحَمْدُ لِلَّهِ',          target: 33  },
  { text: 'Allahu Akbar',      arabic: 'اللَّهُ أَكْبَرُ',           target: 33  },
  { text: 'La ilaha illallah', arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', target: 33  },
  { text: 'Astaghfirullah',   arabic: 'أَسْتَغْفِرُ اللَّهَ',       target: 100 },
];

export default function TasbihScreen() {
  const { theme: T } = useTheme();
  const [selectedDhikr, setSelectedDhikr] = useState(0);
  const [count, setCount]         = useState(0);
  const [completed, setCompleted] = useState(false);
  const { userId } = useAuthStore();
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const current    = DEFAULT_DHIKRS[selectedDhikr];
  const progress   = Math.min(1, count / current.target);

  useEffect(() => { loadLastSession(); }, [selectedDhikr]);

  const loadLastSession = async () => {
    try {
      const { data } = await supabase
        .from('tasbih_sessions')
        .select('count')
        .eq('user_id', userId())
        .eq('dhikr_text', current.text)
        .order('created_at', { ascending: false })
        .limit(1);
      setCount(data?.[0] ? data[0].count % current.target : 0);
    } catch { 
      setCount(0); 
    }
    setCompleted(false);
  };

  // ✅ FIXED: Made this async and added proper await
  const increment = async () => {
    Vibration.vibrate(10);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.18, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    
    const newCount = count + 1;
    setCount(newCount);
    
    if (newCount >= current.target) {
      setCompleted(true);
      Vibration.vibrate([0, 200, 100, 200]);
      
      // ✅ FIXED: Added await and try/catch
      try {
        const { error } = await supabase
          .from('tasbih_sessions')
          .insert({ 
            user_id: userId(), 
            dhikr_text: current.text, 
            dhikr_arabic: current.arabic, 
            count: newCount, 
            target: current.target, 
            session_date: new Date().toISOString().split('T')[0] 
          });

        if (error) {
          // Save to local storage as backup
          const pending = await AsyncStorage.getItem('pending_tasbih');
          const pendingSessions = pending ? JSON.parse(pending) : [];
          pendingSessions.push({
            user_id: userId(),
            dhikr_text: current.text,
            dhikr_arabic: current.arabic,
            count: newCount,
            target: current.target,
            session_date: new Date().toISOString().split('T')[0],
            failedAt: Date.now(),
          });
          await AsyncStorage.setItem('pending_tasbih', JSON.stringify(pendingSessions));
        }
      } catch (error) {
        console.warn('Failed to save tasbih session:', error);
        // Fallback: save locally for retry later
        try {
          const pending = await AsyncStorage.getItem('pending_tasbih');
          const pendingSessions = pending ? JSON.parse(pending) : [];
          pendingSessions.push({
            user_id: userId(),
            dhikr_text: current.text,
            dhikr_arabic: current.arabic,
            count: newCount,
            target: current.target,
            session_date: new Date().toISOString().split('T')[0],
            failedAt: Date.now(),
          });
          await AsyncStorage.setItem('pending_tasbih', JSON.stringify(pendingSessions));
        } catch (storageErr) {
          console.warn('AsyncStorage fallback also failed:', storageErr);
        }
      }
    }
  };

  const selectorBg     = T.isDark ? '#111827' : '#f0f0ea';
  const selectorBorder = T.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const decrementBg    = T.isDark ? '#1f2937' : '#e5e7eb';
  const completionBg   = T.isDark ? '#1f2937' : '#ffffff';
  const progressBg     = T.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      {/* Dhikr selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selector} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {DEFAULT_DHIKRS.map((dhikr, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.selectorItem, { backgroundColor: selectorBg, borderColor: selectorBorder }, selectedDhikr === idx && { backgroundColor: T.gold, borderColor: T.gold }]}
            onPress={() => setSelectedDhikr(idx)}
          >
            <Text style={[styles.selectorText, { color: T.muted }, selectedDhikr === idx && { color: T.bg }]}>{dhikr.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Counter */}
      <View style={styles.counterContainer}>
        <Text style={[styles.arabicText, { color: T.gold }]}>{current.arabic}</Text>
        <Animated.Text style={[styles.countText, { color: T.text, transform: [{ scale: scaleAnim }] }]}>{count}</Animated.Text>
        <Text style={[styles.targetText, { color: T.muted }]}>Target: {current.target}</Text>
        <View style={[styles.progressBar, { backgroundColor: progressBg }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: T.gold }]} />
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.decrementBtn, { backgroundColor: decrementBg }]} onPress={() => { if (count > 0) { setCount(c => c - 1); setCompleted(false); } }}>
          <Ionicons name="remove" size={32} color={T.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.incrementBtn, { backgroundColor: T.gold }]} onPress={increment} activeOpacity={0.85}>
          <Ionicons name="add" size={48} color={T.bg} />
        </TouchableOpacity>
      </View>

      {/* Completion */}
      {completed && (
        <View style={[styles.completionCard, { backgroundColor: completionBg, borderColor: 'rgba(201,168,76,0.3)' }]}>
          <Text style={styles.completionEmoji}>🎉</Text>
          <Text style={[styles.completionTitle, { color: T.text }]}>Completed!</Text>
          <Text style={[styles.completionText, { color: T.muted }]}>You've completed {current.target} {current.text}</Text>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: T.gold }]} onPress={() => Share.share({ message: `Just completed ${current.text} ${current.target} times! 🕌\n"${current.arabic}"\n\nDeen App` })}>
            <Text style={[styles.shareBtnText, { color: T.bg }]}>Share 🤲</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setCount(0); setCompleted(false); }}>
            <Text style={[styles.resetBtnText, { color: T.muted }]}>Start Over</Text>
          </TouchableOpacity>
        </View>
      )}

      {!completed && count > 0 && (
        <TouchableOpacity style={styles.resetButton} onPress={() => { setCount(0); setCompleted(false); }}>
          <Ionicons name="refresh" size={20} color={T.muted} />
          <Text style={[styles.resetButtonText, { color: T.muted }]}>Reset</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  selector:         { maxHeight: 60, marginTop: 16 },
  selectorItem:     { paddingHorizontal: 20, paddingVertical: 10, marginRight: 12, borderRadius: 30, borderWidth: 1 },
  selectorText:     { fontWeight: '500' },
  counterContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  arabicText:       { fontSize: 42, marginBottom: 24, textAlign: 'center' },
  countText:        { fontSize: 96, fontWeight: '800', marginBottom: 12 },
  targetText:       { fontSize: 14 },
  progressBar:      { width: 200, height: 6, borderRadius: 3, marginTop: 32, overflow: 'hidden' },
  progressFill:     { height: 6, borderRadius: 3 },
  actionButtons:    { flexDirection: 'row', justifyContent: 'center', gap: 40, padding: 32, paddingBottom: 60 },
  decrementBtn:     { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  incrementBtn:     { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  resetButton:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginBottom: 20 },
  resetButtonText:  { fontSize: 14 },
  completionCard:   { position: 'absolute', bottom: 100, left: 20, right: 20, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1 },
  completionEmoji:  { fontSize: 48, marginBottom: 8 },
  completionTitle:  { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  completionText:   { fontSize: 14, marginBottom: 20, textAlign: 'center' },
  shareBtn:         { borderRadius: 12, padding: 14, width: '100%', alignItems: 'center', marginBottom: 10 },
  shareBtnText:     { fontWeight: '700' },
  resetBtnText:     { padding: 12 },
});