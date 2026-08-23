// App.js - WORKING VERSION with auth initialization
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { useAuthStore } from './src/store';

function LoadingScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.loader, { backgroundColor: theme?.bg || '#0d1120' }]}>
      <ActivityIndicator size="large" color={theme?.gold || '#c9a84c'} />
      <Text style={[styles.loaderText, { color: theme?.muted || '#9ca3af', marginTop: 16 }]}>
        Loading Deen App...
      </Text>
    </View>
  );
}

// Main App component - FIXED to call initialize
function AppContent() {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [AppNavigator, setAppNavigator] = useState(null);
  
  // ✅ IMPORTANT: Get initialize function from auth store
  const { isLoading: authLoading, initialize, session } = useAuthStore();

  // ✅ Initialize auth on mount - THIS WAS MISSING!
  useEffect(() => {
    console.log('📱 App mounted, initializing auth...');
    initialize();
  }, []);

  // Load AppNavigator
  useEffect(() => {
    console.log('🔄 Loading AppNavigator...');
    import('./src/navigation/AppNavigator')
      .then(module => {
        console.log('✅ AppNavigator loaded successfully');
        setAppNavigator(() => module.default);
      })
      .catch(err => {
        console.error('❌ Failed to load AppNavigator:', err);
        setHasError(true);
        setErrorMessage(err.message);
      });
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('🔍 AppContent state:', { authLoading, hasNavigator: !!AppNavigator, hasSession: !!session });
  }, [authLoading, AppNavigator, session]);

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      </View>
    );
  }

  // ✅ Show loading until auth is initialized AND navigator is loaded
  if (authLoading || !AppNavigator) {
    return <LoadingScreen />;
  }

  console.log('✅ Rendering AppNavigator');
  return <AppNavigator />;
}

export default function App() {
  return (
    <ThemeProvider>
      <StatusBar style="light" />
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#0d1120',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0d1120',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 8,
  },
});