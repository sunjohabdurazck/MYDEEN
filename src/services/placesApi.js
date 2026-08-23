// src/services/placesApi.js
import { Platform } from 'react-native';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function findNearbyMosques(latitude, longitude, radius = 5000) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&keyword=mosque&type=place_of_worship&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    
    return data.results.map(place => ({
      id: place.place_id,
      name: place.name,
      address: place.vicinity,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      openNow: place.opening_hours?.open_now,
      photoRef: place.photos?.[0]?.photo_reference,
    }));
  } catch (error) {
    console.error('Places API error:', error);
    return [];
  }
}

export function getPhotoUrl(photoRef, maxWidth = 400) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoRef}&key=${GOOGLE_MAPS_API_KEY}`;
}