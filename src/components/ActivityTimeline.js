// src/components/ActivityTimeline.js
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';

// Même logique de police que dans AppNavigator (system-ui sur le web)
const font = (name) => (Platform.OS === 'web' ? 'system-ui' : name);

// Valeurs de repli si une couleur du thème est absente
const FALLBACK_THEME = {
  surface: '#1a1f2e',
  text: '#ffffff',
  muted: '#8b93a7',
  gold: '#c9a84c',
  border: 'rgba(255,255,255,0.08)',
};

// Convertit n'importe quelle valeur en texte affichable (jamais d'objet dans <Text>)
const toText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
};

// Date lisible, sans jamais afficher "Invalid Date"
const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
};

export default function ActivityTimeline({ activities: activitiesProp }) {
  const themeCtx = useTheme();
  const T = useMemo(() => ({ ...FALLBACK_THEME, ...(themeCtx?.theme || {}) }), [themeCtx?.theme]);
  const { userId } = useAuthStore();

  // Si la prop est fournie (même vide), on l'utilise et on ne charge rien
  const isControlled = activitiesProp !== undefined;

  const [fetched, setFetched] = useState([]);
  const [loading, setLoading] = useState(!isControlled);

  useEffect(() => {
    if (isControlled) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadActivity = async () => {
      try {
        const uid = typeof userId === 'function' ? userId() : userId;
        if (!uid) return; // pas d'utilisateur : rien à charger

        const { data, error } = await supabase
          .from('user_activity')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        if (isMounted && Array.isArray(data)) setFetched(data);
      } catch (err) {
        console.warn('ActivityTimeline: failed to load activity', err?.message ?? err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadActivity();
    return () => { isMounted = false; };
  }, [isControlled]);

  // Toujours un tableau d'objets valides
  const activities = useMemo(() => {
    const source = isControlled ? activitiesProp : fetched;
    return Array.isArray(source) ? source.filter(Boolean) : [];
  }, [isControlled, activitiesProp, fetched]);

  const containerStyle = [styles.container, { backgroundColor: T.surface, borderColor: T.border }];

  if (loading) {
    return (
      <View style={containerStyle}>
        <Text style={[styles.title, { color: T.text }]}>📜 Activity Feed</Text>
        <ActivityIndicator size="small" color={T.gold} style={styles.loader} />
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={containerStyle}>
        <Text style={[styles.title, { color: T.text }]}>📜 Activity Feed</Text>
        <Text style={[styles.emptyText, { color: T.muted }]}>
          No activity yet. Start praying to see your journey!
        </Text>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text style={[styles.title, { color: T.text }]}>📜 Activity Feed</Text>
      {activities.map((item, idx) => {
        const isLast = idx === activities.length - 1;
        const label = toText(item.text) || toText(item.description);
        const time = toText(item.time) || formatDate(item.created_at);

        return (
          <View
            key={item.id != null ? String(item.id) : `activity-${idx}`}
            style={[
              styles.row,
              { borderBottomColor: T.border },
              isLast && styles.rowLast,
            ]}
          >
            {/* Timeline dot + line */}
            <View style={styles.timelineCol}>
              <View style={[styles.dot, { backgroundColor: T.gold }]} />
              {!isLast && <View style={[styles.line, { backgroundColor: T.border }]} />}
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.icon}>{toText(item.icon) || '📌'}</Text>
              <View style={styles.textCol}>
                <Text style={[styles.text, { color: T.text }]}>{label}</Text>
                {!!time && <Text style={[styles.time, { color: T.muted }]}>{time}</Text>}
              </View>
            </View>
          </View>
        );
      })}
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
  title: { fontSize: 15, fontFamily: font('PlusJakartaSans-SemiBold'), marginBottom: 12 },
  loader: { marginVertical: 16 },
  emptyText: {
    fontSize: 13,
    fontFamily: font('PlusJakartaSans-Regular'),
    textAlign: 'center',
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  rowLast: { borderBottomWidth: 0 },
  timelineCol: { width: 20, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  line: { width: 2, flex: 1, marginTop: 4 },
  rowContent: { flex: 1, flexDirection: 'row', gap: 10, marginLeft: 8 },
  icon: { fontSize: 20 },
  textCol: { flex: 1 },
  text: { fontSize: 13, fontFamily: font('PlusJakartaSans-Medium'), lineHeight: 18 },
  time: { fontSize: 11, fontFamily: font('PlusJakartaSans-Regular'), marginTop: 2 },
});
