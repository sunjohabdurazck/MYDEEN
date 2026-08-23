// src/screens/QiblaScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Animated,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { calculateQiblaDirection } from '../services/qiblaCalculator';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const COMPASS_SIZE = width * 0.75;

export default function QiblaScreen() {
  const { theme: T } = useTheme();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [location, setLocation] = useState(null);
  const [qiblaBearing, setQiblaBearing] = useState(null);
  const [compassHeading, setCompassHeading] = useState(0);
  const [difference, setDifference] = useState(0);
  const [locationError, setLocationError] = useState(null);
  const [magnetometerAvailable, setMagnetometerAvailable] = useState(true);

  // Single Animated.Value for the needle rotation (angle to Qibla relative to phone)
  const needleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  // Stable ref so Magnetometer listener always has latest qiblaBearing
  const qiblaBearingRef = useRef(null);

  useEffect(() => {
    qiblaBearingRef.current = qiblaBearing;
  }, [qiblaBearing]);

  // ── Start pulsing glow animation ───────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Get location then start magnetometer ───────────────
  useEffect(() => {
    let subscription = null;
    let isMounted = true;

    (async () => {
      // Location
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (isMounted) setLocationError('Location permission denied');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!isMounted) return;
        const { latitude, longitude } = loc.coords;
        setLocation({ latitude, longitude });
        const bearing = calculateQiblaDirection(latitude, longitude);
        setQiblaBearing(bearing);
        qiblaBearingRef.current = bearing;
      } catch (e) {
        if (isMounted) setLocationError('Could not get your location');
        return;
      }

      if (!isMounted) return;

      // Magnetometer
      try {
        const isAvail = await Magnetometer.isAvailableAsync();
        if (!isAvail) {
          if (isMounted) setMagnetometerAvailable(false);
          return;
        }
        Magnetometer.setUpdateInterval(80);
        subscription = Magnetometer.addListener(({ x, y }) => {
          if (!isMounted) return;
          // Compass heading: 0° = North, clockwise
          let angle = Math.atan2(y, x) * (180 / Math.PI);
          angle = (angle + 360) % 360;
          setCompassHeading(angle);

          const qibla = qiblaBearingRef.current;
          if (qibla === null) return;

          // Angle the needle must rotate to point at Qibla
          const needleAngle = (qibla - angle + 360) % 360;
          const diff = needleAngle > 180 ? needleAngle - 360 : needleAngle;
          setDifference(diff);

          Animated.timing(needleAnim, {
            toValue: needleAngle,
            duration: 120,
            useNativeDriver: true,
          }).start();
        });
      } catch {
        if (isMounted) setMagnetometerAvailable(false);
      }
    })();

    return () => {
      isMounted = false;
      subscription?.remove?.();
      Magnetometer.removeAllListeners();
    };
  }, []);

  const isAligned = Math.abs(difference) < 5;

  const needleRotation = needleAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const hasCamera = cameraPermission?.granted;

  // ── Loading state ──────────────────────────────────────
  if (!location && !locationError) {
    return (
      <View style={[styles.center, { backgroundColor: T.bg }]}>
        <ActivityIndicator size="large" color="#c9a84c" />
        <Text style={[styles.loadingText, { color: T.muted }]}>Getting your location…</Text>
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────
  if (locationError) {
    return (
      <View style={[styles.center, { backgroundColor: T.bg }]}>
        <Text style={styles.errorEmoji}>📍</Text>
        <Text style={[styles.errorTitle, { color: T.text }]}>Location Required</Text>
        <Text style={[styles.errorText, { color: T.muted }]}>{locationError}</Text>
      </View>
    );
  }

  // ── Compass overlay (shared between camera and fallback) ─
  const CompassOverlay = () => (
    <View style={styles.overlay}>
      {/* Compass ring */}
      <View style={[styles.compassRing, isAligned && styles.compassRingAligned]}>
        {/* Cardinal labels */}
        {[
          { label: 'N', top: 12, left: COMPASS_SIZE / 2 - 10 },
          { label: 'S', bottom: 12, left: COMPASS_SIZE / 2 - 10 },
          { label: 'E', right: 12, top: COMPASS_SIZE / 2 - 10 },
          { label: 'W', left: 12, top: COMPASS_SIZE / 2 - 10 },
        ].map(({ label, ...pos }) => (
          <Text key={label} style={[styles.cardinal, pos]}>{label}</Text>
        ))}

        {/* Kaaba needle pointing toward Qibla */}
        <Animated.View
          style={[styles.needleWrapper, { transform: [{ rotate: needleRotation }] }]}
        >
          <Text style={styles.kaabaIcon}>🕋</Text>
          <View style={styles.needleLine} />
        </Animated.View>

        {/* Center dot */}
        <Animated.View style={[styles.centerDot, { transform: [{ scale: glowAnim }] }]} />
      </View>

      {/* Status card */}
      <View style={[styles.statusCard, isAligned && styles.statusCardAligned]}>
        <Text style={[styles.statusText, isAligned && styles.statusTextAligned]}>
          {isAligned ? '✅ Facing Qibla' : difference > 0 ? '↺ Turn left' : '↻ Turn right'}
        </Text>
        <Text style={styles.degreesText}>
          {Math.abs(difference).toFixed(1)}° off
        </Text>

        {/* Alignment bar */}
        <View style={styles.barBg}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.max(4, 100 - Math.min(100, Math.abs(difference) * 2))}%`,
                backgroundColor: isAligned ? '#10b981' : '#c9a84c',
              },
            ]}
          />
        </View>
      </View>

      <Text style={styles.hint}>Point your phone's top edge toward Qibla</Text>
    </View>
  );

  // ── Camera view ────────────────────────────────────────
  if (hasCamera) {
    return (
      <View style={styles.container}>
        <CameraView style={StyleSheet.absoluteFill} facing="back">
          <CompassOverlay />
        </CameraView>
      </View>
    );
  }

  // ── Fallback: no camera, show compass on dark background ─
  return (
    <View style={[styles.container, { backgroundColor: T.isDark ? '#0d1120' : '#f5f5f0' }]}>
      {!cameraPermission?.granted && (
        <TouchableOpacity style={styles.cameraBtn} onPress={requestCameraPermission}>
          <Text style={styles.cameraBtnText}>📷 Enable Camera for AR Mode</Text>
        </TouchableOpacity>
      )}
      <CompassOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 16, fontSize: 15 },
  errorEmoji: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  errorText: { fontSize: 14, textAlign: 'center' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  compassRing: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(201,168,76,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    position: 'relative',
  },
  compassRingAligned: {
    borderColor: '#10b981',
    borderWidth: 3,
  },
  cardinal: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },

  needleWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 40,
    height: COMPASS_SIZE * 0.45,
    top: '5%',
  },
  kaabaIcon: { fontSize: 30 },
  needleLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#c9a84c',
    borderRadius: 1,
    marginTop: 4,
  },

  centerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#c9a84c',
  },

  statusCard: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    minWidth: 220,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  statusCardAligned: { borderColor: '#10b981' },
  statusText: { fontSize: 16, color: '#c9a84c', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 6 },
  statusTextAligned: { color: '#10b981' },
  degreesText: { fontSize: 28, color: '#fff', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },
  barBg: { width: 160, height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },

  hint: { fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center', paddingHorizontal: 32 },

  cameraBtn: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#c9a84c',
    zIndex: 10,
  },
  cameraBtnText: { color: '#c9a84c', fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold' },
});
