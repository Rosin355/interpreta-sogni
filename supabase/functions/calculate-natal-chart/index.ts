import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

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

    // Get Free Astrology API key
    const freeAstrologyApiKey = Deno.env.get('FREE_ASTROLOGY_API_KEY');
    if (!freeAstrologyApiKey) {
      throw new Error('FREE_ASTROLOGY_API_KEY not configured');
    }

    const { latitude, longitude, placeName, timezone } = birthPlace;

    // Parse date and time
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hours, minutes] = birthTime.split(':').map(Number);

    // Prepare API request data
    const apiRequestData = {
      year,
      month,
      date: day,
      hours,
      minutes,
      seconds: 0,
      latitude,
      longitude,
      timezone,
      settings: {
        observation_point: 'topocentric',
        ayanamsha: 'lahiri'
      }
    };

    console.log('Calling Free Astrology API with:', apiRequestData);

    // Call Free Astrology API for planets
    const planetsResponse = await fetch('https://api.freeastrologyapi.com/horoscope/planets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': freeAstrologyApiKey
      },
      body: JSON.stringify(apiRequestData)
    });

    if (!planetsResponse.ok) {
      const errorText = await planetsResponse.text();
      console.error('Planets API error:', errorText);
      throw new Error(`Failed to fetch planets data: ${planetsResponse.status}`);
    }

    const planetsData = await planetsResponse.json();
    console.log('Planets data received:', planetsData);

    // Call Free Astrology API for house cusps (Placidus system)
    const housesResponse = await fetch('https://api.freeastrologyapi.com/horoscope/house-cusps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': freeAstrologyApiKey
      },
      body: JSON.stringify({
        ...apiRequestData,
        house_system: 'placidus'
      })
    });

    if (!housesResponse.ok) {
      const errorText = await housesResponse.text();
      console.error('Houses API error:', errorText);
      throw new Error(`Failed to fetch houses data: ${housesResponse.status}`);
    }

    const housesData = await housesResponse.json();
    console.log('Houses data received:', housesData);

    // Map planet names from API to our format
    const planetMapping: { [key: string]: string } = {
      'Sun': 'sun',
      'Moon': 'moon',
      'Mercury': 'mercury',
      'Venus': 'venus',
      'Mars': 'mars',
      'Jupiter': 'jupiter',
      'Saturn': 'saturn',
      'Uranus': 'uranus',
      'Neptune': 'neptune',
      'Pluto': 'pluto'
    };

    // Process planets data
    const planetsObject: any = {};
    const planetPositions: { [key: string]: number } = {};

    if (planetsData.output) {
      for (const [planetName, planetInfo] of Object.entries(planetsData.output)) {
        const mappedName = planetMapping[planetName];
        if (mappedName && typeof planetInfo === 'object' && planetInfo !== null) {
          const info = planetInfo as any;
          const longitude = info.longitude || 0;
          const sign = getZodiacSign(longitude);
          const degree = getDegreeInSign(longitude);
          
          planetsObject[mappedName] = {
            longitude,
            sign,
            degree: parseFloat(degree.toFixed(2)),
            house: info.house || 1,
            retrograde: info.is_retrograde || false
          };
          
          planetPositions[mappedName] = longitude;
        }
      }
    }

    console.log('Processed planets:', planetsObject);

    // Process houses data
    const housesArray: any[] = [];
    if (housesData.output) {
      for (let i = 1; i <= 12; i++) {
        const houseKey = `house_${i}`;
        const houseInfo = housesData.output[houseKey];
        if (houseInfo && typeof houseInfo === 'object') {
          const longitude = houseInfo.longitude || (i - 1) * 30;
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

    // If no houses data, create default equal houses based on Ascendant
    if (housesArray.length === 0) {
      const ascendantLongitude = housesData.output?.house_1?.longitude || 0;
      for (let i = 1; i <= 12; i++) {
        const longitude = (ascendantLongitude + (i - 1) * 30) % 360;
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

    console.log('Processed houses:', housesArray);

    // Get Ascendant (1st house cusp) and Midheaven (10th house cusp)
    const ascendantHouse = housesArray.find(h => h.number === 1);
    const midheavenHouse = housesArray.find(h => h.number === 10);

    const ascendant = ascendantHouse ? {
      longitude: ascendantHouse.longitude,
      sign: ascendantHouse.sign,
      degree: ascendantHouse.degree
    } : {
      longitude: 0,
      sign: 'Aries',
      degree: 0
    };

    const midheaven = midheavenHouse ? {
      longitude: midheavenHouse.longitude,
      sign: midheavenHouse.sign,
      degree: midheavenHouse.degree
    } : {
      longitude: 270,
      sign: 'Capricorn',
      degree: 0
    };

    console.log('Ascendant:', ascendant, 'Midheaven:', midheaven);

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
      ascendant,
      midheaven,
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
