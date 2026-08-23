// src/components/WeatherWidget.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const WEATHER_CODE_MAP = {
  0: { emoji: '☀️', label: 'Clear' },
  1: { emoji: '🌤️', label: 'Mostly Clear' },
  2: { emoji: '⛅', label: 'Partly Cloudy' },
  3: { emoji: '☁️', label: 'Cloudy' },
  45: { emoji: '🌫️', label: 'Foggy' },
  48: { emoji: '🌫️', label: 'Foggy' },
  51: { emoji: '🌦️', label: 'Light Drizzle' },
  61: { emoji: '🌧️', label: 'Rain' },
  71: { emoji: '❄️', label: 'Snow' },
  95: { emoji: '⛈️', label: 'Thunderstorm' },
};

function getWeatherInfo(code) {
  return WEATHER_CODE_MAP[code] ?? { emoji: '🌡️', label: 'Weather' };
}

export default function WeatherWidget({ location }) {
  const { theme: T } = useTheme();
  const [weather, setWeather] = useState(null);
  const [cityName, setCityName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location?.latitude || !location?.longitude) return;
    let isMounted = true;

    const run = async () => {
      await Promise.all([
        fetchWeather(location.latitude, location.longitude, isMounted),
        fetchCity(location.latitude, location.longitude, isMounted),
      ]);
    };

    run();
    return () => { isMounted = false; };
  }, [location?.latitude, location?.longitude]);

  const fetchWeather = async (lat, lon, isMounted = true) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode`
      );
      const data = await res.json();
      if (isMounted) setWeather(data.current);
    } catch (_) {}
    if (isMounted) setLoading(false);
  };

  const fetchCity = async (lat, lon, isMounted = true) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      const data = await res.json();
      const city = data.address?.city || data.address?.town || data.address?.village || '';
      if (isMounted) setCityName(city);
    } catch (_) {}
  };

  if (!location?.latitude) return null;
  if (loading) {
    return (
      <View style={[styles.widget, { backgroundColor: T.surface, borderColor: T.border }]}>
        <ActivityIndicator size="small" color={T.gold} />
      </View>
    );
  }
  if (!weather) return null;

  const info = getWeatherInfo(weather.weathercode);

  return (
    <View style={[styles.widget, { backgroundColor: T.surface, borderColor: T.border }]}>
      <Text style={styles.emoji}>{info.emoji}</Text>
      <View style={styles.info}>
        <Text style={[styles.temp, { color: T.text }]}>
          {Math.round(weather.temperature_2m)}°C
        </Text>
        <Text style={[styles.condition, { color: T.muted }]}>{info.label}</Text>
      </View>
      {cityName ? (
        <View style={styles.cityRow}>
          <Ionicons name="location-outline" size={12} color={T.muted} />
          <Text style={[styles.city, { color: T.muted }]} numberOfLines={1}>{cityName}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  widget: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  emoji: { fontSize: 26 },
  info: { flex: 1 },
  temp: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  condition: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  city: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    maxWidth: 100,
  },
});
