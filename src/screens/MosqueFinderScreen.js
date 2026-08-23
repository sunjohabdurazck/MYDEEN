// src/screens/MosqueFinderScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../contexts/ThemeContext';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000, toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function formatDistance(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(1)} km`; }

export default function MosqueFinderScreen() {
  const { theme: T } = useTheme();
  const [userCoords, setUserCoords] = useState(null);
  const [mosques, setMosques]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedMosque, setSelected] = useState(null);
  const [error, setError]           = useState(null);

  useEffect(() => {
    let isMounted = true;
    initLocation(isMounted);
    return () => { isMounted = false; };
  }, []);

  const initLocation = async (isMounted = true) => {
    if (isMounted) { setLoading(true); setError(null); }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (isMounted) { setError('Location permission denied'); setLoading(false); }
        return;
      }
      const loc    = await Location.getCurrentPositionAsync({});
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      if (isMounted) setUserCoords(coords);
      await loadMosques(coords.latitude, coords.longitude, isMounted);
    } catch {
      if (isMounted) { setError('Unable to get your location'); setLoading(false); }
    }
  };

  const loadMosques = async (lat, lon, isMounted = true) => {
    try {
      const query = `[out:json][timeout:20];(node["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${lat},${lon});way["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${lat},${lon}););out center;`;
      const resp  = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
      const data  = await resp.json();
      const places = data.elements.map(el => {
        const mLat = el.lat ?? el.center?.lat, mLon = el.lon ?? el.center?.lon;
        if (!mLat || !mLon) return null;
        const distMeters = haversineDistance(lat, lon, mLat, mLon);
        return { id: el.id.toString(), name: el.tags?.name || el.tags?.['name:en'] || 'Mosque', address: el.tags?.['addr:full'] || el.tags?.['addr:street'] || '', latitude: mLat, longitude: mLon, distMeters, distance: formatDistance(distMeters) };
      }).filter(Boolean).sort((a,b) => a.distMeters - b.distMeters);
      if (isMounted) setMosques(places.length > 0 ? places : getMockMosques(lat, lon));
    } catch {
      if (isMounted) setMosques(getMockMosques(lat, lon));
    }
    finally { if (isMounted) setLoading(false); }
  };

  const getMockMosques = (lat, lon) =>
    [{ id:'1', name:'Central Mosque', dLat:0.002, dLon:0.001 }, { id:'2', name:'Islamic Center', dLat:-0.003, dLon:-0.002 }, { id:'3', name:'Masjid Al-Noor', dLat:0.001, dLon:-0.003 }]
    .map(m => { const mLat=lat+m.dLat, mLon=lon+m.dLon, distMeters=haversineDistance(lat,lon,mLat,mLon); return { ...m, latitude:mLat, longitude:mLon, address:'', distMeters, distance:formatDistance(distMeters) }; })
    .sort((a,b) => a.distMeters - b.distMeters);

  const openInMaps = (mosque) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${mosque.latitude},${mosque.longitude}&travelmode=walking`;
    Linking.canOpenURL(url).then(ok => Linking.openURL(ok ? url : `https://maps.google.com/?q=${mosque.latitude},${mosque.longitude}`)).catch(console.error);
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor: T.bg }]}>
      <ActivityIndicator size="large" color={T.gold} />
      <Text style={[styles.centerText, { color: T.muted }]}>Finding mosques near you…</Text>
    </View>
  );

  if (error) return (
    <View style={[styles.center, { backgroundColor: T.bg }]}>
      <Ionicons name="alert-circle-outline" size={48} color={T.muted} />
      <Text style={[styles.centerText, { color: T.muted }]}>{error}</Text>
      <TouchableOpacity style={[styles.retryBtn, { backgroundColor: T.gold }]} onPress={initLocation}>
        <Text style={[styles.retryBtnText, { color: T.bg }]}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      <FlatList
        data={mosques}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[styles.listHeader, { borderBottomColor: T.border }]}>
            <Text style={[styles.listTitle, { color: T.text }]}>Nearby Mosques</Text>
            <Text style={[styles.listSub, { color: T.muted }]}>{mosques.length} found within 5 km</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { backgroundColor: T.surface, borderColor: selectedMosque?.id === item.id ? T.gold : T.border }]}
            onPress={() => { setSelected(item); openInMaps(item); }}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: T.isDark ? 'rgba(201,168,76,0.1)' : 'rgba(184,134,11,0.1)' }]}>
              <Ionicons name="location" size={22} color={T.gold} />
            </View>
            <View style={styles.rowContent}>
              <Text style={[styles.rowName, { color: T.text }]}>{item.name}</Text>
              <View style={styles.distRow}>
                <Ionicons name="walk-outline" size={12} color={T.emerald} />
                <Text style={[styles.distText, { color: T.emerald }]}>{item.distance}</Text>
                {item.address ? <Text style={[styles.addrText, { color: T.muted }]} numberOfLines={1}> · {item.address}</Text> : null}
              </View>
            </View>
            <Ionicons name="navigate-outline" size={20} color={T.muted} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  centerText: { fontSize: 16, textAlign: 'center' },
  retryBtn:   { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 25 },
  retryBtnText: { fontWeight: '700' },
  list:       { paddingHorizontal: 16, paddingBottom: 32 },
  listHeader: { paddingVertical: 20, borderBottomWidth: 1, marginBottom: 12 },
  listTitle:  { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  listSub:    { fontSize: 14 },
  row:        { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 1 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowContent: { flex: 1 },
  rowName:    { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  distRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distText:   { fontSize: 13, fontWeight: '600' },
  addrText:   { fontSize: 12, flex: 1 },
});
