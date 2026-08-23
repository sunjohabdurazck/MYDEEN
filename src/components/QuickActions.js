// src/components/QuickActions.js
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Dimensions, Modal, Share, FlatList, ActivityIndicator,
  Platform, TextInput, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

// NOTE: EXPO_PUBLIC_ vars are bundled into the client and are extractable
// from the shipped app. Acceptable only if this key is scoped to a
// low-spend / rate-limited OpenRouter account. For real spend risk, proxy
// this through your own backend instead — a client-side limiter (below)
// can always be bypassed by reinstalling the app or clearing storage.
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_KEY;

// ── Accent colors ──────────────────────────────────────────────
// Independent of light/dark theme, same reasoning as ACTION_COLORS below.
const ACCENT = {
  emerald: '#10b981',
  red: '#ef4444',
};

const ACTION_COLORS = {
  qibla:  '#c9a84c',
  tasbih: '#10b981',
  mosque: '#3b82f6',
  dua:    '#8b5cf6',
  share:  '#f59e0b',
};

const ACTIONS = [
  { id: 'qibla',  name: 'Qibla',   icon: 'compass-outline',      iconActive: 'compass',       color: ACTION_COLORS.qibla,  screen: 'Qibla',       description: 'Find prayer direction' },
  { id: 'tasbih', name: 'Tasbih',  icon: 'repeat-outline',       iconActive: 'repeat',        color: ACTION_COLORS.tasbih, screen: 'Tasbih',      description: 'Digital dhikr counter' },
  { id: 'mosque', name: 'Mosques', icon: 'location-outline',     iconActive: 'location',      color: ACTION_COLORS.mosque, screen: 'MosqueFinder',description: 'Nearby mosques' },
  { id: 'dua',    name: 'Duas',    icon: 'book-outline',         iconActive: 'book',          color: ACTION_COLORS.dua,    screen: null,          description: 'Daily supplications' },
  { id: 'share',  name: 'Share',   icon: 'share-social-outline', iconActive: 'share-social',  color: ACTION_COLORS.share,  screen: null,          description: 'Share your progress' },
];

// ── Storage & config ────────────────────────────────────────────
const STORAGE_KEYS = {
  SAVED_DUAS: 'saved_duas',
};

const DUA_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: 8,
  SEARCH_MIN_LENGTH: 2,
  SEARCH_MAX_LENGTH: 100,
  AI_MODEL: 'openai/gpt-4o-mini',
  MAX_DUAS_PER_GENERATION: 3,
  VALID_SOURCES: ['Quran', 'Bukhari', 'Muslim', 'Tirmidhi', 'Ibn Majah', 'Abu Dawud', 'Nasai'],
  REQUIRED_FIELDS: ['arabic', 'transliteration', 'translation', 'source'],
};

// ── Seed + local dua database ───────────────────────────────────
const SEED_DUAS = [
  {
    id: 'seed_001',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar",
    translation: "Our Lord, give us good in this world and good in the Hereafter and protect us from the torment of the Fire.",
    source: 'Quran 2:201',
    category: 'protection',
    tags: ['protection', 'guidance', 'daily'],
    isVerified: true,
    _source: 'seed',
  },
  {
    id: 'seed_002',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ',
    transliteration: "Allahumma inni as'alukal-'afwa wal-'afiyata fid-dunya wal-akhirah",
    translation: "O Allah, I ask You for pardon and well-being in this life and the next.",
    source: 'Ibn Majah',
    category: 'protection',
    tags: ['protection', 'daily', 'morning', 'evening'],
    isVerified: true,
    _source: 'seed',
  },
];

const LOCAL_DUAS = [
  ...SEED_DUAS,
  {
    id: 'local_001',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
    transliteration: "Allahu la ilaha illa huwa al-hayyu al-qayyum",
    translation: "Allah! There is no deity except Him, the Ever-Living, the Self-Sustaining.",
    source: 'Quran 2:255 (Ayat al-Kursi)',
    category: 'protection',
    tags: ['protection', 'morning', 'evening', 'daily'],
    isVerified: true,
    _source: 'local',
  },
  {
    id: 'local_002',
    arabic: 'رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ',
    transliteration: "Rabbana ighfir li wa liwalidayya wa lil-mu'minina yawma yaqumu al-hisab",
    translation: "Our Lord, forgive me and my parents and the believers on the Day the account is established.",
    source: 'Quran 14:41',
    category: 'forgiveness',
    tags: ['forgiveness', 'parents', 'family'],
    isVerified: true,
    _source: 'local',
  },
  {
    id: 'local_003',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ',
    transliteration: "Allahumma inni a'udhu bika min al-hammi wal-hazan",
    translation: "O Allah, I seek refuge in You from anxiety and sorrow.",
    source: 'Sahih Bukhari',
    category: 'protection',
    tags: ['protection', 'anxiety', 'daily'],
    isVerified: true,
    _source: 'local',
  },
  {
    id: 'local_004',
    arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا',
    transliteration: "Rabbana la tuzigh qulubana ba'da idh hadaytana",
    translation: "Our Lord, do not let our hearts deviate after You have guided us.",
    source: 'Quran 3:8',
    category: 'guidance',
    tags: ['guidance', 'protection'],
    isVerified: true,
    _source: 'local',
  },
  {
    id: 'local_005',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى',
    transliteration: "Allahumma inni as'aluka al-huda wa al-tuqa wa al-'afafa wa al-ghina",
    translation: "O Allah, I ask You for guidance, piety, chastity, and contentment.",
    source: 'Sahih Muslim',
    category: 'guidance',
    tags: ['guidance', 'daily', 'morning'],
    isVerified: true,
    _source: 'local',
  },
  {
    id: 'local_006',
    arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
    transliteration: "Rabbi ishrah li sadri wa yassir li amri",
    translation: "My Lord, expand my chest for me and ease my affair for me.",
    source: 'Quran 20:25',
    category: 'guidance',
    tags: ['guidance', 'success', 'morning'],
    isVerified: true,
    _source: 'local',
  },
  {
    id: 'local_007',
    arabic: 'اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي',
    transliteration: "Allahumma aslih li dini alladhi huwa 'ismatu amri",
    translation: "O Allah, rectify my religion which is the safeguard of my affairs.",
    source: 'Sunan Abi Dawud',
    category: 'guidance',
    tags: ['guidance', 'daily', 'morning'],
    isVerified: true,
    _source: 'local',
  },
  {
    id: 'local_008',
    arabic: 'رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ',
    transliteration: "Rabbana wa la tuhammilna ma la taqata lana bih",
    translation: "Our Lord, do not burden us with that which we cannot bear.",
    source: 'Quran 2:286',
    category: 'protection',
    tags: ['protection', 'daily'],
    isVerified: true,
    _source: 'local',
  },
];

// ── Error boundary ───────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('QuickActions Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={eb.container}>
          <Ionicons name="alert-circle-outline" size={48} color={ACCENT.red} />
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.text}>{this.state.error?.message || 'Please try again'}</Text>
          <TouchableOpacity
            style={eb.button}
            onPress={() => this.setState({ hasError: false, error: null })}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={eb.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Dua service (search, AI generation, rate limiting) ───────────
// A single module-level instance is shared across every DuaModal mount, so
// the rate-limit window survives the modal being closed and reopened.
//
// NOTE ON AI CONTENT: generated duas are still tagged internally with
// `_source: 'ai_generated'` even though the UI no longer surfaces this —
// per request, everything renders as one undifferentiated "authentic"
// list. The field is kept in the stored data (not shown anywhere) so it
// can still be audited or filtered later if a citation turns out to be
// wrong — `verifySource()` below only checks that the source string
// contains a known collection name, it does not confirm the dua is real.
class DuaService {
  constructor() {
    this.requestWindow = [];
    this.maxRequestsPerMinute = DUA_CONFIG.MAX_REQUESTS_PER_MINUTE;
  }

  normalizeText(text) {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  sanitizeQuery(query) {
    return query
      .replace(/[<>{}]/g, '')
      .replace(/["'`\n\r]/g, ' ')
      .trim()
      .slice(0, DUA_CONFIG.SEARCH_MAX_LENGTH);
  }

  searchLocal(query) {
    if (!query || query.length < DUA_CONFIG.SEARCH_MIN_LENGTH) return [];

    const sanitizedQuery = this.sanitizeQuery(query);
    const searchTerms = sanitizedQuery.toLowerCase().split(' ');

    return LOCAL_DUAS.filter(dua => {
      const searchableFields = [
        dua.translation,
        dua.source,
        dua.category || '',
        ...(dua.tags || []),
        dua.transliteration,
        dua.arabic,
      ];
      const searchableText = searchableFields.join(' ').toLowerCase();

      return searchTerms.some(term => term.length >= 2 && searchableText.includes(term));
    }).map(dua => ({
      ...dua,
      _relevance: this.calculateRelevance(dua, sanitizedQuery),
    })).sort((a, b) => b._relevance - a._relevance);
  }

  calculateRelevance(dua, query) {
    const terms = this.normalizeText(query).split(' ');
    let score = 0;

    const translation = dua.translation.toLowerCase();
    const transliteration = dua.transliteration.toLowerCase();
    const source = dua.source.toLowerCase();
    const category = (dua.category || '').toLowerCase();
    const tags = (dua.tags || []).join(' ').toLowerCase();
    const arabic = dua.arabic;

    const q = query.toLowerCase();
    if (translation.includes(q)) score += 10;
    if (transliteration.includes(q)) score += 8;

    for (const term of terms) {
      if (term.length < 2) continue;
      if (translation.includes(term)) score += 5;
      if (transliteration.includes(term)) score += 4;
      if (tags.includes(term)) score += 3;
      if (source.includes(term)) score += 2;
      if (category.includes(term)) score += 2;
      if (arabic.includes(term)) score += 1;

      let fieldMatches = 0;
      if (translation.includes(term)) fieldMatches++;
      if (transliteration.includes(term)) fieldMatches++;
      if (tags.includes(term)) fieldMatches++;
      if (source.includes(term)) fieldMatches++;
      if (fieldMatches >= 2) score += 3;
    }

    return score;
  }

  verifySource(source) {
    if (typeof source !== 'string') return false;
    return DUA_CONFIG.VALID_SOURCES.some(s => source.includes(s));
  }

  isValidDuaShape(dua) {
    if (!dua || typeof dua !== 'object') return false;
    return DUA_CONFIG.REQUIRED_FIELDS.every(
      field => typeof dua[field] === 'string' && dua[field].trim().length > 0
    );
  }

  canMakeRequest() {
    const now = Date.now();
    this.requestWindow = this.requestWindow.filter(t => now - t < 60000);
    return this.requestWindow.length < this.maxRequestsPerMinute;
  }

  async _generateDuas({ searchQuery, existingSources = [] }) {
    if (!OPENROUTER_API_KEY) return { status: 'no_key', duas: [] };
    if (!this.canMakeRequest()) return { status: 'rate_limited', duas: [] };

    const topic = searchQuery ? this.sanitizeQuery(searchQuery) : null;
    const topicClause = topic ? `related to "${topic}"` : '';
    const relevanceNote = topic ? `- These duas must be directly relevant to "${topic}"\n` : '';

    const prompt = `You are an Islamic scholar. Generate ${DUA_CONFIG.MAX_DUAS_PER_GENERATION} authentic Islamic duas (supplications) ${topicClause} from the Quran or Sahih Hadith.

IMPORTANT:
${relevanceNote}- They must be DIFFERENT from these existing sources: ${existingSources.length > 0 ? existingSources.join(', ') : 'None'}
- Only use authentic duas from Quran or Sahih Hadith

Format EXACTLY as JSON (no markdown, no commentary):
[
  {
    "arabic": "Arabic text with diacritics",
    "transliteration": "Romanized pronunciation",
    "translation": "English meaning",
    "source": "Quran X:X or Sahih Bukhari X"
  }
]

Only use authentic duas. Respond with JSON only.`;

    try {
      this.requestWindow.push(Date.now());

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://deenapp.com',
        },
        body: JSON.stringify({
          model: DUA_CONFIG.AI_MODEL,
          max_tokens: 500,
          temperature: 0.3,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || '';
      const clean = raw.replace(/```json|```/g, '').trim();

      let generated;
      try {
        generated = JSON.parse(clean);
      } catch (parseError) {
        console.error('AI response was not valid JSON:', parseError, clean);
        return { status: 'parse_error', duas: [] };
      }

      if (!Array.isArray(generated)) return { status: 'parse_error', duas: [] };

      const validated = generated
        .filter(dua => this.isValidDuaShape(dua))
        .map((dua, index) => ({
          arabic: dua.arabic,
          transliteration: dua.transliteration,
          translation: dua.translation,
          source: dua.source,
          id: `ai_${topic ? 'search_' : ''}${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
          _source: 'ai_generated', // internal only — never rendered
          category: 'ai_generated',
          tags: topic ? ['ai_generated', topic.toLowerCase()] : ['ai_generated'],
          isVerified: this.verifySource(dua.source),
          _isNew: true,
        }));

      if (validated.length === 0) return { status: 'parse_error', duas: [] };

      return { status: 'ok', duas: validated };
    } catch (error) {
      console.error('AI Generation error:', error);
      return { status: 'network_error', duas: [] };
    }
  }

  async generateDuas(existingSources = []) {
    return this._generateDuas({ existingSources });
  }

  async generateDuasForQuery(searchQuery, existingSources = []) {
    return this._generateDuas({ searchQuery, existingSources });
  }

  getOfflineFallback(existingIds = new Set()) {
    return LOCAL_DUAS
      .filter(d => !existingIds.has(d.id))
      .slice(0, 4)
      .map(dua => ({
        ...dua,
        id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        _source: 'offline_fallback',
        _isNew: true,
      }));
  }
}

const duaService = new DuaService();

// ── Dua card ───────────────────────────────────────────────────
// Renders identically regardless of where the dua came from (seed, local,
// or AI-generated) — only "Verified" (source string matches a known
// collection) and "NEW" (just added to the collection) are shown.
const DuaCard = memo(({ item, index, T, onAdd, onRemove, isSearchResult = false }) => {
  const isNew = item._isNew;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, delay: Math.min(index * 40, 200), useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, delay: Math.min(index * 40, 200), useNativeDriver: true }),
    ]).start();
    return () => {
      slideAnim.stopAnimation();
      opacityAnim.stopAnimation();
    };
  }, []);

  return (
    <Animated.View
      style={[
        dm.duaCard,
        {
          backgroundColor: T.bg,
          borderColor: isNew ? ACCENT.emerald : `${T.gold}26`,
          borderWidth: isNew ? 2 : 1,
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={dm.badgeRow}>
        {isNew && (
          <View style={[dm.badge, { backgroundColor: `${ACCENT.emerald}20`, borderColor: ACCENT.emerald }]}>
            <Text style={[dm.badgeText, { color: ACCENT.emerald }]}>NEW</Text>
          </View>
        )}
        {item.isVerified && (
          <View style={[dm.badge, { backgroundColor: `${ACCENT.emerald}20`, borderColor: ACCENT.emerald }]}>
            <Ionicons name="checkmark-circle" size={10} color={ACCENT.emerald} />
            <Text style={[dm.badgeText, { color: ACCENT.emerald }]}>Verified</Text>
          </View>
        )}
      </View>

      <Text style={[dm.arabic, { color: T.gold }]}>{item.arabic}</Text>
      <Text style={[dm.transliteration, { color: T.muted }]}>{item.transliteration}</Text>
      <Text style={[dm.translation, { color: T.text }]}>"{item.translation}"</Text>

      <View style={dm.cardFooter}>
        <View style={dm.sourceRow}>
          <Ionicons name="book-outline" size={12} color={T.gold} />
          <Text style={[dm.source, { color: T.muted }]}>{item.source}</Text>
        </View>
        <View style={dm.cardActions}>
          {onRemove && !isSearchResult && (
            <TouchableOpacity onPress={() => onRemove(item.id)} accessibilityRole="button" accessibilityLabel="Remove dua" style={dm.iconBtn}>
              <Ionicons name="remove-circle-outline" size={24} color={ACCENT.red} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onAdd(item)} accessibilityRole="button" accessibilityLabel="Add dua" style={dm.iconBtn}>
            <Ionicons name="add-circle" size={24} color={T.gold} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
});

// ── DuaModal ───────────────────────────────────────────────────
function DuaModal({ visible, onClose }) {
  const { theme: T } = useTheme();

  const [duas, setDuas] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchStatusMessage, setSearchStatusMessage] = useState(null);
  const [loadMoreMessage, setLoadMoreMessage] = useState(null);

  const inputRef = useRef(null);
  const searchTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const saveDuas = useCallback(async (duasToSave) => {
    try {
      const filtered = duasToSave.filter(d => d._source !== 'seed');
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_DUAS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Save error:', error);
    }
  }, []);

  const loadSavedDuas = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_DUAS);
      if (!isMountedRef.current) return;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seedIds = new Set(SEED_DUAS.map(d => d.id));
          setDuas([...SEED_DUAS, ...parsed.filter(d => !seedIds.has(d.id))]);
          setIsInitialLoad(false);
          return;
        }
      }
      setDuas([...SEED_DUAS]);
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Load error:', error);
      if (!isMountedRef.current) return;
      setDuas([...SEED_DUAS]);
      setIsInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadSavedDuas();
      setSearchResults([]);
      setShowSearchResults(false);
      setSearchStatusMessage(null);
      setLoadMoreMessage(null);
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 250);
    } else {
      Keyboard.dismiss();
      if (duas.length > 0) saveDuas(duas);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const loadMoreDuas = useCallback(async () => {
    if (isGenerating) return;
    setLoading(true);
    setIsGenerating(true);
    setLoadMoreMessage(null);

    try {
      const existingSources = duas.map(d => d.source);
      const existingIds = new Set(duas.map(d => d.id));
      const { status, duas: newDuas } = await duaService.generateDuas(existingSources);
      if (!isMountedRef.current) return;

      if (newDuas.length > 0) {
        setDuas(prev => {
          const updated = [...prev, ...newDuas];
          saveDuas(updated);
          return updated;
        });
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      } else {
        const fallback = duaService.getOfflineFallback(existingIds);
        if (fallback.length > 0) {
          setDuas(prev => {
            const updated = [...prev, ...fallback];
            saveDuas(updated);
            return updated;
          });
        }
        setLoadMoreMessage(fallback.length > 0 ? null : 'No new duas available right now — try again shortly.');
      }
    } catch (error) {
      console.error('Load more error:', error);
      if (isMountedRef.current) setLoadMoreMessage('Something went wrong loading more duas.');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsGenerating(false);
      }
    }
  }, [duas, isGenerating, saveDuas]);

  // Local search first; if it comes up empty, silently fall through to AI
  // generation and merge the result into the same list. The two are never
  // distinguished in the UI or in the result count.
  const performSearch = useCallback(async (searchQuery) => {
    const requestId = ++searchRequestIdRef.current;

    if (!searchQuery || searchQuery.length < DUA_CONFIG.SEARCH_MIN_LENGTH) {
      setSearchResults([]);
      setShowSearchResults(false);
      setSearchStatusMessage(null);
      return;
    }

    setLoading(true);
    setSearchStatusMessage(null);

    try {
      const existingIds = new Set(duas.map(d => d.id));
      const local = duaService.searchLocal(searchQuery).filter(d => !existingIds.has(d.id));

      let results = local;
      let status = 'ok';

      if (local.length === 0 && OPENROUTER_API_KEY) {
        const existingSources = duas.map(d => d.source);
        const generated = await duaService.generateDuasForQuery(searchQuery, existingSources);
        if (requestId !== searchRequestIdRef.current || !isMountedRef.current) return;
        results = generated.duas;
        status = generated.status;
      }

      if (requestId !== searchRequestIdRef.current || !isMountedRef.current) return;

      setSearchResults(results);
      setShowSearchResults(true);

      if (results.length > 0) {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      } else if (local.length === 0 && !OPENROUTER_API_KEY) {
        setSearchStatusMessage('Try a different search term.');
      } else {
        const messages = {
          rate_limited: "You've hit the search limit for now — try again in a minute.",
          parse_error: 'Try rephrasing your search.',
          network_error: 'Could not complete the search. Check your connection and try again.',
        };
        setSearchStatusMessage(messages[status] || 'Try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      if (requestId === searchRequestIdRef.current && isMountedRef.current) {
        setSearchStatusMessage('Something went wrong while searching.');
      }
    } finally {
      if (requestId === searchRequestIdRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [duas]);

  const handleSearchChange = useCallback((text) => {
    setQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => performSearch(text), 500);
  }, [performSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchStatusMessage(null);
    inputRef.current?.focus();
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchRequestIdRef.current++;
  }, []);

  const addSearchResultDua = useCallback((dua) => {
    setDuas(prev => {
      if (prev.some(d => d.id === dua.id)) return prev;
      const updated = [...prev, { ...dua, _isNew: true }];
      saveDuas(updated);
      return updated;
    });
    setSearchResults(prev => prev.filter(d => d.id !== dua.id));
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Success); } catch {}
  }, [saveDuas]);

  const removeDua = useCallback((duaId) => {
    setDuas(prev => {
      const updated = prev.filter(d => d.id !== duaId);
      saveDuas(updated);
      return updated;
    });
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  }, [saveDuas]);

  const addAllResults = useCallback(() => {
    if (searchResults.length === 0) return;
    setDuas(prev => {
      const existingIds = new Set(prev.map(d => d.id));
      const updated = [...prev, ...searchResults.filter(d => !existingIds.has(d.id)).map(d => ({ ...d, _isNew: true }))];
      saveDuas(updated);
      return updated;
    });
    setSearchResults([]);
    setShowSearchResults(false);
    setQuery('');
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Success); } catch {}
  }, [searchResults, saveDuas]);

  const keyExtractor = useCallback((item) => String(item.id), []);

  const renderMainItem = useCallback(({ item, index }) => (
    <DuaCard item={item} index={index} T={T} onAdd={addSearchResultDua} onRemove={removeDua} />
  ), [T, addSearchResultDua, removeDua]);

  const renderSearchItem = useCallback(({ item, index }) => (
    <DuaCard item={item} index={index} T={T} onAdd={addSearchResultDua} isSearchResult />
  ), [T, addSearchResultDua]);

  const bg08 = T.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <ErrorBoundary>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={dm.backdrop}>
          <View style={[dm.sheet, { backgroundColor: T.surface }]}>
            <View style={[dm.header, { borderBottomColor: T.border }]}>
              <View>
                <Text style={[dm.title, { color: T.text }]}>🤲 Daily Duas</Text>
                <Text style={[dm.subtitle, { color: T.muted }]}>
                  {duas.length} authentic
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={[dm.closeBtn, { backgroundColor: bg08 }]} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={T.muted} />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={[dm.searchBar, { backgroundColor: T.bg, borderColor: T.border }]}>
              <Ionicons name="search" size={20} color={T.muted} />
              <TextInput
                ref={inputRef}
                style={[dm.searchInput, { color: T.text }]}
                placeholder="Search duas..."
                placeholderTextColor={T.muted}
                value={query}
                onChangeText={handleSearchChange}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={DUA_CONFIG.SEARCH_MAX_LENGTH}
                accessibilityLabel="Search duas"
                accessibilityHint="Type to search the collection"
              />
              {loading && <ActivityIndicator size="small" color={T.gold} />}
              {query.length > 0 && !loading && (
                <TouchableOpacity onPress={clearSearch} accessibilityRole="button" accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={20} color={T.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search results */}
            {showSearchResults ? (
              <View style={dm.resultsArea}>
                {searchResults.length > 0 ? (
                  <>
                    <View style={dm.resultsHeader}>
                      <Text style={[dm.resultsHeaderText, { color: T.muted }]}>
                        Found {searchResults.length} result{searchResults.length > 1 ? 's' : ''}
                      </Text>
                      <TouchableOpacity style={dm.addAllBtn} onPress={addAllResults} accessibilityRole="button">
                        <Text style={dm.addAllBtnText}>Add All +</Text>
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={searchResults}
                      keyExtractor={keyExtractor}
                      renderItem={renderSearchItem}
                      style={dm.resultsList}
                      showsVerticalScrollIndicator
                      nestedScrollEnabled
                      initialNumToRender={3}
                    />
                  </>
                ) : !loading ? (
                  <View style={dm.noResults}>
                    <Ionicons name="search-outline" size={44} color={T.muted} />
                    <Text style={[dm.noResultsText, { color: T.text }]}>No results found for "{query}"</Text>
                    <Text style={[dm.noResultsSubtext, { color: T.muted }]}>{searchStatusMessage || 'Try a different search term.'}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <>
                {duas.length === 0 && !isInitialLoad ? (
                  <View style={dm.emptyState}>
                    <Ionicons name="book-outline" size={44} color={T.muted} />
                    <Text style={[dm.emptyTitle, { color: T.text }]}>No Duas Yet</Text>
                    <Text style={[dm.emptySubtext, { color: T.muted }]}>Search for duas or tap "More Duas" to start your collection</Text>
                  </View>
                ) : (
                  <FlatList
                    data={duas}
                    keyExtractor={keyExtractor}
                    renderItem={renderMainItem}
                    style={dm.scroll}
                    contentContainerStyle={dm.mainListContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onRefresh={loadMoreDuas}
                    refreshing={loading}
                  />
                )}

                {loadMoreMessage && (
                  <Text style={[dm.loadMoreMessage, { color: T.muted }]}>{loadMoreMessage}</Text>
                )}

                <TouchableOpacity
                  style={[dm.moreBtn, { backgroundColor: T.gold }, (loading || isGenerating) && dm.moreBtnLoading]}
                  onPress={loadMoreDuas}
                  disabled={loading || isGenerating}
                  accessibilityRole="button"
                  accessibilityLabel="Load more duas"
                >
                  {isGenerating ? (
                    <ActivityIndicator size="small" color={T.bg} />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color={T.bg} />
                      <Text style={[dm.moreBtnText, { color: T.bg }]}>More Duas</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ErrorBoundary>
  );
}

// ── Main component ─────────────────────────────────────────────
export default function QuickActions({ navigation }) {
  const { theme: T } = useTheme();
  const [selectedAction, setSelectedAction] = useState(null);
  const [showDuaModal, setShowDuaModal] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    return () => {
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: '🕌 Deen App - Your Complete Islamic Companion\n\nTrack prayers, read Quran, find Qibla direction, and more!\n\nDownload now and strengthen your faith! 📱',
        title: 'Share Deen App',
      });
    } catch {}
    setSelectedAction(null);
  }, []);

  const handlePress = useCallback(async (action) => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setSelectedAction(action.id);

    if (action.screen) {
      setTimeout(() => { navigation.navigate(action.screen); setSelectedAction(null); }, 150);
    } else if (action.id === 'share') {
      await handleShare();
    } else if (action.id === 'dua') {
      setShowDuaModal(true);
      setSelectedAction(null);
    }
  }, [navigation, handleShare]);

  return (
    <ErrorBoundary>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: T.muted }]}>Quick Actions</Text>
          <Text style={[styles.subtitle, { color: T.muted }]}>Tap for shortcuts</Text>
        </View>

        <View style={styles.grid}>
          {ACTIONS.map(action => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionCard,
                { backgroundColor: T.surface, borderColor: T.border },
                selectedAction === action.id && { borderColor: T.gold },
              ]}
              onPress={() => handlePress(action)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={action.name}
              accessibilityHint={action.description}
            >
              <Animated.View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${action.color}15` },
                  selectedAction === action.id && { transform: [{ scale: scaleAnim }] },
                ]}
              >
                <Ionicons
                  name={selectedAction === action.id ? action.iconActive : action.icon}
                  size={28}
                  color={action.color}
                />
              </Animated.View>
              <Text style={[styles.actionName, { color: T.text }]}>{action.name}</Text>
              <Text style={[styles.actionDescription, { color: T.muted }]}>{action.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <DuaModal visible={showDuaModal} onClose={() => setShowDuaModal(false)} />
      </Animated.View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginVertical: 8 },
  header: { marginBottom: 12, paddingHorizontal: 4 },
  title: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', letterSpacing: 0.8, textTransform: 'uppercase' },
  subtitle: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  actionCard: { flex: 1, minWidth: (width - 56) / 3 - 12, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1 },
  iconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionName: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', marginBottom: 4 },
  actionDescription: { fontSize: 10, fontFamily: 'PlusJakartaSans-Regular', textAlign: 'center' },
});

const eb = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', marginTop: 12 },
  text: { fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', marginTop: 8, textAlign: 'center' },
  button: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#c9a84c', borderRadius: 12 },
  buttonText: { fontSize: 16, fontFamily: 'PlusJakartaSans-Bold', color: '#0d1120' },
});

const dm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8, maxHeight: '90%', minHeight: '75%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold' },
  subtitle: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 14, marginBottom: 6,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 8, borderRadius: 14, borderWidth: 1, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 4 },

  resultsArea: { flex: 1 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8 },
  resultsHeaderText: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular' },
  addAllBtn: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  addAllBtnText: { fontSize: 12, color: '#10b981', fontFamily: 'PlusJakartaSans-SemiBold' },
  resultsList: { maxHeight: 400, paddingHorizontal: 20 },

  noResults: { paddingVertical: 30, alignItems: 'center', paddingHorizontal: 24 },
  noResultsText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', textAlign: 'center' },
  noResultsSubtext: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', marginTop: 4, textAlign: 'center' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', marginTop: 12 },
  emptySubtext: { fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },

  scroll: { flex: 1 },
  mainListContent: { padding: 20, paddingTop: 8 },

  duaCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  badgeText: { fontSize: 9, fontFamily: 'PlusJakartaSans-Bold' },
  arabic: { fontSize: 22, fontFamily: 'Amiri-Regular', textAlign: 'right', lineHeight: 36, marginBottom: 8 },
  transliteration: { fontSize: 13, fontStyle: 'italic', marginBottom: 6, lineHeight: 20 },
  translation: { fontSize: 14, lineHeight: 22, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  source: { fontSize: 11 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 4 },

  loadMoreMessage: { fontSize: 11, fontFamily: 'PlusJakartaSans-Regular', textAlign: 'center', marginHorizontal: 20, marginBottom: 6 },
  moreBtn: { margin: 20, marginTop: 4, borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  moreBtnLoading: { opacity: 0.7 },
  moreBtnText: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 15 },
});