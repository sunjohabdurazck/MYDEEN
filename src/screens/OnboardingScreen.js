// src/screens/OnboardingScreen.js
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Dimensions, Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🕌</Text>
          <Text style={styles.title}>Deen</Text>
          <Text style={styles.subtitle}>Your Complete Islamic Companion</Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>⏰</Text>
            <Text style={styles.featureText}>Accurate Prayer Times</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>📖</Text>
            <Text style={styles.featureText}>Holy Quran with Translations</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>🧭</Text>
            <Text style={styles.featureText}>Qibla Direction Finder</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureEmoji}>🔒</Text>
            <Text style={styles.featureText}>Prayer Lock Mode</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.getStartedBtn} 
          onPress={() => navigation.replace('Auth')}
        >
          <Text style={styles.getStartedText}>Get Started →</Text>
        </TouchableOpacity>
        
        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1120' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 60 },
  logoEmoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 42, fontFamily: 'PlusJakartaSans-Bold', color: '#c9a84c', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#9ca3af', textAlign: 'center' },
  features: { width: '100%', marginBottom: 60, gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', padding: 16, borderRadius: 16, gap: 12 },
  featureEmoji: { fontSize: 24 },
  featureText: { fontSize: 16, color: '#e5e7eb', fontFamily: 'PlusJakartaSans-Medium' },
  getStartedBtn: { backgroundColor: '#c9a84c', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 30, width: '100%', alignItems: 'center' },
  getStartedText: { color: '#0d1120', fontSize: 18, fontFamily: 'PlusJakartaSans-Bold' },
  termsText: { fontSize: 12, color: '#4b5563', marginTop: 24, textAlign: 'center' },
});