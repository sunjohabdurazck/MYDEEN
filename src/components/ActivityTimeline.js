// src/components/ActivityTimeline.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';

export default function ActivityTimeline({ activities: activitiesProp }) {
  const { theme: T } = useTheme();
  const { userId } = useAuthStore();
  const [activities, setActivities] = useState(activitiesProp ?? []);
  const [loading, setLoading] = useState(!activitiesProp);

  useEffect(() => {
    // If prop is provided externally, use it directly
    if (activitiesProp !== undefined) {
      setActivities(activitiesProp);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadActivity = async () => {
      try {
        const { data } = await supabase
          .from('user_activity')
          .select('*')
          .eq('user_id', userId())
          .order('created_at', { ascending: false })
          .limit(20);
        if (isMounted && data) setActivities(data);
      } catch (err) {
        console.warn('ActivityTimeline: failed to load activity', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadActivity();
    return () => { isMounted = false; };
  }, [activitiesProp]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Text style={[styles.title, { color: T.text }]}>📜 Activity Feed</Text>
        <ActivityIndicator size="small" color={T.gold} style={{ marginVertical: 16 }} />
      </View>
    );
  }

  if (!activities.length) {
    return (
      <View style={[styles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Text style={[styles.title, { color: T.text }]}>📜 Activity Feed</Text>
        <Text style={[styles.emptyText, { color: T.muted }]}>No activity yet. Start praying to see your journey!</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
      <Text style={[styles.title, { color: T.text }]}>📜 Activity Feed</Text>
      {activities.map((item, idx) => (
        <View
          key={item.id ?? idx}
          style={[
            styles.row,
            { borderBottomColor: T.border },
            idx === activities.length - 1 && { borderBottomWidth: 0 },
          ]}
        >
          {/* Timeline dot + line */}
          <View style={styles.timelineCol}>
            <View style={[styles.dot, { backgroundColor: T.gold }]} />
            {idx < activities.length - 1 && <View style={[styles.line, { backgroundColor: T.border }]} />}
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.icon}>{item.icon ?? '📌'}</Text>
            <View style={styles.textCol}>
              <Text style={[styles.text, { color: T.text }]}>{item.text ?? item.description ?? ''}</Text>
              <Text style={[styles.time, { color: T.muted }]}>
                {item.time ?? (item.created_at ? new Date(item.created_at).toLocaleDateString() : '')}
              </Text>
            </View>
          </View>
        </View>
      ))}
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
    padding: 14,
  },
  title: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', marginBottom: 12 },
  emptyText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Regular', textAlign: 'center', paddingVertical: 16 },
  row: {
    flexDirection: 'row',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  timelineCol: { width: 20, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  line: { width: 2, flex: 1, marginTop: 4 },
  rowContent: { flex: 1, flexDirection: 'row', gap: 10, marginLeft: 8 },
  icon: { fontSize: 20 },
  textCol: { flex: 1 },
  text: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', lineHeight: 18 },
  time: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', marginTop: 2 },
});
