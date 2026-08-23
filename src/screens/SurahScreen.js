// src/screens/SurahScreen.js - COMPLETELY FIXED for web compatibility
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal, FlatList, RefreshControl,
  Animated, Platform, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuranStore, useAuthStore } from '../store';
import { getTafsir, getQuranAudioUrl } from '../services/quran';
import { tokenizeForTajweed, TAJWEED_LEGEND } from '../services/tajweed';
import { useTheme } from '../contexts/ThemeContext';

// ── Safe Audio import: only load expo-av on native to avoid shadowing window.Audio ──
let ExpoAudio = null;
if (Platform.OS !== 'web') {
  try {
    ExpoAudio = require('expo-av').Audio;
  } catch (_) {}
}

// ── Tajweed Arabic Text ────────────────────────────────────────────────────────
function TajweedText({ arabic, fontSize, tajweedOn, theme }) {
  if (!arabic) return null;
  if (!tajweedOn) {
    return <Text style={[styles.arabicText, { fontSize, color: theme.text }]}>{arabic}</Text>;
  }
  const tokens = tokenizeForTajweed(arabic);
  return (
    <Text style={[styles.arabicText, { fontSize }]}>
      {tokens.map((tok, i) =>
        tok.color
          ? <Text key={i} style={{ color: tok.color }}>{tok.text}</Text>
          : <Text key={i} style={{ color: theme.text }}>{tok.text}</Text>
      )}
    </Text>
  );
}

// ── Tajweed Legend ─────────────────────────────────────────────────────────────
function TajweedLegend({ visible, onClose, theme }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.legendPanel, { backgroundColor: theme.surface }]}>
          <Text style={[styles.legendTitle, { color: theme.text }]}>🎨 Tajweed Guide</Text>
          {TAJWEED_LEGEND.map((item, i) => (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.legendName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.legendDesc, { color: theme.muted }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={[styles.legendClose, { backgroundColor: theme.gold }]} onPress={onClose}>
            <Text style={[styles.legendCloseTxt, { color: theme.bg }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Tafsir Modal - FIXED for web ───────────────────────────────────────────────
function TafsirModal({ tafsir, verseKey, loading, onClose, theme }) {
  // Only show modal if we have a verseKey OR loading
  const isVisible = !!verseKey || loading;
  
  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.tafsirPanel, { backgroundColor: theme.surface }]}>
          <Text style={[styles.tafsirTitle, { color: theme.text }]}>
            📖 Tafsir {verseKey ? `— ${verseKey}` : ''}
          </Text>
          {loading
            ? <ActivityIndicator color={theme.gold} style={{ marginVertical: 24 }} />
            : <Text style={[styles.tafsirText, { color: theme.muted }]}>{tafsir || 'No tafsir available.'}</Text>}
          <TouchableOpacity
            style={[styles.tafsirCloseBtn, { borderColor: theme.gold + '55' }]}
            onPress={onClose}
          >
            <Text style={[styles.tafsirCloseTxt, { color: theme.gold }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────────────
function Toolbar({ tajweedOn, setTajweedOn, showTranslation, setShowTranslation,
  fontSize, setFontSize, onLegend, theme, isPlaying, onStopAll }) {
  return (
    <View style={[styles.toolbar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={[styles.toolBtn, { borderColor: theme.border }]}
        onPress={() => setFontSize(s => Math.max(18, s - 2))}
      >
        <Text style={[styles.toolBtnTxt, { color: theme.muted }]}>A−</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toolBtn, { borderColor: theme.border }]}
        onPress={() => setFontSize(s => Math.min(38, s + 2))}
      >
        <Text style={[styles.toolBtnTxt, { color: theme.muted }]}>A+</Text>
      </TouchableOpacity>

      <View style={[styles.toolDivider, { backgroundColor: theme.border }]} />

      <TouchableOpacity
        style={[styles.toolBtn, showTranslation && styles.toolBtnActive, { borderColor: theme.border }]}
        onPress={() => setShowTranslation(v => !v)}
      >
        <Text style={[styles.toolBtnTxt, { color: showTranslation ? theme.gold : theme.muted }]}>EN</Text>
      </TouchableOpacity>

      <View style={[styles.toolDivider, { backgroundColor: theme.border }]} />

      <TouchableOpacity
        style={[styles.toolBtn, tajweedOn && styles.toolBtnActive, { borderColor: theme.border }]}
        onPress={() => setTajweedOn(v => !v)}
      >
        <Text style={[styles.toolBtnTxt, { color: tajweedOn ? theme.gold : theme.muted }]}>Tajweed</Text>
      </TouchableOpacity>

      {tajweedOn && (
        <TouchableOpacity style={[styles.toolBtn, { borderColor: theme.border }]} onPress={onLegend}>
          <Ionicons name="color-palette-outline" size={17} color={theme.gold} />
        </TouchableOpacity>
      )}

      {isPlaying && (
        <>
          <View style={[styles.toolDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            style={[styles.toolBtn, { borderColor: theme.border }]}
            onPress={onStopAll}
          >
            <Ionicons name="stop-circle" size={17} color="#ef4444" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function SurahScreen({ route, navigation }) {
  const {
    surahId, surahName, surahNameArabic, surahNameTransliteration,
    scrollToAyah,
  } = route.params;

  const { theme } = useTheme();
  const {
    loadSurah, verses, currentAyah, setCurrentAyah,
    addBookmark, bookmarks,
    setLastRead,
  } = useQuranStore();
  const { userId } = useAuthStore();

  const [tajweedOn, setTajweedOn] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [fontSize, setFontSize] = useState(24);
  const [playingVerse, setPlayingVerse] = useState(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [selectedTafsir, setSelectedTafsir] = useState(null);
  const [tafsirVerseKey, setTafsirVerseKey] = useState(null);
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const flatListRef = useRef();
  const soundRef = useRef(null);
  const autoPlayRef = useRef(autoPlay);
  const webAudioRef = useRef(null);
  const verseTimerRef = useRef(null);

  // Sync autoPlay ref
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  // ── Load surah ───────────────────────────────────────────────────────────────
  const loadSurahData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loadSurah(surahId);
    } catch (err) {
      setError('Failed to load surah. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [surahId, loadSurah]);

  // Initialize audio mode (only for native)
  useEffect(() => {
    const initAudio = async () => {
      if (Platform.OS !== 'web' && ExpoAudio) {
        try {
          await ExpoAudio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
        } catch (err) {
          console.warn('Audio init error:', err);
        }
      }
    };
    initAudio();
    
    return () => {
      if (verseTimerRef.current) {
        clearTimeout(verseTimerRef.current);
      }
      // Clean up native audio
      if (soundRef.current && Platform.OS !== 'web') {
        soundRef.current.unloadAsync().catch(() => {});
      }
      // Clean up web audio
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: surahNameTransliteration || surahName || `Surah ${surahId}` });
    loadSurahData();
  }, [surahId]);

  // Update lastRead
  useEffect(() => {
    if (!verses?.length) return;
    setLastRead({
      surahId,
      surahName: surahNameTransliteration || surahName,
      surahNameArabic: surahNameArabic || '',
      ayah: currentAyah,
      totalVerses: verses.length,
    });
  }, [currentAyah, surahId, verses?.length, setLastRead]);

  // Scroll to resume position
  useEffect(() => {
    if (!verses?.length) return;
    const target = scrollToAyah ?? currentAyah ?? 1;
    const idx = Math.min(Math.max(0, target - 1), verses.length - 1);
    if (idx > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.1 });
      }, 300);
    }
  }, [verses?.length, scrollToAyah, currentAyah]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSurahData();
    setRefreshing(false);
  }, [loadSurahData]);

  // Stop audio (works on both web and native)
  const stopAudio = useCallback(async () => {
    if (verseTimerRef.current) {
      clearTimeout(verseTimerRef.current);
      verseTimerRef.current = null;
    }
    
    if (Platform.OS === 'web') {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current.currentTime = 0;
        webAudioRef.current = null;
      }
    } else {
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (err) {
          console.warn('Stop audio error:', err);
        }
        soundRef.current = null;
      }
    }
    
    setPlayingVerse(null);
  }, []);

  // ── FIXED playVerse for web compatibility ─────────────────────────────────────
  const playVerse = useCallback(async (verseKey, verseIndex) => {
    // Toggle off if same verse is playing
    if (playingVerse === verseKey) {
      autoPlayRef.current = false;
      setAutoPlay(false);
      await stopAudio();
      return;
    }
    
    await stopAudio();

    try {
      const parts = verseKey.split(':');
      if (parts.length !== 2) {
        console.error('Invalid verseKey format:', verseKey);
        if (Platform.OS === 'web') {
          alert('Invalid verse format');
        } else {
          Alert.alert('Error', 'Invalid verse format');
        }
        return;
      }
      
      // Get audio URL using our fixed function
      let audioUrl = await getQuranAudioUrl(verseKey);
      
      if (!audioUrl) {
        const fallbackMsg = `Unable to load audio for ${verseKey}.\n\nListen at: https://quran.com/${parts[0]}`;
        if (Platform.OS === 'web') {
          if (confirm(`${fallbackMsg}\n\nOpen in browser?`)) {
            window.open(`https://quran.com/${parts[0]}`, '_blank');
          }
        } else {
          Alert.alert(
            'Audio Unavailable',
            fallbackMsg,
            [
              { text: 'Open in Browser', onPress: () => Linking.openURL(`https://quran.com/${parts[0]}`) },
              { text: 'OK' }
            ]
          );
        }
        return;
      }
      
      console.log('🎵 Playing audio:', audioUrl);
      setPlayingVerse(verseKey);
      
      // Web platform - use HTML5 Audio via window.Audio
      if (Platform.OS === 'web') {
        const WebAudio = window.Audio;
        const webAudio = new WebAudio(audioUrl);
        webAudioRef.current = webAudio;
        
        webAudio.onended = () => {
          setPlayingVerse(null);
          if (autoPlayRef.current && verses && verseIndex < verses.length - 1) {
            const next = verses[verseIndex + 1];
            if (next) {
              setCurrentAyah(next.verseNumber);
              setTimeout(() => playVerse(next.verseKey, verseIndex + 1), 500);
            }
          }
          webAudioRef.current = null;
        };
        
        webAudio.onerror = (e) => {
          console.error('Web audio error:', e);
          setPlayingVerse(null);
          if (Platform.OS === 'web') {
            alert('Audio playback failed. Try opening in browser.');
          }
          webAudioRef.current = null;
        };
        
        await webAudio.play().catch(err => {
          console.error('Play failed:', err);
          setPlayingVerse(null);
          if (Platform.OS === 'web') {
            alert('Click to allow audio playback');
          }
        });
        
      } else {
        // Native platform - use Expo AV
        if (!ExpoAudio) throw new Error('Audio not available');
        await ExpoAudio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        
        const { sound } = await ExpoAudio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true }
        );
        
        soundRef.current = sound;
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setPlayingVerse(null);
            if (autoPlayRef.current && verses && verseIndex < verses.length - 1) {
              const next = verses[verseIndex + 1];
              if (next) {
                setCurrentAyah(next.verseNumber);
                setTimeout(() => playVerse(next.verseKey, verseIndex + 1), 500);
              }
            }
          }
        });
      }
      
    } catch (err) {
      console.error('Audio error:', err);
      if (Platform.OS === 'web') {
        alert('Could not play audio. Please try again.');
      } else {
        Alert.alert('Playback Error', 'Could not play audio. Please try again.');
      }
      setPlayingVerse(null);
    }
  }, [playingVerse, verses, stopAudio, setCurrentAyah]);

  // Toggle auto play
  const toggleAutoPlay = useCallback(() => {
    setAutoPlay(prev => !prev);
  }, []);

  // Bookmark helpers
  const isBookmarked = useCallback((verse) => {
    return bookmarks?.some(b => b.surah === surahId && b.ayah === verse.verseNumber);
  }, [bookmarks, surahId]);

  const toggleBookmark = useCallback(async (verse) => {
    try {
      await addBookmark(userId(), {
        surahId,
        ayahId: verse.verseNumber,
        note: verse.textArabic?.slice(0, 60),
      });
    } catch (err) {
      console.warn('Bookmark error:', err);
    }
  }, [surahId, userId, addBookmark]);

  // ── FIXED showTafsirFor - don't pre-set loading string ───────────────────────
  const showTafsirFor = useCallback(async (verseKey) => {
    setTafsirLoading(true);
    setTafsirVerseKey(verseKey);
    setSelectedTafsir(null); // Don't set to 'Loading tafsir...'
    try {
      const tafsirText = await getTafsir(verseKey);
      setSelectedTafsir(tafsirText);
    } catch (error) {
      console.error('Tafsir error:', error);
      setSelectedTafsir('Unable to load tafsir. Please try again.');
    } finally {
      setTafsirLoading(false);
    }
  }, []);

  const onScrollToIndexFailed = useCallback((info) => {
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.1 });
    }, 500);
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    const first = viewableItems[0]?.item;
    if (first?.verseNumber) setCurrentAyah(first.verseNumber);
  }, [setCurrentAyah]);

  // Render verse
  const renderVerse = useCallback(({ item: verse, index }) => {
    const isActive = currentAyah === verse.verseNumber;
    const isPlayingVerse = playingVerse === verse.verseKey;
    const bookmarked = isBookmarked(verse);
    const arabicText = verse.textArabic || verse.textUthmani || '';

    return (
      <TouchableOpacity
        key={verse.verseKey || verse.id}
        style={[
          styles.verseCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
          isActive && { borderColor: theme.gold + '80', backgroundColor: theme.gold + '07' },
          isPlayingVerse && { borderColor: '#60a5fa60', backgroundColor: '#60a5fa07' },
        ]}
        onPress={() => { setCurrentAyah(verse.verseNumber); }}
        activeOpacity={0.75}
      >
        <View style={styles.verseHeader}>
          <View style={[styles.verseBadge, { backgroundColor: theme.gold + '20' }]}>
            <Text style={[styles.verseBadgeText, { color: theme.gold }]}>{verse.verseNumber}</Text>
          </View>
          <View style={styles.verseActions}>
            <TouchableOpacity onPress={() => playVerse(verse.verseKey, index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={isPlayingVerse ? 'pause-circle' : 'play-circle'} size={30} color={isPlayingVerse ? '#60a5fa' : theme.gold} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleBookmark(verse)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={24} color={bookmarked ? theme.gold : theme.muted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => showTafsirFor(verse.verseKey)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="information-circle-outline" size={24} color={theme.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {arabicText ? (
          <TajweedText arabic={arabicText} fontSize={fontSize} tajweedOn={tajweedOn} theme={theme} />
        ) : (
          <Text style={[styles.arabicText, { fontSize, color: theme.muted, fontStyle: 'italic' }]}>Loading…</Text>
        )}

        {showTranslation && verse.translation ? (
          <Text style={[styles.translationText, { color: theme.muted }]}>
            {verse.translation}
          </Text>
        ) : showTranslation && !verse.translation ? (
          <Text style={[styles.translationText, { color: theme.border, fontStyle: 'italic' }]}>
            Translation unavailable
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  }, [currentAyah, playingVerse, fontSize, tajweedOn, showTranslation, theme, playVerse, toggleBookmark, isBookmarked, showTafsirFor, setCurrentAyah]);

  const getItemLayout = useCallback((_, index) => ({
    length: 220,
    offset: 220 * index,
    index,
  }), []);

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.gold} />
        <Text style={[styles.centerText, { color: theme.muted }]}>Loading Surah…</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>⚠️</Text>
        <Text style={[styles.centerText, { color: theme.text, fontSize: 16, marginBottom: 8 }]}>Failed to Load</Text>
        <Text style={[styles.centerText, { color: theme.muted, textAlign: 'center', paddingHorizontal: 32, marginBottom: 20 }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.gold }]} onPress={loadSurahData}>
          <Text style={[styles.retryBtnText, { color: theme.bg }]}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (!verses?.length) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={{ fontSize: 44, marginBottom: 12 }}>📖</Text>
        <Text style={[styles.centerText, { color: theme.muted }]}>No verses found. Check your connection.</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.gold }]} onPress={loadSurahData}>
          <Text style={[styles.retryBtnText, { color: theme.bg }]}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main render
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Toolbar
        tajweedOn={tajweedOn} setTajweedOn={setTajweedOn}
        showTranslation={showTranslation} setShowTranslation={setShowTranslation}
        fontSize={fontSize} setFontSize={setFontSize}
        onLegend={() => setShowLegend(true)}
        theme={theme}
        isPlaying={!!playingVerse}
        onStopAll={stopAudio}
      />

      {/* Auto-play toggle bar */}
      <TouchableOpacity
        style={[styles.autoPlayBar, { backgroundColor: autoPlay ? '#60a5fa18' : theme.surface, borderColor: autoPlay ? '#60a5fa40' : theme.border }]}
        onPress={toggleAutoPlay}
        activeOpacity={0.8}
      >
        <Ionicons name={autoPlay ? 'musical-notes' : 'musical-notes-outline'} size={14} color={autoPlay ? '#60a5fa' : theme.muted} />
        <Text style={[styles.autoPlayText, { color: autoPlay ? '#60a5fa' : theme.muted }]}>
          {autoPlay ? 'Auto-play ON — verses will advance automatically' : 'Tap to enable auto-play mode'}
        </Text>
        <View style={[styles.autoPlayDot, { backgroundColor: autoPlay ? '#60a5fa' : theme.border }]} />
      </TouchableOpacity>

      {/* Bismillah (except Surah 9) */}
      {surahId !== 9 && (
        <View style={[styles.bismillah, { borderBottomColor: theme.border }]}>
          <TajweedText
            arabic="بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ"
            fontSize={fontSize + 2}
            tajweedOn={tajweedOn}
            theme={theme}
          />
          {showTranslation && (
            <Text style={[styles.translationText, { color: theme.muted, textAlign: 'center', marginTop: 6 }]}>
              In the name of Allah, the Most Gracious, the Most Merciful
            </Text>
          )}
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={verses}
        keyExtractor={(item, i) => item.verseKey || item.id?.toString() || i.toString()}
        renderItem={renderVerse}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={12}
        windowSize={10}
        removeClippedSubviews={Platform.OS !== 'web'}
        onScrollToIndexFailed={onScrollToIndexFailed}
        getItemLayout={Platform.OS === 'web' ? undefined : getItemLayout}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />

      {/* Now-playing footer */}
      {playingVerse && (
        <View style={[styles.audioBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <Text style={{ fontSize: 14 }}>🎵</Text>
          <Text style={[styles.audioBarText, { color: theme.text }]} numberOfLines={1}>
            Playing {playingVerse}{autoPlay ? '  •  auto-play' : ''}
          </Text>
          <TouchableOpacity onPress={stopAudio}>
            <Ionicons name="close-circle" size={22} color={theme.muted} />
          </TouchableOpacity>
        </View>
      )}

      <TajweedLegend visible={showLegend} onClose={() => setShowLegend(false)} theme={theme} />
      <TafsirModal
        tafsir={selectedTafsir}
        verseKey={tafsirVerseKey}
        loading={tafsirLoading}
        onClose={() => { setSelectedTafsir(null); setTafsirVerseKey(null); setTafsirLoading(false); }}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  centerText: { fontSize: 14 },

  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, gap: 3, flexWrap: 'nowrap' },
  toolBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  toolBtnActive: { borderColor: '#c9a84c55', backgroundColor: '#c9a84c12' },
  toolBtnTxt: { fontSize: 12, fontWeight: '600' },
  toolDivider: { width: 1, height: 20, marginHorizontal: 2 },

  autoPlayBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1 },
  autoPlayText: { flex: 1, fontSize: 11, fontWeight: '500' },
  autoPlayDot: { width: 8, height: 8, borderRadius: 4 },

  bismillah: { padding: 18, alignItems: 'center', borderBottomWidth: 1 },
  listContent: { padding: 13, paddingBottom: 110 },

  verseCard: { padding: 16, marginBottom: 10, borderRadius: 18, borderWidth: 1 },
  verseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  verseBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  verseBadgeText: { fontSize: 13, fontWeight: '800' },
  verseActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },

  arabicText: { lineHeight: 46, textAlign: 'right', marginBottom: 4, writingDirection: 'rtl' },
  translationText: { fontSize: 14, lineHeight: 22, marginTop: 10 },

  audioBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: 1 },
  audioBarText: { flex: 1, fontSize: 13 },

  overlay: { flex: 1, backgroundColor: '#000000bb', justifyContent: 'flex-end' },
  legendPanel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, gap: 12 },
  legendTitle: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  legendRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  legendDot: { width: 13, height: 13, borderRadius: 7, marginTop: 3 },
  legendName: { fontSize: 13, fontWeight: '700' },
  legendDesc: { fontSize: 11 },
  legendClose: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  legendCloseTxt: { fontWeight: '800', fontSize: 15 },

  tafsirPanel: { borderRadius: 22, padding: 20, gap: 12, maxHeight: '85%', margin: 20 },
  tafsirTitle: { fontSize: 17, fontWeight: '800' },
  tafsirText: { lineHeight: 23, fontSize: 14 },
  tafsirCloseBtn: { borderRadius: 12, paddingVertical: 10, alignItems: 'center', borderWidth: 1, marginTop: 10 },
  tafsirCloseTxt: { fontWeight: '700' },

  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25, marginTop: 8 },
  retryBtnText: { fontWeight: '800', fontSize: 15 },
});