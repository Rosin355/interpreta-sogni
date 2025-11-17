// Traduzioni italiane per elementi astrologici

export const ZODIAC_SIGNS_IT: Record<string, string> = {
  'Aries': 'Ariete',
  'Taurus': 'Toro',
  'Gemini': 'Gemelli',
  'Cancer': 'Cancro',
  'Leo': 'Leone',
  'Virgo': 'Vergine',
  'Libra': 'Bilancia',
  'Scorpio': 'Scorpione',
  'Sagittarius': 'Sagittario',
  'Capricorn': 'Capricorno',
  'Aquarius': 'Acquario',
  'Pisces': 'Pesci'
};

export const PLANETS_IT: Record<string, string> = {
  'sun': 'Sole',
  'moon': 'Luna',
  'mercury': 'Mercurio',
  'venus': 'Venere',
  'mars': 'Marte',
  'jupiter': 'Giove',
  'saturn': 'Saturno',
  'uranus': 'Urano',
  'neptune': 'Nettuno',
  'pluto': 'Plutone',
  'north_node': 'Nodo Nord',
  'south_node': 'Nodo Sud',
  'chiron': 'Chirone'
};

export const ASPECTS_IT: Record<string, string> = {
  'conjunction': 'Congiunzione',
  'opposition': 'Opposizione',
  'trine': 'Trigono',
  'square': 'Quadrato',
  'sextile': 'Sestile',
  'quincunx': 'Quinconce'
};

export const PLANET_SYMBOLS: Record<string, string> = {
  'sun': '☉',
  'moon': '☽',
  'mercury': '☿',
  'venus': '♀',
  'mars': '♂',
  'jupiter': '♃',
  'saturn': '♄',
  'uranus': '♅',
  'neptune': '♆',
  'pluto': '♇',
  'north_node': '☊',
  'south_node': '☋',
  'chiron': '⚷'
};

export const ZODIAC_SYMBOLS: Record<string, string> = {
  'Aries': '♈',
  'Taurus': '♉',
  'Gemini': '♊',
  'Cancer': '♋',
  'Leo': '♌',
  'Virgo': '♍',
  'Libra': '♎',
  'Scorpio': '♏',
  'Sagittarius': '♐',
  'Capricorn': '♑',
  'Aquarius': '♒',
  'Pisces': '♓'
};

export function translateSign(sign: string): string {
  return ZODIAC_SIGNS_IT[sign] || sign;
}

export function translatePlanet(planet: string): string {
  return PLANETS_IT[planet] || planet;
}

export function translateAspect(aspect: string): string {
  return ASPECTS_IT[aspect] || aspect;
}

export function getPlanetSymbol(planet: string): string {
  return PLANET_SYMBOLS[planet] || '';
}

export function getZodiacSymbol(sign: string): string {
  return ZODIAC_SYMBOLS[sign] || '';
}
