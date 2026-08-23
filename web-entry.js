// web-entry.js - Minimal Supabase-free version for web
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { registerRootComponent } from 'expo';

// Mock Supabase for web to avoid import.meta issues
global.import = { meta: { url: location.href } };
global.__DEV__ = true;

// Simple App component
function WebApp() {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoaded(true), 500);
  }, []);

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#c9a84c" />
        <Text style={styles.text}>Loading Deen App...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🕌 Deen App</Text>
      <Text style={styles.subtitle}>Islamic Companion</Text>
      <Text style={styles.message}>Web version coming soon!</Text>
      <Text style={styles.note}>
        For now, please use the mobile app for full features.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1120',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    color: '#c9a84c',
    marginBottom: 16,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 32,
    fontFamily: 'System',
  },
  message: {
    fontSize: 18,
    color: '#9ca3af',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'System',
  },
  note: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontFamily: 'System',
  },
  text: {
    marginTop: 16,
    color: '#9ca3af',
    fontSize: 14,
  },
});

registerRootComponent(WebApp);