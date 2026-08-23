// src/services/tajweed.js — Tajweed Coloring Engine
// Applies color rules to Arabic Quran text for tajweed learning.
// Colors match the standard Dar Al-Ma'rifah color scheme used in most tajweed Qurans.

// ── TAJWEED RULE COLORS ────────────────────────────────────────────────────
export const TAJWEED_COLORS = {
  ghunnah:      '#00B4D8', // Nasal sound (2 beats) — blue
  idghaam:      '#FF6B6B', // Merging letters — red/coral
  ikhfa:        '#F7B731', // Concealment — yellow/gold
  iqlab:        '#A29BFE', // Substitution (ن → م) — purple
  qalqalah:     '#FF9F43', // Echo/vibration — orange
  madd:         '#2ED573', // Elongation — green
  shaddah:      '#FF4757', // Double letter — bright red
  lam_shamsiya: '#1E90FF', // Solar laam — blue
  waqf:         '#B2BEC3', // Stop signs — grey
};

// ── TAJWEED RULE PATTERNS ─────────────────────────────────────────────────
// Each rule: { name, regex, color, description }
// Patterns use Unicode Arabic ranges. Order matters — more specific first.

const TAJWEED_RULES = [
  {
    name: 'shaddah',
    // Shadda character ّ (U+0651) — doubled letter
    pattern: /[\u0600-\u06FF]\u0651/g,
    color: TAJWEED_COLORS.shaddah,
    desc: 'Shaddah — doubled letter',
  },
  {
    name: 'qalqalah',
    // Qalqalah letters: ق ط ب ج د with sukun
    pattern: /[قطبجد]\u0652/g,
    color: TAJWEED_COLORS.qalqalah,
    desc: 'Qalqalah — echo sound',
  },
  {
    name: 'iqlab',
    // ن followed by ب (with any harakat in between)
    pattern: /ن[\u064B-\u0652]?\s*ب/g,
    color: TAJWEED_COLORS.iqlab,
    desc: 'Iqlab — ن converts to م sound before ب',
  },
  {
    name: 'ghunnah',
    // Tanwin or nunation marks: ً ٌ ٍ (double harakat)
    pattern: /[\u064B\u064C\u064D]/g,
    color: TAJWEED_COLORS.ghunnah,
    desc: 'Ghunnah — nasal sound',
  },
  {
    name: 'madd_lazim',
    // Madd: و or ي or ا after long vowel
    pattern: /[\u0627\u0648\u064A]\u0652/g,
    color: TAJWEED_COLORS.madd,
    desc: 'Madd Lazim — obligatory elongation',
  },
  {
    name: 'ikhfa',
    // ن with sukun before ikhfa letters: ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك
    pattern: /ن\u0652[\u062A\u062B\u062C\u062F\u0630\u0632\u0633\u0634\u0635\u0636\u0637\u0638\u0641\u0642\u0643]/g,
    color: TAJWEED_COLORS.ikhfa,
    desc: 'Ikhfa — concealment of ن',
  },
  {
    name: 'lam_shamsiya',
    // ال followed by solar letters: ت ث د ذ ر ز س ش ص ض ط ظ ل ن
    pattern: /ٱل[\u062A\u062B\u062F\u0630\u0631\u0632\u0633\u0634\u0635\u0636\u0637\u0638\u0644\u0646]/g,
    color: TAJWEED_COLORS.lam_shamsiya,
    desc: 'Lam Shamsiya — assimilated lam',
  },
];

// ── TOKENIZE: Split text into colored segments ─────────────────────────────
// Returns an array of { text, color, rule } objects
export function tokenizeForTajweed(arabicText) {
  if (!arabicText) return [{ text: '', color: null, rule: null }];

  // Build a map of character index → rule
  const colorMap = new Array(arabicText.length).fill(null);

  for (const rule of TAJWEED_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;
    while ((match = regex.exec(arabicText)) !== null) {
      for (let i = match.index; i < match.index + match[0].length; i++) {
        if (!colorMap[i]) { // First rule wins (more specific rules listed first)
          colorMap[i] = { color: rule.color, rule: rule.name, desc: rule.desc };
        }
      }
    }
  }

  // Merge consecutive characters with the same color into tokens
  const tokens = [];
  let i = 0;
  while (i < arabicText.length) {
    const current = colorMap[i];
    let j = i + 1;
    while (j < arabicText.length && colorMap[j]?.color === current?.color) {
      j++;
    }
    tokens.push({
      text: arabicText.slice(i, j),
      color: current?.color ?? null,
      rule: current?.rule ?? null,
      desc: current?.desc ?? null,
    });
    i = j;
  }

  return tokens;
}

// ── LEGEND ITEMS for UI ───────────────────────────────────────────────────
export const TAJWEED_LEGEND = [
  { name: 'Ghunnah',       color: TAJWEED_COLORS.ghunnah,      desc: 'Nasal sound, 2 counts' },
  { name: 'Ikhfa',         color: TAJWEED_COLORS.ikhfa,        desc: 'Concealed ن before 15 letters' },
  { name: 'Iqlab',         color: TAJWEED_COLORS.iqlab,        desc: 'ن → م sound before ب' },
  { name: 'Qalqalah',      color: TAJWEED_COLORS.qalqalah,     desc: 'Echo vibration on ق ط ب ج د' },
  { name: 'Madd',          color: TAJWEED_COLORS.madd,         desc: 'Elongation — 4-6 counts' },
  { name: 'Shaddah',       color: TAJWEED_COLORS.shaddah,      desc: 'Double/stressed letter' },
  { name: 'Lam Shamsiya',  color: TAJWEED_COLORS.lam_shamsiya, desc: 'Solar lam — lam is silent' },
];
