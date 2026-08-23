// src/services/qiblaCalculator.js
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';

const KAABA_COORDS = { latitude: 21.4225, longitude: 39.8262 };

export function calculateQiblaDirection(userLat, userLon) {
  const φ1 = userLat * Math.PI / 180;
  const φ2 = KAABA_COORDS.latitude * Math.PI / 180;
  const Δλ = (KAABA_COORDS.longitude - userLon) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

export async function getCurrentCompassHeading() {
  const { status } = await Magnetometer.requestPermissionsAsync();
  if (status !== 'granted') return null;
  
  Magnetometer.setUpdateInterval(100);
  return new Promise((resolve) => {
    Magnetometer.addListener(result => {
      const { x, y } = result;
      let angle = Math.atan2(y, x) * 180 / Math.PI;
      angle = (angle + 360) % 360;
      resolve(angle);
      Magnetometer.removeAllListeners();
    });
  });
}