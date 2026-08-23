// src/services/behaviorEngine.js — BEHAVIOR ENGINE (Discipline Coach)
import AsyncStorage from '@react-native-async-storage/async-storage';

const BEHAVIOR_KEY = 'behavior_engine_data';
const NUDGE_HISTORY_KEY = 'nudge_history';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// ─── PATTERN TYPES ────────────────────────────────────────────────────────────
export const PATTERN = {
  FREQUENT_MISS:    'FREQUENT_MISS',       // Misses same prayer 4+ times/week
  FREQUENT_BYPASS:  'FREQUENT_BYPASS',     // Bypasses lock for same prayer
  STREAK_RISK:      'STREAK_RISK',         // At risk of breaking streak
  IMPROVING:        'IMPROVING',           // Better this week vs last
  DECLINING:        'DECLINING',           // Worse this week vs last
  PERFECT_WEEK:     'PERFECT_WEEK',        // 35/35 prayers this week
  FAJR_STRUGGLE:    'FAJR_STRUGGLE',       // Fajr specifically missed 3+ times
  NIGHT_PATTERN:    'NIGHT_PATTERN',       // Isha consistently missed
};

// ─── STRICTNESS LEVELS ────────────────────────────────────────────────────────
export const STRICTNESS = {
  GENTLE: 1,    // Normal 20-min lock
  FIRM:   2,    // 30-min lock + penalty for bypasses
  STRICT: 3,    // 45-min lock + extended penalties
  INTENSE: 4,   // 60-min lock + hardcore mode auto-on
};

// ─── STRICTNESS CONFIG ────────────────────────────────────────────────────────
export const STRICTNESS_CONFIG = {
  [STRICTNESS.GENTLE]: {
    label: 'Gentle',
    emoji: '🌱',
    lockMinutes: 20,
    hardcoreMode: false,
    penaltyMinutes: 0,
    description: 'Encouraging nudges. Lock for 20 mins.',
  },
  [STRICTNESS.FIRM]: {
    label: 'Firm',
    emoji: '🔐',
    lockMinutes: 30,
    hardcoreMode: false,
    penaltyMinutes: 2,
    description: 'Firmer accountability. Lock for 30 mins with bypass penalties.',
  },
  [STRICTNESS.STRICT]: {
    label: 'Strict',
    emoji: '🔒',
    lockMinutes: 45,
    hardcoreMode: true,
    penaltyMinutes: 5,
    description: 'Strict discipline. 45-min locks. Hardcore mode enabled.',
  },
  [STRICTNESS.INTENSE]: {
    label: 'Intense',
    emoji: '⛔',
    lockMinutes: 60,
    hardcoreMode: true,
    penaltyMinutes: 10,
    description: 'Maximum intensity. 60-min locks. All bypasses blocked.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENGINE CLASS
// ─────────────────────────────────────────────────────────────────────────────
export class BehaviorEngine {

  // ── LOAD / SAVE ENGINE STATE ──────────────────────────────────────────────
  static async _load() {
    try {
      const raw = await AsyncStorage.getItem(BEHAVIOR_KEY);
      return raw ? JSON.parse(raw) : {
        strictnessLevel: STRICTNESS.GENTLE,
        strictnessHistory: [],       // [{ level, reason, date }]
        lastAnalyzedWeek: null,      // ISO week string
        patterns: [],                // current detected patterns
        consecutiveSkipDays: 0,
        totalPrayersLogged: 0,
        nudgesShown: {},             // { nudgeId: timestamp }
      };
    } catch {
      return { strictnessLevel: STRICTNESS.GENTLE, patterns: [], nudgesShown: {} };
    }
  }

  static async _save(data) {
    try {
      await AsyncStorage.setItem(BEHAVIOR_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('BehaviorEngine save failed:', e);
    }
  }

  // ── ANALYZE LOGS → DETECT PATTERNS ───────────────────────────────────────
  /**
   * @param {Object} logs   - { 'YYYY-MM-DD': { Fajr: 'prayed'|'missed'|'late', ... } }
   * @param {Array}  bypasses - from AppBlocker.getBypassLog()
   * @param {Object} profile  - { streak_current, streak_best }
   * @returns {Object} { patterns, strictnessLevel, nudges, weeklyReport }
   */
  static async analyze(logs, bypasses = [], profile = {}) {
    const engine = await this._load();
    const today = new Date();

    // Build last-14-days window
    const last14 = this._getDateRange(today, 14);
    const last7  = this._getDateRange(today, 7);
    const prev7  = this._getDateRange(new Date(today - 7 * 86400000), 7);

    // ── Per-prayer miss counts (last 7 days) ──
    const missCount = {};   // { Fajr: 4, ... }
    const prayCounts = {};  // { Fajr: 3, ... }
    PRAYER_NAMES.forEach(p => { missCount[p] = 0; prayCounts[p] = 0; });

    last7.forEach(dateStr => {
      const dayLogs = logs[dateStr] ?? {};
      PRAYER_NAMES.forEach(p => {
        if (dayLogs[p] === 'missed') missCount[p]++;
        if (dayLogs[p] === 'prayed') prayCounts[p]++;
      });
    });

    // ── Weekly totals ──
    const thisWeekTotal  = this._countPrayed(logs, last7);
    const lastWeekTotal  = this._countPrayed(logs, prev7);
    const thisWeekMax    = last7.length * 5;

    // ── Bypass analysis ──
    const recentBypasses = bypasses.filter(b => Date.now() - b.at < 7 * 86400000);
    const bypassByPrayer = {};
    PRAYER_NAMES.forEach(p => { bypassByPrayer[p] = 0; });
    recentBypasses.forEach(b => { if (bypassByPrayer[b.prayer] !== undefined) bypassByPrayer[b.prayer]++; });

    // ── DETECT PATTERNS ──────────────────────────────────────────────────
    const patterns = [];

    // 1. Frequent miss per prayer (4+ misses in 7 days)
    PRAYER_NAMES.forEach(p => {
      if (missCount[p] >= 4) {
        patterns.push({
          type: PATTERN.FREQUENT_MISS,
          prayer: p,
          count: missCount[p],
          severity: missCount[p] >= 6 ? 'high' : 'medium',
          message: `You've missed ${p} ${missCount[p]}x this week`,
        });
      }
    });

    // 2. Fajr-specific struggle (3+ misses)
    if (missCount['Fajr'] >= 3 && !patterns.find(p => p.type === PATTERN.FREQUENT_MISS && p.prayer === 'Fajr')) {
      patterns.push({
        type: PATTERN.FAJR_STRUGGLE,
        prayer: 'Fajr',
        count: missCount['Fajr'],
        severity: 'medium',
        message: `Fajr is your biggest challenge this week`,
      });
    }

    // 3. Isha night pattern
    if (missCount['Isha'] >= 3) {
      patterns.push({
        type: PATTERN.NIGHT_PATTERN,
        prayer: 'Isha',
        count: missCount['Isha'],
        severity: 'medium',
        message: `You often miss Isha — set a night reminder`,
      });
    }

    // 4. Frequent bypass for specific prayer
    PRAYER_NAMES.forEach(p => {
      if (bypassByPrayer[p] >= 3) {
        patterns.push({
          type: PATTERN.FREQUENT_BYPASS,
          prayer: p,
          count: bypassByPrayer[p],
          severity: bypassByPrayer[p] >= 5 ? 'high' : 'medium',
          message: `You bypassed the ${p} lock ${bypassByPrayer[p]}x this week`,
        });
      }
    });

    // 5. Streak at risk (streak ≥ 3 AND today not fully prayed)
    const todayStr = today.toISOString().slice(0, 10);
    const todayPrayed = Object.values(logs[todayStr] ?? {}).filter(s => s === 'prayed').length;
    const currentStreak = profile?.streak_current || 0;
    if (currentStreak >= 3 && todayPrayed < 5) {
      const remaining = 5 - todayPrayed;
      patterns.push({
        type: PATTERN.STREAK_RISK,
        severity: currentStreak >= 7 ? 'high' : 'medium',
        streakDays: currentStreak,
        prayersLeft: remaining,
        message: `${remaining} prayer${remaining > 1 ? 's' : ''} left to protect your ${currentStreak}-day streak`,
      });
    }

    // 6. Improving / Declining
    if (thisWeekTotal > lastWeekTotal + 2) {
      patterns.push({
        type: PATTERN.IMPROVING,
        severity: 'positive',
        thisWeek: thisWeekTotal,
        lastWeek: lastWeekTotal,
        message: `Up ${thisWeekTotal - lastWeekTotal} prayers vs last week — keep it up!`,
      });
    } else if (lastWeekTotal > thisWeekTotal + 3) {
      patterns.push({
        type: PATTERN.DECLINING,
        severity: 'high',
        thisWeek: thisWeekTotal,
        lastWeek: lastWeekTotal,
        message: `Down ${lastWeekTotal - thisWeekTotal} prayers vs last week`,
      });
    }

    // 7. Perfect week
    if (thisWeekTotal === thisWeekMax && thisWeekMax > 0) {
      patterns.push({
        type: PATTERN.PERFECT_WEEK,
        severity: 'positive',
        message: 'Perfect week! All prayers completed 🌟',
      });
    }

    // ── ADAPTIVE STRICTNESS ──────────────────────────────────────────────
    const newStrictness = this._calculateStrictness(patterns, recentBypasses.length, engine.strictnessLevel);

    // Only escalate up (never auto-drop more than 1 level per week)
    const finalStrictness = Math.max(
      Math.min(newStrictness, engine.strictnessLevel + 1),
      Math.max(STRICTNESS.GENTLE, engine.strictnessLevel - 1)
    );

    if (finalStrictness !== engine.strictnessLevel) {
      engine.strictnessHistory.push({
        from: engine.strictnessLevel,
        to: finalStrictness,
        reason: this._strictnessChangeReason(patterns, recentBypasses.length),
        date: todayStr,
      });
    }

    // ── GENERATE NUDGES ──────────────────────────────────────────────────
    const nudges = this._generateNudges(patterns, currentStreak, todayPrayed, engine.nudgesShown);

    // ── WEEKLY REPORT ─────────────────────────────────────────────────────
    const weeklyReport = this._buildWeeklyReport(
      logs, last7, missCount, prayCounts, bypassByPrayer,
      thisWeekTotal, thisWeekMax, lastWeekTotal, patterns, currentStreak
    );

    // Save updated engine state
    engine.strictnessLevel = finalStrictness;
    engine.patterns = patterns;
    nudges.forEach(n => {
      if (!n.persistent) engine.nudgesShown[n.id] = Date.now();
    });
    await this._save(engine);

    return {
      patterns,
      strictnessLevel: finalStrictness,
      strictnessConfig: STRICTNESS_CONFIG[finalStrictness],
      nudges,
      weeklyReport,
      missCount,
      prayCounts,
      bypassByPrayer,
    };
  }

  // ── CALCULATE STRICTNESS LEVEL ────────────────────────────────────────────
  static _calculateStrictness(patterns, totalBypasses, currentLevel) {
    let score = 0;

    patterns.forEach(p => {
      if (p.severity === 'high') score += 3;
      else if (p.severity === 'medium') score += 1;
      else if (p.severity === 'positive') score -= 2;
    });

    score += Math.floor(totalBypasses / 2);

    // Frequent miss of same prayer = escalate fast
    const freqMisses = patterns.filter(p => p.type === PATTERN.FREQUENT_MISS);
    if (freqMisses.length >= 2) score += 3;

    // Bypass for same prayer multiple times
    const bypassPatterns = patterns.filter(p => p.type === PATTERN.FREQUENT_BYPASS);
    if (bypassPatterns.length >= 1) score += 4;

    if (score <= 0)  return STRICTNESS.GENTLE;
    if (score <= 3)  return STRICTNESS.FIRM;
    if (score <= 7)  return STRICTNESS.STRICT;
    return STRICTNESS.INTENSE;
  }

  static _strictnessChangeReason(patterns, totalBypasses) {
    if (patterns.find(p => p.type === PATTERN.FREQUENT_BYPASS)) return 'Repeated lock bypasses detected';
    if (patterns.filter(p => p.type === PATTERN.FREQUENT_MISS).length >= 2) return 'Multiple prayers frequently missed';
    if (patterns.find(p => p.type === PATTERN.IMPROVING)) return 'Improvement detected — easing up';
    if (totalBypasses > 5) return `${totalBypasses} bypass attempts this week`;
    return 'Based on prayer pattern analysis';
  }

  // ── GENERATE SMART NUDGES ─────────────────────────────────────────────────
  static _generateNudges(patterns, streak, todayPrayed, shownHistory) {
    const nudges = [];
    const now = Date.now();
    const COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours between same nudge

    const canShow = (id) => {
      const last = shownHistory[id] || 0;
      return now - last > COOLDOWN;
    };

    // Streak risk nudge — highest priority
    const streakRisk = patterns.find(p => p.type === PATTERN.STREAK_RISK);
    if (streakRisk && canShow('streak_risk')) {
      nudges.push({
        id: 'streak_risk',
        priority: 10,
        emoji: '🔥',
        title: `Don't break your ${streakRisk.streakDays}-day streak!`,
        body: `${streakRisk.prayersLeft} prayer${streakRisk.prayersLeft > 1 ? 's' : ''} left today. You've come too far to stop now.`,
        type: 'warning',
        persistent: true, // Always show streak risk
      });
    }

    // Perfect week nudge
    if (patterns.find(p => p.type === PATTERN.PERFECT_WEEK) && canShow('perfect_week')) {
      nudges.push({
        id: 'perfect_week',
        priority: 9,
        emoji: '🌟',
        title: 'Perfect week achieved!',
        body: 'You completed all 35 prayers this week. SubhanAllah — keep this momentum going!',
        type: 'success',
        persistent: false,
      });
    }

    // Fajr struggle nudge
    const fajrPatterns = [
      patterns.find(p => p.type === PATTERN.FAJR_STRUGGLE),
      patterns.find(p => p.type === PATTERN.FREQUENT_MISS && p.prayer === 'Fajr'),
    ].filter(Boolean);
    if (fajrPatterns.length > 0 && canShow('fajr_struggle')) {
      nudges.push({
        id: 'fajr_struggle',
        priority: 8,
        emoji: '🌅',
        title: 'Fajr is your biggest challenge',
        body: 'Try sleeping earlier and setting 2 alarms. The Prophet ﷺ said Fajr sets the tone for the whole day.',
        type: 'tip',
        persistent: false,
      });
    }

    // Bypass pattern nudge
    const bypassPattern = patterns.find(p => p.type === PATTERN.FREQUENT_BYPASS);
    if (bypassPattern && canShow('bypass_warning')) {
      nudges.push({
        id: 'bypass_warning',
        priority: 7,
        emoji: '🔒',
        title: `You keep bypassing ${bypassPattern.prayer}`,
        body: `${bypassPattern.count} bypasses this week. The lock has been made stricter to help you stay accountable.`,
        type: 'warning',
        persistent: false,
      });
    }

    // Declining nudge
    if (patterns.find(p => p.type === PATTERN.DECLINING) && canShow('declining')) {
      nudges.push({
        id: 'declining',
        priority: 6,
        emoji: '📉',
        title: 'Your prayers are declining',
        body: `You prayed fewer times this week than last. Let's turn this around today — starting now.`,
        type: 'alert',
        persistent: false,
      });
    }

    // Improving nudge
    if (patterns.find(p => p.type === PATTERN.IMPROVING) && canShow('improving')) {
      nudges.push({
        id: 'improving',
        priority: 5,
        emoji: '📈',
        title: 'You\'re improving, MashaAllah!',
        body: `More prayers this week than last. This is the consistency Allah loves — keep building.`,
        type: 'success',
        persistent: false,
      });
    }

    // Today low count nudge (afternoon)
    const hour = new Date().getHours();
    if (todayPrayed < 3 && hour >= 15 && canShow('daily_low')) {
      nudges.push({
        id: 'daily_low',
        priority: 6,
        emoji: '⏰',
        title: `Only ${todayPrayed}/5 prayers today`,
        body: `The day isn't over. Asr, Maghrib, and Isha are still ahead — don't let today slip.`,
        type: 'reminder',
        persistent: false,
      });
    }

    // Sort by priority
    return nudges.sort((a, b) => b.priority - a.priority);
  }

  // ── BUILD WEEKLY REPORT ───────────────────────────────────────────────────
  static _buildWeeklyReport(logs, last7, missCount, prayCounts, bypassByPrayer, thisWeekTotal, thisWeekMax, lastWeekTotal, patterns, streak) {
    // Completion % per prayer
    const prayerStats = PRAYER_NAMES.map(name => ({
      name,
      prayed:  prayCounts[name] || 0,
      missed:  missCount[name] || 0,
      bypassed: bypassByPrayer[name] || 0,
      rate: Math.round(((prayCounts[name] || 0) / 7) * 100),
    }));

    // Day-by-day breakdown
    const dailyBreakdown = last7.map(dateStr => {
      const dayLogs = logs[dateStr] ?? {};
      const prayed = PRAYER_NAMES.filter(p => dayLogs[p] === 'prayed').length;
      const missed = PRAYER_NAMES.filter(p => dayLogs[p] === 'missed').length;
      return {
        date: dateStr,
        day: new Date(dateStr).toLocaleDateString('en', { weekday: 'short' }),
        prayed,
        missed,
        total: 5,
        percentage: Math.round((prayed / 5) * 100),
      };
    });

    // Best / worst day
    const sortedDays = [...dailyBreakdown].sort((a, b) => b.prayed - a.prayed);
    const bestDay  = sortedDays[0];
    const worstDay = sortedDays[sortedDays.length - 1];

    // Strongest / weakest prayer
    const sortedPrayers = [...prayerStats].sort((a, b) => b.rate - a.rate);
    const strongestPrayer = sortedPrayers[0];
    const weakestPrayer   = sortedPrayers[sortedPrayers.length - 1];

    // Trend vs last week
    const trend = thisWeekTotal > lastWeekTotal ? 'up'
                : thisWeekTotal < lastWeekTotal ? 'down' : 'same';
    const trendDelta = Math.abs(thisWeekTotal - lastWeekTotal);

    // Discipline score (0-100)
    const totalBypasses = Object.values(bypassByPrayer).reduce((a, b) => a + b, 0);
    const completionScore = thisWeekMax > 0 ? (thisWeekTotal / thisWeekMax) * 70 : 0;
    const bypassPenalty  = Math.min(30, totalBypasses * 5);
    const disciplineScore = Math.max(0, Math.round(completionScore - bypassPenalty));

    // Generate insight message
    const insights = this._generateInsights(
      thisWeekTotal, thisWeekMax, weakestPrayer, strongestPrayer, trend,
      trendDelta, streak, patterns, totalBypasses
    );

    return {
      weekTotal: thisWeekTotal,
      weekMax: thisWeekMax,
      completionRate: thisWeekMax > 0 ? Math.round((thisWeekTotal / thisWeekMax) * 100) : 0,
      lastWeekTotal,
      trend,
      trendDelta,
      streak,
      prayerStats,
      dailyBreakdown,
      bestDay,
      worstDay,
      strongestPrayer,
      weakestPrayer,
      totalBypasses,
      disciplineScore,
      insights,
      patterns,
    };
  }

  // ── GENERATE INSIGHTS TEXT ─────────────────────────────────────────────────
  static _generateInsights(thisWeek, max, worst, best, trend, delta, streak, patterns, bypasses) {
    const insights = [];
    const rate = max > 0 ? Math.round((thisWeek / max) * 100) : 0;

    if (rate === 100) {
      insights.push({ emoji: '🌟', text: 'Perfect week — every single prayer completed. This is rare and remarkable.' });
    } else if (rate >= 80) {
      insights.push({ emoji: '✅', text: `Strong week at ${rate}% — you're building real discipline.` });
    } else if (rate >= 60) {
      insights.push({ emoji: '📊', text: `${rate}% this week — solid effort but ${max - thisWeek} prayers were missed.` });
    } else {
      insights.push({ emoji: '⚠️', text: `Only ${rate}% this week. ${max - thisWeek} missed prayers is a habit to break.` });
    }

    if (trend === 'up') {
      insights.push({ emoji: '📈', text: `${delta} more prayers than last week — you're on an upward trajectory.` });
    } else if (trend === 'down') {
      insights.push({ emoji: '📉', text: `${delta} fewer prayers than last week. What changed? Identify the trigger.` });
    }

    if (worst.rate < 60) {
      const tips = {
        Fajr:   'Set your alarm before sleep. Keep a glass of water by the bed.',
        Dhuhr:  'Block your calendar at noon. Make it a non-negotiable break.',
        Asr:    'Set a 3:30pm reminder. Asr is easy to forget in meetings.',
        Maghrib: 'Sunset moves daily. Check the time and set a fresh alert.',
        Isha:   'Pray Isha before winding down for the night — not after.',
      };
      insights.push({ emoji: '🎯', text: `Focus on ${worst.name} (${worst.rate}% this week). ${tips[worst.name] || 'Build a consistent routine.'}` });
    }

    if (best.rate >= 85) {
      insights.push({ emoji: '💪', text: `${best.name} is your strongest prayer at ${best.rate}%. Use this consistency as a template for other prayers.` });
    }

    if (bypasses > 5) {
      insights.push({ emoji: '🔓', text: `${bypasses} lock bypasses this week. Each bypass is a moment of weakness — your strictness has been adjusted.` });
    } else if (bypasses === 0 && thisWeek > 20) {
      insights.push({ emoji: '🔒', text: 'Zero bypasses this week — full commitment to the lock system.' });
    }

    if (streak >= 7) {
      insights.push({ emoji: '🔥', text: `${streak}-day streak alive. Allah loves consistent acts, even if small.` });
    }

    return insights;
  }

  // ── GET CURRENT STRICTNESS ─────────────────────────────────────────────────
  static async getStrictness() {
    const engine = await this._load();
    return {
      level: engine.strictnessLevel,
      config: STRICTNESS_CONFIG[engine.strictnessLevel],
      history: engine.strictnessHistory || [],
    };
  }

  // ── MANUALLY OVERRIDE STRICTNESS ──────────────────────────────────────────
  static async setStrictness(level) {
    const engine = await this._load();
    engine.strictnessHistory.push({
      from: engine.strictnessLevel,
      to: level,
      reason: 'Manual override',
      date: new Date().toISOString().slice(0, 10),
    });
    engine.strictnessLevel = level;
    await this._save(engine);
  }

  // ── GET PENDING NUDGES (unshown for >4h) ────────────────────────────────
  static async getPendingNudges(logs, bypasses, profile) {
    const result = await this.analyze(logs, bypasses, profile);
    return result.nudges.slice(0, 2); // Max 2 nudges at a time
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  static _getDateRange(endDate, days) {
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }

  static _countPrayed(logs, dateRange) {
    let count = 0;
    dateRange.forEach(dateStr => {
      const dayLogs = logs[dateStr] ?? {};
      count += Object.values(dayLogs).filter(s => s === 'prayed').length;
    });
    return count;
  }
}
