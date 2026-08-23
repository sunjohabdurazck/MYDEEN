// src/services/quran.js - COMPLETE FIX for tafsir, translation, and audio on WEB
// Quran API service using Quran.com API with CORS support for web

const QURAN_API_BASE = 'https://api.quran.com/api/v4';
const ALQURAN_API_BASE = 'https://api.alquran.cloud/v1';

// ============================================================
// TRANSLATIONS & RECITERS CONFIGURATION
// ============================================================

export const TRANSLATIONS = {
  Clear_Quran: 'clear_quran',
  Sahih_International: 'en.sahih',
  Yusuf_Ali: 'en.yusufali',
  Muhsin_Khan: 'en.muhsinkhan',
  Pickthall: 'en.pickthall',
  Dr_Ghali: 'en.ghali',
};

// Translation ID mapping for Quran.com API
const TRANSLATION_ID_MAP = {
  'en.sahih': 131,       // Sahih International
  'en.yusufali': 85,     // Yusuf Ali
  'en.pickthall': 95,    // Pickthall
  'en.muhsinkhan': 84,   // Muhsin Khan
  'en.ghali': 136,       // Dr. Ghali
};

export const RECITERS = {
  Mishary_Alafasy: 'mishary_alafasy',
  Abdul_Basit: 'abdul_basit',
  Saad_Al_Ghamdi: 'saad_al_ghamdi',
  Maher_Al_Muaiqly: 'maher_al_muaiqly',
  Yasser_Al_Dosari: 'yasser_al_dosari',
};

// ============================================================
// COMPLETE CHAPTERS DATA (114 Surahs)
// ============================================================

export const ALL_CHAPTERS = [
  { id: 1, name: 'Al-Fatiha', nameArabic: 'الفاتحة', nameTransliteration: 'Al-Fatihah', versesCount: 7, revelationPlace: 'Mecca' },
  { id: 2, name: 'Al-Baqarah', nameArabic: 'البقرة', nameTransliteration: 'Al-Baqarah', versesCount: 286, revelationPlace: 'Medina' },
  { id: 3, name: 'Aal-E-Imran', nameArabic: 'آل عمران', nameTransliteration: 'Aal-i-Imran', versesCount: 200, revelationPlace: 'Medina' },
  { id: 4, name: 'An-Nisa', nameArabic: 'النساء', nameTransliteration: 'An-Nisa', versesCount: 176, revelationPlace: 'Medina' },
  { id: 5, name: 'Al-Maidah', nameArabic: 'المائدة', nameTransliteration: 'Al-Maida', versesCount: 120, revelationPlace: 'Medina' },
  { id: 6, name: 'Al-Anam', nameArabic: 'الأنعام', nameTransliteration: 'Al-An\'am', versesCount: 165, revelationPlace: 'Mecca' },
  { id: 7, name: 'Al-Araf', nameArabic: 'الأعراف', nameTransliteration: 'Al-A\'raf', versesCount: 206, revelationPlace: 'Mecca' },
  { id: 8, name: 'Al-Anfal', nameArabic: 'الأنفال', nameTransliteration: 'Al-Anfal', versesCount: 75, revelationPlace: 'Medina' },
  { id: 9, name: 'At-Tawbah', nameArabic: 'التوبة', nameTransliteration: 'At-Tawbah', versesCount: 129, revelationPlace: 'Medina' },
  { id: 10, name: 'Yunus', nameArabic: 'يونس', nameTransliteration: 'Yunus', versesCount: 109, revelationPlace: 'Mecca' },
  { id: 11, name: 'Hud', nameArabic: 'هود', nameTransliteration: 'Hud', versesCount: 123, revelationPlace: 'Mecca' },
  { id: 12, name: 'Yusuf', nameArabic: 'يوسف', nameTransliteration: 'Yusuf', versesCount: 111, revelationPlace: 'Mecca' },
  { id: 13, name: 'Ar-Rad', nameArabic: 'الرعد', nameTransliteration: 'Ar-Ra\'d', versesCount: 43, revelationPlace: 'Medina' },
  { id: 14, name: 'Ibrahim', nameArabic: 'إبراهيم', nameTransliteration: 'Ibrahim', versesCount: 52, revelationPlace: 'Mecca' },
  { id: 15, name: 'Al-Hijr', nameArabic: 'الحجر', nameTransliteration: 'Al-Hijr', versesCount: 99, revelationPlace: 'Mecca' },
  { id: 16, name: 'An-Nahl', nameArabic: 'النحل', nameTransliteration: 'An-Nahl', versesCount: 128, revelationPlace: 'Mecca' },
  { id: 17, name: 'Al-Isra', nameArabic: 'الإسراء', nameTransliteration: 'Al-Isra', versesCount: 111, revelationPlace: 'Mecca' },
  { id: 18, name: 'Al-Kahf', nameArabic: 'الكهف', nameTransliteration: 'Al-Kahf', versesCount: 110, revelationPlace: 'Mecca' },
  { id: 19, name: 'Maryam', nameArabic: 'مريم', nameTransliteration: 'Maryam', versesCount: 98, revelationPlace: 'Mecca' },
  { id: 20, name: 'Ta-Ha', nameArabic: 'طه', nameTransliteration: 'Ta-Ha', versesCount: 135, revelationPlace: 'Mecca' },
  { id: 21, name: 'Al-Anbiya', nameArabic: 'الأنبياء', nameTransliteration: 'Al-Anbiya', versesCount: 112, revelationPlace: 'Mecca' },
  { id: 22, name: 'Al-Hajj', nameArabic: 'الحج', nameTransliteration: 'Al-Hajj', versesCount: 78, revelationPlace: 'Medina' },
  { id: 23, name: 'Al-Muminun', nameArabic: 'المؤمنون', nameTransliteration: 'Al-Mu\'minun', versesCount: 118, revelationPlace: 'Mecca' },
  { id: 24, name: 'An-Nur', nameArabic: 'النور', nameTransliteration: 'An-Nur', versesCount: 64, revelationPlace: 'Medina' },
  { id: 25, name: 'Al-Furqan', nameArabic: 'الفرقان', nameTransliteration: 'Al-Furqan', versesCount: 77, revelationPlace: 'Mecca' },
  { id: 26, name: 'Ash-Shuara', nameArabic: 'الشعراء', nameTransliteration: 'Ash-Shu\'ara', versesCount: 227, revelationPlace: 'Mecca' },
  { id: 27, name: 'An-Naml', nameArabic: 'النمل', nameTransliteration: 'An-Naml', versesCount: 93, revelationPlace: 'Mecca' },
  { id: 28, name: 'Al-Qasas', nameArabic: 'القصص', nameTransliteration: 'Al-Qasas', versesCount: 88, revelationPlace: 'Mecca' },
  { id: 29, name: 'Al-Ankabut', nameArabic: 'العنكبوت', nameTransliteration: 'Al-\'Ankabut', versesCount: 69, revelationPlace: 'Mecca' },
  { id: 30, name: 'Ar-Rum', nameArabic: 'الروم', nameTransliteration: 'Ar-Rum', versesCount: 60, revelationPlace: 'Mecca' },
  { id: 31, name: 'Luqman', nameArabic: 'لقمان', nameTransliteration: 'Luqman', versesCount: 34, revelationPlace: 'Mecca' },
  { id: 32, name: 'As-Sajdah', nameArabic: 'السجدة', nameTransliteration: 'As-Sajdah', versesCount: 30, revelationPlace: 'Mecca' },
  { id: 33, name: 'Al-Ahzab', nameArabic: 'الأحزاب', nameTransliteration: 'Al-Ahzab', versesCount: 73, revelationPlace: 'Medina' },
  { id: 34, name: 'Saba', nameArabic: 'سبأ', nameTransliteration: 'Saba', versesCount: 54, revelationPlace: 'Mecca' },
  { id: 35, name: 'Fatir', nameArabic: 'فاطر', nameTransliteration: 'Fatir', versesCount: 45, revelationPlace: 'Mecca' },
  { id: 36, name: 'Ya-Sin', nameArabic: 'يس', nameTransliteration: 'Ya-Sin', versesCount: 83, revelationPlace: 'Mecca' },
  { id: 37, name: 'As-Saffat', nameArabic: 'الصافات', nameTransliteration: 'As-Saffat', versesCount: 182, revelationPlace: 'Mecca' },
  { id: 38, name: 'Sad', nameArabic: 'ص', nameTransliteration: 'Sad', versesCount: 88, revelationPlace: 'Mecca' },
  { id: 39, name: 'Az-Zumar', nameArabic: 'الزمر', nameTransliteration: 'Az-Zumar', versesCount: 75, revelationPlace: 'Mecca' },
  { id: 40, name: 'Ghafir', nameArabic: 'غافر', nameTransliteration: 'Ghafir', versesCount: 85, revelationPlace: 'Mecca' },
  { id: 41, name: 'Fussilat', nameArabic: 'فصلت', nameTransliteration: 'Fussilat', versesCount: 54, revelationPlace: 'Mecca' },
  { id: 42, name: 'Ash-Shura', nameArabic: 'الشورى', nameTransliteration: 'Ash-Shura', versesCount: 53, revelationPlace: 'Mecca' },
  { id: 43, name: 'Az-Zukhruf', nameArabic: 'الزخرف', nameTransliteration: 'Az-Zukhruf', versesCount: 89, revelationPlace: 'Mecca' },
  { id: 44, name: 'Ad-Dukhan', nameArabic: 'الدخان', nameTransliteration: 'Ad-Dukhan', versesCount: 59, revelationPlace: 'Mecca' },
  { id: 45, name: 'Al-Jathiya', nameArabic: 'الجاثية', nameTransliteration: 'Al-Jathiya', versesCount: 37, revelationPlace: 'Mecca' },
  { id: 46, name: 'Al-Ahqaf', nameArabic: 'الأحقاف', nameTransliteration: 'Al-Ahqaf', versesCount: 35, revelationPlace: 'Mecca' },
  { id: 47, name: 'Muhammad', nameArabic: 'محمد', nameTransliteration: 'Muhammad', versesCount: 38, revelationPlace: 'Medina' },
  { id: 48, name: 'Al-Fath', nameArabic: 'الفتح', nameTransliteration: 'Al-Fath', versesCount: 29, revelationPlace: 'Medina' },
  { id: 49, name: 'Al-Hujurat', nameArabic: 'الحجرات', nameTransliteration: 'Al-Hujurat', versesCount: 18, revelationPlace: 'Medina' },
  { id: 50, name: 'Qaf', nameArabic: 'ق', nameTransliteration: 'Qaf', versesCount: 45, revelationPlace: 'Mecca' },
  { id: 51, name: 'Adh-Dhariyat', nameArabic: 'الذاريات', nameTransliteration: 'Adh-Dhariyat', versesCount: 60, revelationPlace: 'Mecca' },
  { id: 52, name: 'At-Tur', nameArabic: 'الطور', nameTransliteration: 'At-Tur', versesCount: 49, revelationPlace: 'Mecca' },
  { id: 53, name: 'An-Najm', nameArabic: 'النجم', nameTransliteration: 'An-Najm', versesCount: 62, revelationPlace: 'Mecca' },
  { id: 54, name: 'Al-Qamar', nameArabic: 'القمر', nameTransliteration: 'Al-Qamar', versesCount: 55, revelationPlace: 'Mecca' },
  { id: 55, name: 'Ar-Rahman', nameArabic: 'الرحمن', nameTransliteration: 'Ar-Rahman', versesCount: 78, revelationPlace: 'Medina' },
  { id: 56, name: 'Al-Waqiah', nameArabic: 'الواقعة', nameTransliteration: 'Al-Waqi\'ah', versesCount: 96, revelationPlace: 'Mecca' },
  { id: 57, name: 'Al-Hadid', nameArabic: 'الحديد', nameTransliteration: 'Al-Hadid', versesCount: 29, revelationPlace: 'Medina' },
  { id: 58, name: 'Al-Mujadila', nameArabic: 'المجادلة', nameTransliteration: 'Al-Mujadilah', versesCount: 22, revelationPlace: 'Medina' },
  { id: 59, name: 'Al-Hashr', nameArabic: 'الحشر', nameTransliteration: 'Al-Hashr', versesCount: 24, revelationPlace: 'Medina' },
  { id: 60, name: 'Al-Mumtahanah', nameArabic: 'الممتحنة', nameTransliteration: 'Al-Mumtahanah', versesCount: 13, revelationPlace: 'Medina' },
  { id: 61, name: 'As-Saff', nameArabic: 'الصف', nameTransliteration: 'As-Saff', versesCount: 14, revelationPlace: 'Medina' },
  { id: 62, name: 'Al-Jumuah', nameArabic: 'الجمعة', nameTransliteration: 'Al-Jumu\'ah', versesCount: 11, revelationPlace: 'Medina' },
  { id: 63, name: 'Al-Munafiqun', nameArabic: 'المنافقون', nameTransliteration: 'Al-Munafiqun', versesCount: 11, revelationPlace: 'Medina' },
  { id: 64, name: 'At-Taghabun', nameArabic: 'التغابن', nameTransliteration: 'At-Taghabun', versesCount: 18, revelationPlace: 'Medina' },
  { id: 65, name: 'At-Talaq', nameArabic: 'الطلاق', nameTransliteration: 'At-Talaq', versesCount: 12, revelationPlace: 'Medina' },
  { id: 66, name: 'At-Tahrim', nameArabic: 'التحريم', nameTransliteration: 'At-Tahrim', versesCount: 12, revelationPlace: 'Medina' },
  { id: 67, name: 'Al-Mulk', nameArabic: 'الملك', nameTransliteration: 'Al-Mulk', versesCount: 30, revelationPlace: 'Mecca' },
  { id: 68, name: 'Al-Qalam', nameArabic: 'القلم', nameTransliteration: 'Al-Qalam', versesCount: 52, revelationPlace: 'Mecca' },
  { id: 69, name: 'Al-Haqqah', nameArabic: 'الحاقة', nameTransliteration: 'Al-Haqqah', versesCount: 52, revelationPlace: 'Mecca' },
  { id: 70, name: 'Al-Maarij', nameArabic: 'المعارج', nameTransliteration: 'Al-Ma\'arij', versesCount: 44, revelationPlace: 'Mecca' },
  { id: 71, name: 'Nuh', nameArabic: 'نوح', nameTransliteration: 'Nuh', versesCount: 28, revelationPlace: 'Mecca' },
  { id: 72, name: 'Al-Jinn', nameArabic: 'الجن', nameTransliteration: 'Al-Jinn', versesCount: 28, revelationPlace: 'Mecca' },
  { id: 73, name: 'Al-Muzzammil', nameArabic: 'المزمل', nameTransliteration: 'Al-Muzzammil', versesCount: 20, revelationPlace: 'Mecca' },
  { id: 74, name: 'Al-Muddaththir', nameArabic: 'المدثر', nameTransliteration: 'Al-Muddaththir', versesCount: 56, revelationPlace: 'Mecca' },
  { id: 75, name: 'Al-Qiyamah', nameArabic: 'القيامة', nameTransliteration: 'Al-Qiyamah', versesCount: 40, revelationPlace: 'Mecca' },
  { id: 76, name: 'Al-Insan', nameArabic: 'الإنسان', nameTransliteration: 'Al-Insan', versesCount: 31, revelationPlace: 'Medina' },
  { id: 77, name: 'Al-Mursalat', nameArabic: 'المرسلات', nameTransliteration: 'Al-Mursalat', versesCount: 50, revelationPlace: 'Mecca' },
  { id: 78, name: 'An-Naba', nameArabic: 'النبأ', nameTransliteration: 'An-Naba', versesCount: 40, revelationPlace: 'Mecca' },
  { id: 79, name: 'An-Naziat', nameArabic: 'النازعات', nameTransliteration: 'An-Nazi\'at', versesCount: 46, revelationPlace: 'Mecca' },
  { id: 80, name: 'Abasa', nameArabic: 'عبس', nameTransliteration: '\'Abasa', versesCount: 42, revelationPlace: 'Mecca' },
  { id: 81, name: 'At-Takwir', nameArabic: 'التكوير', nameTransliteration: 'At-Takwir', versesCount: 29, revelationPlace: 'Mecca' },
  { id: 82, name: 'Al-Infitar', nameArabic: 'الانفطار', nameTransliteration: 'Al-Infitar', versesCount: 19, revelationPlace: 'Mecca' },
  { id: 83, name: 'Al-Mutaffifin', nameArabic: 'المطففين', nameTransliteration: 'Al-Mutaffifin', versesCount: 36, revelationPlace: 'Mecca' },
  { id: 84, name: 'Al-Inshiqaq', nameArabic: 'الانشقاق', nameTransliteration: 'Al-Inshiqaq', versesCount: 25, revelationPlace: 'Mecca' },
  { id: 85, name: 'Al-Buruj', nameArabic: 'البروج', nameTransliteration: 'Al-Buruj', versesCount: 22, revelationPlace: 'Mecca' },
  { id: 86, name: 'At-Tariq', nameArabic: 'الطارق', nameTransliteration: 'At-Tariq', versesCount: 17, revelationPlace: 'Mecca' },
  { id: 87, name: 'Al-Ala', nameArabic: 'الأعلى', nameTransliteration: 'Al-A\'la', versesCount: 19, revelationPlace: 'Mecca' },
  { id: 88, name: 'Al-Ghashiyah', nameArabic: 'الغاشية', nameTransliteration: 'Al-Ghashiyah', versesCount: 26, revelationPlace: 'Mecca' },
  { id: 89, name: 'Al-Fajr', nameArabic: 'الفجر', nameTransliteration: 'Al-Fajr', versesCount: 30, revelationPlace: 'Mecca' },
  { id: 90, name: 'Al-Balad', nameArabic: 'البلد', nameTransliteration: 'Al-Balad', versesCount: 20, revelationPlace: 'Mecca' },
  { id: 91, name: 'Ash-Shams', nameArabic: 'الشمس', nameTransliteration: 'Ash-Shams', versesCount: 15, revelationPlace: 'Mecca' },
  { id: 92, name: 'Al-Layl', nameArabic: 'الليل', nameTransliteration: 'Al-Layl', versesCount: 21, revelationPlace: 'Mecca' },
  { id: 93, name: 'Ad-Duhaa', nameArabic: 'الضحى', nameTransliteration: 'Ad-Duha', versesCount: 11, revelationPlace: 'Mecca' },
  { id: 94, name: 'Ash-Sharh', nameArabic: 'الشرح', nameTransliteration: 'Ash-Sharh', versesCount: 8, revelationPlace: 'Mecca' },
  { id: 95, name: 'At-Tin', nameArabic: 'التين', nameTransliteration: 'At-Tin', versesCount: 8, revelationPlace: 'Mecca' },
  { id: 96, name: 'Al-Alaq', nameArabic: 'العلق', nameTransliteration: 'Al-\'Alaq', versesCount: 19, revelationPlace: 'Mecca' },
  { id: 97, name: 'Al-Qadr', nameArabic: 'القدر', nameTransliteration: 'Al-Qadr', versesCount: 5, revelationPlace: 'Mecca' },
  { id: 98, name: 'Al-Bayyinah', nameArabic: 'البينة', nameTransliteration: 'Al-Bayyinah', versesCount: 8, revelationPlace: 'Medina' },
  { id: 99, name: 'Az-Zalzalah', nameArabic: 'الزلزلة', nameTransliteration: 'Az-Zalzalah', versesCount: 8, revelationPlace: 'Medina' },
  { id: 100, name: 'Al-Adiyat', nameArabic: 'العاديات', nameTransliteration: 'Al-\'Adiyat', versesCount: 11, revelationPlace: 'Mecca' },
  { id: 101, name: 'Al-Qariah', nameArabic: 'القارعة', nameTransliteration: 'Al-Qari\'ah', versesCount: 11, revelationPlace: 'Mecca' },
  { id: 102, name: 'At-Takathur', nameArabic: 'التكاثر', nameTransliteration: 'At-Takathur', versesCount: 8, revelationPlace: 'Mecca' },
  { id: 103, name: 'Al-Asr', nameArabic: 'العصر', nameTransliteration: 'Al-\'Asr', versesCount: 3, revelationPlace: 'Mecca' },
  { id: 104, name: 'Al-Humazah', nameArabic: 'الهمزة', nameTransliteration: 'Al-Humazah', versesCount: 9, revelationPlace: 'Mecca' },
  { id: 105, name: 'Al-Fil', nameArabic: 'الفيل', nameTransliteration: 'Al-Fil', versesCount: 5, revelationPlace: 'Mecca' },
  { id: 106, name: 'Quraysh', nameArabic: 'قريش', nameTransliteration: 'Quraysh', versesCount: 4, revelationPlace: 'Mecca' },
  { id: 107, name: 'Al-Maun', nameArabic: 'الماعون', nameTransliteration: 'Al-Ma\'un', versesCount: 7, revelationPlace: 'Mecca' },
  { id: 108, name: 'Al-Kawthar', nameArabic: 'الكوثر', nameTransliteration: 'Al-Kawthar', versesCount: 3, revelationPlace: 'Mecca' },
  { id: 109, name: 'Al-Kafirun', nameArabic: 'الكافرون', nameTransliteration: 'Al-Kafirun', versesCount: 6, revelationPlace: 'Mecca' },
  { id: 110, name: 'An-Nasr', nameArabic: 'النصر', nameTransliteration: 'An-Nasr', versesCount: 3, revelationPlace: 'Medina' },
  { id: 111, name: 'Al-Masad', nameArabic: 'المسد', nameTransliteration: 'Al-Masad', versesCount: 5, revelationPlace: 'Mecca' },
  { id: 112, name: 'Al-Ikhlas', nameArabic: 'الإخلاص', nameTransliteration: 'Al-Ikhlas', versesCount: 4, revelationPlace: 'Mecca' },
  { id: 113, name: 'Al-Falaq', nameArabic: 'الفلق', nameTransliteration: 'Al-Falaq', versesCount: 5, revelationPlace: 'Mecca' },
  { id: 114, name: 'An-Nas', nameArabic: 'الناس', nameTransliteration: 'An-Nas', versesCount: 6, revelationPlace: 'Mecca' },
];

// ============================================================
// API FUNCTIONS
// ============================================================

export async function getChapters(language = 'en') {
  try {
    const response = await fetch(`${QURAN_API_BASE}/chapters?language=${language}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.chapters && data.chapters.length > 0) {
        return data.chapters.map(ch => ({
          id: ch.id,
          name: ch.name_simple,
          nameArabic: ch.name_arabic,
          nameTransliteration: ch.name_complex,
          versesCount: ch.verses_count,
          revelationPlace: ch.revelation_place,
          page: ch.page,
        }));
      }
    }
    return ALL_CHAPTERS;
  } catch (error) {
    console.warn('Using fallback chapters data');
    return ALL_CHAPTERS;
  }
}

/**
 * Get verses by chapter ID with translation - FIXED FOR WEB CORS
 */
export async function getVersesByChapter(chapterId, translationId = 'en.sahih', options = {}) {
  const { perPage = 300, page = 1 } = options;
  
  // Map translation identifier to Quran.com translation ID
  const qcTranslationId = TRANSLATION_ID_MAP[translationId] || 131;

  try {
    // ── Step 1: Fetch Arabic text ────────────────────────────────
    const arabicRes = await fetch(
      `https://api.quran.com/api/v4/verses/by_chapter/${chapterId}?language=en&fields=text_uthmani&per_page=${perPage}&page=${page}`
    );

    if (!arabicRes.ok) throw new Error(`Arabic fetch failed: ${arabicRes.status}`);
    const arabicData = await arabicRes.json();

    if (!arabicData.verses || arabicData.verses.length === 0) {
      throw new Error('No verses returned');
    }

    // ── Step 2: Fetch translation (with fallback chain) ──────────
    let translationMap = {}; // verse_key → translation text

    // Primary: Quran.com v4 with translation IDs
    try {
      const transRes = await fetch(
        `https://api.quran.com/api/v4/verses/by_chapter/${chapterId}?language=en&translations=${qcTranslationId}&per_page=${perPage}&page=${page}`
      );
      if (transRes.ok) {
        const transData = await transRes.json();
        (transData.verses || []).forEach(v => {
          const raw = v.translations?.[0]?.text;
          if (raw) translationMap[v.verse_key] = raw.replace(/<[^>]+>/g, '').trim();
        });
      }
    } catch (_) {}

    // Fallback: alquran.cloud (CORS-friendly, returns full surah at once)
    if (Object.keys(translationMap).length === 0) {
      try {
        const fallbackRes = await fetch(
          `https://api.alquran.cloud/v1/surah/${chapterId}/en.sahih`
        );
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          (fallbackData.data?.ayahs || []).forEach(ayah => {
            const key = `${chapterId}:${ayah.numberInSurah}`;
            translationMap[key] = ayah.text || '';
          });
        }
      } catch (_) {}
    }

    // ── Step 3: Merge ────────────────────────────────────────────
    const verses = arabicData.verses.map((verse) => {
      const translation = translationMap[verse.verse_key] || '';
      return {
        id: verse.id,
        verseNumber: verse.verse_number,
        chapterId: parseInt(chapterId),
        verseKey: verse.verse_key,
        textArabic: verse.text_uthmani,
        textUthmani: verse.text_uthmani,
        translation,
        translationId,
        juz: verse.juz_number,
        page: verse.page_number,
        sajdah: false,
      };
    });

    return {
      verses,
      totalVerses: verses.length,
      currentPage: page,
      totalPages: 1,
    };

  } catch (error) {
    console.error('Failed to fetch verses:', error);
    return { 
      verses: [], 
      totalVerses: 0, 
      currentPage: 1, 
      totalPages: 1 
    };
  }
}

/**
 * Get a single verse by chapter and verse number
 */
export async function getVerse(chapterId, verseNumber, translationId = 'en.sahih') {
  try {
    const qcTranslationId = TRANSLATION_ID_MAP[translationId] || 131;
    
    const [arabicRes, transRes] = await Promise.all([
      fetch(`https://api.quran.com/api/v4/verses/by_chapter/${chapterId}?language=en&fields=text_uthmani&per_page=1&page=${verseNumber}`),
      fetch(`https://api.quran.com/api/v4/verses/by_chapter/${chapterId}?language=en&translations=${qcTranslationId}&per_page=1&page=${verseNumber}`)
    ]);
    
    if (!arabicRes.ok) return null;
    
    const arabicData = await arabicRes.json();
    const transData = transRes.ok ? await transRes.json() : null;
    
    if (arabicData.verses && arabicData.verses.length > 0) {
      const verse = arabicData.verses[0];
      const transVerse = transData?.verses?.[0];
      
      return {
        id: verse.id,
        verseNumber: verse.verse_number,
        chapterId: parseInt(chapterId),
        verseKey: verse.verse_key,
        textArabic: verse.text_uthmani,
        translation: transVerse?.translations?.[0]?.text?.replace(/<[^>]+>/g, '') || '',
        juz: verse.juz_number,
        page: verse.page_number,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch verse:', error);
    return null;
  }
}

/**
 * Search the Quran
 */
export async function searchQuran(query, language = 'en', page = 1) {
  try {
    const url = `${QURAN_API_BASE}/search?q=${encodeURIComponent(query)}&language=${language}&page=${page}&size=20`;
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      return {
        results: data.verses?.map(v => ({
          verseId: v.verse_id,
          verseKey: v.verse_key,
          chapterId: v.chapter_id,
          textArabic: v.text,
          translation: v.translation,
          score: v.score,
        })) || [],
        totalResults: data.total_count || 0,
        currentPage: data.current_page || page,
        totalPages: data.total_pages || 1,
      };
    }
    return { results: [], totalResults: 0, currentPage: 1, totalPages: 1 };
  } catch (error) {
    console.error('Search failed:', error);
    return { results: [], totalResults: 0, currentPage: 1, totalPages: 1 };
  }
}

// ============================================================
// AUDIO FUNCTIONS - FIXED FOR WEB CORS
// ============================================================

/**
 * Get audio URL for a verse - WORKS ON WEB WITH CORS
 * @param {string} verseKey - Format: "chapterId:verseNumber" (e.g., "1:1")
 * @returns {Promise<string|null>} - Direct audio URL or null
 */
export async function getQuranAudioUrl(verseKey) {
  try {
    const parts = verseKey.split(':');
    if (parts.length !== 2) {
      console.error('Invalid verseKey format:', verseKey);
      return null;
    }
    
    const [chapter, verse] = parts;
    const paddedChapter = chapter.padStart(3, '0');
    const paddedVerse = verse.padStart(3, '0');
    
    // everyayah.com serves per-verse mp3s and allows CORS on web
    // This gives proper per-verse audio instead of full surah files
    return `https://everyayah.com/data/Mishari_Alafasy_128kbps/${paddedChapter}${paddedVerse}.mp3`;
    
  } catch (error) {
    console.error('Audio URL error:', error);
    return null;
  }
}

/**
 * Simple audio URL getter (synchronous version) - FIXED FOR WEB
 */
export function getAudioUrl(reciterId, verseKey) {
  const parts = verseKey.split(':');
  if (parts.length !== 2) return null;
  const [chapter, verse] = parts;
  const paddedChapter = chapter.padStart(3, '0');
  const paddedVerse = verse.padStart(3, '0');
  return `https://everyayah.com/data/Mishari_Alafasy_128kbps/${paddedChapter}${paddedVerse}.mp3`;
}

export async function getVerseAudio(verseKey, reciterId = 'mishary_alafasy') {
  return getQuranAudioUrl(verseKey);
}

export async function getOfficialQuranAudio(verseKey) {
  return getQuranAudioUrl(verseKey);
}

// ============================================================
// TAFSIR FUNCTIONS - FIXED FOR WEB CORS
// ============================================================

/**
 * Get Tafsir for a verse - WORKS ON WEB WITH PROPER CORS
 */
export async function getTafsir(verseKey) {
  try {
    const [chapterId, verseNumber] = verseKey.split(':');
    
    // Quran.com API v4 tafsir — proper CORS headers
    // 169 = Ibn Kathir (English)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(
      `https://api.quran.com/api/v4/tafsirs/169/by_ayah/${verseKey}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      const text = data?.tafsir?.text;
      if (text && text.trim()) {
        // Strip HTML tags and clean up the text
        return text
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }

    // Fallback: Open on Quran.com
    return `📖 Tafsir for ${verseKey}\n\nRead the full explanation at:\nhttps://quran.com/${chapterId}:${verseNumber}/tafsirs`;
    
  } catch (error) {
    console.error('Tafsir fetch error:', error);
    return `Unable to load tafsir. Visit https://quran.com/${verseKey.replace(':', '/')} for detailed commentary.`;
  }
}

/**
 * Get juz (parah) information
 */
export async function getJuzInfo(juzNumber) {
  try {
    const response = await fetch(`${QURAN_API_BASE}/juzs/${juzNumber}`);
    if (response.ok) {
      const data = await response.json();
      return data.juz;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch juz:', error);
    return null;
  }
}

/**
 * Get all juz (parah) list
 */
export async function getAllJuz() {
  try {
    const response = await fetch(`${QURAN_API_BASE}/juzs`);
    if (response.ok) {
      const data = await response.json();
      return data.juzs;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch juz list:', error);
    return [];
  }
}

/**
 * Get random verse from the Quran
 */
export async function getRandomVerse() {
  try {
    const randomChapter = Math.floor(Math.random() * 114) + 1;
    const response = await fetch(`${QURAN_API_BASE}/verses/by_chapter/${randomChapter}?per_page=1&page=1&fields=text_uthmani`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.verses && data.verses.length > 0) {
        const randomVerseIndex = Math.floor(Math.random() * (data.verses.length || 1));
        const verse = data.verses[randomVerseIndex];
        return {
          verseKey: `${randomChapter}:${verse.verse_number}`,
          textArabic: verse.text_uthmani,
          chapterId: randomChapter,
          verseNumber: verse.verse_number,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch random verse:', error);
    return null;
  }
}

// ============================================================
// HELPERS
// ============================================================

export function getChapterName(chapterId, chapters = []) {
  const chapter = chapters.find(c => c.id === chapterId);
  return chapter || { name: `Surah ${chapterId}`, nameArabic: `سورة ${chapterId}` };
}

export function formatVerseKey(chapterId, verseNumber) {
  return `${chapterId}:${verseNumber}`;
}

export function parseVerseKey(verseKey) {
  const [chapterId, verseNumber] = verseKey.split(':');
  return { chapterId: parseInt(chapterId), verseNumber: parseInt(verseNumber) };
}

export default {
  TRANSLATIONS,
  RECITERS,
  getChapters,
  getVersesByChapter,
  getVerse,
  searchQuran,
  getAudioUrl,
  getVerseAudio,
  getOfficialQuranAudio,
  getQuranAudioUrl,
  getTafsir,
  getJuzInfo,
  getAllJuz,
  getRandomVerse,
  getChapterName,
  formatVerseKey,
  parseVerseKey,
  ALL_CHAPTERS,
};