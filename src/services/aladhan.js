// src/services/aladhan.js
// Docs: https://aladhan.com/prayer-times-api

const BASE = 'https://api.aladhan.com/v1';

// ── CALCULATION METHOD IDs ─────────────────────────────────────
export const METHODS = {
  MWL: 3,           // Muslim World League (default)
  ISNA: 2,          // Islamic Society of North America
  Egypt: 5,         // Egyptian General Authority of Survey
  UmmAlQura: 4,     // Umm Al-Qura University, Makkah
  Karachi: 1,       // University of Islamic Sciences, Karachi
  Tehran: 7,        // Institute of Geophysics, University of Tehran
  Jafari: 0,        // Shia Ithna-Ashari (Ja`fari)
  Gulf: 8,
  Kuwait: 9,
  Qatar: 10,
  Singapore: 11,
  France: 12,
  Turkey: 13,
  Russia: 14,
};

export const SCHOOL = {
  Shafi: 0,   // Standard (Shafi / Maliki / Hanbali)
  Hanafi: 1,
};

// ── PRAYER TIMES BY COORDS ─────────────────────────────────────
/**
 * Get prayer times for a specific date and location
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} method - calculation method ID (default: MWL = 3)
 * @param {number} school - madhab (0 = Shafi, 1 = Hanafi)
 * @param {string} date - 'DD-MM-YYYY' (optional, defaults to today)
 */
export async function getPrayerTimes({ latitude, longitude, method = 3, school = 0, date }) {
  try {
    const endpoint = date ? `${BASE}/timings/${date}` : `${BASE}/timings`;
    const params = new URLSearchParams({
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      method,
      school,
    });

    const response = await fetch(`${endpoint}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Aladhan API error: ${response.status}`);
    }
    
    const { data } = await response.json();

    // Normalize the timings object
    return {
      Fajr:    data.timings.Fajr,
      Sunrise: data.timings.Sunrise,
      Dhuhr:   data.timings.Dhuhr,
      Asr:     data.timings.Asr,
      Maghrib: data.timings.Maghrib,
      Isha:    data.timings.Isha,
      Midnight: data.timings.Midnight,
      Imsak:   data.timings.Imsak,
      date:    data.date,
      hijri:   data.date.hijri,
      meta:    data.meta,
    };
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    throw error;
  }
}

// ── PRAYER TIMES FOR WHOLE MONTH ──────────────────────────────
/**
 * Get entire month's prayer times (good for caching)
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} month - 1-12
 * @param {number} year
 * @param {number} method
 */
export async function getMonthlyPrayerTimes({ latitude, longitude, month, year, method = 3, school = 0 }) {
  try {
    const params = new URLSearchParams({
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      method,
      school,
      month,
      year,
    });

    const response = await fetch(`${BASE}/calendar?${params}`);
    
    if (!response.ok) {
      throw new Error(`Aladhan calendar error: ${response.status}`);
    }
    
    const { data } = await response.json();
    return data; // Array of 28-31 day objects
  } catch (error) {
    console.error('Error fetching monthly prayer times:', error);
    return [];
  }
}

// ── HIJRI DATE ─────────────────────────────────────────────────
/**
 * Convert Gregorian → Hijri date
 * @param {string} date - 'DD-MM-YYYY' (optional, defaults to today)
 */
export async function getHijriDate(date) {
  try {
    const today = date ?? formatDate(new Date());
    const response = await fetch(`${BASE}/gToH/${today}`);
    
    if (!response.ok) {
      throw new Error(`Hijri conversion error: ${response.status}`);
    }
    
    const { data } = await response.json();
    
    return {
      day:   data.hijri.day,
      month: data.hijri.month,    // { number, en, ar }
      year:  data.hijri.year,
      weekday: data.hijri.weekday, // { en, ar }
      formatted: `${data.hijri.day} ${data.hijri.month.en} ${data.hijri.year}`,
      formattedArabic: `${data.hijri.day} ${data.hijri.month.ar} ${data.hijri.year} Hijri`,
      arabic: `${data.hijri.day} ${data.hijri.month.ar} ${data.hijri.year}`,
    };
  } catch (error) {
    console.error('Error fetching Hijri date:', error);
    return {
      day: new Date().getDate(),
      month: { en: 'Unknown', ar: 'غير معروف' },
      year: new Date().getFullYear(),
      weekday: { en: 'Unknown', ar: 'غير معروف' },
      formatted: 'Date unavailable',
      formattedArabic: 'التاريخ غير متوفر',
      arabic: 'التاريخ غير متوفر',
    };
  }
}

/**
 * Convert Hijri → Gregorian date
 */
export async function hijriToGregorian({ day, month, year }) {
  try {
    const response = await fetch(`${BASE}/hToG/${day}-${month}-${year}`);
    
    if (!response.ok) {
      throw new Error(`Hijri→Gregorian error: ${response.status}`);
    }
    
    const { data } = await response.json();
    return data.gregorian;
  } catch (error) {
    console.error('Error converting Hijri to Gregorian:', error);
    return null;
  }
}

/**
 * Get current Hijri calendar month
 */
export async function getHijriCalendar({ month, year }) {
  try {
    const response = await fetch(`${BASE}/hCalendar/${month}/${year}`);
    
    if (!response.ok) {
      throw new Error(`Hijri calendar error: ${response.status}`);
    }
    
    const { data } = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Hijri calendar:', error);
    return [];
  }
}

// ── RAMADAN TIMES ──────────────────────────────────────────────
/**
 * Get Suhoor / Iftar times for Ramadan month
 * Returns Fajr (Suhoor end) and Maghrib (Iftar) for each day
 */
export async function getRamadanTimes({ latitude, longitude, year, method = 3 }) {
  try {
    // Ramadan is month 9 in Hijri — get its Gregorian equivalent
    const hijriRamadanStart = await hijriToGregorian({ day: 1, month: 9, year });
    if (!hijriRamadanStart) return [];
    
    const startDate = new Date(hijriRamadanStart.date);
    const gMonth = startDate.getMonth() + 1;
    const gYear = startDate.getFullYear();

    const data = await getMonthlyPrayerTimes({ latitude, longitude, month: gMonth, year: gYear, method });

    return data.map(day => ({
      date:    day.date.gregorian.date,
      hijri:   day.date.hijri,
      suhoor:  day.timings.Fajr,
      iftar:   day.timings.Maghrib,
    }));
  } catch (error) {
    console.error('Error fetching Ramadan times:', error);
    return [];
  }
}

// ── UTILS ─────────────────────────────────────────────────────
function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Convert "HH:MM (timezone)" string to Date object for today
 */
export function prayerTimeToDate(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, h, m] = match;
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d;
}

/**
 * Find the next prayer from the current time
 * @param {Object} timings - { Fajr, Dhuhr, Asr, Maghrib, Isha }
 * @returns {{ name, time, minutesLeft }}
 */
export function getNextPrayer(timings) {
  if (!timings) return { name: 'Fajr', time: null, minutesLeft: 0 };

  const now = new Date();
  const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  for (const name of PRAYERS) {
    const t = prayerTimeToDate(timings[name]);
    if (t && t > now) {
      const diff = Math.floor((t - now) / 60000);
      return { name, time: timings[name], minutesLeft: diff };
    }
  }

  // Past Isha → next is Fajr tomorrow
  const fajrTomorrow = prayerTimeToDate(timings.Fajr);
  if (fajrTomorrow) {
    fajrTomorrow.setDate(fajrTomorrow.getDate() + 1);
    const diff = Math.floor((fajrTomorrow - now) / 60000);
    // Guard against negative or absurd values (> 24h)
    const minutesLeft = diff > 0 && diff < 1440 ? diff : 0;
    return { name: 'Fajr', time: timings.Fajr, minutesLeft };
  }

  return { name: 'Fajr', time: null, minutesLeft: 0 };
}

/**
 * Get current prayer based on time
 * @returns {string} Current prayer name or null
 */
export function getCurrentPrayer(timings) {
  if (!timings) return null;
  
  const now = new Date();
  const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  
  for (let i = 0; i < prayers.length - 1; i++) {
    const currentTime = prayerTimeToDate(timings[prayers[i]]);
    const nextTime = prayerTimeToDate(timings[prayers[i + 1]]);
    
    if (currentTime && nextTime && now >= currentTime && now < nextTime) {
      return prayers[i];
    }
  }
  
  // After Isha
  const ishaTime = prayerTimeToDate(timings.Isha);
  if (ishaTime && now >= ishaTime) {
    return 'Isha';
  }
  
  // Before Fajr
  const fajrTime = prayerTimeToDate(timings.Fajr);
  if (fajrTime && now < fajrTime) {
    return 'Night';
  }
  
  return null;
}

/**
 * Get prayer time in 12-hour format
 */
export function formatPrayerTime(timeStr) {
  if (!timeStr) return '--:--';
  const match = timeStr.match(/^(\d{2}):(\d{2})/);
  if (!match) return timeStr;
  
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  
  return `${hours}:${minutes} ${ampm}`;
}