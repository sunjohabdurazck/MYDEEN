// src/utils/dateUtils.js — Smart Ramadan & date helpers

// Ramadan dates extended through 2030 (approximate Gregorian equivalents)
// Ramadan shifts ~11 days earlier each Gregorian year
const RAMADAN_DATES = [
  { start: new Date(2025, 2,  1),  end: new Date(2025, 2, 30)  }, // Mar 1–30, 2025
  { start: new Date(2026, 1, 18),  end: new Date(2026, 2, 18)  }, // Feb 18–Mar 18, 2026
  { start: new Date(2027, 1,  7),  end: new Date(2027, 2,  8)  }, // Feb 7–Mar 8, 2027
  { start: new Date(2028, 0, 27),  end: new Date(2028, 1, 25)  }, // Jan 27–Feb 25, 2028
  { start: new Date(2029, 0, 16),  end: new Date(2029, 1, 14)  }, // Jan 16–Feb 14, 2029
  { start: new Date(2030, 0,  5),  end: new Date(2030, 1,  3)  }, // Jan 5–Feb 3, 2030
];

/**
 * Returns true if today (or given date) is within a Ramadan period.
 */
export function isRamadan(date = new Date()) {
  return RAMADAN_DATES.some(r => date >= r.start && date <= r.end);
}

/**
 * Returns the current Ramadan day number (1-based), or null if not Ramadan.
 */
export function getRamadanDay(date = new Date()) {
  const r = RAMADAN_DATES.find(r => date >= r.start && date <= r.end);
  if (!r) return null;
  const diffMs = date - r.start;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Returns the total days of the current/next Ramadan period.
 */
export function getRamadanLength(date = new Date()) {
  const r = RAMADAN_DATES.find(r => date >= r.start && date <= r.end);
  if (!r) return 30;
  const diffMs = r.end - r.start;
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Returns how many days until the next Ramadan starts.
 * Returns 0 if currently in Ramadan.
 */
export function daysUntilRamadan(date = new Date()) {
  if (isRamadan(date)) return 0;
  // Find the next upcoming Ramadan start
  const next = RAMADAN_DATES.find(r => r.start > date);
  if (!next) return null; // No more dates in our table
  const diffMs = next.start - date;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if Ramadan is within `withinDays` days.
 */
export function isRamadanApproaching(withinDays = 30, date = new Date()) {
  const days = daysUntilRamadan(date);
  return days !== null && days > 0 && days <= withinDays;
}

/**
 * Returns the current Ramadan's end date, or null.
 */
export function getRamadanEndDate(date = new Date()) {
  const r = RAMADAN_DATES.find(r => date >= r.start && date <= r.end);
  return r ? r.end : null;
}

/**
 * Format a date as YYYY-MM-DD string.
 */
export function toDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
