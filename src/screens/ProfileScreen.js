// src/screens/ProfileScreen.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  Modal, TextInput, ActivityIndicator, FlatList, Linking, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, usePrayerStore } from '../store';
import { useTheme } from '../contexts/ThemeContext';
import StreakDisplay from '../components/StreakDisplay';
import BadgeGrid from '../components/BadgeGrid';
import ActivityTimeline from '../components/ActivityTimeline';
import WeeklyComparison from '../components/WeeklyComparison';
import GoalTracker from '../components/GoalTracker';
import { supabase } from '../lib/supabase';

// ── EDIT PROFILE MODAL ──────────────────────────────────────────────
function EditProfileModal({ visible, onClose, profile, onUpdate }) {
  const { theme: T } = useTheme();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
    }
  }, [visible, profile]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name is required');
      return;
    }
    
    setLoading(true);
    try {
      await onUpdate({ 
        display_name: displayName.trim(), 
        username: username.trim().toLowerCase() || null,
        bio: bio.trim() || null 
      });
      onClose();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={T.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: T.muted }]}>Display Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.inputBg || T.surface, color: T.text, borderColor: T.border }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={T.muted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: T.muted }]}>Username</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.inputBg || T.surface, color: T.text, borderColor: T.border }]}
                value={username}
                onChangeText={setUsername}
                placeholder="@username"
                placeholderTextColor={T.muted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[styles.inputHint, { color: T.muted }]}>Used for finding friends</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: T.muted }]}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput, { backgroundColor: T.inputBg || T.surface, color: T.text, borderColor: T.border }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Write something about yourself..."
                placeholderTextColor={T.muted}
                multiline
                numberOfLines={3}
                maxLength={150}
              />
              <Text style={[styles.inputHint, { color: T.muted, textAlign: 'right' }]}>{bio.length}/150</Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: T.border }]} onPress={onClose}>
              <Text style={[styles.modalCancelText, { color: T.muted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: T.gold }]} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#0d1120" /> : <Text style={styles.modalSaveText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── INVITE FRIEND MODAL ──────────────────────────────────────────────
function InviteFriendModal({ visible, onClose, userProfile }) {
  const { theme: T } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const sendEmailInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const downloadLink = Platform.OS === 'ios' 
        ? 'https://apps.apple.com/app/deen/id123456789'
        : 'https://play.google.com/store/apps/details?id=com.deen.app';
      
      const subject = encodeURIComponent(`${userProfile?.display_name || 'A friend'} invited you to join Deen App!`);
      const body = encodeURIComponent(`
Salaam,

${userProfile?.display_name || 'Someone'} invited you to join Deen App - Your Complete Islamic Companion!

✨ Features:
• Accurate Prayer Times with Adhan notifications
• Complete Holy Quran with translations
• Qibla Direction Finder with AR mode
• Prayer tracking with streaks and achievements
• Digital Tasbih counter
• And much more!

Download the app here: ${downloadLink}

May Allah bless you,
${userProfile?.display_name || 'Deen App User'}
      `);

      const mailtoUrl = `mailto:${email.trim()}?subject=${subject}&body=${body}`;
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        Alert.alert('Email Ready', `Email client opened. Send the invitation to ${email}`);
        setEmail('');
        onClose();
      } else {
        Alert.alert('No Email App', 'Please install an email app or use the Share option below');
      }
    } catch (error) {
      console.error('Email error:', error);
      Alert.alert('Error', 'Could not open email app. Please use the Share option instead.');
    } finally {
      setLoading(false);
    }
  };

  const shareInviteLink = async () => {
    const downloadLink = Platform.OS === 'ios' 
      ? 'https://apps.apple.com/app/deen/id123456789'
      : 'https://play.google.com/store/apps/details?id=com.deen.app';
    
    const message = `🕌 Join me on Deen App - Your Complete Islamic Companion!\n\nDownload: ${downloadLink}`;
    
    try {
      await Share.share({
        message: message,
        title: 'Share Deen App',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, styles.inviteModalContent, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Invite a Friend</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={T.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inviteIconContainer}>
              <Text style={styles.inviteEmoji}>📧</Text>
            </View>
            
            <Text style={[styles.inviteDescription, { color: T.muted }]}>
              Enter your friend's email address to open your email app with a pre-written invitation
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: T.muted }]}>Friend's Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.inputBg || T.surface, color: T.text, borderColor: T.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder="friend@example.com"
                placeholderTextColor={T.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity 
              style={[styles.sendInviteBtn, { backgroundColor: T.gold }]} 
              onPress={sendEmailInvite} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#0d1120" />
              ) : (
                <>
                  <Ionicons name="mail-outline" size={20} color="#0d1120" />
                  <Text style={styles.sendInviteBtnText}>Open Email App</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: T.border }]} />
              <Text style={[styles.dividerText, { color: T.muted }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: T.border }]} />
            </View>

            <TouchableOpacity style={styles.shareLinkBtn} onPress={shareInviteLink}>
              <Ionicons name="share-social-outline" size={20} color={T.gold} />
              <Text style={[styles.shareLinkBtnText, { color: T.gold }]}>Share Download Link</Text>
            </TouchableOpacity>

            <Text style={[styles.noteText, { color: T.muted }]}>
              Note: If you don't have an email app configured, use the Share option above.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── FRIENDS LIST MODAL ──────────────────────────────────────────────
function FriendsModal({ visible, onClose, userId, userProfile }) {
  const { theme: T } = useTheme();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFriends();
      loadPendingRequests();
    }
  }, [visible]);

  const loadFriends = async () => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id, status, created_at,
          user:profiles!friendships_user_id_fkey(id, display_name, username, xp, streak_current, bio),
          friend:profiles!friendships_friend_id_fkey(id, display_name, username, xp, streak_current, bio)
        `)
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

      if (error) throw error;

      const friendsList = (data || []).map(f => {
        const isUser = f.user_id === userId;
        return isUser ? f.friend : f.user;
      }).filter(Boolean);

      setFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          id, created_at,
          user:profiles!friendships_user_id_fkey(id, display_name, username, xp, streak_current)
        `)
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, xp, streak_current')
        .neq('id', userId)
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(20);

      if (!error) {
        const existingFriendIds = friends.map(f => f.id);
        const pendingIds = pendingRequests.map(r => r.user_id);
        const filteredResults = (data || []).filter(u => 
          !existingFriendIds.includes(u.id) && !pendingIds.includes(u.id)
        );
        setSearchResults(filteredResults);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (friendId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({ user_id: userId, friend_id: friendId, status: 'pending' });

      if (error) throw error;
      Alert.alert('Request Sent', 'Friend request has been sent.');
      setSearchResults(prev => prev.filter(u => u.id !== friendId));
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const acceptRequest = async (friendshipId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;
      
      setPendingRequests(prev => prev.filter(r => r.id !== friendshipId));
      loadFriends();
      Alert.alert('Accepted', 'Friend request accepted!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const rejectRequest = async (friendshipId) => {
    Alert.alert('Reject Request', 'Are you sure you want to reject this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', friendshipId);
          if (!error) {
            setPendingRequests(prev => prev.filter(r => r.id !== friendshipId));
          }
        }
      }
    ]);
  };

  const removeFriend = async (friendId, friendName) => {
    Alert.alert('Remove Friend', `Are you sure you want to remove ${friendName} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('friendships')
            .delete()
            .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);
          
          if (!error) loadFriends();
        }
      }
    ]);
  };

  const renderFriendItem = ({ item }) => (
    <View style={[styles.friendItem, { borderBottomColor: T.border }]}>
      <View style={[styles.friendAvatar, { backgroundColor: T.gold + '15' }]}>
        <Text style={styles.friendAvatarText}>{item.display_name?.[0] || '🤲'}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: T.text }]}>{item.display_name}</Text>
        <Text style={[styles.friendUsername, { color: T.muted }]}>@{item.username || 'user'}</Text>
        <View style={styles.friendStats}>
          <Text style={[styles.friendStat, { color: T.muted }]}>🔥 {item.streak_current || 0}</Text>
          <Text style={[styles.friendStat, { color: T.muted }]}>✨ {item.xp || 0} XP</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => removeFriend(item.id, item.display_name)} style={styles.removeFriendBtn}>
        <Ionicons name="person-remove-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  const renderRequestItem = ({ item }) => (
    <View style={[styles.friendItem, { borderBottomColor: T.border }]}>
      <View style={[styles.friendAvatar, { backgroundColor: T.gold + '15' }]}>
        <Text style={styles.friendAvatarText}>{item.user?.display_name?.[0] || '👤'}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: T.text }]}>{item.user?.display_name}</Text>
        <Text style={[styles.friendUsername, { color: T.muted }]}>@{item.user?.username}</Text>
        <Text style={[styles.requestDate, { color: T.muted }]}>
          Requested {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: T.emerald || '#10b981' }]} onPress={() => acceptRequest(item.id)}>
          <Ionicons name="checkmark" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(item.id)}>
          <Ionicons name="close" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResult = ({ item }) => (
    <View style={[styles.searchResultItem, { borderBottomColor: T.border }]}>
      <View style={[styles.friendAvatar, { backgroundColor: T.gold + '15' }]}>
        <Text style={styles.friendAvatarText}>{item.display_name?.[0] || '👤'}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: T.text }]}>{item.display_name}</Text>
        <Text style={[styles.friendUsername, { color: T.muted }]}>@{item.username || 'user'}</Text>
        <View style={styles.friendStats}>
          <Text style={[styles.friendStat, { color: T.muted }]}>🔥 {item.streak_current || 0}</Text>
          <Text style={[styles.friendStat, { color: T.muted }]}>✨ {item.xp || 0} XP</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.addFriendBtn, { backgroundColor: T.gold }]} onPress={() => sendFriendRequest(item.id)}>
        <Text style={styles.addFriendBtnText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalContent, styles.friendsModalContent, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: T.text }]}>Friends</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={T.muted} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchBar, { backgroundColor: T.inputBg || T.surface, borderColor: T.border }]}>
              <Ionicons name="search" size={20} color={T.muted} />
              <TextInput
                style={[styles.searchInput, { color: T.text }]}
                placeholder="Search by username or name..."
                placeholderTextColor={T.muted}
                value={searchQuery}
                onChangeText={text => { setSearchQuery(text); searchUsers(text); }}
              />
            </View>

            {/* Invite Button */}
            <TouchableOpacity 
              style={[styles.inviteButton, { backgroundColor: T.gold + '15', borderColor: T.gold }]} 
              onPress={() => setShowInviteModal(true)}
            >
              <Ionicons name="mail-outline" size={20} color={T.gold} />
              <Text style={[styles.inviteButtonText, { color: T.gold }]}>Invite a Friend by Email</Text>
            </TouchableOpacity>

            {/* Search Results */}
            {searchQuery.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { color: T.muted }]}>Search Results</Text>
                {searching ? (
                  <ActivityIndicator color={T.gold} style={styles.loader} />
                ) : searchResults.length === 0 ? (
                  <View style={styles.emptySearch}>
                    <Text style={[styles.emptyText, { color: T.muted }]}>No users found with "{searchQuery}"</Text>
                    <TouchableOpacity style={styles.inviteNotFoundBtn} onPress={() => setShowInviteModal(true)}>
                      <Text style={[styles.inviteNotFoundText, { color: T.gold }]}>Invite by Email Instead</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <FlatList
                    data={searchResults}
                    keyExtractor={item => item.id}
                    renderItem={renderSearchResult}
                    style={styles.searchResultsList}
                    nestedScrollEnabled
                  />
                )}
              </>
            )}

            {/* Tabs */}
            {searchQuery.length === 0 && (
              <View style={styles.tabBar}>
                <TouchableOpacity style={[styles.tab, activeTab === 'friends' && styles.activeTab]} onPress={() => setActiveTab('friends')}>
                  <Text style={[styles.tabText, { color: T.muted }, activeTab === 'friends' && { color: T.gold }]}>
                    Friends ({friends.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'requests' && styles.activeTab]} onPress={() => setActiveTab('requests')}>
                  <Text style={[styles.tabText, { color: T.muted }, activeTab === 'requests' && { color: T.gold }]}>
                    Requests ({pendingRequests.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Content */}
            {searchQuery.length === 0 && (
              <>
                {loading ? (
                  <ActivityIndicator color={T.gold} style={styles.loader} />
                ) : activeTab === 'friends' ? (
                  friends.length === 0 ? (
                    <View style={styles.emptyFriends}>
                      <Text style={[styles.emptyFriendsText, { color: T.muted }]}>No friends yet</Text>
                      <Text style={[styles.emptyFriendsSubtext, { color: T.muted }]}>Search for users above or invite friends by email</Text>
                      <TouchableOpacity style={[styles.emptyInviteBtn, { backgroundColor: T.gold }]} onPress={() => setShowInviteModal(true)}>
                        <Text style={styles.emptyInviteBtnText}>Invite Friends</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <FlatList
                      data={friends}
                      keyExtractor={item => item.id}
                      renderItem={renderFriendItem}
                      style={styles.friendsList}
                      nestedScrollEnabled
                    />
                  )
                ) : (
                  pendingRequests.length === 0 ? (
                    <View style={styles.emptyFriends}>
                      <Text style={[styles.emptyFriendsText, { color: T.muted }]}>No pending requests</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={pendingRequests}
                      keyExtractor={item => item.id}
                      renderItem={renderRequestItem}
                      style={styles.friendsList}
                      nestedScrollEnabled
                    />
                  )
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <InviteFriendModal 
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        userProfile={userProfile}
      />
    </>
  );
}

// ── HELP & SUPPORT MODAL ───────────────────────────────────────────
function HelpSupportModal({ visible, onClose }) {
  const { theme: T } = useTheme();
  
  const FAQS = [
    { q: 'How do I mark a prayer?', a: 'Tap on any prayer card to mark it as prayed. Long-press to mark as missed.' },
    { q: 'What is Hardcore Mode?', a: 'Prevents you from exiting the prayer lock screen until you complete your prayer. Enable in Settings.' },
    { q: 'How does the streak work?', a: 'Your streak increases when you pray all 5 prayers on time. Missing a prayer resets it.' },
    { q: 'Can I adjust prayer times?', a: 'Yes! Go to Settings to change calculation method and Asr madhab.' },
    { q: 'How to use Qibla finder?', a: 'Open Quick Actions → Qibla. Allow camera and location for AR mode.' },
    { q: 'How do I add friends?', a: 'Go to Profile → Friends, search for users by username or name, or invite them by email.' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modalContent, styles.helpModalContent, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Help & Support</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={T.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.helpSection}>
              <Text style={[styles.helpSectionTitle, { color: T.gold }]}>📖 Frequently Asked Questions</Text>
              {FAQS.map((faq, i) => (
                <View key={i} style={[styles.faqItem, { borderBottomColor: T.border }]}>
                  <Text style={[styles.faqQuestion, { color: T.text }]}>{faq.q}</Text>
                  <Text style={[styles.faqAnswer, { color: T.muted }]}>{faq.a}</Text>
                </View>
              ))}
            </View>

            <View style={styles.helpSection}>
              <Text style={[styles.helpSectionTitle, { color: T.gold }]}>📧 Contact Us</Text>
              <Text style={[styles.helpText, { color: T.muted }]}>Email: support@deenapp.com</Text>
              <Text style={[styles.helpText, { color: T.muted }]}>Website: www.deenapp.com</Text>
            </View>

            <View style={styles.helpSection}>
              <Text style={[styles.helpSectionTitle, { color: T.gold }]}>📜 About Deen App</Text>
              <Text style={[styles.helpText, { color: T.muted }]}>
                Version 1.0.0{'\n\n'}
                Deen App is your complete Islamic companion, helping you stay connected to your faith with prayer times, Quran, Qibla direction, and more.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── MAIN PROFILE SCREEN ────────────────────────────────────────────
// ── PROFILE SUB-TABS (Stats / Activity) ─────────────────────────
const PROFILE_TABS = [
  { key: 'stats',    label: '📊 Stats' },
  { key: 'activity', label: '📜 Activity' },
  { key: 'goals',    label: '🎯 Goals' },
];

function ProfileSubTabs() {
  const { theme: T } = useTheme();
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <View style={{ marginTop: 8, marginBottom: 4 }}>
      {/* Tab bar */}
      <View style={[profileTabStyles.tabRow, { borderBottomColor: T.border }]}>
        {PROFILE_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[profileTabStyles.tabBtn, activeTab === tab.key && { borderBottomColor: T.gold, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[profileTabStyles.tabText, { color: activeTab === tab.key ? T.gold : T.muted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'stats' && (
        <View style={{ paddingTop: 8 }}>
          <WeeklyComparison />
        </View>
      )}
      {activeTab === 'activity' && (
        <View style={{ paddingTop: 8 }}>
          <ActivityTimeline />
        </View>
      )}
      {activeTab === 'goals' && (
        <View style={{ paddingTop: 8 }}>
          <GoalTracker />
        </View>
      )}
    </View>
  );
}

const profileTabStyles = StyleSheet.create({
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 10, marginRight: 4 },
  tabText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold' },
});

export default function ProfileScreen({ navigation }) {
  const { theme: T } = useTheme();
  const { profile, signOut, userId, updateProfile } = useAuthStore();
  const { getTodayCount } = usePrayerStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleSignOut = () => Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
  ]);

  const handleUpdateProfile = async (updates) => {
    await updateProfile(updates);
  };

  const todayPrayers = getTodayCount();
  const xpInLevel = (profile?.xp || 0) % 500;
  const levelPct = (xpInLevel / 500) * 100;
  const xpToNext = 500 - xpInLevel;

  const MENU = [
    { icon: 'person-outline', label: 'Edit Profile', onPress: () => setShowEditModal(true) },
    { icon: 'settings-outline', label: 'Settings', onPress: () => navigation.navigate('Settings') },
    { icon: 'people-outline', label: 'Friends', onPress: () => setShowFriendsModal(true) },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => setShowHelpModal(true) },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: T.bg }]} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <View style={[styles.avatar, { backgroundColor: T.surface, borderColor: T.gold }]}>
          <Text style={styles.avatarEmoji}>🕌</Text>
        </View>
        <Text style={[styles.displayName, { color: T.text }]}>{profile?.display_name || 'Muslim'}</Text>
        <Text style={[styles.username, { color: T.muted }]}>@{profile?.username || 'believer'}</Text>
        
        {profile?.bio && (
          <Text style={[styles.bio, { color: T.muted }]}>{profile.bio}</Text>
        )}

        <View style={styles.statsRow}>
          {[
            { val: profile?.level || 1, lbl: 'Level' },
            { val: profile?.xp || 0, lbl: 'XP' },
            { val: `${todayPrayers}/5`, lbl: 'Today' },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: T.border }]} />}
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: T.gold }]}>{s.val}</Text>
                <Text style={[styles.statLbl, { color: T.muted }]}>{s.lbl}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.xpWrap}>
          <View style={[styles.xpBarBg, { backgroundColor: T.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <View style={[styles.xpBarFill, { width: `${levelPct}%`, backgroundColor: T.gold }]} />
          </View>
          <Text style={[styles.xpText, { color: T.muted }]}>{xpToNext} XP to Level {(profile?.level || 1) + 1}</Text>
        </View>
      </View>

      <StreakDisplay streak={profile?.streak_current || 0} bestStreak={profile?.streak_best || 0} />

      {/* Profile sub-tabs */}
      <ProfileSubTabs />

      <BadgeGrid earnedBadges={[]} />

      {/* Menu */}
      <View style={styles.menuSection}>
        {MENU.map((item, i) => (
          <TouchableOpacity key={i} style={[styles.menuItem, { backgroundColor: T.surface }]} onPress={item.onPress} activeOpacity={0.75}>
            <Ionicons name={item.icon} size={22} color={T.muted} />
            <Text style={[styles.menuText, { color: T.text }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={T.muted} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.menuItem, styles.signOutItem, { backgroundColor: T.surface }]} onPress={handleSignOut} activeOpacity={0.75}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={[styles.menuText, { color: '#ef4444' }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      {/* Modals */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        profile={profile}
        onUpdate={handleUpdateProfile}
      />
      <FriendsModal
        visible={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        userId={userId()}
        userProfile={profile}
      />
      <HelpSupportModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 24, borderBottomWidth: 1 },
  avatar: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2 },
  avatarEmoji: { fontSize: 48 },
  displayName: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  username: { fontSize: 14, marginBottom: 8 },
  bio: { fontSize: 13, textAlign: 'center', marginHorizontal: 32, marginBottom: 16 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  editProfileText: { fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLbl: { fontSize: 12, marginTop: 4 },
  divider: { width: 1, height: 30 },
  xpWrap: { width: '80%', alignItems: 'center' },
  xpBarBg: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: 6, borderRadius: 3 },
  xpText: { fontSize: 12, marginTop: 8 },
  menuSection: { marginTop: 20, paddingHorizontal: 20, gap: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, gap: 12 },
  menuText: { flex: 1, fontSize: 16 },
  signOutItem: { marginTop: 8 },

  // Modal styles
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '90%', borderRadius: 24, borderWidth: 1, maxHeight: '85%' },
  friendsModalContent: { maxHeight: '90%' },
  helpModalContent: { maxHeight: '85%' },
  inviteModalContent: { maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalBody: { padding: 20, maxHeight: 400 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  modalCancelText: { fontSize: 16 },
  modalSaveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalSaveText: { color: '#0d1120', fontSize: 16, fontWeight: '700' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, marginBottom: 8 },
  input: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  inputHint: { fontSize: 10, marginTop: 4 },

  // Invite modal styles
  inviteIconContainer: { alignItems: 'center', marginBottom: 16 },
  inviteEmoji: { fontSize: 48 },
  inviteDescription: { fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  sendInviteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 20 },
  sendInviteBtnText: { color: '#0d1120', fontSize: 16, fontWeight: '700' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 12 },
  shareLinkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#c9a84c' },
  shareLinkBtnText: { fontSize: 16, fontWeight: '600' },
  noteText: { fontSize: 11, textAlign: 'center', marginTop: 16, fontStyle: 'italic' },

  // Friends styles
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: 16, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16 },
  inviteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  inviteButtonText: { fontSize: 14, fontWeight: '600' },
  sectionHeader: { fontSize: 13, fontWeight: '600', marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  searchResultsList: { maxHeight: 300 },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  friendsList: { maxHeight: 400 },
  friendItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  friendAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  friendAvatarText: { fontSize: 24 },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  friendUsername: { fontSize: 12, marginBottom: 2 },
  friendStats: { flexDirection: 'row', gap: 12 },
  friendStat: { fontSize: 11 },
  addFriendBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  addFriendBtnText: { color: '#0d1120', fontWeight: '600', fontSize: 12 },
  removeFriendBtn: { padding: 8 },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef444415' },
  requestDate: { fontSize: 10, marginTop: 2 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', marginHorizontal: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#c9a84c' },
  tabText: { fontSize: 14, fontWeight: '500' },
  loader: { margin: 20 },
  emptyFriends: { alignItems: 'center', padding: 40 },
  emptyFriendsText: { fontSize: 16, marginBottom: 8 },
  emptyFriendsSubtext: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  emptyInviteBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyInviteBtnText: { color: '#0d1120', fontWeight: '600' },
  emptySearch: { alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 14, marginBottom: 12 },
  inviteNotFoundBtn: { paddingVertical: 8 },
  inviteNotFoundText: { fontSize: 14, fontWeight: '600' },

  // Help styles
  helpSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  helpSectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  faqItem: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1 },
  faqQuestion: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  faqAnswer: { fontSize: 13, lineHeight: 20 },
  helpText: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
});