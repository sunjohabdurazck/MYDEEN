// src/components/GoalTracker.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const DEFAULT_GOALS = [
  { id: 'quran',    name: 'Complete Quran',  target: 604, current: 0,  unit: 'pages',  icon: '📖' },
  { id: 'fasting',  name: 'Voluntary Fasts', target: 52,  current: 0,  unit: 'days',   icon: '🌙' },
  { id: 'tahajjud', name: 'Tahajjud Nights', target: 100, current: 0,  unit: 'nights', icon: '⭐' },
];

function GoalRow({ goal, theme: T, onIncrement }) {
  const pct = Math.min(100, (goal.current / goal.target) * 100);
  return (
    <View style={[styles.goalRow, { borderBottomColor: T.border }]}>
      <View style={styles.goalLeft}>
        <Text style={styles.goalIcon}>{goal.icon}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.goalHeader}>
            <Text style={[styles.goalName, { color: T.text }]}>{goal.name}</Text>
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
        style={[styles.incrBtn, { backgroundColor: T.gold + '22', borderColor: T.gold + '44' }]}
        onPress={() => onIncrement(goal.id)}
      >
        <Ionicons name="add" size={16} color={T.gold} />
      </TouchableOpacity>
    </View>
  );
}

export default function GoalTracker() {
  const { theme: T } = useTheme();
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [newGoal, setNewGoal] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const handleIncrement = (id) => {
    setGoals(prev =>
      prev.map(g => g.id === id ? { ...g, current: Math.min(g.target, g.current + 1) } : g)
    );
  };

  const handleAddGoal = () => {
    if (!newGoal.trim()) return;
    setGoals(prev => [...prev, {
      id: `custom_${Date.now()}`,
      name: newGoal.trim(),
      target: 30,
      current: 0,
      unit: 'times',
      icon: '🎯',
    }]);
    setNewGoal('');
    setShowAdd(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: T.text }]}>🎯 Spiritual Goals</Text>
        <TouchableOpacity onPress={() => setShowAdd(v => !v)}>
          <Ionicons name={showAdd ? 'close' : 'add-circle-outline'} size={22} color={T.gold} />
        </TouchableOpacity>
      </View>

      {goals.map(g => (
        <GoalRow key={g.id} goal={g} theme={T} onIncrement={handleIncrement} />
      ))}

      {showAdd && (
        <View style={[styles.addRow, { borderTopColor: T.border }]}>
          <TextInput
            style={[styles.addInput, { backgroundColor: T.inputBg ?? T.bg, color: T.text, borderColor: T.border }]}
            placeholder="New goal name..."
            placeholderTextColor={T.muted}
            value={newGoal}
            onChangeText={setNewGoal}
            onSubmitEditing={handleAddGoal}
            returnKeyType="done"
          />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: T.gold }]} onPress={handleAddGoal}>
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
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  goalName: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium' },
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
