import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { corsHeaders, errorResponse, notifyQuotaToAdmins } from "../_shared/error-response.ts";

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

// Calculate which house a planet is in based on house cusps
function calculateHouse(planetLongitude: number, houseCusps: number[]): number {
  if (!houseCusps || houseCusps.length !== 12) return 1;
  
  // Normalize planet longitude (0-360)
  const normLong = ((planetLongitude % 360) + 360) % 360;
  
  // Find the house by comparing with cusps
  for (let i = 0; i < 12; i++) {
    const currentCusp = houseCusps[i];
    const nextCusp = houseCusps[(i + 1) % 12];
    
    // Handle case where houses cross 0° Aries
    if (nextCusp > currentCusp) {
      if (normLong >= currentCusp && normLong < nextCusp) {
        return i + 1;
      }
    } else {
      // The cusp crosses 0° (e.g., House 12 at 350° and House 1 at 10°)
      if (normLong >= currentCusp || normLong < nextCusp) {
        return i + 1;
      }
    }
  }
  
  return 1; // Fallback
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== Natal Chart Calculation Started ===');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      throw new Error('Missing Authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    const { birthDate, birthTime, birthPlace } = await req.json();

    // Input validation
    if (!birthDate || !birthTime || !birthPlace) {
      console.error('Missing required fields:', { birthDate, birthTime, birthPlace });
      throw new Error('Missing required fields: birthDate, birthTime, and birthPlace are required');
    }

    console.log('Input data:', { birthDate, birthTime, birthPlace });

    const { latitude, longitude, placeName, timezone } = birthPlace;

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      console.error('Invalid coordinates:', { latitude, longitude });
      throw new Error('Invalid coordinates: latitude and longitude must be numbers');
    }

    if (latitude < -90 || latitude > 90) {
      throw new Error('Invalid latitude: must be between -90 and 90');
    }

    if (longitude < -180 || longitude > 180) {
      throw new Error('Invalid longitude: must be between -180 and 180');
    }

    // Parse date and time
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hours, minutes] = birthTime.split(':').map(Number);

    // Validate date components
    if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error('Invalid date format');
    }

    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error('Invalid time format');
    }

    console.log('Parsed data:', { year, month, day, hours, minutes, latitude, longitude });

    // Robust timezone validation with fallback
    let timezoneOffset: number;

    if (!timezone || typeof timezone !== 'string') {
      console.warn('⚠️ Invalid timezone (null/undefined), defaulting to UTC+0');
      timezoneOffset = 0;
    } else {
      const parsed = parseFloat(timezone.replace('UTC', '').replace('+', ''));
      
      if (isNaN(parsed) || parsed < -12 || parsed > 14) {
        console.warn(`⚠️ Invalid timezone offset: "${timezone}" (parsed as ${parsed}), defaulting to UTC+0`);
        timezoneOffset = 0;
      } else {
        timezoneOffset = parsed;
      }
    }

    console.log('✓ Final timezone offset:', timezoneOffset);

    // ========================================
    // STEP 1: CHECK CACHE NEL DATABASE
    // ========================================
    console.log('=== Checking database cache ===');
    console.log('Cache system: ENABLED');

    // Arrotonda le coordinate per evitare cache miss per differenze minime
    const roundedLat = Math.round(latitude * 10000) / 10000;
    const roundedLon = Math.round(longitude * 10000) / 10000;

    console.log('Looking for cached data with:', {
      birthDate,
      birthTime,
      latitude: roundedLat,
      longitude: roundedLon
    });

    // Query il profilo per verificare se esiste già un tema natale con questi dati
    const supabaseServiceUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseServiceUrl, supabaseServiceKey);

    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('natal_chart_data, birth_date, birth_time, birth_latitude, birth_longitude')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('Error fetching profile for cache check:', profileError);
      // Non bloccare, procedi con la chiamata API
    }

    // Verifica se i dati di nascita corrispondono esattamente
    if (existingProfile?.natal_chart_data && 
        existingProfile.birth_date === birthDate &&
        existingProfile.birth_time === birthTime &&
        existingProfile.birth_latitude !== null &&
        existingProfile.birth_longitude !== null &&
        Math.abs(parseFloat(existingProfile.birth_latitude) - roundedLat) < 0.0001 &&
        Math.abs(parseFloat(existingProfile.birth_longitude) - roundedLon) < 0.0001) {
      
      console.log('✅ CACHE HIT - Returning cached natal chart data');
      console.log('✅ Saved 1 API call');
      console.log('=== Natal Chart Calculation Completed (from cache) ===');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: existingProfile.natal_chart_data,
          fromCache: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log('⚠️ CACHE MISS - API call required');
    if (!existingProfile?.natal_chart_data) {
      console.log('Reason: No existing natal_chart_data');
    } else {
      console.log('Reason: Birth data mismatch');
    }

    console.log('⚠️ CACHE MISS - API call required');
    if (!existingProfile?.natal_chart_data) {
      console.log('Reason: No existing natal_chart_data');
    } else {
      console.log('Reason: Birth data mismatch');
    }

    // Call Astrologer API (RapidAPI)
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not configured');
      throw new Error('RAPIDAPI_KEY not configured');
    }

    console.log('Calling Astrologer API (RapidAPI)...');
    
    // Prepare request body for Astrologer API
    const astrologerBody = {
      subject: {
        name: "User",
        year,
        month,
        day,
        hour: hours,
        minute: minutes,
        longitude,
        latitude,
        timezone: timezoneOffset
      }
    };

    const rapidApiHeaders = {
      'X-RapidAPI-Host': 'astrologer.p.rapidapi.com',
      'X-RapidAPI-Key': rapidApiKey,
      'Content-Type': 'application/json',
    };

    console.log('=== FINAL API REQUEST DATA ===');
    console.log('Date:', { year, month, day });
    console.log('Time:', { hours, minutes });
    console.log('Location:', { latitude, longitude });
    console.log('Timezone offset:', timezoneOffset);
    console.log('Headers:', { ...rapidApiHeaders, 'X-RapidAPI-Key': '***' });
    console.log('Full Request Body:', JSON.stringify(astrologerBody, null, 2));
    console.log('==============================');

    // Implement retry logic with exponential backoff
    let retries = 3;
    let chartData: any = null;
    let natalContext: string = "";
    let lastError: Error | null = null;

    while (retries > 0) {
      try {
        console.log(`API Attempt ${4 - retries}...`);
        
        // Parallel calls for data and context
        const [dataRes, contextRes] = await Promise.all([
          fetch('https://astrologer.p.rapidapi.com/api/v5/chart-data/birth-chart', {
            method: 'POST',
            headers: rapidApiHeaders,
            body: JSON.stringify(astrologerBody)
          }),
          fetch('https://astrologer.p.rapidapi.com/api/v5/context/birth-chart', {
            method: 'POST',
            headers: rapidApiHeaders,
            body: JSON.stringify(astrologerBody)
          })
        ]);

        if (dataRes.ok && contextRes.ok) {
          chartData = await dataRes.json();
          const contextData = await contextRes.json();
          natalContext = contextData.context || "";
          console.log('API calls successful');
          break;
        }

        const dataError = !dataRes.ok ? await dataRes.text() : 'OK';
        const contextError = !contextRes.ok ? await contextRes.text() : 'OK';
        console.error(`API error (Data: ${dataRes.status}, Context: ${contextRes.status})`);
        console.error(`Data response: ${dataError}`);
        console.error(`Context response: ${contextError}`);
        
        // GESTIONE SPECIFICA RATE LIMIT / QUOTA
        if (dataRes.status === 429 || contextRes.status === 429 || 
            dataError.toLowerCase().includes('limit exceeded') || 
            contextError.toLowerCase().includes('limit exceeded') ||
            dataError.toLowerCase().includes('quota') ||
            contextError.toLowerCase().includes('quota')) {
          console.error('🚫 RAPIDAPI QUOTA EXCEEDED');
          const technical = `RapidAPI Astrologer quota exceeded — data:${dataRes.status} context:${contextRes.status} — ${dataError || contextError}`;
          // Notifica super admin (best-effort, non blocca)
          notifyQuotaToAdmins({
            provider: 'rapidapi',
            errorCode: 'API_QUOTA_EXCEEDED',
            functionName: 'calculate-natal-chart',
            technicalMessage: technical,
          }).catch(() => {});
          return errorResponse('API_QUOTA_EXCEEDED', technical, {
            provider: 'rapidapi',
          });
        }

        lastError = new Error(`API returned non-200 status. Data: ${dataRes.status}, Context: ${contextRes.status}`);
        retries--;

        if (retries > 0) {
          const waitTime = (4 - retries) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (error) {
        lastError = error as Error;
        if (error.message?.includes('quota')) throw error;
        
        retries--;
        if (retries > 0) {
          const waitTime = (4 - retries) * 1000;
          console.log(`Error occurred, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          throw error;
        }
      }
    }

    if (!chartData) {
      throw new Error(`Impossibile calcolare il tema natale: ${lastError?.message || 'Errore sconosciuto'}`);
    }

    // Mapping of planet names to our internal format
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
      'Pluto': 'pluto',
      'North Node': 'north_node',
      'South Node': 'south_node',
      'Chiron': 'chiron'
    };

    const planetsObject: any = {};
    const planetPositions: { [key: string]: number } = {};

    // Process planets from chartData
    const apiPlanets = chartData.planets || [];
    console.log(`Processing ${apiPlanets.length} planets...`);

    for (const planet of apiPlanets) {
      const name = planet.name;
      const mappedName = planetMapping[name] || name.toLowerCase().replace(' ', '_');
      
      const longitude = planet.abs_pos || planet.position || 0;
      const sign = planet.sign;
      const house = planet.house;
      const retrograde = planet.retrograde || false;
      const degreeVal = getDegreeInSign(longitude);

      planetsObject[mappedName] = {
        longitude,
        sign,
        degree: parseFloat(degreeVal.toFixed(2)),
        house,
        retrograde
      };

      planetPositions[mappedName] = longitude;
    }

    // Process houses
    const apiHouses = chartData.houses || [];
    const housesArray = apiHouses.map((h: any, index: number) => {
      const longitude = h.abs_pos || h.position || (index * 30);
      return {
        number: h.number || (index + 1),
        longitude,
        sign: h.sign || getZodiacSign(longitude),
        degree: parseFloat(getDegreeInSign(longitude).toFixed(2))
      };
    });

    // Ensure we have 12 houses
    if (housesArray.length < 12) {
      console.warn('API returned fewer than 12 houses, using fallback');
      const startLong = housesArray[0]?.longitude || 0;
      for (let i = housesArray.length; i < 12; i++) {
        const longitude = (startLong + (i * 30)) % 360;
        housesArray.push({
          number: i + 1,
          longitude,
          sign: getZodiacSign(longitude),
          degree: parseFloat(getDegreeInSign(longitude).toFixed(2))
        });
      }
    }

    // Extract Ascendant and Midheaven
    const ascendantData = {
      longitude: chartData.ascendant?.abs_pos || housesArray[0]?.longitude || 0,
      sign: chartData.ascendant?.sign || housesArray[0]?.sign || getZodiacSign(0),
      degree: parseFloat(getDegreeInSign(chartData.ascendant?.abs_pos || housesArray[0]?.longitude || 0).toFixed(2))
    };

    const midheavenData = {
      longitude: chartData.midheaven?.abs_pos || housesArray[9]?.longitude || 0,
      sign: chartData.midheaven?.sign || housesArray[9]?.sign || getZodiacSign(0),
      degree: parseFloat(getDegreeInSign(chartData.midheaven?.abs_pos || housesArray[9]?.longitude || 0).toFixed(2))
    };

    // Process aspects
    const apiAspects = chartData.aspects || [];
    const aspectsArray = apiAspects.map((a: any) => ({
      planet1: planetMapping[a.planet1] || a.planet1.toLowerCase().replace(' ', '_'),
      planet2: planetMapping[a.planet2] || a.planet2.toLowerCase().replace(' ', '_'),
      type: a.type.toLowerCase(),
      angle: parseFloat((a.angle || 0).toFixed(2)),
      orb: parseFloat((a.orb || 0).toFixed(2))
    }));

    // Prepare final natalChartData structure
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

    // Update user profile with natal chart data AND natal_context
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        natal_chart_data: natalChartData,
        natal_context: natalContext,
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

    console.log('✅ Natal chart calculated and saved successfully (with context)');
    console.log('=== Natal Chart Calculation Completed ===');

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
