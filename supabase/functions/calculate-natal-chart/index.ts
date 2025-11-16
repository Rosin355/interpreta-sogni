import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zodiac signs mapping
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

// Helper function to get zodiac sign from longitude
function getZodiacSign(longitude: number): string {
  const signIndex = Math.floor(longitude / 30);
  return ZODIAC_SIGNS[signIndex % 12];
}

// Helper function to get degree within sign
function getDegreeInSign(longitude: number): number {
  return longitude % 30;
}

// Temporary calculation function - uses simplified ephemeris
// TODO: Replace with accurate Swiss Ephemeris calculations
function calculateSimplifiedNatalChart(year: number, month: number, day: number, hour: number, minute: number, latitude: number, longitude: number) {
  // Julian Day calculation
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  const jd = jdn + (hour - 12) / 24 + minute / 1440;

  // Simplified planetary positions (this is placeholder - not astronomically accurate)
  // These should be calculated using proper ephemeris
  const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000.0
  
  // Sun position (very simplified)
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const sunLongitude = (L0 % 360 + 360) % 360;
  
  // Simplified moon, planets positions (using mean motions - NOT accurate)
  const moonLongitude = (218.316 + 481267.881 * T) % 360;
  const mercuryLongitude = (252.25 + 149472.68 * T) % 360;
  const venusLongitude = (181.98 + 58517.82 * T) % 360;
  const marsLongitude = (355.43 + 19141.05 * T) % 360;
  const jupiterLongitude = (34.35 + 3034.91 * T) % 360;
  const saturnLongitude = (50.08 + 1222.11 * T) % 360;
  const uranusLongitude = (314.05 + 428.48 * T) % 360;
  const neptuneLongitude = (304.35 + 218.46 * T) % 360;
  const plutoLongitude = (238.96 + 145.18 * T) % 360;
  
  // Ascendant calculation (simplified)
  const lst = (100.46 + 0.985647 * jdn + longitude + 15 * (hour + minute / 60)) % 360;
  const obliquity = 23.4393 - 0.0000004 * T;
  const ascendantLongitude = Math.atan2(Math.cos(lst * Math.PI / 180), 
    -Math.sin(lst * Math.PI / 180) * Math.cos(obliquity * Math.PI / 180)) * 180 / Math.PI;
  
  return {
    sun: sunLongitude,
    moon: moonLongitude,
    mercury: mercuryLongitude,
    venus: venusLongitude,
    mars: marsLongitude,
    jupiter: jupiterLongitude,
    saturn: saturnLongitude,
    uranus: uranusLongitude,
    neptune: neptuneLongitude,
    pluto: plutoLongitude,
    ascendant: (ascendantLongitude + 360) % 360
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verifica l'utente
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { 
      birthDate, 
      birthTime, 
      birthPlaceName, 
      latitude, 
      longitude, 
      timezone 
    } = await req.json();

    console.log('Calculating natal chart for user:', user.id);
    console.log('Birth data:', { birthDate, birthTime, birthPlaceName, latitude, longitude, timezone });

    // Validazione input
    if (!birthDate || !birthTime || !latitude || !longitude) {
      throw new Error('Missing required birth data');
    }

    // Parse birth date and time
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hours, minutes] = birthTime.split(':').map(Number);

    console.log('Parsed date/time:', { year, month, day, hours, minutes });

    // Calculate natal chart using simplified calculations
    const positions = calculateSimplifiedNatalChart(year, month, day, hours, minutes, latitude, longitude);
    
    console.log('Planetary positions calculated');

    // Helper function to get house number for a degree
    const getHouseForDegree = (degree: number, ascendant: number): number => {
      const relDegree = (degree - ascendant + 360) % 360;
      return Math.floor(relDegree / 30) + 1;
    };

    // Build planets object
    const planets: any = {
      sun: {
        sign: getZodiacSign(positions.sun),
        house: getHouseForDegree(positions.sun, positions.ascendant),
        degree: getDegreeInSign(positions.sun),
        retrograde: false
      },
      moon: {
        sign: getZodiacSign(positions.moon),
        house: getHouseForDegree(positions.moon, positions.ascendant),
        degree: getDegreeInSign(positions.moon),
        retrograde: false
      },
      mercury: {
        sign: getZodiacSign(positions.mercury),
        house: getHouseForDegree(positions.mercury, positions.ascendant),
        degree: getDegreeInSign(positions.mercury),
        retrograde: false
      },
      venus: {
        sign: getZodiacSign(positions.venus),
        house: getHouseForDegree(positions.venus, positions.ascendant),
        degree: getDegreeInSign(positions.venus),
        retrograde: false
      },
      mars: {
        sign: getZodiacSign(positions.mars),
        house: getHouseForDegree(positions.mars, positions.ascendant),
        degree: getDegreeInSign(positions.mars),
        retrograde: false
      },
      jupiter: {
        sign: getZodiacSign(positions.jupiter),
        house: getHouseForDegree(positions.jupiter, positions.ascendant),
        degree: getDegreeInSign(positions.jupiter),
        retrograde: false
      },
      saturn: {
        sign: getZodiacSign(positions.saturn),
        house: getHouseForDegree(positions.saturn, positions.ascendant),
        degree: getDegreeInSign(positions.saturn),
        retrograde: false
      },
      uranus: {
        sign: getZodiacSign(positions.uranus),
        house: getHouseForDegree(positions.uranus, positions.ascendant),
        degree: getDegreeInSign(positions.uranus),
        retrograde: false
      },
      neptune: {
        sign: getZodiacSign(positions.neptune),
        house: getHouseForDegree(positions.neptune, positions.ascendant),
        degree: getDegreeInSign(positions.neptune),
        retrograde: false
      },
      pluto: {
        sign: getZodiacSign(positions.pluto),
        house: getHouseForDegree(positions.pluto, positions.ascendant),
        degree: getDegreeInSign(positions.pluto),
        retrograde: false
      },
      chiron: {
        sign: getZodiacSign((positions.saturn + 45) % 360),
        house: getHouseForDegree((positions.saturn + 45) % 360, positions.ascendant),
        degree: getDegreeInSign((positions.saturn + 45) % 360),
        retrograde: false
      },
      northNode: {
        sign: getZodiacSign((positions.moon + 180) % 360),
        house: getHouseForDegree((positions.moon + 180) % 360, positions.ascendant),
        degree: getDegreeInSign((positions.moon + 180) % 360),
        retrograde: true
      },
      southNode: {
        sign: getZodiacSign(positions.moon),
        house: getHouseForDegree(positions.moon, positions.ascendant),
        degree: getDegreeInSign(positions.moon),
        retrograde: true
      }
    };

    // Build houses array
    const housesArray = [];
    for (let i = 0; i < 12; i++) {
      const houseDegree = (positions.ascendant + i * 30) % 360;
      housesArray.push({
        number: i + 1,
        sign: getZodiacSign(houseDegree),
        degree: houseDegree
      });
    }

    // Get Ascendant and Midheaven
    const ascendant = {
      sign: getZodiacSign(positions.ascendant),
      degree: getDegreeInSign(positions.ascendant)
    };

    const midheavenDegree = (positions.ascendant + 270) % 360;
    const midheaven = {
      sign: getZodiacSign(midheavenDegree),
      degree: getDegreeInSign(midheavenDegree)
    };

    // Calculate basic aspects
    const aspectsArray: any[] = [];
    const planetKeys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    
    for (let i = 0; i < planetKeys.length; i++) {
      for (let j = i + 1; j < planetKeys.length; j++) {
        const planet1 = planetKeys[i];
        const planet2 = planetKeys[j];
        const pos1 = positions[planet1 as keyof typeof positions];
        const pos2 = positions[planet2 as keyof typeof positions];
        
        let angle = Math.abs(pos1 - pos2);
        if (angle > 180) angle = 360 - angle;
        
        // Check for major aspects (with proper orb)
        if (Math.abs(angle - 0) < 8) {
          aspectsArray.push({ planet1, planet2, type: 'conjunction', angle, orb: Math.abs(angle - 0) });
        } else if (Math.abs(angle - 60) < 6) {
          aspectsArray.push({ planet1, planet2, type: 'sextile', angle, orb: Math.abs(angle - 60) });
        } else if (Math.abs(angle - 90) < 8) {
          aspectsArray.push({ planet1, planet2, type: 'square', angle, orb: Math.abs(angle - 90) });
        } else if (Math.abs(angle - 120) < 8) {
          aspectsArray.push({ planet1, planet2, type: 'trine', angle, orb: Math.abs(angle - 120) });
        } else if (Math.abs(angle - 180) < 8) {
          aspectsArray.push({ planet1, planet2, type: 'opposition', angle, orb: Math.abs(angle - 180) });
        }
      }
    }

    const natalChartData = {
      calculatedAt: new Date().toISOString(),
      birthInfo: {
        date: birthDate,
        time: birthTime,
        place: birthPlaceName,
        latitude,
        longitude,
        timezone
      },
      planets,
      houses: housesArray,
      ascendant,
      midheaven,
      aspects: aspectsArray
    };

    // Salva i dati nel profilo dell'utente
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        birth_date: birthDate,
        birth_time: birthTime,
        birth_place_name: birthPlaceName,
        birth_latitude: latitude,
        birth_longitude: longitude,
        birth_timezone: timezone,
        natal_chart_data: natalChartData
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    console.log('Natal chart calculated and saved successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        natalChartData,
        message: 'Tema natale calcolato con successo (calcoli semplificati - da migliorare con Swiss Ephemeris)' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in calculate-natal-chart function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
