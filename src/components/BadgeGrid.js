// src/components/BadgeGrid.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';

const BADGES = [
  { slug: 'first_prayer',  name: 'First Step',       icon: '🕌', description: 'Logged first prayer' },
  { slug: 'perfect_day',   name: 'Perfect Day',       icon: '⭐', description: 'All 5 prayers on time' },
  { slug: '7_day_streak',  name: 'Week Warrior',      icon: '🔥', description: '7 day streak' },
  { slug: '30_day_streak', name: 'Monthly Master',    icon: '🏆', description: '30 day streak' },
  { slug: 'quran_khatam',  name: 'Quran Completer',   icon: '📖', description: 'Completed full Quran' },
  { slug: 'fajr_hero',     name: 'Fajr Hero',         icon: '🌅', description: 'Prayed Fajr 30 days straight' },
  { slug: 'tahajjud',      name: 'Night Vigil',       icon: '🌙', description: 'Prayed Tahajjud 10 times' },
  { slug: 'dhikr_master',  name: 'Dhikr Master',      icon: '📿', description: '1000 total dhikr' },
];

export default function BadgeGrid({ earnedBadges: earnedBadgesProp }) {
  const { theme: T } = useTheme();
  const { userId } = useAuthStore();
  const [earnedBadges, setEarnedBadges] = useState(earnedBadgesProp ?? []);
  const [loadingBadges, setLoadingBadges] = useState(!earnedBadgesProp);

  useEffect(() => {
    // If prop is provided externally, use it directly
    if (earnedBadgesProp !== undefined) {
      setEarnedBadges(earnedBadgesProp);
      setLoadingBadges(false);
      return;
    }

    // Otherwise fetch from Supabase
    let isMounted = true;
    const loadBadges = async () => {
      try {
        const { data } = await supabase
          .from('user_badges')
          .select('badge_slug')
          .eq('user_id', userId());
        if (isMounted && data) {
          setEarnedBadges(data.map(b => b.badge_slug));
        }
      } catch (err) {
        console.warn('BadgeGrid: failed to load badges', err);
      } finally {
        if (isMounted) setLoadingBadges(false);
      }
    };

    loadBadges();
    return () => { isMounted = false; };
  }, [earnedBadgesProp]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: T.text }]}>Achievements</Text>
      {loadingBadges ? (
        <ActivityIndicator size="small" color={T.gold} style={{ marginVertical: 20 }} />
      ) : (
        <View style={styles.grid}>
          {BADGES.map(badge => {
            const earned = earnedBadges.includes(badge.slug);
            return (
              <View
                key={badge.slug}
                style={[
                  styles.badgeCard,
                  {
                    backgroundColor: earned
                      ? `${T.gold}0D`
                      : T.surface,
                    borderColor: earned ? T.gold : T.border,
                  },
                ]}
              >
                <Text style={styles.badgeEmoji}>{badge.icon}</Text>
                <Text style={[styles.badgeName, { color: earned ? T.gold : T.muted }]}>
                  {badge.name}
                </Text>
                <Text style={[styles.badgeDesc, { color: T.muted }]}>{badge.description}</Text>
                {!earned && <View style={styles.lockedOverlay} />}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  title: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', marginBottom: 16, paddingHorizontal: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 12 },
  badgeCard: { width: '30%', aspectRatio: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 12, position: 'relative', borderWidth: 1 },
  badgeEmoji: { fontSize: 32, marginBottom: 8 },
  badgeName: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', textAlign: 'center' },
  badgeDesc: { fontSize: 9, textAlign: 'center', marginTop: 4 },
  lockedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16 },
});
