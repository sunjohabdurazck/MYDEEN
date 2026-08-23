// src/services/appBlocker.js — FIXED for React Native 0.77+
import { Platform, Alert, BackHandler, AppState, Vibration } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const LOCK_KEY = 'prayer_lock_state';
const BYPASS_LOG_KEY = 'bypass_attempts';

// ── Lock state shape ───────────────────────────────────────────────────────
// { prayer, until, active, hardcoreMode, bypassCount }

export class AppBlocker {
  static _monitorInterval = null;
  static _appStateSubscription = null;
  static _bypassCount = 0;
  static _backHandlerSubscription = null;

  // ── PERMISSIONS ─────────────────────────────────────────────────────────
  static async requestRequiredPermissions() {
    if (Platform.OS !== 'android') return { overlay: false, notifications: true };

    const results = {};

    // Overlay (SYSTEM_ALERT_WINDOW) — needed for true overlay
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.MANAGE_OVERLAY_PERMISSION,
        { data: 'package:' + Application.applicationId }
      );
      results.overlay = true;
    } catch {
      results.overlay = false;
    }

    // Notification permissions for foreground service simulation
    const { status } = await Notifications.requestPermissionsAsync();
    results.notifications = status === 'granted';

    return results;
  }

  // ── START LOCK ──────────────────────────────────────────────────────────
  static async startBlocking(prayerName, durationMinutes = 20, hardcoreMode = false) {
    const until = Date.now() + durationMinutes * 60 * 1000;

    const lockState = {
      prayer: prayerName,
      until,
      active: true,
      hardcoreMode,
      bypassCount: 0,
      startedAt: Date.now(),
    };

    await AsyncStorage.setItem(LOCK_KEY, JSON.stringify(lockState));

    // Post a persistent notification (acts as foreground service on Android)
    await this._postLockNotification(prayerName, until);

    // Start AppState monitor — detects if user leaves our app
    this._startMonitor(prayerName, until, hardcoreMode);

    return lockState;
  }

  // ── STOP LOCK ───────────────────────────────────────────────────────────
  static async stopBlocking() {
    await AsyncStorage.removeItem(LOCK_KEY);
    await Notifications.dismissAllNotificationsAsync();
    this._stopMonitor();
  }

  // ── LOCK STATE CHECK ────────────────────────────────────────────────────
  static async getLockState() {
    try {
      const raw = await AsyncStorage.getItem(LOCK_KEY);
      if (!raw) return null;
      const state = JSON.parse(raw);
      // Auto-expire
      if (Date.now() > state.until) {
        await this.stopBlocking();
        return null;
      }
      return state;
    } catch {
      return null;
    }
  }

  static async isLocked() {
    const state = await this.getLockState();
    return state?.active === true;
  }

  // ── RECORD BYPASS ATTEMPT ───────────────────────────────────────────────
  static async recordBypassAttempt() {
    const raw = await AsyncStorage.getItem(LOCK_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    state.bypassCount = (state.bypassCount || 0) + 1;
    await AsyncStorage.setItem(LOCK_KEY, JSON.stringify(state));

    // Log for AI discipline tracking
    const logsRaw = await AsyncStorage.getItem(BYPASS_LOG_KEY);
    const logs = logsRaw ? JSON.parse(logsRaw) : [];
    logs.push({ prayer: state.prayer, at: Date.now() });
    await AsyncStorage.setItem(BYPASS_LOG_KEY, JSON.stringify(logs.slice(-100)));

    return state.bypassCount;
  }

  static async getBypassLog() {
    const raw = await AsyncStorage.getItem(BYPASS_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  // ── BACK HANDLER (call from LockScreen useEffect) ───────────────────────
  // ✅ FIXED: Use the new API (addEventListener returns a subscription)
  static createBackHandler(hardcoreMode, onBypassAttempt) {
    const handler = () => {
      if (hardcoreMode) {
        Vibration.vibrate([0, 80, 60, 80]); // Double buzz = denied
        this.recordBypassAttempt();
        onBypassAttempt?.();
        return true; // Consume — do NOT go back
      }
      return false; // Allow back in soft mode
    };
    
    // ✅ NEW API: addEventListener returns a subscription with .remove()
    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    
    // Store subscription for cleanup
    this._backHandlerSubscription = subscription;
    
    // Return cleanup function
    return () => {
      subscription.remove();
      this._backHandlerSubscription = null;
    };
  }

  // ── APP STATE MONITOR ────────────────────────────────────────────────────
  // If user backgrounds the app during a hardcore lock, we re-surface it.
  // NOTE: React Native can't forcibly bring an app to foreground without
  //       a native module — but we can: (a) fire a notification that deep-links
  //       back, (b) track the attempt, (c) extend the lock timer as penalty.
  static _startMonitor(prayerName, until, hardcoreMode) {
    this._stopMonitor(); // Clear any existing monitor

    if (!hardcoreMode) return;

    this._appStateSubscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        const lockState = await this.getLockState();
        if (!lockState?.active) return;

        // Record the escape attempt
        await this.recordBypassAttempt();

        // Fire urgent notification to pull them back
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔒 Prayer Time',
            body: `Return to your ${prayerName} prayer. App is locked.`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { screen: 'Lock', prayer: prayerName },
          },
          trigger: null, // Immediate
        });

        // Hardcore penalty: extend lock by 2 minutes per escape
        if (lockState.bypassCount > 1) {
          lockState.until += 2 * 60 * 1000;
          await AsyncStorage.setItem(LOCK_KEY, JSON.stringify(lockState));
        }
      }
    });
  }

  static _stopMonitor() {
    if (this._appStateSubscription) {
      this._appStateSubscription.remove();
      this._appStateSubscription = null;
    }
    if (this._monitorInterval) {
      clearInterval(this._monitorInterval);
      this._monitorInterval = null;
    }
  }

  // ── PERSISTENT NOTIFICATION ──────────────────────────────────────────────
  static async _postLockNotification(prayerName, until) {
    try {
      const minsLeft = Math.ceil((until - Date.now()) / 60000);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🕌 ${prayerName} Prayer Time`,
          body: `App is locked for ${minsLeft} minutes. Complete your prayer.`,
          sound: false,
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { screen: 'Lock', prayer: prayerName },
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Could not post lock notification:', e);
    }
  }

  // ── REMAINING TIME ─────────────────────────────────────────────────────
  static async getRemainingSeconds() {
    const state = await this.getLockState();
    if (!state) return 0;
    return Math.max(0, Math.ceil((state.until - Date.now()) / 1000));
  }

  // ── iOS FALLBACK ────────────────────────────────────────────────────────
  // iOS doesn't allow system-level blocking. Best we can do:
  // 1. Full-screen modal that can't be dismissed
  // 2. Screen Time API reminder (user sets up)
  // 3. Guilt-based UI with strong messaging
  static getiOSLockDescription() {
    return 'On iOS, use Screen Time > App Limits to enforce blocking. Deen App will guide you through setup.';
  }
}