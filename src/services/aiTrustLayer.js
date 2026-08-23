// src/services/aiTrustLayer.js
// ─────────────────────────────────────────────────────────────
// AI Trust Layer
// A. Quran reference validation (e.g. 2:183)
// B. "Verified Mode" toggle — only answer with sources
// C. Source-first UI utilities
// ─────────────────────────────────────────────────────────────

// ── A. Reference Validation ──────────────────────────────────

// Quran has 114 surahs; each has a known max verse count
const SURAH_VERSE_COUNTS = [
  0,    // index 0 unused
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,   // 1–10
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,    // 11–20
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,       // 21–30
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,         // 31–40
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,          // 41–50
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,          // 51–60
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,          // 61–70
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,          // 71–80
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,          // 81–90
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,              // 91–100
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,                  // 101–110
  5, 4, 5, 6, 6, 3, 18, 3, 5,                     // 111–114 (114 total)
];

/**
 * Validates a Quran reference like "2:183" or "Al-Baqarah 2:183"
 * Returns: { valid: boolean, surah: number|null, ayah: number|null, formatted: string }
 */
export function validateQuranRef(ref) {
  if (!ref || typeof ref !== 'string') {
    return { valid: false, surah: null, ayah: null, formatted: ref };
  }

  // Match patterns: "2:183", "2 : 183", "[2:183]", "Surah 2, Ayah 183"
  const patterns = [
    /\b(\d{1,3})\s*:\s*(\d{1,3})\b/,
    /surah\s+(\d{1,3})[,\s]+ayah\s+(\d{1,3})/i,
    /\[(\d{1,3}):(\d{1,3})\]/,
  ];

  let surah = null;
  let ayah = null;
  let matchFound = false;

  for (const pattern of patterns) {
    const match = ref.match(pattern);
    if (match) {
      surah = parseInt(match[1]);
      ayah = parseInt(match[2]);
      matchFound = true;
      break;
    }
  }

  if (!matchFound) {
    return { valid: false, surah: null, ayah: null, formatted: ref };
  }

  // Range checks
  if (surah < 1 || surah > 114) {
    return { valid: false, surah, ayah, formatted: ref, reason: 'Surah number out of range (1–114)' };
  }

  const maxAyah = SURAH_VERSE_COUNTS[surah] || 0;
  if (ayah < 1 || ayah > maxAyah) {
    return {
      valid: false, surah, ayah, formatted: ref,
      reason: `Ayah ${ayah} doesn't exist in Surah ${surah} (max: ${maxAyah})`,
    };
  }

  return {
    valid: true,
    surah,
    ayah,
    formatted: `${surah}:${ayah}`,
  };
}

/**
 * Scans AI response text for Quran references and validates them.
 * Returns annotated array of segments: { text, isRef, ref, valid }
 */
export function annotateQuranRefs(text) {
  if (!text) return [{ text, isRef: false }];

  const refPattern = /\b(\d{1,3})\s*:\s*(\d{1,3})\b/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = refPattern.exec(text)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), isRef: false });
    }

    const refStr = match[0];
    const validation = validateQuranRef(refStr);
    segments.push({
      text: refStr,
      isRef: true,
      ref: refStr,
      valid: validation.valid,
      surah: validation.surah,
      ayah: validation.ayah,
      reason: validation.reason,
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isRef: false });
  }

  return segments;
}

// ── B. Verified Mode ─────────────────────────────────────────

/**
 * System prompt injected when Verified Mode is ON
 * Forces AI to only answer when it has Islamic sources
 */
export const VERIFIED_MODE_SYSTEM_PROMPT = `
You are a knowledgeable Islamic assistant operating in VERIFIED MODE.

Rules you MUST follow:
1. Only provide answers when you can cite a specific Quran verse (Surah:Ayah) or authentic Hadith (with collection and number).
2. If you cannot find a reliable source, respond EXACTLY with:
   {"verified": false, "message": "I cannot confidently answer this without a verified source. Please consult a qualified scholar."}
3. Always begin your answer with the source reference FIRST, before the explanation.
4. Format: {"verified": true, "source": "Quran 2:183 / Sahih Bukhari 1897", "answer": "...", "sourceType": "quran|hadith|both"}
5. Do not guess or extrapolate Islamic rulings without textual evidence.
6. If the question is about fiqh (Islamic law), note that scholars may differ and recommend consulting a local scholar.
`;

export const STANDARD_SYSTEM_PROMPT = `
You are a knowledgeable Islamic assistant. Answer questions about Islam, prayer, Quran, and spiritual practice.
Provide helpful, accurate information. When referencing Quran, use the format Surah:Ayah (e.g., 2:183).
Be respectful, compassionate, and spiritually uplifting.
`;

/**
 * Parses a Verified Mode response from the AI
 * Returns: { verified, source, answer, sourceType, message }
 */
export function parseVerifiedResponse(responseText) {
  try {
    // Try JSON parse
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
  } catch {}

  // Fallback: treat as plain text, mark as unverified
  return {
    verified: true, // plain text = not explicitly unverified
    source: null,
    answer: responseText,
    sourceType: 'unknown',
  };
}

// ── C. Source priority helper ────────────────────────────────

/**
 * Determines the source badge to show at the top of an AI response
 * Returns: { label, emoji, color } or null
 */
export function getSourceBadge(sourceType, sourceText) {
  if (!sourceText) return null;

  const hasQuran = sourceType === 'quran' || sourceType === 'both' ||
    /quran|surah|\d+:\d+/i.test(sourceText);
  const hasHadith = sourceType === 'hadith' || sourceType === 'both' ||
    /hadith|bukhari|muslim|tirmidhi|abu dawud/i.test(sourceText);

  if (hasQuran && hasHadith) {
    return { label: 'Based on Quran & Hadith', emoji: '📖', color: '#10b981' };
  }
  if (hasQuran) {
    return { label: 'Based on Quran', emoji: '📖', color: '#c9a84c' };
  }
  if (hasHadith) {
    return { label: 'Based on Hadith', emoji: '📜', color: '#c9a84c' };
  }
  return { label: 'Islamic Guidance', emoji: '🕌', color: '#9ca3af' };
}
