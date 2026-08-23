// src/components/NamesOfAllah.js
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const NAMES = [
  { id:1,  ar:'الرَّحْمَٰنُ', name:'Ar-Rahman',   meaning:'The Most Gracious',          ref:'1:1'   },
  { id:2,  ar:'الرَّحِيمُ',   name:'Ar-Rahim',    meaning:'The Most Merciful',           ref:'2:163' },
  { id:3,  ar:'الْمَلِكُ',    name:'Al-Malik',    meaning:'The King',                    ref:'59:23' },
  { id:4,  ar:'الْقُدُّوسُ',  name:'Al-Quddus',   meaning:'The Most Holy',               ref:'59:23' },
  { id:5,  ar:'السَّلَامُ',   name:'As-Salam',    meaning:'The Source of Peace',         ref:'59:23' },
  { id:6,  ar:'الْمُؤْمِنُ',  name:'Al-Mu\'min',  meaning:'The Guardian of Faith',       ref:'59:23' },
  { id:7,  ar:'الْمُهَيْمِنُ',name:'Al-Muhaymin', meaning:'The Protector',               ref:'59:23' },
  { id:8,  ar:'الْعَزِيزُ',   name:'Al-Aziz',     meaning:'The Almighty',                ref:'59:23' },
  { id:9,  ar:'الْجَبَّارُ',  name:'Al-Jabbar',   meaning:'The Compeller',               ref:'59:23' },
  { id:10, ar:'الْمُتَكَبِّرُ',name:'Al-Mutakabbir',meaning:'The Majestic',             ref:'59:23' },
  { id:11, ar:'الْخَالِقُ',   name:'Al-Khaliq',   meaning:'The Creator',                 ref:'59:24' },
  { id:12, ar:'الْبَارِئُ',   name:'Al-Bari',     meaning:'The Originator',              ref:'59:24' },
  { id:13, ar:'الْمُصَوِّرُ', name:'Al-Musawwir',  meaning:'The Fashioner',               ref:'59:24' },
  { id:14, ar:'الْغَفَّارُ',  name:'Al-Ghaffar',  meaning:'The Forgiving',               ref:'20:82' },
  { id:15, ar:'الْقَهَّارُ',  name:'Al-Qahhar',   meaning:'The Subduer',                 ref:'13:16' },
  { id:16, ar:'الْوَهَّابُ',  name:'Al-Wahhab',   meaning:'The Bestower',                ref:'3:8'   },
  { id:17, ar:'الرَّزَّاقُ',  name:'Ar-Razzaq',   meaning:'The Provider',                ref:'51:58' },
  { id:18, ar:'الْفَتَّاحُ',  name:'Al-Fattah',   meaning:'The Opener',                  ref:'34:26' },
  { id:19, ar:'الْعَلِيمُ',   name:'Al-Alim',     meaning:'The All-Knowing',             ref:'2:158' },
  { id:20, ar:'الْقَابِضُ',   name:'Al-Qabid',    meaning:'The Restrainer',              ref:'2:245' },
  { id:21, ar:'الْبَاسِطُ',   name:'Al-Basit',    meaning:'The Extender',                ref:'2:245' },
  { id:22, ar:'الْخَافِضُ',   name:'Al-Khafid',   meaning:'The Abaser',                  ref:'56:3'  },
  { id:23, ar:'الرَّافِعُ',   name:'Ar-Rafi',     meaning:'The Exalter',                 ref:'56:3'  },
  { id:24, ar:'الْمُعِزُّ',   name:'Al-Mu\'izz',  meaning:'The Honourer',                ref:'3:26'  },
  { id:25, ar:'الْمُذِلُّ',   name:'Al-Mudhill',  meaning:'The Humiliator',              ref:'3:26'  },
  { id:26, ar:'السَّمِيعُ',   name:'As-Sami',     meaning:'The All-Hearing',             ref:'2:127' },
  { id:27, ar:'الْبَصِيرُ',   name:'Al-Basir',    meaning:'The All-Seeing',              ref:'4:58'  },
  { id:28, ar:'الْحَكَمُ',    name:'Al-Hakam',    meaning:'The Judge',                   ref:'22:69' },
  { id:29, ar:'الْعَدْلُ',    name:'Al-Adl',      meaning:'The Just',                    ref:'6:115' },
  { id:30, ar:'اللَّطِيفُ',   name:'Al-Latif',    meaning:'The Subtle One',              ref:'6:103' },
  { id:31, ar:'الْخَبِيرُ',   name:'Al-Khabir',   meaning:'The All-Aware',               ref:'6:18'  },
  { id:32, ar:'الْحَلِيمُ',   name:'Al-Halim',    meaning:'The Most Patient',            ref:'2:225' },
  { id:33, ar:'الْعَظِيمُ',   name:'Al-Azim',     meaning:'The Most Great',              ref:'2:255' },
  { id:34, ar:'الْغَفُورُ',   name:'Al-Ghafur',   meaning:'The Forgiving',               ref:'2:173' },
  { id:35, ar:'الشَّكُورُ',   name:'Ash-Shakur',  meaning:'The Appreciative',            ref:'35:30' },
  { id:36, ar:'الْعَلِيُّ',   name:'Al-Aliyy',    meaning:'The Most High',               ref:'2:255' },
  { id:37, ar:'الْكَبِيرُ',   name:'Al-Kabir',    meaning:'The Most Great',              ref:'13:9'  },
  { id:38, ar:'الْحَفِيظُ',   name:'Al-Hafiz',    meaning:'The Preserver',               ref:'11:57' },
  { id:39, ar:'الْمُقِيتُ',   name:'Al-Muqit',    meaning:'The Nourisher',               ref:'4:85'  },
  { id:40, ar:'الْحَسِيبُ',   name:'Al-Hasib',    meaning:'The Reckoner',                ref:'4:6'   },
  { id:41, ar:'الْجَلِيلُ',   name:'Al-Jalil',    meaning:'The Majestic',                ref:'55:27' },
  { id:42, ar:'الْكَرِيمُ',   name:'Al-Karim',    meaning:'The Most Generous',           ref:'27:40' },
  { id:43, ar:'الرَّقِيبُ',   name:'Ar-Raqib',    meaning:'The Watchful',                ref:'4:1'   },
  { id:44, ar:'الْمُجِيبُ',   name:'Al-Mujib',    meaning:'The Responsive',              ref:'11:61' },
  { id:45, ar:'الْوَاسِعُ',   name:'Al-Wasi',     meaning:'The All-Encompassing',        ref:'2:268' },
  { id:46, ar:'الْحَكِيمُ',   name:'Al-Hakim',    meaning:'The Wise',                    ref:'2:129' },
  { id:47, ar:'الْوَدُودُ',   name:'Al-Wadud',    meaning:'The Most Loving',             ref:'11:90' },
  { id:48, ar:'الْمَجِيدُ',   name:'Al-Majid',    meaning:'The Most Glorious',           ref:'11:73' },
  { id:49, ar:'الْبَاعِثُ',   name:'Al-Ba\'ith',  meaning:'The Resurrector',             ref:'22:7'  },
  { id:50, ar:'الشَّهِيدُ',   name:'Ash-Shahid',  meaning:'The Witness',                 ref:'4:79'  },
  { id:51, ar:'الْحَقُّ',     name:'Al-Haqq',     meaning:'The Absolute Truth',          ref:'22:6'  },
  { id:52, ar:'الْوَكِيلُ',   name:'Al-Wakil',    meaning:'The Trustee',                 ref:'3:173' },
  { id:53, ar:'الْقَوِيُّ',   name:'Al-Qawiyy',   meaning:'The All-Powerful',            ref:'22:74' },
  { id:54, ar:'الْمَتِينُ',   name:'Al-Matin',    meaning:'The Firm One',                ref:'51:58' },
  { id:55, ar:'الْوَلِيُّ',   name:'Al-Waliyy',   meaning:'The Protecting Friend',       ref:'42:28' },
  { id:56, ar:'الْحَمِيدُ',   name:'Al-Hamid',    meaning:'The Praiseworthy',            ref:'2:267' },
  { id:57, ar:'الْمُحْصِي',   name:'Al-Muhsi',    meaning:'The All-Enumerating',         ref:'19:94' },
  { id:58, ar:'الْمُبْدِئُ',  name:'Al-Mubdi',    meaning:'The Originator',              ref:'85:13' },
  { id:59, ar:'الْمُعِيدُ',   name:'Al-Mu\'id',   meaning:'The Restorer',                ref:'85:13' },
  { id:60, ar:'الْمُحْيِي',   name:'Al-Muhyi',    meaning:'The Giver of Life',           ref:'30:50' },
  { id:61, ar:'الْمُمِيتُ',   name:'Al-Mumit',    meaning:'The Taker of Life',           ref:'3:156' },
  { id:62, ar:'الْحَيُّ',     name:'Al-Hayy',     meaning:'The Ever-Living',             ref:'2:255' },
  { id:63, ar:'الْقَيُّومُ',  name:'Al-Qayyum',   meaning:'The Self-Subsisting',         ref:'2:255' },
  { id:64, ar:'الْوَاجِدُ',   name:'Al-Wajid',    meaning:'The Finder',                  ref:'Hadith'},
  { id:65, ar:'الْمَاجِدُ',   name:'Al-Majid',    meaning:'The Noble',                   ref:'Hadith'},
  { id:66, ar:'الْوَاحِدُ',   name:'Al-Wahid',    meaning:'The One',                     ref:'13:16' },
  { id:67, ar:'الْأَحَدُ',    name:'Al-Ahad',     meaning:'The Unique',                  ref:'112:1' },
  { id:68, ar:'الصَّمَدُ',    name:'As-Samad',    meaning:'The Eternal Refuge',          ref:'112:2' },
  { id:69, ar:'الْقَادِرُ',   name:'Al-Qadir',    meaning:'The All-Capable',             ref:'6:65'  },
  { id:70, ar:'الْمُقْتَدِرُ',name:'Al-Muqtadir', meaning:'The All-Determining',        ref:'18:45' },
  { id:71, ar:'الْمُقَدِّمُ', name:'Al-Muqaddim', meaning:'The Expediter',               ref:'Hadith'},
  { id:72, ar:'الْمُؤَخِّرُ', name:'Al-Mu\'akhkhir',meaning:'The Delayer',              ref:'Hadith'},
  { id:73, ar:'الْأَوَّلُ',   name:'Al-Awwal',    meaning:'The First',                   ref:'57:3'  },
  { id:74, ar:'الْآخِرُ',     name:'Al-Akhir',    meaning:'The Last',                    ref:'57:3'  },
  { id:75, ar:'الظَّاهِرُ',   name:'Az-Zahir',    meaning:'The Manifest',                ref:'57:3'  },
  { id:76, ar:'الْبَاطِنُ',   name:'Al-Batin',    meaning:'The Hidden',                  ref:'57:3'  },
  { id:77, ar:'الْوَالِي',    name:'Al-Wali',     meaning:'The Governor',                ref:'13:11' },
  { id:78, ar:'الْمُتَعَالِي',name:'Al-Muta\'ali',meaning:'The Most Exalted',            ref:'13:9'  },
  { id:79, ar:'الْبَرُّ',     name:'Al-Barr',     meaning:'The Good',                    ref:'52:28' },
  { id:80, ar:'التَّوَّابُ',  name:'At-Tawwab',   meaning:'The Ever-Relenting',          ref:'2:128' },
  { id:81, ar:'الْمُنْتَقِمُ',name:'Al-Muntaqim', meaning:'The Avenger',                 ref:'32:22' },
  { id:82, ar:'الْعَفُوُّ',   name:'Al-Afuww',    meaning:'The Pardoner',                ref:'4:99'  },
  { id:83, ar:'الرَّءُوفُ',   name:'Ar-Ra\'uf',   meaning:'The Most Kind',               ref:'3:30'  },
  { id:84, ar:'مَالِكُ الْمُلْكِ',name:'Malik-ul-Mulk',meaning:'Master of the Kingdom', ref:'3:26'  },
  { id:85, ar:'ذُو الْجَلَالِ',name:'Dhul-Jalal', meaning:'Lord of Majesty',             ref:'55:27' },
  { id:86, ar:'الْمُقْسِطُ',  name:'Al-Muqsit',   meaning:'The Equitable',               ref:'Hadith'},
  { id:87, ar:'الْجَامِعُ',   name:'Al-Jami',     meaning:'The Gatherer',                ref:'3:9'   },
  { id:88, ar:'الْغَنِيُّ',   name:'Al-Ghani',    meaning:'The Self-Sufficient',         ref:'3:97'  },
  { id:89, ar:'الْمُغْنِي',   name:'Al-Mughni',   meaning:'The Enricher',                ref:'9:28'  },
  { id:90, ar:'الْمَانِعُ',   name:'Al-Mani',     meaning:'The Preventer',               ref:'Hadith'},
  { id:91, ar:'الضَّارُّ',    name:'Ad-Darr',     meaning:'The Distresser',              ref:'Hadith'},
  { id:92, ar:'النَّافِعُ',   name:'An-Nafi',     meaning:'The Propitious',              ref:'Hadith'},
  { id:93, ar:'النُّورُ',     name:'An-Nur',      meaning:'The Light',                   ref:'24:35' },
  { id:94, ar:'الْهَادِي',    name:'Al-Hadi',     meaning:'The Guide',                   ref:'22:54' },
  { id:95, ar:'الْبَدِيعُ',   name:'Al-Badi',     meaning:'The Incomparable',            ref:'2:117' },
  { id:96, ar:'الْبَاقِي',    name:'Al-Baqi',     meaning:'The Ever-Surviving',          ref:'Hadith'},
  { id:97, ar:'الْوَارِثُ',   name:'Al-Warith',   meaning:'The Inheritor',               ref:'15:23' },
  { id:98, ar:'الرَّشِيدُ',   name:'Ar-Rashid',   meaning:'The Guide to Right Path',     ref:'Hadith'},
  { id:99, ar:'الصَّبُورُ',   name:'As-Sabur',    meaning:'The Patient',                 ref:'Hadith'},
];

function NameCard({ item, theme: T, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: T.card ?? T.bg, borderColor: T.border }]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <Text style={[styles.number, { color: T.muted }]}>{item.id}</Text>
      <Text style={[styles.arabic, { color: T.gold }]}>{item.ar}</Text>
      <Text style={[styles.latin, { color: T.text }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[styles.meaning, { color: T.muted }]} numberOfLines={2}>{item.meaning}</Text>
    </TouchableOpacity>
  );
}

function NameDetailModal({ item, visible, onClose, theme: T }) {
  if (!item) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, { backgroundColor: T.surface, borderColor: T.border }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color={T.muted} />
          </TouchableOpacity>
          <Text style={[styles.detailNum, { color: T.muted }]}>#{item.id} of 99</Text>
          <Text style={[styles.detailArabic, { color: T.gold }]}>{item.ar}</Text>
          <Text style={[styles.detailName, { color: T.text }]}>{item.name}</Text>
          <Text style={[styles.detailMeaning, { color: T.muted }]}>{item.meaning}</Text>
          {item.ref && item.ref !== 'Hadith' && (
            <View style={[styles.refChip, { backgroundColor: T.gold + '18', borderColor: T.gold + '44' }]}>
              <Text style={[styles.refText, { color: T.gold }]}>📖 Quran {item.ref}</Text>
            </View>
          )}
          {item.ref === 'Hadith' && (
            <View style={[styles.refChip, { backgroundColor: T.muted + '18', borderColor: T.border }]}>
              <Text style={[styles.refText, { color: T.muted }]}>📚 Mentioned in Hadith</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function NamesOfAllah() {
  const { theme: T } = useTheme();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return NAMES;
    return NAMES.filter(n =>
      n.name.toLowerCase().includes(q) ||
      n.meaning.toLowerCase().includes(q) ||
      n.ar.includes(q)
    );
  }, [search]);

  return (
    <View style={[styles.container, { backgroundColor: T.surface, borderColor: T.border }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: T.text }]}>🕌 99 Names of Allah</Text>
          <Text style={[styles.subtitle, { color: T.muted }]}>Al-Asma-ul-Husna</Text>
        </View>
      </View>

      <View style={[styles.searchBar, { backgroundColor: T.inputBg ?? T.bg, borderColor: T.border }]}>
        <Ionicons name="search" size={15} color={T.muted} />
        <TextInput
          placeholder="Search names or meanings..."
          placeholderTextColor={T.muted}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: T.text }]}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={T.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        numColumns={3}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <NameCard item={item} theme={T} onPress={setSelected} />
        )}
        contentContainerStyle={styles.grid}
      />

      <NameDetailModal
        item={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
        theme={T}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 14,
  },
  headerRow: { marginBottom: 10 },
  title: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold' },
  subtitle: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', marginTop: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans-Regular' },
  grid: { gap: 6 },
  card: {
    flex: 1,
    margin: 3,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    minHeight: 80,
  },
  number: { fontSize: 9, fontFamily: 'PlusJakartaSans-Regular', marginBottom: 2 },
  arabic: { fontSize: 16, fontFamily: 'System', marginBottom: 2, textAlign: 'center' },
  latin: { fontSize: 10, fontFamily: 'PlusJakartaSans-SemiBold', textAlign: 'center' },
  meaning: { fontSize: 9, fontFamily: 'PlusJakartaSans-Regular', textAlign: 'center', marginTop: 2 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: { position: 'absolute', top: 14, right: 14 },
  detailNum: { fontSize: 12, fontFamily: 'PlusJakartaSans-Regular', marginBottom: 8 },
  detailArabic: { fontSize: 42, fontFamily: 'System', marginBottom: 8 },
  detailName: { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', marginBottom: 4 },
  detailMeaning: { fontSize: 14, fontFamily: 'PlusJakartaSans-Regular', marginBottom: 12, textAlign: 'center' },
  refChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  refText: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium' },
});
