// src/components/GoalTracker.js
import React, { useState, useCallback, useRef, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const DEFAULT_GOALS = [
  { id: 'quran',    name: 'Complete Quran',  target: 604, current: 0, unit: 'pages',  icon: '📖' },
  { id: 'fasting',  name: 'Voluntary Fasts', target: 52,  current: 0, unit: 'days',   icon: '🌙' },
  { id: 'tahajjud', name: 'Tahajjud Nights', target: 100, current: 0, unit: 'nights', icon: '⭐' },
];

const MAX_GOALS = 20;
const MAX_NAME_LENGTH = 40;

// Couleurs de secours si le thème est incomplet ou absent
const FALLBACK = {
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  surface: '#ffffff',
  bg: '#f9fafb',
  gold: '#d4a017',
};

// Ajoute de la transparence uniquement si la couleur est un hex #RRGGBB
// (évite "undefined22" ou "rgb(...)22" qui cassent le style)
const withAlpha = (color, alpha) =>
  typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;

const toSafeNumber = (n, fallback = 0) => (Number.isFinite(n) ? n : fallback);

const getPercent = (current, target) => {
  const t = toSafeNumber(target);
  if (t <= 0) return 0; // évite la division par zéro (NaN / Infinity)
  const pct = (toSafeNumber(current) / t) * 100;
  return Math.max(0, Math.min(100, pct));
};

const GoalRow = memo(function GoalRow({ goal, theme: T, onIncrement, onDecrement }) {
  const pct = getPercent(goal.current, goal.target);
  const done = goal.current >= goal.target;

  return (
    <View style={[styles.goalRow, { borderBottomColor: T.border }]}>
      <View style={styles.goalLeft}>
        <Text style={styles.goalIcon}>{goal.icon}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.goalHeader}>
            <Text style={[styles.goalName, { color: T.text }]} numberOfLines={1}>
              {goal.name}
            </Text>
            <Text style={[styles.goalCount, { color: T.gold }]}>
              {goal.current}/{goal.target} {goal.unit}
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: T.border }]}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: T.gold }]} />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.incrBtn,
          {
            backgroundColor: withAlpha(T.gold, '22'),
            borderColor: withAlpha(T.gold, '44'),
            opacity: done ? 0.5 : 1,
          },
        ]}
        onPress={() => onIncrement(goal.id)}
        onLongPress={() => onDecrement(goal.id)} // appui long = annuler une erreur
        accessibilityRole="button"
        accessibilityLabel={`Add one to ${goal.name}. Long press to remove one.`}
      >
        <Ionicons name={done ? 'checkmark' : 'add'} size={16} color={T.gold} />
      </TouchableOpacity>
    </View>
  );
});

export default function GoalTracker() {
  const themeCtx = useTheme();
  const T = { ...FALLBACK, ...((themeCtx && themeCtx.theme) || {}) };

  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [newGoal, setNewGoal] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const idCounter = useRef(0); // garantit des ids uniques même avec deux appuis rapides

  const handleIncrement = useCallback((id) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, current: Math.min(g.target, toSafeNumber(g.current) + 1) } : g
      )
    );
  }, []);

  const handleDecrement = useCallback((id) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, current: Math.max(0, toSafeNumber(g.current) - 1) } : g
      )
    );
  }, []);

  const handleAddGoal = useCallback(() => {
    const name = newGoal.trim().slice(0, MAX_NAME_LENGTH);
    if (!name) return;

    if (goals.length >= MAX_GOALS) {
      Alert.alert('Limit reached', `You can track up to ${MAX_GOALS} goals.`);
      return;
    }

    const exists = goals.some((g) => g.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      Alert.alert('Already added', 'You already have a goal with this name.');
      return;
    }

    idCounter.current += 1;
    setGoals((prev) => [
      ...prev,
      {
        id: `custom_${Date.now()}_${idCounter.current}`,
        name,
        target: 30,
        current: 0,
        unit: 'times',
        icon: '🎯',
      },
    ]);
    setNewGoal('');
    setShowAdd(false);
  }, [newGoal, goals]);

  return (
    <View style={[styles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: T.text }]}>🎯 Spiritual Goals</Text>
        <TouchableOpacity
          onPress={() => setShowAdd((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={showAdd ? 'Close add goal form' : 'Add a new goal'}
        >
          <Ionicons name={showAdd ? 'close' : 'add-circle-outline'} size={22} color={T.gold} />
        </TouchableOpacity>
      </View>

      {goals.map((g) => (
        <GoalRow
          key={g.id}
          goal={g}
          theme={T}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
      ))}

      {showAdd && (
        <View style={[styles.addRow, { borderTopColor: T.border }]}>
          <TextInput
            style={[
              styles.addInput,
              { backgroundColor: T.inputBg ?? T.bg, color: T.text, borderColor: T.border },
            ]}
            placeholder="New goal name..."
            placeholderTextColor={T.muted}
            value={newGoal}
            onChangeText={setNewGoal}
            onSubmitEditing={handleAddGoal}
            returnKeyType="done"
            maxLength={MAX_NAME_LENGTH}
            autoCapitalize="sentences"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: T.gold, opacity: newGoal.trim() ? 1 : 0.5 }]}
            onPress={handleAddGoal}
            disabled={!newGoal.trim()}
            accessibilityRole="button"
            accessibilityLabel="Confirm new goal"
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingBottom: 10,
  },
  title: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold' },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  goalLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  goalIcon: { fontSize: 20 },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    gap: 8,
  },
  goalName: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans-Medium' },
  goalCount: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold' },
  progressBar: { height: 5, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  incrBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
  },
  addInput: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
