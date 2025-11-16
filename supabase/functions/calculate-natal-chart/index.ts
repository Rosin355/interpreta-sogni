import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { Origin, Horoscope } from "https://esm.sh/circular-natal-horoscope-js@1.1.0";

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

    // Create Origin object for natal chart calculation
    const origin = new Origin({
      year,
      month,
      date: day,
      hour: hours,
      minute: minutes,
      latitude,
      longitude
    });

    console.log('Origin created, calculating horoscope...');

    // Calculate horoscope
    const horoscope = new Horoscope({
      origin,
      houseSystem: "placidus",
      zodiac: "tropical",
      aspectPoints: ['bodies', 'points', 'angles'],
      aspectWithPoints: ['bodies', 'points', 'angles'],
      aspectTypes: ["major", "minor"],
      customOrbs: {},
      language: 'en'
    });

    console.log('Horoscope calculated successfully');

    // Extract celestial bodies data
    const celestialBodies = horoscope.CelestialBodies;
    const celestialPoints = horoscope.CelestialPoints;
    const houses = horoscope.Houses;
    const aspects = horoscope.Aspects;

    // Helper function to get house number for a planet
    const getHouseForPlanet = (longitude: number): number => {
      for (let i = 0; i < houses.length; i++) {
        const currentHouse = houses[i];
        const nextHouse = houses[(i + 1) % houses.length];
        const currentLong = currentHouse.ChartPosition.Ecliptic.DecimalDegrees;
        const nextLong = nextHouse.ChartPosition.Ecliptic.DecimalDegrees;
        
        if (nextLong > currentLong) {
          if (longitude >= currentLong && longitude < nextLong) {
            return currentHouse.House;
          }
        } else {
          // Handle house spanning 0° Aries
          if (longitude >= currentLong || longitude < nextLong) {
            return currentHouse.House;
          }
        }
      }
      return 1; // Default to first house if not found
    };

    // Build planets object
    const planets: any = {};
    
    // Map celestial bodies
    const bodyMapping: { [key: string]: string } = {
      'sun': 'sun',
      'moon': 'moon',
      'mercury': 'mercury',
      'venus': 'venus',
      'mars': 'mars',
      'jupiter': 'jupiter',
      'saturn': 'saturn',
      'uranus': 'uranus',
      'neptune': 'neptune',
      'pluto': 'pluto',
      'chiron': 'chiron'
    };

    Object.keys(bodyMapping).forEach(key => {
      const body = celestialBodies[key];
      if (body) {
        const longitude = body.ChartPosition.Ecliptic.DecimalDegrees;
        planets[key] = {
          sign: body.Sign.label,
          house: getHouseForPlanet(longitude),
          degree: getDegreeInSign(longitude),
          retrograde: body.isRetrograde || false
        };
      }
    });

    // Add North Node and South Node
    if (celestialPoints.northnode) {
      const nnLongitude = celestialPoints.northnode.ChartPosition.Ecliptic.DecimalDegrees;
      planets.northNode = {
        sign: celestialPoints.northnode.Sign.label,
        house: getHouseForPlanet(nnLongitude),
        degree: getDegreeInSign(nnLongitude),
        retrograde: true // North Node is always retrograde
      };
      
      // South Node is always opposite to North Node
      const snLongitude = (nnLongitude + 180) % 360;
      planets.southNode = {
        sign: getZodiacSign(snLongitude),
        house: getHouseForPlanet(snLongitude),
        degree: getDegreeInSign(snLongitude),
        retrograde: true
      };
    }

    // Build houses array
    const housesArray = houses.map((house: any) => ({
      number: house.House,
      sign: house.Sign.label,
      degree: house.ChartPosition.Ecliptic.DecimalDegrees
    }));

    // Get Ascendant and Midheaven
    const ascendant = celestialPoints.ascendant ? {
      sign: celestialPoints.ascendant.Sign.label,
      degree: getDegreeInSign(celestialPoints.ascendant.ChartPosition.Ecliptic.DecimalDegrees)
    } : housesArray[0] ? { sign: housesArray[0].sign, degree: 0 } : { sign: 'Aries', degree: 0 };

    const midheaven = celestialPoints.midheaven ? {
      sign: celestialPoints.midheaven.Sign.label,
      degree: getDegreeInSign(celestialPoints.midheaven.ChartPosition.Ecliptic.DecimalDegrees)
    } : housesArray[9] ? { sign: housesArray[9].sign, degree: 0 } : { sign: 'Capricorn', degree: 0 };

    // Build aspects array
    const aspectsArray = aspects.all.map((aspect: any) => ({
      planet1: aspect.point1.label.toLowerCase(),
      planet2: aspect.point2.label.toLowerCase(),
      type: aspect.aspectLevel,
      angle: aspect.orb
    }));

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
        message: 'Tema natale calcolato e salvato con successo con dati astronomici reali' 
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
