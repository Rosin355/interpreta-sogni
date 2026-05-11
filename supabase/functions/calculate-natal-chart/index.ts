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

    // IANA timezone string per l'endpoint /context (richiede stringa).
    // Strategia: se offset è intero usiamo "Etc/GMT±N" (segno invertito da convenzione POSIX).
    // Per offset frazionari usiamo formato "+HH:MM".
    const buildTimezoneString = (offset: number): string => {
      if (Number.isInteger(offset)) {
        const sign = offset >= 0 ? '-' : '+'; // POSIX-inverted
        return `Etc/GMT${sign}${Math.abs(offset)}`;
      }
      const sign = offset >= 0 ? '+' : '-';
      const abs = Math.abs(offset);
      const hh = String(Math.floor(abs)).padStart(2, '0');
      const mm = String(Math.round((abs - Math.floor(abs)) * 60)).padStart(2, '0');
      return `${sign}${hh}:${mm}`;
    };

    const tzString = buildTimezoneString(timezoneOffset);
    const cityName = (placeName && typeof placeName === 'string' && placeName.trim().length > 0)
      ? placeName.split(',')[0].trim()
      : 'Unknown';

    // Payload condiviso: l'API Astrologer v5 richiede city (stringa) e timezone (stringa IANA)
    // per ENTRAMBI gli endpoint /chart-data e /context. In passato /chart-data accettava
    // anche timezone numerico, ma lo schema attuale rifiuta sia il numero che l'assenza di city.
    const subjectPayload = {
      name: "User",
      year, month, day,
      hour: hours, minute: minutes,
      longitude, latitude,
      city: cityName,
      nation: "IT",
      timezone: tzString,
    };

    const dataBody = { subject: subjectPayload };
    const contextBody = { subject: subjectPayload };

    const rapidApiHeaders = {
      'X-RapidAPI-Host': 'astrologer.p.rapidapi.com',
      'X-RapidAPI-Key': rapidApiKey,
      'Content-Type': 'application/json',
    };

    console.log('=== FINAL API REQUEST DATA ===');
    console.log('Date:', { year, month, day });
    console.log('Time:', { hours, minutes });
    console.log('Location:', { latitude, longitude, city: cityName, nation: 'IT' });
    console.log('Timezone offset / IANA:', timezoneOffset, '/', tzString);
    console.log('Subject payload (sent to BOTH endpoints):', JSON.stringify(subjectPayload));
    console.log('==============================');

    // Retry per il solo /chart-data (è il dato critico). /context è "nice to have".
    let retries = 3;
    let chartData: any = null;
    let natalContext: string = "";
    let lastError: Error | null = null;

    while (retries > 0) {
      const attempt = 4 - retries;
      try {
        console.log(`[chart-data] Attempt ${attempt}/3 → POST /api/v5/chart-data/birth-chart`);
        const t0 = Date.now();

        const dataRes = await fetch(
          'https://astrologer.p.rapidapi.com/api/v5/chart-data/birth-chart',
          { method: 'POST', headers: rapidApiHeaders, body: JSON.stringify(dataBody) }
        );

        const elapsed = Date.now() - t0;
        console.log(`[chart-data] Response: status=${dataRes.status} in ${elapsed}ms`);

        if (dataRes.ok) {
          const rawJson = await dataRes.json();
          // Astrologer v5 può annidare i dati sotto .data o .chart_data
          chartData = rawJson?.data ?? rawJson?.chart_data ?? rawJson;
          const _src = rawJson?.data ? 'rawJson.data' : (rawJson?.chart_data ? 'rawJson.chart_data' : 'rawJson');
          console.log(`[chart-data] Response keys: ${Object.keys(rawJson).join(', ')} → using ${_src}`);
          console.log(`[chart-data] Normalized keys: ${Object.keys(chartData || {}).join(', ')}`);
          console.log(`[chart-data] ✅ OK — planets=${(chartData.planets || []).length}, houses=${(chartData.houses || []).length}, aspects=${(chartData.aspects || []).length}`);
          break;
        }

        const dataError = await dataRes.text();
        console.error(`[chart-data] ❌ ERROR ${dataRes.status} (attempt ${attempt}/3): ${dataError}`);

        if (
          dataRes.status === 429 ||
          dataError.toLowerCase().includes('limit exceeded') ||
          dataError.toLowerCase().includes('quota') ||
          dataError.toLowerCase().includes('too many requests')
        ) {
          console.error('[chart-data] 🚫 RAPIDAPI QUOTA EXCEEDED');
          const technical = `RapidAPI Astrologer quota exceeded — chart-data:${dataRes.status} — ${dataError}`;
          notifyQuotaToAdmins({
            provider: 'rapidapi',
            errorCode: 'API_QUOTA_EXCEEDED',
            functionName: 'calculate-natal-chart',
            technicalMessage: technical,
          }).catch(() => {});
          return errorResponse('API_QUOTA_EXCEEDED', technical, { provider: 'rapidapi' });
        }

        if (dataRes.status === 422 || dataRes.status === 400) {
          console.error('[chart-data] 🛑 Validation error — aborting retries (payload issue)');
          lastError = new Error(`chart-data validation failed (${dataRes.status}): ${dataError}`);
          break;
        }

        lastError = new Error(`chart-data returned ${dataRes.status}: ${dataError}`);
        retries--;
        if (retries > 0) {
          const waitTime = (4 - retries) * 1000;
          console.log(`[chart-data] Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (error) {
        console.error(`[chart-data] 💥 Network/fetch exception (attempt ${attempt}/3):`, error);
        lastError = error as Error;
        retries--;
        if (retries > 0) {
          const waitTime = (4 - retries) * 1000;
          console.log(`[chart-data] Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          break;
        }
      }
    }

    if (!chartData) {
      const msg = `Impossibile calcolare il tema natale: ${lastError?.message || 'Errore sconosciuto'}`;
      return errorResponse('UPSTREAM_UNAVAILABLE', msg, { provider: 'rapidapi' });
    }

    // Astrologer v5 mette i pianeti e le case dentro chart_data.subject (oggetti per nome)
    const subject: any = chartData?.subject ?? {};
    const _subjectKeys = Object.keys(subject);
    console.log(`[chart-data] subject keys count=${_subjectKeys.length}`);
    if (!subject || _subjectKeys.length === 0) {
      const keys = Object.keys(chartData || {}).join(', ');
      const technical = `Astrologer response shape unexpected (no subject). Keys: [${keys}]`;
      console.error('[chart-data] 🛑', technical);
      return errorResponse('UPSTREAM_UNAVAILABLE', technical, { provider: 'rapidapi' });
    }

    // /context (best-effort, non blocca il salvataggio)
    try {
      console.log('[context] → POST /api/v5/context/birth-chart');
      const t0 = Date.now();
      const contextRes = await fetch(
        'https://astrologer.p.rapidapi.com/api/v5/context/birth-chart',
        { method: 'POST', headers: rapidApiHeaders, body: JSON.stringify(contextBody) }
      );
      const elapsed = Date.now() - t0;
      console.log(`[context] Response: status=${contextRes.status} in ${elapsed}ms`);

      if (contextRes.ok) {
        const ctxRaw = await contextRes.json();
        const ctxPayload = ctxRaw?.data ?? ctxRaw?.chart_data ?? ctxRaw;
        natalContext = ctxPayload?.context || ctxRaw?.context || "";
        console.log(`[context] ✅ OK — context length=${natalContext.length}`);
      } else {
        const contextError = await contextRes.text();
        console.warn(`[context] ⚠️ FAILED ${contextRes.status} — proceeding without natal_context: ${contextError}`);
        if (contextRes.status === 429) {
          notifyQuotaToAdmins({
            provider: 'rapidapi',
            errorCode: 'API_QUOTA_EXCEEDED',
            functionName: 'calculate-natal-chart',
            technicalMessage: `context endpoint quota: ${contextError}`,
          }).catch(() => {});
        }
      }
    } catch (ctxErr) {
      console.warn('[context] 💥 Network/fetch exception, proceeding without natal_context:', ctxErr);
    }

    // === Astrologer v5: pianeti e case sono dentro chart_data.subject (oggetti per chiave) ===

    // Mappa segni 3-letter → nome inglese completo (formato atteso dal resto dell'app)
    const SIGN_FULL: Record<string, string> = {
      Ari: 'Aries', Tau: 'Taurus', Gem: 'Gemini', Can: 'Cancer',
      Leo: 'Leo', Vir: 'Virgo', Lib: 'Libra', Sco: 'Scorpio',
      Sag: 'Sagittarius', Cap: 'Capricorn', Aqu: 'Aquarius', Pis: 'Pisces',
    };
    const normalizeSign = (s: any): string => {
      if (!s || typeof s !== 'string') return getZodiacSign(0);
      return SIGN_FULL[s] || s;
    };

    // Mappa nome casa Astrologer ("First_House") → numero
    const HOUSE_NAME_TO_NUMBER: Record<string, number> = {
      First_House: 1, Second_House: 2, Third_House: 3, Fourth_House: 4,
      Fifth_House: 5, Sixth_House: 6, Seventh_House: 7, Eighth_House: 8,
      Ninth_House: 9, Tenth_House: 10, Eleventh_House: 11, Twelfth_House: 12,
    };

    // Pianeti da estrarre dal subject (chiavi lowercase)
    const PLANET_KEYS: Array<{ key: string; mapped: string }> = [
      { key: 'sun', mapped: 'sun' },
      { key: 'moon', mapped: 'moon' },
      { key: 'mercury', mapped: 'mercury' },
      { key: 'venus', mapped: 'venus' },
      { key: 'mars', mapped: 'mars' },
      { key: 'jupiter', mapped: 'jupiter' },
      { key: 'saturn', mapped: 'saturn' },
      { key: 'uranus', mapped: 'uranus' },
      { key: 'neptune', mapped: 'neptune' },
      { key: 'pluto', mapped: 'pluto' },
      { key: 'chiron', mapped: 'chiron' },
      { key: 'true_north_lunar_node', mapped: 'north_node' },
      { key: 'mean_north_lunar_node', mapped: 'north_node' },
      { key: 'true_south_lunar_node', mapped: 'south_node' },
      { key: 'mean_south_lunar_node', mapped: 'south_node' },
    ];

    // Mappa nome API ("Sun", "True_North_Lunar_Node", "Ascendant") → chiave interna lowercase
    const API_NAME_TO_INTERNAL: Record<string, string> = {
      Sun: 'sun', Moon: 'moon', Mercury: 'mercury', Venus: 'venus', Mars: 'mars',
      Jupiter: 'jupiter', Saturn: 'saturn', Uranus: 'uranus', Neptune: 'neptune',
      Pluto: 'pluto', Chiron: 'chiron',
      Ascendant: 'ascendant', Descendant: 'descendant',
      Medium_Coeli: 'mc', Imum_Coeli: 'ic',
      True_North_Lunar_Node: 'north_node', Mean_North_Lunar_Node: 'north_node',
      True_South_Lunar_Node: 'south_node', Mean_South_Lunar_Node: 'south_node',
      Mean_Lilith: 'lilith',
    };

    const planetsObject: any = {};
    for (const { key, mapped } of PLANET_KEYS) {
      const p = subject[key];
      if (!p || typeof p !== 'object') continue;
      if (planetsObject[mapped]) continue; // preferisci la prima occorrenza (es. true_node prima di mean_node)
      const longitude = typeof p.abs_pos === 'number' ? p.abs_pos : (typeof p.position === 'number' ? p.position : 0);
      planetsObject[mapped] = {
        longitude,
        sign: normalizeSign(p.sign),
        degree: parseFloat(getDegreeInSign(longitude).toFixed(2)),
        house: HOUSE_NAME_TO_NUMBER[p.house] || p.house || null,
        retrograde: !!p.retrograde,
      };
    }
    console.log(`[chart-data] parsed planets=${Object.keys(planetsObject).length}: ${Object.keys(planetsObject).join(',')}`);

    // Case
    const HOUSE_KEYS = [
      'first_house','second_house','third_house','fourth_house','fifth_house','sixth_house',
      'seventh_house','eighth_house','ninth_house','tenth_house','eleventh_house','twelfth_house',
    ];
    const housesArray: any[] = [];
    HOUSE_KEYS.forEach((hk, idx) => {
      const h = subject[hk];
      if (h && typeof h === 'object') {
        const longitude = typeof h.abs_pos === 'number' ? h.abs_pos : (typeof h.position === 'number' ? h.position : (idx * 30));
        housesArray.push({
          number: idx + 1,
          longitude,
          sign: normalizeSign(h.sign),
          degree: parseFloat(getDegreeInSign(longitude).toFixed(2)),
        });
      }
    });
    console.log(`[chart-data] parsed houses=${housesArray.length}`);

    // Validazione: serve almeno Sole + Luna + 12 case
    if (!planetsObject.sun || !planetsObject.moon || housesArray.length !== 12) {
      const technical = `Astrologer subject incomplete: planets=${Object.keys(planetsObject).length}, houses=${housesArray.length}, hasSun=${!!planetsObject.sun}, hasMoon=${!!planetsObject.moon}`;
      console.error('[chart-data] 🛑', technical);
      return errorResponse('UPSTREAM_UNAVAILABLE', technical, { provider: 'rapidapi' });
    }

    // Ascendente / Medio Cielo
    const ascRaw = subject.ascendant || {};
    const ascLong = typeof ascRaw.abs_pos === 'number' ? ascRaw.abs_pos : (housesArray[0]?.longitude || 0);
    const ascendantData = {
      longitude: ascLong,
      sign: normalizeSign(ascRaw.sign) || housesArray[0]?.sign,
      degree: parseFloat(getDegreeInSign(ascLong).toFixed(2)),
    };

    const mcRaw = subject.medium_coeli || {};
    const mcLong = typeof mcRaw.abs_pos === 'number' ? mcRaw.abs_pos : (housesArray[9]?.longitude || 0);
    const midheavenData = {
      longitude: mcLong,
      sign: normalizeSign(mcRaw.sign) || housesArray[9]?.sign,
      degree: parseFloat(getDegreeInSign(mcLong).toFixed(2)),
    };

    // Aspetti (formato v5: p1_name, p2_name, aspect, orbit, aspect_degrees, diff)
    const apiAspects = Array.isArray(chartData.aspects) ? chartData.aspects : [];
    const aspectsArray = apiAspects
      .map((a: any) => {
        const p1 = API_NAME_TO_INTERNAL[a.p1_name] || (typeof a.p1_name === 'string' ? a.p1_name.toLowerCase() : null);
        const p2 = API_NAME_TO_INTERNAL[a.p2_name] || (typeof a.p2_name === 'string' ? a.p2_name.toLowerCase() : null);
        if (!p1 || !p2) return null;
        return {
          planet1: p1,
          planet2: p2,
          type: typeof a.aspect === 'string' ? a.aspect.toLowerCase() : 'unknown',
          angle: parseFloat(((a.aspect_degrees ?? a.diff ?? 0) as number).toFixed(2)),
          orb: parseFloat(((a.orbit ?? 0) as number).toFixed(2)),
        };
      })
      .filter(Boolean);
    console.log(`[chart-data] parsed aspects=${aspectsArray.length}`);

    const houseSystemName: string | undefined =
      subject.houses_system_name || subject.houses_system_identifier || undefined;

    // Prepare final natalChartData structure
    const natalChartData = {
      planets: planetsObject,
      houses: housesArray,
      ascendant: ascendantData,
      midheaven: midheavenData,
      aspects: aspectsArray,
      houseSystem: houseSystemName,
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
    const msg = (error as Error)?.message || 'Internal server error';
    if (/unauthor/i.test(msg) || /authorization header/i.test(msg)) {
      return errorResponse('UNAUTHORIZED', msg);
    }
    if (/invalid|missing required|format/i.test(msg)) {
      return errorResponse('INVALID_INPUT', msg);
    }
    return errorResponse('INTERNAL_ERROR', msg);
  }
});
