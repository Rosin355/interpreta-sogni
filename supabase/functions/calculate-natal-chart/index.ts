import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { Origin } from 'https://esm.sh/circular-natal-horoscope-js@1.1.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

function getZodiacSign(longitude: number): string {
  const index = Math.floor(longitude / 30);
  return ZODIAC_SIGNS[index];
}

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
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { birthDate, birthTime, birthPlace } = await req.json();

    if (!birthDate || !birthTime || !birthPlace) {
      throw new Error('Missing required fields');
    }

    console.log('Calculating natal chart for:', { birthDate, birthTime, birthPlace });

    const { latitude, longitude, placeName, timezone } = birthPlace;

    // Parse date and time
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hours, minutes] = birthTime.split(':').map(Number);

    console.log('Parsed data:', { year, month, day, hours, minutes, latitude, longitude });

    // Create Origin object for circular-natal-horoscope-js
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

    // Get celestial bodies positions
    const celestialBodies = origin.CelestialBodies.all;
    const ascendant = origin.Ascendant;
    const houses = origin.Houses;

    console.log('Horoscope calculated successfully');

    // Map planet data
    const planetMapping: { [key: string]: string } = {
      'sun': 'sun',
      'moon': 'moon',
      'mercury': 'mercury',
      'venus': 'venus',
      'mars': 'mars',
      'jupiter': 'jupiter',
      'saturn': 'saturn',
      'uranus': 'uranus',
      'neptune': 'neptune',
      'pluto': 'pluto'
    };

    const planetsObject: any = {};
    const planetPositions: { [key: string]: number } = {};

    // Process celestial bodies
    for (const [key, body] of Object.entries(celestialBodies)) {
      const planetKey = key.toLowerCase();
      const mappedName = planetMapping[planetKey];
      
      if (mappedName && body && typeof body === 'object') {
        const bodyData = body as any;
        const longitude = bodyData.ChartPosition?.Ecliptic?.DecimalDegrees || 0;
        const sign = getZodiacSign(longitude);
        const degree = getDegreeInSign(longitude);
        const houseNumber = bodyData.House?.id || 1;
        const isRetrograde = bodyData.isRetrograde || false;

        planetsObject[mappedName] = {
          longitude,
          sign,
          degree: parseFloat(degree.toFixed(2)),
          house: houseNumber,
          retrograde: isRetrograde
        };

        planetPositions[mappedName] = longitude;
      }
    }

    console.log('Processed planets:', planetsObject);

    // Process houses (Placidus system)
    const housesArray: any[] = [];
    if (houses && typeof houses === 'object') {
      const housesData = houses as any;
      for (let i = 1; i <= 12; i++) {
        const houseKey = `House${i}`;
        const house = housesData[houseKey];
        
        if (house && house.ChartPosition) {
          const longitude = house.ChartPosition.Ecliptic?.DecimalDegrees || ((i - 1) * 30);
          const sign = getZodiacSign(longitude);
          const degree = getDegreeInSign(longitude);

          housesArray.push({
            number: i,
            longitude,
            sign,
            degree: parseFloat(degree.toFixed(2))
          });
        } else {
          // Fallback to equal houses
          const ascLongitude = ascendant?.ChartPosition?.Ecliptic?.DecimalDegrees || 0;
          const longitude = (ascLongitude + (i - 1) * 30) % 360;
          const sign = getZodiacSign(longitude);
          const degree = getDegreeInSign(longitude);

          housesArray.push({
            number: i,
            longitude,
            sign,
            degree: parseFloat(degree.toFixed(2))
          });
        }
      }
    }

    console.log('Processed houses:', housesArray);

    // Get Ascendant and Midheaven
    const ascendantLongitude = ascendant?.ChartPosition?.Ecliptic?.DecimalDegrees || 0;
    const ascendantData = {
      longitude: ascendantLongitude,
      sign: getZodiacSign(ascendantLongitude),
      degree: parseFloat(getDegreeInSign(ascendantLongitude).toFixed(2))
    };

    // Midheaven is the 10th house cusp
    const midheavenHouse = housesArray.find(h => h.number === 10);
    const midheavenData = midheavenHouse ? {
      longitude: midheavenHouse.longitude,
      sign: midheavenHouse.sign,
      degree: midheavenHouse.degree
    } : {
      longitude: (ascendantLongitude + 270) % 360,
      sign: getZodiacSign((ascendantLongitude + 270) % 360),
      degree: parseFloat(getDegreeInSign((ascendantLongitude + 270) % 360).toFixed(2))
    };

    console.log('Ascendant:', ascendantData, 'Midheaven:', midheavenData);

    // Calculate aspects between planets
    const aspectsArray: any[] = [];
    const planetNames = Object.keys(planetPositions);
    
    for (let i = 0; i < planetNames.length; i++) {
      for (let j = i + 1; j < planetNames.length; j++) {
        const planet1 = planetNames[i];
        const planet2 = planetNames[j];
        const pos1 = planetPositions[planet1];
        const pos2 = planetPositions[planet2];
        
        let angle = Math.abs(pos1 - pos2);
        if (angle > 180) angle = 360 - angle;
        
        // Check for major aspects with proper orbs
        if (Math.abs(angle - 0) < 8) {
          aspectsArray.push({ 
            planet1, 
            planet2, 
            type: 'conjunction', 
            angle: parseFloat(angle.toFixed(2)), 
            orb: parseFloat(Math.abs(angle - 0).toFixed(2))
          });
        } else if (Math.abs(angle - 60) < 6) {
          aspectsArray.push({ 
            planet1, 
            planet2, 
            type: 'sextile', 
            angle: parseFloat(angle.toFixed(2)), 
            orb: parseFloat(Math.abs(angle - 60).toFixed(2))
          });
        } else if (Math.abs(angle - 90) < 8) {
          aspectsArray.push({ 
            planet1, 
            planet2, 
            type: 'square', 
            angle: parseFloat(angle.toFixed(2)), 
            orb: parseFloat(Math.abs(angle - 90).toFixed(2))
          });
        } else if (Math.abs(angle - 120) < 8) {
          aspectsArray.push({ 
            planet1, 
            planet2, 
            type: 'trine', 
            angle: parseFloat(angle.toFixed(2)), 
            orb: parseFloat(Math.abs(angle - 120).toFixed(2))
          });
        } else if (Math.abs(angle - 180) < 8) {
          aspectsArray.push({ 
            planet1, 
            planet2, 
            type: 'opposition', 
            angle: parseFloat(angle.toFixed(2)), 
            orb: parseFloat(Math.abs(angle - 180).toFixed(2))
          });
        }
      }
    }

    console.log('Calculated aspects:', aspectsArray);

    // Prepare natal chart data
    const natalChartData = {
      planets: planetsObject,
      houses: housesArray,
      ascendant: ascendantData,
      midheaven: midheavenData,
      aspects: aspectsArray,
      calculationDetails: {
        date: birthDate,
        time: birthTime,
        location: placeName,
        latitude,
        longitude,
        timezone
      }
    };

    // Update user profile with natal chart data
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        natal_chart_data: natalChartData,
        birth_date: birthDate,
        birth_time: birthTime,
        birth_place_name: placeName,
        birth_latitude: latitude,
        birth_longitude: longitude,
        birth_timezone: timezone,
        updated_at: new Date().toISOString()
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
        natalChartData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in calculate-natal-chart function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
