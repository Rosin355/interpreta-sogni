// Utility per geocoding usando OpenStreetMap Nominatim API

export interface GeocodingResult {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  country?: string;
  city?: string;
}

export async function searchPlaces(query: string): Promise<GeocodingResult[]> {
  if (!query || query.length < 3) {
    return [];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: query,
          format: 'json',
          addressdetails: '1',
          limit: '5',
        }),
      {
        headers: {
          'User-Agent': 'Dreams-Alchemist-App',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    return data.map((item: any) => ({
      name: item.name,
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      country: item.address?.country,
      city: item.address?.city || item.address?.town || item.address?.village,
    }));
  } catch (error) {
    console.error('Error fetching geocoding results:', error);
    return [];
  }
}

export function getTimezone(latitude: number, longitude: number): string {
  // Stima approssimativa del timezone basata sulla longitudine
  // Per un'implementazione più precisa si potrebbe usare un'API dedicata
  const offset = Math.round(longitude / 15);
  return `UTC${offset >= 0 ? '+' : ''}${offset}`;
}
