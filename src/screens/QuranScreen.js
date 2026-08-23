// src/screens/QuranScreen.js — PREMIUM + Khatam Tracker + 99 Names tab
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuranStore, useAuthStore } from '../store';
import { searchQuran } from '../services/quran';
import { useTheme } from '../contexts/ThemeContext';
import JuzTracker from '../components/JuzTracker';
import NamesOfAllah from '../components/NamesOfAllah';

const QURAN_TABS = [
  { key: 'surahs', label: 'Surahs' },
  { key: 'khatam', label: 'Khatam' },
  { key: 'names',  label: '99 Names' },
];

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
  const p = progress[lastRead.surahId];
  const ayah = p?.lastAyah || lastRead.ayah || 1;
  const total = lastRead.totalVerses || 1;
  const pct = Math.round((ayah / total) * 100);

  return (
    <TouchableOpacity
      style={[styles.continueCard, { backgroundColor: T.gold + '14', borderColor: T.gold + '40' }]}
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
function BookmarkStrip({ bookmarks, chapters, onPress, T }) {
  if (!bookmarks?.length) return null;
  // Deduplicate by surah
  const seen = new Set();
  const unique = bookmarks.filter(b => {
    if (seen.has(b.surah)) return false;
    seen.add(b.surah);
    return true;
  }).slice(0, 5);

  return (
    <View style={styles.bookmarkSection}>
      <Text style={[styles.sectionLabel, { color: T.muted }]}>BOOKMARKS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {unique.map((bm, i) => {
          const ch = chapters.find(c => c.id === bm.surah);
          return (
            <TouchableOpacity
              key={i}
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
  const { theme: T } = useTheme();
  const { chapters, fetchChapters, isLoading, lastRead, progress, bookmarks } = useQuranStore();
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching,   setIsSearching]   = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);

  useEffect(() => { fetchChapters('en'); }, []);

  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.length > 1) {
      setIsSearching(true);
      const results = await searchQuran(text);
      setSearchResults(results.results || []);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChapters('en');
    setRefreshing(false);
  };

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
    const isRevealedMakkah = item.revelation_place === 'makkah';
    const revColor = isRevealedMakkah ? '#f59e0b' : '#10b981';
    const p = progress[item.id];
    const pct = p ? Math.round((p.lastAyah / item.versesCount) * 100) : 0;

    return (
      <TouchableOpacity
        style={[styles.surahCard, { backgroundColor: T.surface, borderColor: T.border }]}
        onPress={() => navigateToSurah(item.id, item)}
        activeOpacity={0.72}
      >
        <View style={[styles.surahNumber, { backgroundColor: T.gold + '18' }]}>
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
            <View style={[styles.progressPill, { backgroundColor: T.gold + '20' }]}>
              <Text style={[styles.progressPillText, { color: T.gold }]}>{pct}%</Text>
            </View>
          )}
          {pct === 100 && <Ionicons name="checkmark-circle" size={16} color="#10b981" />}
        </View>
      </TouchableOpacity>
    );
  }, [T, progress, navigateToSurah]);

  const renderSearchResult = useCallback(({ item }) => (
    <TouchableOpacity
      style={[styles.searchResultCard, { backgroundColor: T.surface, borderColor: T.border }]}
      onPress={() => {
        const ch = chapters.find(c => c.id === item.surah_id);
        navigateToSurah(item.surah_id, ch);
      }}
      activeOpacity={0.8}
    >
      <Text style={[styles.searchRef, { color: T.gold }]}>Surah {item.surah_id}:{item.verse_number}</Text>
      <Text style={[styles.searchArabic, { color: T.text }]} numberOfLines={2}>{item.text_uthmani}</Text>
      {item.translations?.[0] && (
        <Text style={[styles.searchTranslation, { color: T.muted }]} numberOfLines={2}>
          {item.translations[0].text}
        </Text>
      )}
    </TouchableOpacity>
  ), [T, chapters, navigateToSurah]);

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
        />
        {isSearching && <ActivityIndicator size="small" color={T.gold} />}
        {searchQuery.length > 0 && !isSearching && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
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
              const ch = chapters.find(c => c.id === lastRead.surahId);
              const ayah = progress[lastRead.surahId]?.lastAyah || 1;
              navigateToSurah(lastRead.surahId, ch || { nameSimple: lastRead.surahName, nameArabic: lastRead.surahNameArabic }, ayah);
            }}
          />
        </View>
      )}

      {/* Bookmarks */}
      {!searchQuery && (
        <BookmarkStrip
          bookmarks={bookmarks}
          chapters={chapters}
          T={T}
          onPress={(surahId, ch) => navigateToSurah(surahId, ch)}
        />
      )}

      {/* Juz Navigation */}
      {!searchQuery && (
        <View style={styles.juzSection}>
          <Text style={[styles.sectionLabel, { color: T.muted }]}>JUMP TO JUZ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.juzRow}>
            {JUZ_STARTS.map(juz => (
              <TouchableOpacity
                key={juz.juz}
                style={[styles.juzChip, { backgroundColor: T.surface, borderColor: T.border }]}
                onPress={() => {
                  const ch = chapters.find(c => c.id === juz.surahId);
                  navigateToSurah(juz.surahId, ch, juz.ayah);
                }}
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
      {/* Tab bar — always visible at top */}
      <View style={[styles.quranTabRow, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        {QURAN_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.quranTabBtn, activeTab === tab.key && { borderBottomColor: T.gold, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
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
        data={searchQuery.length > 1 ? searchResults : chapters}
        keyExtractor={(item, i) => item.id?.toString() || i.toString()}
        renderItem={searchQuery.length > 1 ? renderSearchResult : renderSurahItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>📖</Text>
            <Text style={[styles.emptyTitle, { color: T.text }]}>
              {searchQuery ? 'No results found' : 'Welcome to the Quran'}
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.gold} />}
        showsVerticalScrollIndicator={false}
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
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
});
