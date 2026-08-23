// src/components/TrendingQuestions.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const TRENDING = [
  { id: 1, q: 'How to make up missed prayers?',      asks: 1234 },
  { id: 2, q: 'What breaks wudu?',                   asks: 892  },
  { id: 3, q: 'Dua for anxiety and stress',          asks: 756  },
  { id: 4, q: 'How is Zakat calculated?',            asks: 641  },
  { id: 5, q: 'Can I pray with a tattoo?',           asks: 534  },
  { id: 6, q: 'What is the ruling on music?',        asks: 498  },
  { id: 7, q: 'How to perform Ghusl correctly?',     asks: 421  },
  { id: 8, q: 'Importance of Tahajjud prayer',       asks: 389  },
];

export default function TrendingQuestions({ onSelect }) {
  const { theme: T } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: T.muted }]}>🔥 TRENDING THIS WEEK</Text>
      {TRENDING.map((item, i) => (
        <TouchableOpacity
          key={item.id}
          style={[styles.row, { borderBottomColor: T.border }]}
          onPress={() => onSelect?.(item.q)}
          activeOpacity={0.75}
        >
          <Text style={[styles.rank, { color: T.gold }]}>{i + 1}</Text>
          <Text style={[styles.question, { color: T.text }]} numberOfLines={2}>{item.q}</Text>
          <Text style={[styles.count, { color: T.muted }]}>{item.asks.toLocaleString()}</Text>
          <Ionicons name="chevron-forward" size={14} color={T.muted} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16 },
  label: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  rank: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', width: 18, textAlign: 'center' },
  question: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', lineHeight: 18 },
  count: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular' },
});
