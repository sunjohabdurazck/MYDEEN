<div align="center">

# 🕌 Deen App

### Your Full-Stack Islamic Companion

*Prayer times · Quran reader · AI assistant · Qibla compass · Gamified tracking*

[![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ Overview

**Deen App** is a feature-rich Islamic companion built with React Native (Expo) and Supabase. It combines accurate prayer times, a beautiful Quran reader, an AI-powered Islamic assistant, and a gamified accountability system — all in a single, dark-first mobile app designed for iOS and Android.

---

## 📱 Features

### 🕐 Prayer Times
- Location-based prayer times via the **Aladhan API** (no API key required)
- Support for 14 calculation methods (MWL, ISNA, Umm Al-Qura, Karachi, and more)
- Madhab selection (Shafi / Hanafi for Asr calculation)
- Hijri date display
- Real-time countdown to next prayer

### 📖 Quran Reader
- All 114 surahs via **Quran.com API v4**
- Arabic text with multiple translations (Saheeh International, Clear Quran, Bengali, Yusuf Ali)
- Verse-by-verse progress tracking with bookmark support
- Reading history saved to Supabase

### 🤖 Deen AI — Islamic Assistant
- Powered by **OpenRouter (GPT-4o-mini)**
- Answers fiqh questions with cited Quranic verses and hadith references
- Confidence scoring per response (High Certainty → Consult Scholar)
- Conversation history persisted to Supabase
- Scholar note triggered for low-confidence answers

### 🔒 Prayer Lock Screen
- Full-screen app blocker activates at prayer time
- **Hardcore Mode**: restricts bypass ability entirely
- Step-based confirmation flow (lock → confirm → reason → done)
- Bypass reason logging for self-accountability
- Vibration and persistent notification during lock period

### 🧭 Qibla Compass
- Real-time direction using **Expo Sensors** (magnetometer + accelerometer)
- Bearing calculation relative to the user's GPS coordinates
- Animated compass needle UI

### 📿 Tasbih Counter
- Digital dhikr counter with haptic feedback
- Pre-set dhikr options (Subhanallah, Alhamdulillah, Allahu Akbar, etc.)
- Session history saved to Supabase

### 🕌 Mosque Finder
- Nearby mosques via **Google Places API**
- Map view using `react-native-maps`
- Distance, address, and opening hours

### 📊 Progress & Gamification
| Action | XP |
|--------|----|
| Fajr prayed | +80 |
| Isha prayed | +60 |
| Dhuhr / Asr / Maghrib | +40 |
| 5/5 prayers in a day | +50 bonus |
| Quran page read | +10 |
| Tasbih session (33+) | +15 |

- Level system: `floor(totalXP / 500) + 1`
- Daily streak tracking with best-streak record
- Badge achievements unlocked by milestones
- Friends list and accountability pairs via Supabase Realtime

### 🔔 Notifications
- 10-minute advance reminders (configurable)
- Adhan sound at prayer time (overrides silent mode on Android)
- Persistent lock screen notification during prayer window
- All notifications cancelable/reschedulable from Settings

### 🎨 Theming & Fonts
- Dark-first design with optional light mode via `ThemeContext`
- Custom fonts: **Plus Jakarta Sans** (UI) + **Amiri** (Arabic text)
- Gold accent color (`#c9a84c`) throughout

---

## 🗂️ Project Structure

```
deen-app/
├── App.js                          # Root: font loading + auth init + ThemeProvider
├── app.json                        # Expo config (permissions, plugins, bundle IDs)
├── package.json
├── eas.json                        # EAS Build config
├── metro.config.js
├── babel.config.js
├── supabase/
│   └── schema.sql                  # Full DB schema, RLS policies, triggers, functions
└── src/
    ├── lib/
    │   └── supabase.js             # Supabase client + realtime helpers + db utils
    ├── contexts/
    │   └── ThemeContext.js         # Dark/light theme with token system
    ├── store/
    │   └── index.js                # Zustand stores (persisted via AsyncStorage)
    │       ├── usePrayerStore      # Timings, logs, next prayer, Hijri date
    │       ├── useQuranStore       # Chapters, verses, progress, bookmarks
    │       └── useAuthStore        # Session, profile, realtime subscription
    ├── services/
    │   ├── aladhan.js              # Prayer times + Hijri dates (Aladhan API)
    │   ├── quran.js                # Quran.com API v4 (chapters, verses, translations)
    │   ├── aiAssistant.js          # OpenRouter chat + source extraction + confidence
    │   ├── appBlocker.js           # Prayer lock state machine + bypass logging
    │   ├── notifications.js        # Expo Notifications scheduling (adhan + reminders)
    │   ├── adhanPlayer.js          # Audio playback via expo-av
    │   ├── placesApi.js            # Google Places (mosque finder)
    │   ├── prayerCalculator.js     # Local fallback prayer time math
    │   ├── qiblaCalculator.js      # Bearing calculation from lat/lng
    │   └── tajweed.js              # Tajweed rule highlighting helpers
    ├── navigation/
    │   └── AppNavigator.js         # Root Stack → Bottom Tabs → Nested stacks
    ├── screens/
    │   ├── HomeScreen.js           # Prayer times dashboard + hero card
    │   ├── LockScreen.js           # Full-screen prayer blocker (modal)
    │   ├── QuranScreen.js          # Surah list + search
    │   ├── SurahScreen.js          # Verse-by-verse reader
    │   ├── AIChatScreen.js         # Deen AI chat interface
    │   ├── ProgressScreen.js       # Streak, XP chart, prayer calendar
    │   ├── ProfileScreen.js        # User profile, friends, badges
    │   ├── SettingsScreen.js       # Prayer method, madhab, notifications
    │   ├── QiblaScreen.js          # Live compass with bearing
    │   ├── TasbihScreen.js         # Dhikr counter
    │   ├── MosqueFinderScreen.js   # Map + nearby mosques
    │   ├── AuthScreen.js           # Login / sign-up
    │   └── OnboardingScreen.js     # First-time location + method setup
    └── components/
        ├── NextPrayerHero.js       # Large countdown card
        ├── PrayerCard.js           # Single prayer row (tap to log)
        ├── DailyProgressBar.js     # 5-prayer progress bar
        ├── QuickActions.js         # Qibla / Tasbih / Mosque shortcut buttons
        ├── StreakDisplay.js        # Fire icon + current streak
        └── BadgeGrid.js            # Achievement badge grid
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native 0.81.5 + Expo SDK 54 |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| State management | Zustand 4 (persisted via AsyncStorage / localStorage) |
| Backend / Auth | Supabase (PostgreSQL + Row Level Security) |
| Prayer times | Aladhan REST API (free, no key) |
| Quran data | Quran.com API v4 (free, no key) |
| AI assistant | OpenRouter API → GPT-4o-mini |
| Maps | react-native-maps + Google Places API |
| Sensors | expo-sensors (magnetometer for Qibla) |
| Notifications | expo-notifications + expo-av (adhan audio) |
| Location | expo-location |
| Camera | expo-camera (Qibla AR, future) |
| Fonts | Plus Jakarta Sans + Amiri (via Google Fonts CDN) |

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A [Supabase](https://supabase.com) account (free tier is fine)
- An [OpenRouter](https://openrouter.ai) account for Deen AI
- (Optional) Google Maps API key for Mosque Finder

---

### 1. Clone & Install

```bash
git clone https://github.com/yourname/deen-app.git
cd deen-app
npx expo install
```

---

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. In the **SQL Editor**, paste and run the full contents of `supabase/schema.sql`
3. Under **Authentication → Providers**, enable **Email**
4. Optionally enable **Google OAuth** for social sign-in
5. Copy your **Project URL** and **anon public key** from *Project Settings → API*

---

### 3. Configure Environment Variables

Create a `.env` file in the root:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenRouter (Deen AI)
EXPO_PUBLIC_OPENROUTER_KEY=sk-or-...

# Google Places (Mosque Finder) — optional
EXPO_PUBLIC_GOOGLE_PLACES_KEY=AIza...
```

> **Note:** All `EXPO_PUBLIC_` variables are bundled into the client. Never store secret keys with this prefix.

---

### 4. Run the App

```bash
# Start Expo dev server
npx expo start

# Run directly on a device/simulator
npx expo run:android
npx expo run:ios
```

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User settings, location, level, XP, streak, prayer method |
| `prayer_logs` | Per-prayer daily records (`prayed` / `missed` / `qada` / `pending`) |
| `quran_progress` | Last ayah read per surah, completion flag, read count |
| `bookmarks` | Saved ayahs and duas |
| `tasbih_sessions` | Dhikr counter history with dhikr text and count |
| `fasting_logs` | Ramadan + voluntary fast tracking |
| `friendships` | Friend connections with status (`pending` / `accepted`) |
| `accountability_pairs` | Paired accountability partners |
| `user_badges` | Earned achievement badges |
| `ai_chats` | AI conversation history (role, content, metadata, confidence) |

### Key Database Features
- **Row Level Security (RLS)** on every table — users can only read/write their own data
- **Auto-create profile trigger** fires on new Supabase Auth signup
- **XP award trigger** fires when a prayer is logged as `prayed`
- **Streak calculation function** computed server-side
- **Realtime enabled** on `prayer_logs` and `profiles` for live friend updates

---

## 🧱 Navigation Architecture

```
NavigationContainer
└── Root Stack (no header)
    ├── [Unauthenticated]
    │   ├── Onboarding          ← location + method setup
    │   └── Auth                ← login / sign-up
    │
    └── [Authenticated]
        ├── Main → Bottom Tabs
        │   ├── Home Stack
        │   │   ├── HomeMain    ← prayer dashboard
        │   │   ├── Qibla       (modal)
        │   │   ├── Tasbih      (modal)
        │   │   └── MosqueFinder (modal)
        │   ├── Quran Stack
        │   │   ├── QuranList
        │   │   └── Surah
        │   ├── AIChat
        │   ├── Progress
        │   └── Profile
        ├── Lock                ← fullScreenModal
        └── Settings            ← modal
```

---

## 🔔 Notification Architecture

```
Prayer time approaches
        │
        ▼
┌─────────────────────┐
│  10-min reminder    │  ← schedulable, cancelable per prayer
│  (local push)       │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Adhan at prayer    │  ← plays adhan.mp3 via expo-av
│  time (audio)       │    overrides silent mode (Android)
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│  Lock Screen        │  ← notification tap → navigate('Lock')
│  (full overlay)     │    persistent notification keeps session
└─────────────────────┘
```

---

## 🤖 Deen AI — How It Works

```
User question
     │
     ▼
cleanHistory()        ← strips null/empty messages from history
     │
     ▼
OpenRouter API        ← model: openai/gpt-4o-mini
  system prompt       ← instructs direct answers + Islamic citations
  last 6 turns        ← context window management
     │
     ▼
extractSources()      ← regex for Quran N:N and hadith names
calculateConfidence() ← 20–85% based on sources found
     │
     ▼
Result object: { answer, confidence, sources, scholar_note, related_topics }
     │
     ▼
Supabase ai_chats     ← persists both user + assistant messages
```

**Confidence Scale:**

| Score | Label | Color |
|-------|-------|-------|
| 85–100 | High Certainty | 🟢 Green |
| 70–84 | Verified | 🟩 Light Green |
| 50–69 | Moderate | 🟡 Amber |
| 30–49 | Uncertain | 🟠 Orange |
| 0–29 | Consult Scholar | 🔴 Red |

---

## 🌐 External APIs

### Aladhan — Prayer Times
```
GET https://api.aladhan.com/v1/timings?latitude=23.8&longitude=90.4&method=3
```

**Method IDs:**
| ID | Name |
|----|------|
| 1 | Karachi (University of Islamic Sciences) |
| 2 | ISNA (North America) |
| 3 | MWL — Muslim World League (default) |
| 4 | Umm Al-Qura (Saudi Arabia) |
| 5 | Egyptian General Authority |
| 7 | Tehran |
| 8–14 | Gulf, Kuwait, Qatar, Singapore, France, Turkey, Russia |

**School (Madhab):** `0` = Shafi/Maliki/Hanbali · `1` = Hanafi

---

### Quran.com API v4
```
GET https://api.quran.com/api/v4/verses/by_chapter/1?translations=131&words=true
```

**Translation IDs:**
| ID | Name |
|----|------|
| 131 | Saheeh International |
| 167 | The Clear Quran (Dr. Mustafa Khattab) — recommended |
| 161 | Bengali — Muhiuddin Khan (for BD users) |
| 85 | Yusuf Ali |

---

## 🏗️ Building for Production

This project uses **EAS Build** (Expo Application Services).

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure your project
eas build:configure

# Build for Android (APK or AAB)
eas build --platform android

# Build for iOS
eas build --platform ios

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

> The EAS project ID is pre-configured in `app.json` under `extra.eas.projectId`.

---

## 🗺️ Roadmap

- [ ] Qibla AR camera overlay
- [ ] Offline Quran audio downloads (multiple reciters)
- [ ] Ramadan mode — full Suhoor / Iftar calendar + niyyah reminders
- [ ] Friends leaderboard powered by Supabase Realtime
- [ ] Halal restaurant finder (Google Places)
- [ ] Community feed / Islamic Q&A board
- [ ] Apple Watch complication for next prayer time
- [ ] Android widget for home screen prayer times
- [ ] Full Tajweed color highlighting in Surah reader
- [ ] Claude API integration for Deen AI (verified scholarly mode)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please follow the existing code style (ES modules, functional components, Zustand for state).

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ❤️ for the Ummah

</div>
