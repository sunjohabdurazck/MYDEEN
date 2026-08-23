// src/services/aiAssistant.js — TRUSTED AI ENGINE v2
// Forces structured JSON responses: answer + Quran ref + Hadith ref + AI-graded confidence
import { supabase } from '../lib/supabase';

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

// ─────────────────────────────────────────────────────────────────────────────
// FIQH CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
export const FIQH_CATEGORIES = [
  { key: 'all',      label: 'All',      emoji: '☪️' },
  { key: 'prayer',   label: 'Prayer',   emoji: '🕌' },
  { key: 'fasting',  label: 'Fasting',  emoji: '🌙' },
  { key: 'zakat',    label: 'Zakat',    emoji: '💛' },
  { key: 'halal',    label: 'Halal',    emoji: '✅' },
  { key: 'quran',    label: "Qur'an",   emoji: '📖' },
  { key: 'aqeedah',  label: 'Aqeedah',  emoji: '🤍' },
  { key: 'marriage', label: 'Marriage', emoji: '💍' },
  { key: 'ethics',   label: 'Ethics',   emoji: '🤲' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — forces structured JSON with all trust signals
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemPrompt(fiqhCategory) {
  const categoryHint =
    fiqhCategory && fiqhCategory !== 'all'
      ? `The user is asking in the context of: ${fiqhCategory.toUpperCase()}. Prioritise references relevant to this topic.`
      : '';

  return `You are Deen AI, a trusted Islamic knowledge assistant. You answer based on the Quran, authentic Sunnah, and the consensus of traditional scholars (ijma).

${categoryHint}

CRITICAL RULE: Respond ONLY with a single valid JSON object. No text before or after. No markdown fences. No prose outside the JSON.

Required JSON schema:
{
  "answer": "Clear, warm, respectful answer in 2–4 paragraphs. Do NOT mention JSON or formatting in the answer.",
  "quran": {
    "ref": "Surah name + chapter:verse — e.g. Al-Baqarah 2:183",
    "arabic": "Exact Arabic text of the verse",
    "translation": "English meaning of the verse"
  },
  "hadith": {
    "ref": "Collection + book + number — e.g. Sahih Bukhari, Book of Fasting, Hadith 1904",
    "text": "English translation of the hadith"
  },
  "confidence": "HIGH" or "MEDIUM" or "LOW" or "CONSULT_SCHOLAR",
  "confidence_reason": "One sentence explaining the confidence level.",
  "scholar_note": "Message to consult a scholar — or null if not needed.",
  "fiqh_category": "prayer" or "fasting" or "zakat" or "halal" or "quran" or "aqeedah" or "marriage" or "ethics" or "general"
}

Confidence levels — choose carefully:
- HIGH: Clear Quranic ruling OR mutawatir hadith with unanimous scholarly consensus.
- MEDIUM: Authentic hadith or well-established scholarly opinion with minor differences.
- LOW: Involves ijtihad, scholarly disagreement, or contextual fiqh rulings.
- CONSULT_SCHOLAR: Requires a personal fatwa, involves the person's specific situation, or is too sensitive to answer without knowing their circumstances.

Rules for references:
- If there is NO directly relevant Quran verse, set "quran" to null.
- If there is NO relevant hadith, set "hadith" to null.
- NEVER fabricate verse numbers or hadith numbers. Only cite what you are certain about.
- Prefer the most well-known, accessible reference rather than an obscure one.

Even for CONSULT_SCHOLAR, still provide whatever general guidance you can in "answer".`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFE JSON PARSER
// ─────────────────────────────────────────────────────────────────────────────
function parseStructuredResponse(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let cleaned = raw.trim();
  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const CONFIDENCE_MAP = {
  HIGH:            { score: 92, label: 'High Certainty',  color: '#10b981', icon: '✅' },
  MEDIUM:          { score: 72, label: 'Verified',         color: '#34d399', icon: '⚠️' },
  LOW:             { score: 45, label: 'Scholarly Diff.',  color: '#f59e0b', icon: '⚠️' },
  CONSULT_SCHOLAR: { score: 20, label: 'Consult Scholar', color: '#ef4444', icon: '🎓' },
};

export function getConfidenceInfo(level) {
  return CONFIDENCE_MAP[level] || CONFIDENCE_MAP.LOW;
}

// backward-compat for ConfidenceBadge (score-based)
export function getConfidenceLabel(score) {
  if (score >= 85) return { label: 'High Certainty',  color: '#10b981', icon: '✅' };
  if (score >= 65) return { label: 'Verified',         color: '#34d399', icon: '⚠️' };
  if (score >= 40) return { label: 'Moderate',         color: '#f59e0b', icon: '⚠️' };
  if (score >= 20) return { label: 'Uncertain',        color: '#f97316', icon: '⚠️' };
  return                   { label: 'Consult Scholar', color: '#ef4444', icon: '🎓' };
}

export function getSourceIcon(type) {
  switch (type) {
    case 'quran':  return '📖';
    case 'hadith': return '📜';
    default:       return '📌';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY CLEANER
// ─────────────────────────────────────────────────────────────────────────────
function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(m => m?.role && typeof m?.content === 'string' && m.content.trim().length > 0)
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content.trim(),
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK
// ─────────────────────────────────────────────────────────────────────────────
function makeFallback(rawText) {
  return {
    answer: rawText || "I apologize, I couldn't generate a response. Please try again.",
    quran: null,
    hadith: null,
    confidence: 'LOW',
    confidence_reason: 'Response format could not be verified.',
    scholar_note: 'Please consult a qualified Islamic scholar for this matter.',
    fiqh_category: 'general',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export async function askIslamicQuestion(
  question,
  userId,
  history = [],
  verifiedMode = true,
  fiqhCategory = 'all',
) {
  if (!question?.trim()) {
    return {
      type: 'error', answer: 'Please ask a valid question.',
      quran: null, hadith: null, confidence: 0, sources: [], scholar_note: null,
    };
  }

  if (!OPENROUTER_API_KEY) {
    return {
      type: 'error', answer: 'AI service is not configured. Please check app settings.',
      quran: null, hadith: null, confidence: 0, sources: [], scholar_note: null,
    };
  }

  try {
    const cleanedHistory = cleanHistory(history);

    const messages = [
      { role: 'system', content: buildSystemPrompt(fiqhCategory) },
      ...cleanedHistory.slice(-6),
      { role: 'user', content: question.trim() },
    ];

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://deenapp.com',
        'X-Title': 'Deen App',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 900,
        top_p: 0.9,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`API ${response.status}: ${err?.error?.message || 'unknown'}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    const parsed = parseStructuredResponse(rawContent);
    const structured = parsed || makeFallback(rawContent);

    const confidenceLevel = ['HIGH', 'MEDIUM', 'LOW', 'CONSULT_SCHOLAR'].includes(structured.confidence)
      ? structured.confidence
      : 'LOW';

    const { score } = getConfidenceInfo(confidenceLevel);

    // Build legacy sources array for SourceCard
    const sources = [];
    if (structured.quran) {
      sources.push({
        type: 'quran',
        ref: structured.quran.ref,
        arabic: structured.quran.arabic || null,
        translation: structured.quran.translation || null,
      });
    }
    if (structured.hadith) {
      sources.push({
        type: 'hadith',
        ref: structured.hadith.ref,
        arabic: null,
        translation: structured.hadith.text || null,
      });
    }

    const result = {
      type: verifiedMode ? 'verified' : 'plain',
      answer: structured.answer,
      quran: structured.quran || null,
      hadith: structured.hadith || null,
      confidence: score,
      confidence_level: confidenceLevel,
      confidence_reason: structured.confidence_reason || '',
      scholar_note:
        structured.scholar_note ||
        (confidenceLevel === 'CONSULT_SCHOLAR'
          ? 'This matter involves personal circumstances or scholarly differences. Please consult a qualified scholar for a specific ruling.'
          : null),
      fiqh_category: structured.fiqh_category || 'general',
      sources,
    };

    // ✅ FIXED: Non-blocking Supabase persist with proper Promise handling
    if (supabase && userId) {
      // Use async IIFE to properly handle promises
      (async () => {
        try {
          // Save user message
          const { error: userError } = await supabase
            .from('ai_chats')
            .insert({
              user_id: userId,
              role: 'user',
              content: question.trim(),
              created_at: new Date().toISOString(),
            });
          
          if (userError) {
            console.warn('Failed to save user message:', userError.message);
          }

          // Save assistant message
          const { error: assistantError } = await supabase
            .from('ai_chats')
            .insert({
              user_id: userId,
              role: 'assistant',
              content: structured.answer,
              verified: verifiedMode,
              metadata: result,
              created_at: new Date().toISOString(),
            });
          
          if (assistantError) {
            console.warn('Failed to save assistant message:', assistantError.message);
          }
        } catch (err) {
          console.warn('Error saving AI messages:', err);
        }
      })();
    }

    return result;

  } catch (error) {
    console.error('❌ AI Error:', error);
    return {
      type: 'error',
      answer: "I'm having trouble responding right now. Please try again in a moment.",
      quran: null, hadith: null,
      confidence: 0, confidence_level: 'LOW',
      confidence_reason: '',
      scholar_note: 'Please try again or consult a scholar for important matters.',
      fiqh_category: 'general',
      sources: [],
    };
  }
}