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

    // Convert timezone string to number (e.g., "UTC+1" -> 1)
    const timezoneOffset = parseFloat(timezone.replace('UTC', '').replace('+', ''));

    console.log('Timezone offset:', timezoneOffset);

    // Call Free Astrology API
    const apiKey = Deno.env.get('FREE_ASTROLOGY_API_KEY');
    if (!apiKey) {
      console.error('FREE_ASTROLOGY_API_KEY not configured');
      throw new Error('FREE_ASTROLOGY_API_KEY not configured');
    }

    console.log('Calling Free Astrology API with Swiss Ephemeris...');
    
    // Prepare request body according to API specification
    const requestBody = {
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
        language: 'en'
      }
    };
    console.log('API Request Body:', JSON.stringify(requestBody, null, 2));

    // Implement retry logic with exponential backoff
    let retries = 3;
    let apiResponse: Response | null = null;
    let lastError: Error | null = null;

    while (retries > 0) {
      try {
        apiResponse = await fetch('https://json.freeastrologyapi.com/western/natal-wheel-chart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify(requestBody)
        });

        if (apiResponse.ok) {
          console.log('API call successful');
          break;
        }

        const errorText = await apiResponse.text();
        console.error(`Free Astrology API error (${retries} retries left):`, errorText);
        
        // Don't retry on 400 (validation errors)
        if (apiResponse.status === 400) {
          throw new Error(`Invalid request to API: ${errorText}`);
        }

        lastError = new Error(`API returned ${apiResponse.status}: ${errorText}`);
        retries--;

        if (retries > 0) {
          const waitTime = (4 - retries) * 1000; // 1s, 2s, 3s backoff
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (error) {
        lastError = error as Error;
        retries--;
        
        if (retries > 0 && !(error as Error).message.includes('Invalid request')) {
          const waitTime = (4 - retries) * 1000;
          console.log(`Error occurred, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          throw error;
        }
      }
    }

    if (!apiResponse || !apiResponse.ok) {
      throw lastError || new Error('Failed to call Free Astrology API after retries');
    }

    const apiData = await apiResponse.json();
    console.log('Free Astrology API response status:', apiData.statusCode);
    console.log('API output keys:', apiData?.output ? Object.keys(apiData.output) : 'no output');

    if (apiData.statusCode !== 200 || !apiData.output) {
      console.error('Invalid API response structure:', JSON.stringify(apiData, null, 2));
      throw new Error('Invalid response from Free Astrology API');
    }

    let planets = apiData?.output?.planets;
    let houses = apiData?.output?.houses;
    let aspects = apiData?.output?.aspects;

    if (!planets || !houses) {
      console.log('Wheel API did not include planets/houses. Fetching dedicated endpoints...');
      const payload = requestBody; // same body including config
      const [plRes, hoRes, asRes] = await Promise.all([
        fetch('https://json.freeastrologyapi.com/western/planets', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify(payload)
        }),
        fetch('https://json.freeastrologyapi.com/western/houses', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify(payload)
        }),
        fetch('https://json.freeastrologyapi.com/western/aspects', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify(payload)
        })
      ]);

      if (!plRes.ok || !hoRes.ok) {
        const t1 = !plRes.ok ? await plRes.text() : '';
        const t2 = !hoRes.ok ? await hoRes.text() : '';
        console.error('=== API ERROR ===');
        console.error('Planets API status:', plRes.status, plRes.statusText);
        console.error('Houses API status:', hoRes.status, hoRes.statusText);
        console.error('Planets error response:', t1);
        console.error('Houses error response:', t2);
        console.error('Request payload:', JSON.stringify(payload, null, 2));
        console.error('================');
        throw new Error('Failed to fetch planets/houses');
      }
      const [plJson, hoJson, asJson] = await Promise.all([plRes.json(), hoRes.json(), asRes.ok ? asRes.json() : Promise.resolve(null)]);
      planets = plJson?.output;
      houses = hoJson?.output;
      aspects = asJson?.output || [];
      
      // DEBUG: Log della struttura completa delle case
      console.log('=== HOUSES API RESPONSE DEBUG ===');
      console.log('Houses type:', typeof houses);
      console.log('Houses is Array?:', Array.isArray(houses));
      if (houses && typeof houses === 'object') {
        console.log('Houses keys:', Object.keys(houses));
        console.log('First house sample:', JSON.stringify(houses[Object.keys(houses)[0]], null, 2));
      }
      console.log('===================================');
    }

    console.log('Processing', (Array.isArray(planets)? planets.length : (planets? Object.keys(planets).length:0)), 'planets,', (Array.isArray(houses)? houses.length : (houses? Object.keys(houses).length:0)), 'houses,', (Array.isArray(aspects)? aspects.length : (aspects? Object.keys(aspects).length:0)), 'aspects');

    // Map planets to our format with improved error handling
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

    // Helper function to normalize API responses to arrays
    const normalizeToArray = (val: any) =>
      Array.isArray(val) ? val : (val && typeof val === 'object' ? Object.values(val) : []);

    // Normalize planets and houses early so they're available everywhere
    const planetsRaw = normalizeToArray(planets);
    
    // STEP 1: Process houses FIRST (we need house cusps to calculate planet houses)
    const housesArray: any[] = [];
    let housesRaw = normalizeToArray(houses);

    // Controlla sia 'houses' che 'Houses' (case-insensitive)
    if (houses && !Array.isArray(houses)) {
      // Prova prima 'Houses' (maiuscola) - formato standard Free Astrology API
      if (houses.Houses) {
        console.log('Found nested Houses property (capital H), using it');
        housesRaw = normalizeToArray(houses.Houses);
      } 
      // Poi 'houses' (minuscola) come fallback
      else if (houses.houses) {
        console.log('Found nested houses property (lowercase h), using it');
        housesRaw = normalizeToArray(houses.houses);
      }
    }
    
    // Se housesRaw è ancora vuoto o ha solo 1 elemento, prova a estrarre da chiavi numeriche
    if (housesRaw.length < 12 && houses && typeof houses === 'object') {
      console.log('Attempting to extract houses from numeric keys...');
      const houseKeys = Object.keys(houses).filter(k => !isNaN(parseInt(k))).sort((a, b) => parseInt(a) - parseInt(b));
      if (houseKeys.length >= 12) {
        housesRaw = houseKeys.map(k => houses[k]);
        console.log(`Extracted ${housesRaw.length} houses from numeric keys`);
      }
    }
    
    if (housesRaw && housesRaw.length > 0) {
      for (let i = 0; i < housesRaw.length && i < 12; i++) {
        const house = housesRaw[i];
        const longitude = typeof house?.fullDegree === 'number' ? house.fullDegree : (typeof house?.degree === 'number' ? house.degree : ((i) * 30));
        const sign = house?.zodiac_sign?.name?.en || getZodiacSign(longitude);
        const degree = typeof house?.normDegree === 'number' ? house.normDegree : getDegreeInSign(longitude);

        housesArray.push({
          number: (house?.number || i + 1),
          longitude,
          sign,
          degree: parseFloat(Number(degree).toFixed(2))
        });
      }
    }

    console.log('Processed houses:', housesArray.length);
    
    // Fallback: Se abbiamo meno di 12 case, calcola usando Equal House system
    if (housesArray.length < 12) {
      console.log('WARNING: Less than 12 houses from API, using Equal House fallback');
      housesArray.length = 0; // Clear
      
      // Trova l'Ascendente per usarlo come cusp della Casa 1
      let ascLongitude = 0;
      const ascendantPlanetTemp = planetsRaw?.find((p: any) => {
        const name = p?.planet?.en || p?.planet || p?.name;
        return name?.toLowerCase() === 'ascendant';
      });
      
      if (ascendantPlanetTemp) {
        ascLongitude = typeof ascendantPlanetTemp?.fullDegree === 'number' 
          ? ascendantPlanetTemp.fullDegree 
          : (typeof ascendantPlanetTemp?.degree === 'number' ? ascendantPlanetTemp.degree : 0);
      }
      
      for (let i = 0; i < 12; i++) {
        const longitude = (ascLongitude + (i * 30)) % 360;
        housesArray.push({
          number: i + 1,
          longitude,
          sign: getZodiacSign(longitude),
          degree: parseFloat(getDegreeInSign(longitude).toFixed(2))
        });
      }
      
      console.log('Generated 12 houses using Equal House system');
    }

    // Extract house cusps longitudes for planet house calculation
    const houseCuspsLongitudes = housesArray.map(h => h.longitude);

    // STEP 2: Now process planets using the house cusps
    if (planetsRaw && planetsRaw.length > 0) {
      console.log('Processing planets...', planetsRaw.length);
      for (const planet of planetsRaw) {
        const planetNameRaw = planet?.planet?.en || planet?.planet || planet?.name;
        const mappedName = planetMapping[planetNameRaw] || (planetNameRaw ? String(planetNameRaw).toLowerCase() : undefined);
        if (!mappedName) continue;

        const longitude = typeof planet?.fullDegree === 'number' ? planet.fullDegree : (typeof planet?.degree === 'number' ? planet.degree : 0);
        const sign = planet?.zodiac_sign?.name?.en || getZodiacSign(longitude);
        const degreeVal = typeof planet?.normDegree === 'number' ? planet.normDegree : getDegreeInSign(longitude);
        const retro = planet?.isRetro === 'True' || planet?.isRetro === true || planet?.retrograde === true;
        
        // Calculate house using cusps instead of relying on API
        const houseNum = calculateHouse(longitude, houseCuspsLongitudes);

        planetsObject[mappedName] = {
          longitude,
          sign,
          degree: parseFloat(Number(degreeVal).toFixed(2)),
          house: houseNum,
          retrograde: retro
        };

        planetPositions[mappedName] = longitude;
        console.log(`  ${mappedName}: ${sign} ${Number(degreeVal).toFixed(2)}° (House ${houseNum})${retro ? ' ℞' : ''}`);
      }
    } else {
      console.error('No planets data in API response. Output keys:', Object.keys(apiData?.output || {}));
      try { console.error('Sample output preview:', JSON.stringify(apiData?.output, null, 2).slice(0, 800)); } catch {}
      throw new Error('No planets data returned from API');
    }

    console.log('Processed planets:', Object.keys(planetsObject));

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
      console.log(`Processing ${aspects.length} aspects from API...`);
      aspectsArray = aspects
        .filter((aspect: any) => {
          // Strict validation of aspect object
          if (!aspect || typeof aspect !== 'object') return false;
          if (!aspect.planet1 || typeof aspect.planet1 !== 'string') return false;
          if (!aspect.planet2 || typeof aspect.planet2 !== 'string') return false;
          if (!aspect.type || typeof aspect.type !== 'string') return false;
          return true;
        })
        .map((aspect: any) => {
          const p1 = planetMapping[aspect.planet1] || aspect.planet1.toLowerCase();
          const p2 = planetMapping[aspect.planet2] || aspect.planet2.toLowerCase();
          const t = aspect.type.toLowerCase();
          
          return {
            planet1: p1,
            planet2: p2,
            type: t,
            angle: parseFloat((aspect.angle || 0).toFixed(2)),
            orb: parseFloat((aspect.orb || 0).toFixed(2))
          };
        })
        .filter((aspect: any) => 
          planetMapping[aspect.planet1] !== undefined || 
          planetMapping[aspect.planet2] !== undefined
        );
      console.log(`Successfully processed ${aspectsArray.length} valid aspects`);
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
