// src/screens/QuranScreen.js — PREMIUM + Khatam Tracker + 99 Names tab
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuranStore } from '../store';
import { searchQuran } from '../services/quran';
import { useTheme } from '../contexts/ThemeContext';
import JuzTracker from '../components/JuzTracker';
import NamesOfAllah from '../components/NamesOfAllah';

const QURAN_TABS = [
  { key: 'surahs', label: 'Surahs' },
  { key: 'khatam', label: 'Khatam' },
  { key: 'names',  label: '99 Names' },
];

// Même logique de police que dans AppNavigator (system-ui sur le web)
const font = (name) => (Platform.OS === 'web' ? 'system-ui' : name);

// Valeurs de repli si une couleur du thème est absente
const FALLBACK_THEME = {
  bg: '#0d1120',
  surface: '#1a1f2e',
  text: '#ffffff',
  muted: '#8b93a7',
  gold: '#c9a84c',
  border: 'rgba(255,255,255,0.08)',
  isDark: true,
};

// Ajoute une transparence hexadécimale seulement si la couleur est du type #RRGGBB
// (évite les couleurs invalides comme "rgba(...)14")
const withAlpha = (color, alpha) =>
  typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color + alpha : color;

// Pourcentage sécurisé (jamais NaN, jamais > 100)
const getPct = (last, total) => {
  const l = Number(last) || 0;
  const t = Number(total) || 0;
  if (!l || !t) return 0;
  return Math.min(100, Math.round((l / t) * 100));
};

// Juz → first Surah+Ayah mapping (standard)
const JUZ_STARTS = [
  { juz: 1,  surahId: 1,  ayah: 1,  name: 'Al-Fatiha' },
  { juz: 2,  surahId: 2,  ayah: 142, name: 'Al-Baqarah' },
  { juz: 3,  surahId: 2,  ayah: 253, name: 'Al-Baqarah' },
  { juz: 4,  surahId: 3,  ayah: 93,  name: 'Al-Imran' },
  { juz: 5,  surahId: 4,  ayah: 24,  name: 'An-Nisa' },
  { juz: 6,  surahId: 4,  ayah: 148, name: 'An-Nisa' },
  { juz: 7,  surahId: 5,  ayah: 82,  name: 'Al-Maida' },
  { juz: 8,  surahId: 6,  ayah: 111, name: 'Al-Anam' },
  { juz: 9,  surahId: 7,  ayah: 88,  name: 'Al-Araf' },
  { juz: 10, surahId: 8,  ayah: 41,  name: 'Al-Anfal' },
  { juz: 11, surahId: 9,  ayah: 93,  name: 'At-Tawbah' },
  { juz: 12, surahId: 11, ayah: 6,   name: 'Hud' },
  { juz: 13, surahId: 12, ayah: 53,  name: 'Yusuf' },
  { juz: 14, surahId: 15, ayah: 1,   name: 'Al-Hijr' },
  { juz: 15, surahId: 17, ayah: 1,   name: 'Al-Isra' },
  { juz: 16, surahId: 18, ayah: 75,  name: 'Al-Kahf' },
  { juz: 17, surahId: 21, ayah: 1,   name: 'Al-Anbiya' },
  { juz: 18, surahId: 23, ayah: 1,   name: 'Al-Muminun' },
  { juz: 19, surahId: 25, ayah: 21,  name: 'Al-Furqan' },
  { juz: 20, surahId: 27, ayah: 56,  name: 'An-Naml' },
  { juz: 21, surahId: 29, ayah: 46,  name: 'Al-Ankabut' },
  { juz: 22, surahId: 33, ayah: 31,  name: 'Al-Ahzab' },
  { juz: 23, surahId: 36, ayah: 28,  name: 'Ya-Sin' },
  { juz: 24, surahId: 39, ayah: 32,  name: 'Az-Zumar' },
  { juz: 25, surahId: 41, ayah: 47,  name: 'Fussilat' },
  { juz: 26, surahId: 46, ayah: 1,   name: 'Al-Ahqaf' },
  { juz: 27, surahId: 51, ayah: 31,  name: 'Adh-Dhariyat' },
  { juz: 28, surahId: 58, ayah: 1,   name: 'Al-Mujadila' },
  { juz: 29, surahId: 67, ayah: 1,   name: 'Al-Mulk' },
  { juz: 30, surahId: 78, ayah: 1,   name: 'An-Naba' },
];

// ── Continue Reading Card ─────────────────────────────────────────────────────
function ContinueReadingCard({ lastRead, progress, onPress, T }) {
  if (!lastRead) return null;
  const p = progress?.[lastRead.surahId];
  const ayah = p?.lastAyah || lastRead.ayah || 1;
  const total = lastRead.totalVerses || 1;
  const pct = getPct(ayah, total);

  return (
    <TouchableOpacity
      style={[styles.continueCard, { backgroundColor: withAlpha(T.gold, '14'), borderColor: withAlpha(T.gold, '40') }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.continueLeft}>
        <Text style={[styles.continueLabel, { color: T.gold }]}>CONTINUE READING</Text>
        <Text style={[styles.continueName, { color: T.text }]}>{lastRead.surahName}</Text>
        <Text style={[styles.continueNameAr, { color: T.gold }]}>{lastRead.surahNameArabic}</Text>
        <Text style={[styles.continueAyah, { color: T.muted }]}>Ayah {ayah} of {total}</Text>
      </View>
      <View style={styles.continueRight}>
        <View style={[styles.continueRing, { borderColor: T.gold }]}>
          <Text style={[styles.continueRingPct, { color: T.gold }]}>{pct}%</Text>
        </View>
        <Ionicons name="arrow-forward-circle" size={22} color={T.gold} style={{ marginTop: 6 }} />
      </View>
    </TouchableOpacity>
  );
}

// ── Bookmark Strip ─────────────────────────────────────────────────────────────
function BookmarkStrip({ bookmarks, chaptersById, onPress, T }) {
  if (!Array.isArray(bookmarks) || bookmarks.length === 0) return null;
  // Deduplicate by surah
  const seen = new Set();
  const unique = bookmarks
    .filter(b => {
      if (!b || seen.has(b.surah)) return false;
      seen.add(b.surah);
      return true;
    })
    .slice(0, 5);

  if (unique.length === 0) return null;

  return (
    <View style={styles.bookmarkSection}>
      <Text style={[styles.sectionLabel, { color: T.muted }]}>BOOKMARKS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {unique.map((bm, i) => {
          const ch = chaptersById.get(Number(bm.surah));
          return (
            <TouchableOpacity
              key={`${bm.surah}-${bm.ayah}-${i}`}
              style={[styles.bookmarkChip, { backgroundColor: T.surface, borderColor: T.border }]}
              onPress={() => onPress(bm.surah, ch)}
              activeOpacity={0.8}
            >
              <Ionicons name="bookmark" size={12} color={T.gold} />
              <Text style={[styles.bookmarkChipText, { color: T.text }]}>
                {ch?.nameSimple || `Surah ${bm.surah}`}
              </Text>
              <Text style={[styles.bookmarkChipAyah, { color: T.muted }]}>:{bm.ayah}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function QuranScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('surahs');
  const themeCtx = useTheme();
  const T = useMemo(() => ({ ...FALLBACK_THEME, ...(themeCtx?.theme || {}) }), [themeCtx?.theme]);
  const insets = useSafeAreaInsets();

  const {
    chapters: rawChapters, fetchChapters, isLoading,
    lastRead, progress: rawProgress, bookmarks,
  } = useQuranStore();

  // Protections contre les valeurs absentes
  const chapters = useMemo(() => (Array.isArray(rawChapters) ? rawChapters : []), [rawChapters]);
  const progress = rawProgress || {};

  const chaptersById = useMemo(() => {
    const map = new Map();
    chapters.forEach(c => { if (c && c.id != null) map.set(Number(c.id), c); });
    return map;
  }, [chapters]);

  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching,   setIsSearching]   = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);

  const isMounted = useRef(true);
  const debounceRef = useRef(null);
  const requestId = useRef(0);

  const isSearchMode = searchQuery.trim().length > 1;

  const loadChapters = useCallback(async () => {
    try {
      await fetchChapters?.('en');
    } catch (e) {
      console.warn('Chapters error:', e?.message);
    }
  }, [fetchChapters]);

  useEffect(() => {
    isMounted.current = true;
    loadChapters();
    return () => {
      isMounted.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Recherche avec délai (évite un appel réseau à chaque lettre)
  // et ignore les réponses plus anciennes que la dernière recherche
  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = text.trim();
    if (q.length <= 1) {
      requestId.current += 1;
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const id = ++requestId.current;
      try {
        const res = await searchQuran(q);
        if (!isMounted.current || id !== requestId.current) return;
        setSearchResults(Array.isArray(res) ? res : (res?.results || []));
      } catch (e) {
        console.warn('Search error:', e?.message);
        if (isMounted.current && id === requestId.current) setSearchResults([]);
      } finally {
        if (isMounted.current && id === requestId.current) setIsSearching(false);
      }
    }, 350);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChapters();
    if (isMounted.current) setRefreshing(false);
  }, [loadChapters]);

  const navigateToSurah = useCallback((surahId, chapter, ayah) => {
    navigation.navigate('Surah', {
      surahId,
      surahName: chapter?.nameSimple || chapter?.name || `Surah ${surahId}`,
      surahNameArabic: chapter?.nameArabic,
      surahNameTransliteration: chapter?.nameTransliteration,
      scrollToAyah: ayah,
    });
  }, [navigation]);

  const renderSurahItem = useCallback(({ item }) => {
    if (!item) return null;
    const place = item.revelation_place || item.revelationPlace;
    const isRevealedMakkah = place === 'makkah';
    const revColor = isRevealedMakkah ? '#f59e0b' : '#10b981';
    const p = progress[item.id];
    const pct = p ? getPct(p.lastAyah, item.versesCount) : 0;

    return (
      <TouchableOpacity
        style={[styles.surahCard, { backgroundColor: T.surface, borderColor: T.border }]}
        onPress={() => navigateToSurah(item.id, item)}
        activeOpacity={0.72}
      >
        <View style={[styles.surahNumber, { backgroundColor: withAlpha(T.gold, '18') }]}>
          <Text style={[styles.surahNumberText, { color: T.gold }]}>{item.id}</Text>
        </View>

        <View style={styles.surahInfo}>
          <Text style={[styles.surahNameArabic, { color: T.text }]}>{item.nameArabic || item.name}</Text>
          <Text style={[styles.surahNameEn, { color: T.muted }]}>{item.nameSimple || item.nameTransliteration}</Text>
          <View style={styles.surahMeta}>
            <Text style={[styles.revBadge, { backgroundColor: revColor + '20', color: revColor }]}>
              {isRevealedMakkah ? 'مكية' : 'مدنية'}
            </Text>
            <Text style={[styles.versesCount, { color: T.muted }]}>{item.versesCount} verses</Text>
          </View>
        </View>

        <View style={styles.surahRight}>
          <Text style={[styles.translatedName, { color: T.muted }]}>{item.translatedName || ''}</Text>
          {pct > 0 && pct < 100 && (
            <View style={[styles.progressPill, { backgroundColor: withAlpha(T.gold, '20') }]}>
              <Text style={[styles.progressPillText, { color: T.gold }]}>{pct}%</Text>
            </View>
          )}
          {pct === 100 && <Ionicons name="checkmark-circle" size={16} color="#10b981" />}
        </View>
      </TouchableOpacity>
    );
  }, [T, progress, navigateToSurah]);

  const renderSearchResult = useCallback(({ item }) => {
    if (!item) return null;
    return (
      <TouchableOpacity
        style={[styles.searchResultCard, { backgroundColor: T.surface, borderColor: T.border }]}
        onPress={() => navigateToSurah(item.surah_id, chaptersById.get(Number(item.surah_id)))}
        activeOpacity={0.8}
      >
        <Text style={[styles.searchRef, { color: T.gold }]}>Surah {item.surah_id}:{item.verse_number}</Text>
        <Text style={[styles.searchArabic, { color: T.text }]} numberOfLines={2}>{item.text_uthmani}</Text>
        {item.translations?.[0]?.text ? (
          <Text style={[styles.searchTranslation, { color: T.muted }]} numberOfLines={2}>
            {item.translations[0].text}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  }, [T, chaptersById, navigateToSurah]);

  const keyExtractor = useCallback((item, i) => {
    if (item?.id != null) return String(item.id);
    if (item?.surah_id != null) return `${item.surah_id}:${item.verse_number}:${i}`;
    return String(i);
  }, []);

  // ⚠️ Appelée comme une fonction (et non passée comme composant) :
  // sinon le champ de recherche se recrée à chaque lettre et le clavier se ferme.
  const renderHeader = () => (
    <>
      {/* Title */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: T.text }]}>Al-Quran</Text>
          <Text style={[styles.headerSubtitle, { color: T.gold }]}>القرآن الكريم</Text>
        </View>
        <Text style={[styles.headerCount, { color: T.muted }]}>114 Surahs</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: T.surface, borderColor: T.border }]}>
        <Ionicons name="search" size={18} color={T.muted} />
        <TextInput
          style={[styles.searchInput, { color: T.text }]}
          placeholder="Search Quran…"
          placeholderTextColor={T.muted}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {isSearching && <ActivityIndicator size="small" color={T.gold} />}
        {searchQuery.length > 0 && !isSearching && (
          <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={T.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Continue Reading */}
      {!searchQuery && (
        <View style={styles.continueSection}>
          <ContinueReadingCard
            lastRead={lastRead}
            progress={progress}
            T={T}
            onPress={() => {
              if (!lastRead) return;
              const ch = chaptersById.get(Number(lastRead.surahId));
              const ayah = progress[lastRead.surahId]?.lastAyah || 1;
              navigateToSurah(
                lastRead.surahId,
                ch || { nameSimple: lastRead.surahName, nameArabic: lastRead.surahNameArabic },
                ayah
              );
            }}
          />
        </View>
      )}

      {/* Bookmarks */}
      {!searchQuery && (
        <BookmarkStrip
          bookmarks={bookmarks}
          chaptersById={chaptersById}
          T={T}
          onPress={(surahId, ch) => navigateToSurah(surahId, ch)}
        />
      )}

      {/* Juz Navigation */}
      {!searchQuery && (
        <View style={styles.juzSection}>
          <Text style={[styles.sectionLabel, { color: T.muted }]}>JUMP TO JUZ</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.juzRow}
            keyboardShouldPersistTaps="handled"
          >
            {JUZ_STARTS.map(juz => (
              <TouchableOpacity
                key={juz.juz}
                style={[styles.juzChip, { backgroundColor: T.surface, borderColor: T.border }]}
                onPress={() => navigateToSurah(juz.surahId, chaptersById.get(juz.surahId), juz.ayah)}
                activeOpacity={0.75}
              >
                <Text style={[styles.juzNum, { color: T.gold }]}>{juz.juz}</Text>
                <Text style={[styles.juzName, { color: T.muted }]}>{juz.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* List label */}
      {!searchQuery && (
        <Text style={[styles.sectionLabel, { color: T.muted, paddingHorizontal: 20, marginBottom: 8 }]}>ALL SURAHS</Text>
      )}
    </>
  );

  if (isLoading && chapters.length === 0) {
    return (
      <View style={[styles.loader, { backgroundColor: T.bg }]}>
        <ActivityIndicator size="large" color={T.gold} />
        <Text style={[styles.loaderText, { color: T.muted }]}>Loading Quran…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      {/* Tab bar — always visible at top (avec la zone sûre pour l'encoche) */}
      <View
        style={[
          styles.quranTabRow,
          { backgroundColor: T.surface, borderBottomColor: T.border, paddingTop: insets.top },
        ]}
      >
        {QURAN_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.quranTabBtn, activeTab === tab.key && { borderBottomColor: T.gold, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Text style={[styles.quranTabText, { color: activeTab === tab.key ? T.gold : T.muted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Khatam tab */}
      {activeTab === 'khatam' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <JuzTracker />
        </ScrollView>
      )}

      {/* 99 Names tab */}
      {activeTab === 'names' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, paddingBottom: 32 }}>
          <NamesOfAllah />
        </ScrollView>
      )}

      {/* Surahs tab */}
      {activeTab === 'surahs' && (
        <FlatList
          data={isSearchMode ? searchResults : chapters}
          keyExtractor={keyExtractor}
          renderItem={isSearchMode ? renderSearchResult : renderSurahItem}
          ListHeaderComponent={renderHeader()}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40 }}>📖</Text>
              <Text style={[styles.emptyTitle, { color: T.text }]}>
                {isSearching ? 'Searching…' : searchQuery ? 'No results found' : 'Welcome to the Quran'}
              </Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.gold} colors={[T.gold]} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
          initialNumToRender={20}
          windowSize={10}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  loader:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText:  { fontSize: 14 },
  listContent: { paddingBottom: 32 },

  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  headerTitle:    { fontSize: 30, fontWeight: '800' },
  headerSubtitle: { fontSize: 18, marginTop: 2 },
  headerCount:    { fontSize: 13, fontWeight: '600', paddingBottom: 6 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  searchInput:     { flex: 1, fontSize: 15, paddingVertical: 2 },

  continueSection: { paddingHorizontal: 16, marginBottom: 10 },
  continueCard:    { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  continueLeft:    { flex: 1 },
  continueLabel:   { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  continueName:    { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  continueNameAr:  { fontSize: 16, marginBottom: 4 },
  continueAyah:    { fontSize: 12 },
  continueRight:   { alignItems: 'center' },
  continueRing:    { width: 54, height: 54, borderRadius: 27, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  continueRingPct: { fontSize: 14, fontWeight: '800' },

  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },

  bookmarkSection: { paddingHorizontal: 16, marginBottom: 12 },
  bookmarkChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  bookmarkChipText: { fontSize: 12, fontWeight: '600' },
  bookmarkChipAyah: { fontSize: 11 },

  juzSection: { paddingHorizontal: 16, marginBottom: 16 },
  juzRow:     { paddingRight: 8, gap: 8 },
  juzChip:    { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, minWidth: 64 },
  juzNum:     { fontSize: 16, fontWeight: '800' },
  juzName:    { fontSize: 9, marginTop: 1 },

  surahCard:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 16, borderWidth: 1 },
  surahNumber:     { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  surahNumberText: { fontSize: 14, fontWeight: '800' },
  surahInfo:       { flex: 2 },
  surahNameArabic: { fontSize: 17 },
  surahNameEn:     { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  surahMeta:       { flexDirection: 'row', alignItems: 'center', gap: 7 },
  revBadge:        { fontSize: 10, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  versesCount:     { fontSize: 10 },
  surahRight:      { flex: 1, alignItems: 'flex-end', gap: 6 },
  translatedName:  { fontSize: 11, textAlign: 'right' },
  progressPill:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  progressPillText: { fontSize: 10, fontWeight: '700' },

  searchResultCard:  { marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 16, borderWidth: 1, gap: 5 },
  searchRef:         { fontSize: 11, fontWeight: '700' },
  searchArabic:      { fontSize: 16, lineHeight: 26 },
  searchTranslation: { fontSize: 13, lineHeight: 19 },

  empty:      { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },

  // Quran tabs
  quranTabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  quranTabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 4,
  },
  quranTabText: {
    fontSize: 14,
    fontFamily: font('PlusJakartaSans-SemiBold'),
  },
});
