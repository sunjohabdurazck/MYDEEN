// src/components/PrayerCard.js
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const PRAYER_ICONS = {
  Fajr: '🌅',
  Dhuhr: '☀️',
  Asr: '🌤️',
  Maghrib: '🌙',
  Isha: '⭐',
};

const PRAYER_ARABIC = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

const STATUS_CONFIG = (T) => ({
  prayed: {
    label: 'Prayed',
    icon: 'checkmark-circle',
    color: T.emerald,
    bgColor: T.isDark ? 'rgba(16,185,129,0.1)' : 'rgba(5,150,105,0.1)',
  },
  missed: {
    label: 'Missed',
    icon: 'close-circle',
    color: T.red,
    bgColor: T.isDark ? 'rgba(239,68,68,0.1)' : 'rgba(220,38,38,0.1)',
  },
  qada: {
    label: 'Qada',
    icon: 'time',
    color: T.orange,
    bgColor: T.isDark ? 'rgba(245,158,11,0.1)' : 'rgba(234,88,12,0.1)',
  },
  pending: {
    label: 'Pending',
    icon: 'hourglass-outline',
    color: T.muted,
    bgColor: T.isDark ? 'rgba(156,163,175,0.1)' : 'rgba(107,114,128,0.1)',
  },
});

export default function PrayerCard({ 
  name, 
  time, 
  status = 'pending', 
  isNext = false,
  onPress,
  onLongPress,
  showTime = true,
  compact = false,
  locked = false,
}) {
  const { theme: T } = useTheme();
  const config = STATUS_CONFIG(T)[status] || STATUS_CONFIG(T).pending;
  const arabicName = PRAYER_ARABIC[name];
  const emoji = PRAYER_ICONS[name];
  
  const formattedTime = time ? formatTimeTo12Hour(time) : '--:--';
  const isPassed = time ? isTimePassed(time) : false;
  
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  
  React.useEffect(() => {
    if (isNext) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isNext]);
  
  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactCard, 
          { 
            backgroundColor: T.surface, 
            borderColor: T.border 
          },
          isNext && { borderColor: T.gold }
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
      >
        <View style={styles.compactLeft}>
          <Text style={styles.compactEmoji}>{emoji}</Text>
          <View>
            <Text style={[styles.compactName, { color: T.text }]}>{name}</Text>
            <Text style={[styles.compactArabic, { color: T.muted }]}>{arabicName}</Text>
          </View>
        </View>
        
        {showTime && (
          <Text style={[
            styles.compactTime, 
            { color: isPassed ? T.muted : T.text },
            isPassed && styles.passedTime
          ]}>
            {formattedTime}
          </Text>
        )}
        
        <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={14} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
  
  return (
    <Animated.View style={[
      styles.card,
      isNext && { transform: [{ scale: pulseAnim }] }
    ]}>
      <TouchableOpacity
        style={[
          styles.cardContent, 
          { 
            backgroundColor: T.surface, 
            borderColor: T.border 
          },
          isNext && { borderColor: T.gold },
          locked && { opacity: 0.85 }
        ]}
        onPress={locked ? undefined : onPress}
        onLongPress={locked ? undefined : onLongPress}
        activeOpacity={locked ? 1 : 0.7}
        delayLongPress={500}
        disabled={locked && !onPress}
      >
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, { backgroundColor: T.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={[styles.name, { color: T.text }, isNext && { color: T.gold }]}>
              {name}
            </Text>
            <Text style={[styles.arabicName, { color: T.muted }]}>
              {arabicName}
            </Text>
          </View>
        </View>
        
        {showTime && (
          <View style={styles.timeContainer}>
            <Text style={[
              styles.time, 
              { color: isPassed ? T.muted : T.text },
              isPassed && styles.passedTime
            ]}>
              {formattedTime}
            </Text>
            {isNext && (
              <View style={[styles.nextBadge, { backgroundColor: T.gold }]}>
                <Text style={[styles.nextBadgeText, { color: T.isDark ? T.bg : '#ffffff' }]}>NEXT</Text>
              </View>
            )}
          </View>
        )}
        
        <View style={[styles.statusContainer, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={18} color={config.color} />
          <Text style={[styles.statusLabel, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Helper functions
function formatTimeTo12Hour(timeStr) {
  if (!timeStr) return '--:--';
  const match = timeStr.match(/^(\d{2}):(\d{2})/);
  if (!match) return timeStr;
  
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  
  return `${hours}:${minutes} ${ampm}`;
}

function isTimePassed(timeStr) {
  if (!timeStr) return false;
  const match = timeStr.match(/^(\d{2}):(\d{2})/);
  if (!match) return false;
  
  const now = new Date();
  const prayerHour = parseInt(match[1]);
  const prayerMinute = parseInt(match[2]);
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  if (currentHour > prayerHour) return true;
  if (currentHour === prayerHour && currentMinute > prayerMinute) return true;
  return false;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: {
    fontSize: 22,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 2,
  },
  arabicName: {
    fontSize: 12,
    fontFamily: 'Amiri-Regular',
  },
  timeContainer: {
    flex: 1,
    alignItems: 'center',
  },
  time: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  passedTime: {
    textDecorationLine: 'line-through',
  },
  nextBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  nextBadgeText: {
    fontSize: 8,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 30,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactEmoji: {
    fontSize: 18,
  },
  compactName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  compactArabic: {
    fontSize: 10,
    fontFamily: 'Amiri-Regular',
  },
  compactTime: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Medium',
  },
});