// src/screens/AuthScreen.js - WORKING with Supabase Google Sign-In
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store';
import { supabase } from '../lib/supabase';

export default function AuthScreen({ navigation }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuthStore();

  // ── Email / Password ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!isLogin && !displayName) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
    } catch (error) {
      Alert.alert('Authentication Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign-In using Supabase (SIMPLER & WORKS) ───────────
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      // Supabase will redirect to Google and back automatically
      // The user will be redirected - no need to handle response here
    } catch (error) {
      console.error('Google sign in error:', error);
      Alert.alert('Google Sign-In Error', error.message || 'Please try again');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.logoEmoji}>🕌</Text>
        <Text style={styles.title}>Deen</Text>
        <Text style={styles.subtitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
      </View>

      <View style={styles.form}>
        {!isLogin && (
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#6b7280" />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#6b7280"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#6b7280" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6b7280"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Password"
            placeholderTextColor="#6b7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#0d1120" />
          ) : (
            <Text style={styles.submitText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
          )}
        </TouchableOpacity>

        {/* ── Divider ─────────────────────────────────────────── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Google Sign-In ──────────────────────────────────── */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.88}
        >
          <View style={styles.googleIcon}>
            <Text style={styles.googleIconText}>G</Text>
          </View>
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1120' },
  header: { alignItems: 'center', marginTop: 60, marginBottom: 40 },
  logoEmoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 36, fontFamily: 'PlusJakartaSans-Bold', color: '#c9a84c' },
  subtitle: { fontSize: 16, color: '#9ca3af', marginTop: 8 },
  form: { paddingHorizontal: 24, gap: 16 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827',
    borderRadius: 14, paddingHorizontal: 16, gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  input: { paddingVertical: 14, color: '#fff', fontSize: 16 },
  submitBtn: { backgroundColor: '#c9a84c', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#0d1120', fontSize: 16, fontFamily: 'PlusJakartaSans-Bold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: '#6b7280', fontSize: 14 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
  },
  googleIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center',
  },
  googleIconText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  googleText: { color: '#1f2937', fontSize: 16, fontFamily: 'PlusJakartaSans-SemiBold' },
  switchText: { color: '#c9a84c', textAlign: 'center', marginTop: 4, fontSize: 14 },
});