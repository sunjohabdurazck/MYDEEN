// src/screens/AIChatScreen.js — TRUSTED AI v2
// Structured response: Answer → Quran ref → Hadith ref → Confidence → Scholar note
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store';
import {
  askIslamicQuestion,
  getConfidenceLabel,
  getSourceIcon,
  getConfidenceInfo,
  FIQH_CATEGORIES,
} from '../services/aiAssistant';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { validateQuranRef } from '../services/aiTrustLayer';
import SavedAnswers from '../components/SavedAnswers';
import TrendingQuestions from '../components/TrendingQuestions';

const SUGGESTIONS = [
  'How do I perform Wudu correctly?',
  'What are the 5 pillars of Islam?',
  'What is the significance of Ramadan?',
  'How is Zakat calculated?',
];

// ─────────────────────────────────────────────────────────────────
// CONFIDENCE BADGE
// ─────────────────────────────────────────────────────────────────
function ConfidenceBadge({ level, score }) {
  const info = level ? getConfidenceInfo(level) : getConfidenceLabel(score);
  const color = info.color;
  const label = info.label;
  const icon = info.icon;
  return (
    <View style={[styles.badge, { borderColor: color + '55', backgroundColor: color + '18' }]}>
      <Text style={[styles.badgeText, { color }]}>{icon} {label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// QURAN REFERENCE CARD
// ─────────────────────────────────────────────────────────────────
function QuranCard({ quran, T }) {
  const [open, setOpen] = useState(false);
  if (!quran) return null;
  const refValidation = quran.ref ? validateQuranRef(quran.ref) : { valid: false };
  const refColor = refValidation.valid ? T.gold : '#9ca3af';
  return (
    <TouchableOpacity
      style={[styles.refCard, { borderColor: refColor + '35', backgroundColor: refColor + '08' }]}
      onPress={() => setOpen(v => !v)}
      activeOpacity={0.8}
    >
      <View style={styles.refHeader}>
        <Text style={styles.refIcon}>📖</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.refLabel, { color: T.muted }]}>QURAN REFERENCE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.refRef, { color: refColor }]}>{quran.ref}</Text>
            {!refValidation.valid && quran.ref && (
              <Text style={{ fontSize: 9, color: '#ef4444', fontWeight: '700' }}>UNVERIFIED</Text>
            )}
          </View>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color={T.muted} />
      </View>
      {open && (
        <View style={styles.refBody}>
          {quran.arabic ? (
            <Text style={[styles.refArabic, { color: T.text }]}>{quran.arabic}</Text>
          ) : null}
          {quran.translation ? (
            <Text style={[styles.refTranslation, { color: T.muted }]}>"{quran.translation}"</Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────
// HADITH REFERENCE CARD
// ─────────────────────────────────────────────────────────────────
function HadithCard({ hadith, T }) {
  const [open, setOpen] = useState(false);
  if (!hadith) return null;
  return (
    <TouchableOpacity
      style={[styles.refCard, { borderColor: '#60a5fa' + '35', backgroundColor: '#60a5fa' + '08' }]}
      onPress={() => setOpen(v => !v)}
      activeOpacity={0.8}
    >
      <View style={styles.refHeader}>
        <Text style={styles.refIcon}>📜</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.refLabel, { color: T.muted }]}>HADITH REFERENCE</Text>
          <Text style={[styles.refRef, { color: '#60a5fa' }]}>{hadith.ref}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={13} color={T.muted} />
      </View>
      {open && hadith.text ? (
        <View style={styles.refBody}>
          <Text style={[styles.refTranslation, { color: T.muted }]}>"{hadith.text}"</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────
// SCHOLAR NOTE
// ─────────────────────────────────────────────────────────────────
function ScholarNote({ note, T }) {
  if (!note) return null;
  return (
    <View style={[styles.scholarNote, { backgroundColor: T.orange + '10', borderColor: T.orange + '30' }]}>
      <Text style={styles.scholarNoteIcon}>🎓</Text>
      <Text style={[styles.scholarNoteText, { color: T.orange }]}>{note}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────
function MessageBubble({ item }) {
  const { theme: T } = useTheme();

  if (item.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: T.gold }]}>
          <Text style={[styles.userText, { color: T.bg }]}>{item.content}</Text>
        </View>
      </View>
    );
  }

  const hasQuran = !!item.quran;
  const hasHadith = !!item.hadith;
  const hasRefs = hasQuran || hasHadith;
  const confidenceLevel = item.confidence_level;
  const hasConfidence = !!confidenceLevel || (typeof item.confidence === 'number' && item.confidence > 0);

  return (
    <View style={styles.aiRow}>
      <View style={[styles.aiBubble, { backgroundColor: T.surface, borderColor: T.border }]}>

        {/* ── Header ── */}
        <View style={styles.aiHeader}>
          <Text style={styles.aiIcon}>🕌</Text>
          <Text style={[styles.aiName, { color: T.gold }]}>Deen AI</Text>
          {hasRefs && (
            <View style={[styles.verifiedTag, { borderColor: T.emerald + '40', backgroundColor: T.emerald + '10' }]}>
              <Text style={[styles.verifiedTagText, { color: T.emerald }]}>✓ SOURCED</Text>
            </View>
          )}
        </View>

        {/* ── Answer ── */}
        <Text style={[styles.aiText, { color: T.text }]}>{item.answer || item.content}</Text>

        {/* ── Quran Reference ── */}
        {hasQuran && <QuranCard quran={item.quran} T={T} />}

        {/* ── Hadith Reference ── */}
        {hasHadith && <HadithCard hadith={item.hadith} T={T} />}

        {/* ── Confidence ── */}
        {hasConfidence && (
          <View style={styles.confidenceRow}>
            <ConfidenceBadge level={confidenceLevel} score={item.confidence} />
            {item.confidence_reason ? (
              <Text style={[styles.confReason, { color: T.muted }]}>{item.confidence_reason}</Text>
            ) : null}
          </View>
        )}

        {/* ── Scholar note ── */}
        <ScholarNote note={item.scholar_note} T={T} />

      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// FIQH CATEGORY PILLS
// ─────────────────────────────────────────────────────────────────
function FiqhPills({ selected, onSelect, T }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pillsContainer}
    >
      {FIQH_CATEGORIES.map(cat => {
        const active = selected === cat.key;
        return (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.pill,
              { borderColor: active ? T.gold : T.border, backgroundColor: active ? T.gold + '18' : 'transparent' },
            ]}
            onPress={() => onSelect(cat.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.pillEmoji}>{cat.emoji}</Text>
            <Text style={[styles.pillLabel, { color: active ? T.gold : T.muted }]}>{cat.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────
// HISTORY ITEM
// ─────────────────────────────────────────────────────────────────
function HistoryItem({ chat, onOpen, onDelete }) {
  const { theme: T } = useTheme();
  const date = new Date(chat.updated_at || chat.created_at);
  const diff = Date.now() - date;
  let timeStr;
  if (diff < 60000) timeStr = 'just now';
  else if (diff < 3600000) timeStr = Math.floor(diff / 60000) + 'm ago';
  else if (diff < 86400000) timeStr = Math.floor(diff / 3600000) + 'h ago';
  else timeStr = date.toLocaleDateString();

  return (
    <TouchableOpacity
      style={[styles.histItem, { backgroundColor: T.surface, borderColor: T.border }]}
      onPress={() => onOpen(chat)}
      activeOpacity={0.8}
    >
      <Text style={styles.histItemIcon}>💬</Text>
      <View style={styles.histItemBody}>
        <Text style={[styles.histItemTitle, { color: T.text }]} numberOfLines={1}>
          {chat.title || 'New Conversation'}
        </Text>
        <Text style={[styles.histItemPreview, { color: T.muted }]} numberOfLines={1}>
          {chat.preview || 'No messages yet'}
        </Text>
      </View>
      <View style={styles.histItemMeta}>
        <Text style={[styles.histItemDate, { color: T.muted }]}>{timeStr}</Text>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            Alert.alert('Delete', 'Delete this conversation?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(chat.id) },
            ])
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={15} color={T.muted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────
export default function AIChatScreen() {
  const { theme: T } = useTheme();
  const [view, setView] = useState('history');
  const [historyTab, setHistoryTab] = useState('chats'); // 'chats' | 'saved' | 'trending'
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verifiedMode, setVerifiedMode] = useState(true);
  const [fiqhCategory, setFiqhCategory] = useState('all');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { userId } = useAuthStore();
  const flatListRef = useRef();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => { loadChatHistory(); }, []);

  useEffect(() => {
    if (!isLoading) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isLoading]);

  const loadChatHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from('ai_sessions')
        .select('*')
        .eq('user_id', userId())
        .order('updated_at', { ascending: false })
        .limit(50);
      setChatHistory(data || []);
    } catch (err) {
      console.warn('AIChatScreen: failed to load history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const createNewChat = async () => {
    const { data } = await supabase
      .from('ai_sessions')
      .insert({ user_id: userId(), title: 'New Conversation', preview: '', message_count: 0 })
      .select()
      .single();
    if (data) {
      setChatHistory(prev => [data, ...prev]);
      openChat(data);
    }
  };

  const openChat = async (chat) => {
    setCurrentChat(chat);
    setMessages([]);
    setView('chat');
    const { data } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('session_id', chat.id)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setMessages(data.map(d => ({ ...d, ...(d.metadata || {}) })));
  };

  const deleteChat = async (id) => {
    await supabase.from('ai_messages').delete().eq('session_id', id);
    await supabase.from('ai_sessions').delete().eq('id', id);
    setChatHistory(prev => prev.filter(c => c.id !== id));
    if (currentChat?.id === id) setView('history');
  };

  const sendMessage = async (text) => {
    const msg = (text || inputText).trim();
    if (!msg || isLoading || !currentChat) return;

    setInputText('');

    const userMsg = { role: 'user', content: msg, created_at: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Retry helper for failed Supabase inserts
    const saveWithRetry = async (table, data, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const { error } = await supabase.from(table).insert(data);
          if (!error) return true;
          if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        } catch (err) {
          if (i === retries - 1) throw err;
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
      return false;
    };

    // Save user message
    try {
      await saveWithRetry('ai_messages', {
        session_id: currentChat.id, user_id: userId(),
        role: 'user', content: msg, created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('AIChatScreen: failed to save user message', err);
    }

    // Set title on first message
    if (!currentChat.preview) {
      const title = msg.length > 45 ? msg.slice(0, 45) + '…' : msg;
      await supabase.from('ai_sessions').update({ title, preview: msg, updated_at: new Date().toISOString() }).eq('id', currentChat.id);
      setCurrentChat(prev => ({ ...prev, title, preview: msg }));
    }

    const historyMessages = [...messages, userMsg]
      .filter(m => m?.content?.trim())
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    const reply = await askIslamicQuestion(msg, userId(), historyMessages, verifiedMode, fiqhCategory);

    const assistantContent = reply?.answer || "I apologize, I couldn't generate a response. Please try again.";

    const assistantMsg = {
      role: 'assistant',
      content: assistantContent,
      answer: assistantContent,
      quran: reply?.quran || null,
      hadith: reply?.hadith || null,
      confidence: reply?.confidence,
      confidence_level: reply?.confidence_level,
      confidence_reason: reply?.confidence_reason,
      scholar_note: reply?.scholar_note,
      fiqh_category: reply?.fiqh_category,
      sources: reply?.sources || [],
      created_at: new Date(),
    };

    setMessages(prev => [...prev, assistantMsg]);

    try {
      await saveWithRetry('ai_messages', {
        session_id: currentChat.id, user_id: userId(),
        role: 'assistant', content: assistantContent,
        metadata: {
          quran: reply?.quran,
          hadith: reply?.hadith,
          confidence: reply?.confidence,
          confidence_level: reply?.confidence_level,
          confidence_reason: reply?.confidence_reason,
          scholar_note: reply?.scholar_note,
          fiqh_category: reply?.fiqh_category,
          sources: reply?.sources,
        },
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('AIChatScreen: failed to save assistant message', err);
    }

    await supabase.from('ai_sessions').update({
      preview: msg.length > 55 ? msg.slice(0, 55) + '…' : msg,
      updated_at: new Date().toISOString(),
    }).eq('id', currentChat.id);

    setIsLoading(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ── HISTORY VIEW ──────────────────────────────────────────────
  if (view === 'history') {
    return (
      <View style={[styles.container, { backgroundColor: T.bg }]}>
        <View style={[styles.histHeader, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
          <Text style={[styles.histHeaderTitle, { color: T.text }]}>Deen AI</Text>
          <TouchableOpacity style={styles.newChatBtn} onPress={createNewChat}>
            <Ionicons name="create-outline" size={16} color="#0d1120" />
            <Text style={styles.newChatBtnText}>New Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Sub-tabs: Chats / Saved / Trending */}
        <View style={[styles.aiSubTabRow, { borderBottomColor: T.border }]}>
          {[
            { key: 'chats',    label: '💬 Chats' },
            { key: 'saved',    label: '📌 Saved' },
            { key: 'trending', label: '🔥 Trending' },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.aiSubTabBtn, historyTab === t.key && { borderBottomColor: T.gold, borderBottomWidth: 2 }]}
              onPress={() => setHistoryTab(t.key)}
            >
              <Text style={[styles.aiSubTabText, { color: historyTab === t.key ? T.gold : T.muted }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chats tab */}
        {historyTab === 'chats' && (
          loadingHistory ? (
            <View style={styles.centerContent}><ActivityIndicator color={T.gold} /></View>
          ) : chatHistory.length === 0 ? (
            <View style={styles.centerContent}>
              <Text style={{ fontSize: 48 }}>🕌</Text>
              <Text style={[styles.emptyTitle, { color: T.text }]}>No conversations yet</Text>
              <Text style={[styles.emptySubtitle, { color: T.muted }]}>Start a new chat to begin your journey</Text>
              <TouchableOpacity style={styles.newChatBtn} onPress={createNewChat}>
                <Text style={styles.newChatBtnText}>Start Your First Chat</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={chatHistory}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 12, gap: 8 }}
              renderItem={({ item }) => (
                <HistoryItem chat={item} onOpen={openChat} onDelete={deleteChat} />
              )}
            />
          )
        )}

        {/* Saved tab */}
        {historyTab === 'saved' && (
          <SavedAnswers
            saved={[]}
            onPress={() => {}}
            onDelete={() => {}}
          />
        )}

        {/* Trending tab */}
        {historyTab === 'trending' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16 }}>
            <TrendingQuestions onSelect={(q) => { createNewChat(); setInputText(q); }} />
          </ScrollView>
        )}
      </View>
    );
  }

  // ── CHAT VIEW ─────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: T.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Top bar */}
      <View style={[styles.chatTopBar, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <TouchableOpacity onPress={() => { setView('history'); loadChatHistory(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={T.gold} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.chatTopTitle, { color: T.text }]} numberOfLines={1}>
            {currentChat?.title || 'New Conversation'}
          </Text>
          <Text style={[styles.chatTopSub, { color: T.muted }]}>Qur'an · Hadith · Scholar sources</Text>
        </View>
        <TouchableOpacity onPress={createNewChat} style={styles.backBtn}>
          <Ionicons name="create-outline" size={20} color={T.muted} />
        </TouchableOpacity>
      </View>

      {/* Mode toggle */}
      <View style={[styles.modeBar, { backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <TouchableOpacity
          style={[styles.modeBtn, verifiedMode && styles.modeBtnActive]}
          onPress={() => setVerifiedMode(true)}
        >
          <Text style={[styles.modeBtnText, verifiedMode && styles.modeBtnTextActive]}>🔒 Verified</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, !verifiedMode && styles.modeBtnActive]}
          onPress={() => setVerifiedMode(false)}
        >
          <Text style={[styles.modeBtnText, !verifiedMode && styles.modeBtnTextActive]}>💬 Chat</Text>
        </TouchableOpacity>
        <Text style={[styles.modeHint, { color: T.muted }]} numberOfLines={1}>
          {verifiedMode ? 'Qur\'an & Hadith references' : 'Friendly companion mode'}
        </Text>
      </View>

      {/* Fiqh Category Pills */}
      <View style={[styles.pillsWrapper, { backgroundColor: T.bg, borderBottomColor: T.border }]}>
        <FiqhPills selected={fiqhCategory} onSelect={setFiqhCategory} T={T} />
      </View>

      {/* Messages / Welcome */}
      {messages.length === 0 ? (
        <View style={styles.welcome}>
          <Text style={styles.welcomeEmoji}>🕌</Text>
          <Text style={[styles.welcomeTitle, { color: T.text }]}>Assalamu Alaikum</Text>
          <Text style={[styles.welcomeSub, { color: T.muted }]}>
            {verifiedMode
              ? "Ask anything — I'll cite Qur'an & Hadith sources"
              : 'Ask me anything about Islam'}
          </Text>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.suggestion, { backgroundColor: T.surface, borderColor: T.gold + '40' }]}
                onPress={() => sendMessage(q)}
              >
                <Text style={[styles.suggestionText, { color: T.gold }]}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => <MessageBubble item={item} />}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {isLoading && (
        <Animated.View style={[styles.loadingRow, { opacity: pulseAnim }]}>
          <Text style={[styles.loadingText, { color: T.gold }]}>
            {verifiedMode ? '📖 Searching Qur\'an & Hadith...' : '✍️ Thinking...'}
          </Text>
        </Animated.View>
      )}

      <View style={[styles.inputRow, { backgroundColor: T.surface, borderTopColor: T.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: T.bg, color: T.text, borderColor: T.border }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about Islam..."
          placeholderTextColor={T.muted}
          multiline
          editable={!isLoading}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || isLoading}
        >
          {isLoading
            ? <ActivityIndicator color="#0d1120" size="small" />
            : <Ionicons name="send" size={18} color="#0d1120" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // History
  histHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 12, borderBottomWidth: 1 },
  histHeaderTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#c9a84c', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  newChatBtnText: { color: '#0d1120', fontSize: 13, fontWeight: '700' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 6 },
  histItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  histItemIcon: { fontSize: 22 },
  histItemBody: { flex: 1, minWidth: 0 },
  histItemTitle: { fontSize: 13, fontWeight: '600', marginBottom: 3 },
  histItemPreview: { fontSize: 11 },
  histItemMeta: { alignItems: 'flex-end', gap: 6 },
  histItemDate: { fontSize: 10 },
  deleteBtn: { padding: 2 },

  // Chat top bar
  chatTopBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn: { padding: 5 },
  chatTopTitle: { fontSize: 14, fontWeight: '700' },
  chatTopSub: { fontSize: 10, marginTop: 1 },

  // Mode bar
  modeBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1, gap: 7 },
  modeBtn: { paddingHorizontal: 13, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modeBtnActive: { backgroundColor: 'rgba(201,168,76,0.15)', borderColor: 'rgba(201,168,76,0.35)' },
  modeBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  modeBtnTextActive: { color: '#c9a84c' },
  modeHint: { fontSize: 10, flex: 1 },

  // Fiqh pills
  pillsWrapper: { borderBottomWidth: 1, paddingVertical: 8 },
  pillsContainer: { paddingHorizontal: 12, gap: 7 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  pillEmoji: { fontSize: 12 },
  pillLabel: { fontSize: 11, fontWeight: '600' },

  // Welcome
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  welcomeEmoji: { fontSize: 52, marginBottom: 8 },
  welcomeTitle: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  welcomeSub: { fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9 },
  suggestion: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  suggestionText: { fontSize: 12 },

  // Messages
  messagesList: { padding: 12, paddingBottom: 6 },

  // User
  userRow: { alignItems: 'flex-end', marginBottom: 12 },
  userBubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderBottomRightRadius: 4 },
  userText: { fontSize: 14, lineHeight: 21 },

  // AI bubble
  aiRow: { alignItems: 'flex-start', marginBottom: 12 },
  aiBubble: { maxWidth: '96%', borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, gap: 10, borderWidth: 1 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiIcon: { fontSize: 16 },
  aiName: { fontSize: 12, fontWeight: '700' },
  verifiedTag: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  verifiedTagText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  aiText: { fontSize: 14, lineHeight: 22 },

  // Reference cards (Quran + Hadith)
  refCard: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  refHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  refIcon: { fontSize: 16 },
  refLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  refRef: { fontSize: 13, fontWeight: '700' },
  refBody: { paddingHorizontal: 12, paddingBottom: 10, gap: 6 },
  refArabic: { fontSize: 18, textAlign: 'right', lineHeight: 30, fontFamily: Platform.OS === 'ios' ? 'Arabic' : undefined },
  refTranslation: { fontSize: 12, fontStyle: 'italic', lineHeight: 18 },

  // Confidence
  confidenceRow: { gap: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  confReason: { fontSize: 11, fontStyle: 'italic', lineHeight: 16 },

  // Scholar
  scholarNote: { flexDirection: 'row', gap: 6, borderRadius: 10, padding: 10, borderWidth: 1 },
  scholarNoteIcon: { fontSize: 14 },
  scholarNoteText: { fontSize: 12, lineHeight: 18, flex: 1 },

  // Loading
  loadingRow: { paddingHorizontal: 14, paddingVertical: 7 },
  loadingText: { fontSize: 12, fontStyle: 'italic' },

  // Input
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 9, gap: 8, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, maxHeight: 95, borderWidth: 1 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#c9a84c', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  // AI Sub-tabs
  aiSubTabRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  aiSubTabBtn: { paddingHorizontal: 14, paddingVertical: 10, marginRight: 4 },
  aiSubTabText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold' },
});
