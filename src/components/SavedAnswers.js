// src/components/SavedAnswers.js
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function SavedAnswers({ saved = [], onPress, onDelete }) {
  const { theme: T } = useTheme();

  if (saved.length === 0) {
    return (
      <View style={[styles.empty, { borderColor: T.border }]}>
        <Ionicons name="bookmark-outline" size={32} color={T.muted} />
        <Text style={[styles.emptyText, { color: T.muted }]}>No saved answers yet</Text>
        <Text style={[styles.emptyHint, { color: T.muted }]}>
          Long-press any AI response to save it here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={saved}
      keyExtractor={(item, i) => item.id ?? String(i)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.card, { backgroundColor: T.surface, borderColor: T.border }]}
          onPress={() => onPress?.(item)}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.categoryChip, { backgroundColor: T.gold + '22' }]}>
              <Text style={[styles.categoryText, { color: T.gold }]}>{item.category ?? 'General'}</Text>
            </View>
            <TouchableOpacity onPress={() => onDelete?.(item.id)}>
              <Ionicons name="trash-outline" size={15} color={T.muted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.question, { color: T.text }]} numberOfLines={2}>
            {item.question}
          </Text>
          <Text style={[styles.answer, { color: T.muted }]} numberOfLines={3}>
            {item.answer}
          </Text>
          {item.source && (
            <Text style={[styles.source, { color: T.gold }]}>📖 {item.source}</Text>
          )}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyText: { fontSize: 16, fontFamily: 'PlusJakartaSans-SemiBold' },
  emptyHint: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', textAlign: 'center' },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryText: { fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold' },
  question: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', lineHeight: 20 },
  answer: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', lineHeight: 18 },
  source: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium' },
});
