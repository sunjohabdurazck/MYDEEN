// src/services/notifications.js
// Handles scheduling Adhan + prayer reminder notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { prayerTimeToDate } from './aladhan';

// ── SETUP ─────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── SCHEDULE DAILY PRAYER NOTIFICATIONS ───────────────────────
/**
 * @param {Object} timings  - { Fajr, Dhuhr, Asr, Maghrib, Isha }
 * @param {Object} settings - { reminderMinsBefore, adhanEnabled, silentMode }
 */
export async function schedulePrayerNotifications(timings, settings = {}) {
  const {
    reminderMinsBefore = 10,
    adhanEnabled = true,
    silentMode = false,
  } = settings;

  // Cancel all existing prayer notifications first
  await cancelAllPrayerNotifications();

  const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const ids = [];

  for (const name of PRAYERS) {
    const prayerTime = prayerTimeToDate(timings[name]);
    if (!prayerTime || prayerTime <= new Date()) continue;

    // 1. Reminder notification (X minutes before)
    if (reminderMinsBefore > 0) {
      const reminderTime = new Date(prayerTime.getTime() - reminderMinsBefore * 60_000);
      if (reminderTime > new Date()) {
        const id = await Notifications.scheduleNotificationAsync({
          identifier: `prayer_reminder_${name}`,
          content: {
            title: `${name} in ${reminderMinsBefore} minutes ⏰`,
            body: `${ARABIC_NAMES[name]} • ${timings[name]}`,
            data: { type: 'prayer_reminder', prayer: name },
            sound: 'default',
          },
          trigger: { date: reminderTime },
        });
        ids.push(id);
      }
    }

    // 2. Adhan notification (at prayer time)
    if (adhanEnabled) {
      const id = await Notifications.scheduleNotificationAsync({
        identifier: `prayer_adhan_${name}`,
        content: {
          title: `🕌 ${name} Prayer Time`,
          body: `الله أكبر • It's time for ${name} (${timings[name]})`,
          data: { type: 'adhan', prayer: name },
          sound: silentMode ? undefined : 'adhan.wav',
          // Android: override phone silent for adhan
          ...(Platform.OS === 'android' && !silentMode && {
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrationPattern: [0, 250, 250, 250],
          }),
        },
        trigger: { date: prayerTime },
      });
      ids.push(id);
    }
  }

  return ids;
}

// ── LOCK SCREEN TRIGGER ───────────────────────────────────────
/**
 * Schedule a notification that opens the lock screen
 * Used when the app is in the background
 */
export async function scheduleLockTrigger(prayerName, prayerTime) {
  return Notifications.scheduleNotificationAsync({
    identifier: `lock_trigger_${prayerName}`,
    content: {
      title: `🔒 Phone locked for ${prayerName}`,
      body: 'Tap to open prayer screen',
      data: { type: 'lock', prayer: prayerName },
      categoryIdentifier: 'lock',
    },
    trigger: { date: prayerTime },
  });
}

// ── CANCEL ────────────────────────────────────────────────────
export async function cancelAllPrayerNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prayerIds = scheduled
    .filter(n => n.identifier.startsWith('prayer_') || n.identifier.startsWith('lock_'))
    .map(n => n.identifier);

  await Promise.all(prayerIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
}

// ── RESPONSE HANDLER (tap on notification) ────────────────────
export function setupNotificationResponseHandler(navigation) {
  const sub = Notifications.addNotificationResponseReceivedListener(response => {
    const { type, prayer } = response.notification.request.content.data;
    if (type === 'adhan' || type === 'lock') {
      navigation?.navigate('Lock', { prayer });
    }
  });
  return sub; // call sub.remove() on cleanup
}

// ── SETUP NOTIFICATION CATEGORIES (iOS) ───────────────────────
export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('lock', [
    {
      identifier: 'prayed',
      buttonTitle: '✓ I\'ve Prayed',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Dismiss',
      options: { isDestructive: true },
    },
  ]);
}

const ARABIC_NAMES = {
  Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء',
};
