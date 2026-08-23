// src/services/prayerCalculator.js — Complete with offsets
import { getPrayerTimes as getAladhanTimes } from './aladhan';

export class PrayerCalculator {
  static async getPrayerTimesWithOffsets(location, method, school, userOffsets = {}) {
    const baseTimes = await getAladhanTimes({ ...location, method, school });
    
    // Apply user offsets (minutes)
    const offsets = {
      Fajr: userOffsets.Fajr || 0,
      Dhuhr: userOffsets.Dhuhr || 0,
      Asr: userOffsets.Asr || 0,
      Maghrib: userOffsets.Maghrib || 0,
      Isha: userOffsets.Isha || 0,
    };
    
    const adjustedTimes = {};
    for (const prayer of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
      const baseTime = baseTimes[prayer];
      const offset = offsets[prayer];
      if (offset !== 0) {
        adjustedTimes[prayer] = this.addMinutesToTimeString(baseTime, offset);
      } else {
        adjustedTimes[prayer] = baseTime;
      }
    }
    
    // Also adjust Sunrise for Fajr offset
    if (offsets.Fajr !== 0) {
      adjustedTimes.Sunrise = this.addMinutesToTimeString(baseTimes.Sunrise, offsets.Fajr);
    }
    
    return {
      ...baseTimes,
      timings: adjustedTimes,
      offsetsApplied: offsets,
    };
  }
  
  static addMinutesToTimeString(timeStr, minutes) {
    const match = timeStr.match(/^(\d{2}):(\d{2})/);
    if (!match) return timeStr;
    
    let hours = parseInt(match[1]);
    let mins = parseInt(match[2]) + minutes;
    
    while (mins >= 60) {
      hours++;
      mins -= 60;
    }
    while (mins < 0) {
      hours--;
      mins += 60;
    }
    
    hours = (hours + 24) % 24;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
}