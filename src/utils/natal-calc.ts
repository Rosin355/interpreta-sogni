import OriginModule from 'circular-natal-horoscope-js';

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

function getZodiacSign(longitude: number): string {
  const index = Math.floor(((longitude % 360) + 360) % 360 / 30);
  return ZODIAC_SIGNS[index];
}

function getDegreeInSign(longitude: number): number {
  const norm = ((longitude % 360) + 360) % 360;
  return norm % 30;
}

export interface BirthPlaceInput {
  latitude: number;
  longitude: number;
  placeName: string;
  timezone?: string;
}

export function computeNatalChartData({
  birthDate,
  birthTime,
  birthPlace,
}: {
  birthDate: string; // yyyy-MM-dd
  birthTime: string; // HH:mm
  birthPlace: BirthPlaceInput;
}) {
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hours, minutes] = birthTime.split(':').map(Number);

  const OriginClass: any = (OriginModule as any).Origin || (OriginModule as any);
  const origin = new OriginClass({
    year,
    month,
    date: day,
    hour: hours,
    minute: minutes,
    latitude: birthPlace.latitude,
    longitude: birthPlace.longitude,
  });

  const celestialBodies = origin.CelestialBodies.all;
  const ascendant = origin.Ascendant;
  const houses = origin.Houses;

  const planetMapping: Record<string, string> = {
    sun: 'sun',
    moon: 'moon',
    mercury: 'mercury',
    venus: 'venus',
    mars: 'mars',
    jupiter: 'jupiter',
    saturn: 'saturn',
    uranus: 'uranus',
    neptune: 'neptune',
    pluto: 'pluto',
  };

  const planets: Record<string, any> = {};
  const positions: Record<string, number> = {};

  for (const [key, body] of Object.entries(celestialBodies)) {
    const planetKey = key.toLowerCase();
    const mapped = planetMapping[planetKey];
    if (!mapped) continue;

    const b: any = body as any;
    const lon = b.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0;
    const sign = getZodiacSign(lon);
    const degree = getDegreeInSign(lon);
    const houseNumber = b.House?.id ?? 1;
    const retrograde = !!b.isRetrograde;

    planets[mapped] = {
      longitude: lon,
      sign,
      degree: parseFloat(degree.toFixed(2)),
      house: houseNumber,
      retrograde,
    };
    positions[mapped] = lon;
  }

  const housesArray: any[] = [];
  if (houses && typeof houses === 'object') {
    const h: any = houses;
    for (let i = 1; i <= 12; i++) {
      const hk = `House${i}`;
      const house = h[hk];
      if (house?.ChartPosition) {
        const lon = house.ChartPosition.Ecliptic?.DecimalDegrees ?? (i - 1) * 30;
        const sign = getZodiacSign(lon);
        const degree = getDegreeInSign(lon);
        housesArray.push({ number: i, longitude: lon, sign, degree: parseFloat(degree.toFixed(2)) });
      }
    }
  }

  const ascLon = ascendant?.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0;
  const ascData = {
    longitude: ascLon,
    sign: getZodiacSign(ascLon),
    degree: parseFloat(getDegreeInSign(ascLon).toFixed(2)),
  };

  const midheavenHouse = housesArray.find((h) => h.number === 10);
  const midheavenData = midheavenHouse
    ? { longitude: midheavenHouse.longitude, sign: midheavenHouse.sign, degree: midheavenHouse.degree }
    : {
        longitude: (ascLon + 270) % 360,
        sign: getZodiacSign((ascLon + 270) % 360),
        degree: parseFloat(getDegreeInSign((ascLon + 270) % 360).toFixed(2)),
      };

  const aspects: any[] = [];
  const names = Object.keys(positions);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const p1 = names[i];
      const p2 = names[j];
      const pos1 = positions[p1];
      const pos2 = positions[p2];
      let angle = Math.abs(pos1 - pos2);
      if (angle > 180) angle = 360 - angle;

      const push = (type: string, nominal: number, orbAllowed: number) => {
        const orb = Math.abs(angle - nominal);
        if (orb < orbAllowed) {
          aspects.push({ planet1: p1, planet2: p2, type, angle: parseFloat(angle.toFixed(2)), orb: parseFloat(orb.toFixed(2)) });
        }
      };

      push('conjunction', 0, 8);
      push('sextile', 60, 6);
      push('square', 90, 8);
      push('trine', 120, 8);
      push('opposition', 180, 8);
    }
  }

  return {
    planets,
    houses: housesArray,
    ascendant: ascData,
    midheaven: midheavenData,
    aspects,
    calculationDetails: {
      date: birthDate,
      time: birthTime,
      location: birthPlace.placeName,
      latitude: birthPlace.latitude,
      longitude: birthPlace.longitude,
      timezone: birthPlace.timezone,
    },
  } as const;
}
