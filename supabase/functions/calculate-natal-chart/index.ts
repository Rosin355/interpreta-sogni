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

    const { latitude, longitude, placeName, timezone } = birthPlace;

    // Parse date and time
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hours, minutes] = birthTime.split(':').map(Number);

    console.log('Parsed data:', { year, month, day, hours, minutes, latitude, longitude });

    // Convert timezone string to number (e.g., "UTC+1" -> 1)
    const timezoneOffset = parseFloat(timezone.replace('UTC', '').replace('+', ''));

    // Call Free Astrology API
    const apiKey = Deno.env.get('FREE_ASTROLOGY_API_KEY');
    if (!apiKey) {
      throw new Error('FREE_ASTROLOGY_API_KEY not configured');
    }

    console.log('Calling Free Astrology API...');
    
    const apiResponse = await fetch('https://json.freeastrologyapi.com/western/natal-wheel-chart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        year,
        month,
        date: day,
        hours,
        minutes,
        seconds: 0,
        latitude,
        longitude,
        timezone: timezoneOffset,
        config: {
          observation_point: 'topocentric',
          ayanamsha: 'tropical',
          house_system: 'Placidus',
          language: 'en',
        }
      })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Free Astrology API error:', errorText);
      throw new Error(`Free Astrology API returned ${apiResponse.status}: ${errorText}`);
    }

    const apiData = await apiResponse.json();
    console.log('Free Astrology API response received');

    if (apiData.statusCode !== 200 || !apiData.output) {
      console.error('Invalid API response:', apiData);
      throw new Error('Invalid response from Free Astrology API');
    }

    const { planets, houses, aspects } = apiData.output;

    // Map planets to our format
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

    const planetsObject: any = {};
    const planetPositions: { [key: string]: number } = {};

    // Process planets from API response
    if (planets && Array.isArray(planets)) {
      for (const planet of planets) {
        const planetName = planet.planet?.en || planet.name;
        const mappedName = planetMapping[planetName];
        
        if (mappedName) {
          const longitude = planet.fullDegree || 0;
          const sign = planet.zodiac_sign?.name?.en || getZodiacSign(longitude);
          const degree = planet.normDegree || getDegreeInSign(longitude);
          
          planetsObject[mappedName] = {
            longitude,
            sign,
            degree: parseFloat(degree.toFixed(2)),
            house: planet.house_number || 1,
            retrograde: planet.isRetro === 'True' || planet.isRetro === true
          };

          planetPositions[mappedName] = longitude;
        }
      }
    }

    console.log('Processed planets:', Object.keys(planetsObject));

    // Process houses
    const housesArray: any[] = [];
    if (houses && Array.isArray(houses)) {
      for (let i = 0; i < houses.length && i < 12; i++) {
        const house = houses[i];
        const longitude = house.fullDegree || house.degree || ((i) * 30);
        const sign = house.zodiac_sign?.name?.en || getZodiacSign(longitude);
        const degree = house.normDegree || getDegreeInSign(longitude);

        housesArray.push({
          number: i + 1,
          longitude,
          sign,
          degree: parseFloat(degree.toFixed(2))
        });
      }
    }

    console.log('Processed houses:', housesArray.length);

    // Find Ascendant and Midheaven from planets array
    const ascendantPlanet = planets?.find((p: any) => 
      (p.planet?.en === 'Ascendant' || p.name === 'Ascendant')
    );
    const ascendantLongitude = ascendantPlanet?.fullDegree || (housesArray[0]?.longitude || 0);
    const ascendantData = {
      longitude: ascendantLongitude,
      sign: ascendantPlanet?.zodiac_sign?.name?.en || getZodiacSign(ascendantLongitude),
      degree: parseFloat((ascendantPlanet?.normDegree || getDegreeInSign(ascendantLongitude)).toFixed(2))
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

    console.log('Ascendant:', ascendantData.sign, 'Midheaven:', midheavenData.sign);

    // Process aspects from API or calculate if not provided
    let aspectsArray: any[] = [];
    
    if (aspects && Array.isArray(aspects)) {
      aspectsArray = aspects.map((aspect: any) => ({
        planet1: planetMapping[aspect.planet1] || aspect.planet1.toLowerCase(),
        planet2: planetMapping[aspect.planet2] || aspect.planet2.toLowerCase(),
        type: aspect.type.toLowerCase(),
        angle: parseFloat((aspect.angle || 0).toFixed(2)),
        orb: parseFloat((aspect.orb || 0).toFixed(2))
      }));
    } else {
      // Calculate aspects manually if not provided by API
      const planetNames = Object.keys(planetPositions);
      for (let i = 0; i < planetNames.length; i++) {
        for (let j = i + 1; j < planetNames.length; j++) {
          const planet1 = planetNames[i];
          const planet2 = planetNames[j];
          const pos1 = planetPositions[planet1];
          const pos2 = planetPositions[planet2];
          
          let angle = Math.abs(pos1 - pos2);
          if (angle > 180) angle = 360 - angle;
          
          // Check for major aspects
          if (Math.abs(angle - 0) < 8) {
            aspectsArray.push({ 
              planet1, planet2, type: 'conjunction', 
              angle: parseFloat(angle.toFixed(2)), 
              orb: parseFloat(Math.abs(angle - 0).toFixed(2))
            });
          } else if (Math.abs(angle - 60) < 6) {
            aspectsArray.push({ 
              planet1, planet2, type: 'sextile', 
              angle: parseFloat(angle.toFixed(2)), 
              orb: parseFloat(Math.abs(angle - 60).toFixed(2))
            });
          } else if (Math.abs(angle - 90) < 8) {
            aspectsArray.push({ 
              planet1, planet2, type: 'square', 
              angle: parseFloat(angle.toFixed(2)), 
              orb: parseFloat(Math.abs(angle - 90).toFixed(2))
            });
          } else if (Math.abs(angle - 120) < 8) {
            aspectsArray.push({ 
              planet1, planet2, type: 'trine', 
              angle: parseFloat(angle.toFixed(2)), 
              orb: parseFloat(Math.abs(angle - 120).toFixed(2))
            });
          } else if (Math.abs(angle - 180) < 8) {
            aspectsArray.push({ 
              planet1, planet2, type: 'opposition', 
              angle: parseFloat(angle.toFixed(2)), 
              orb: parseFloat(Math.abs(angle - 180).toFixed(2))
            });
          }
        }
      }
    }

    console.log('Processed aspects:', aspectsArray.length);

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
