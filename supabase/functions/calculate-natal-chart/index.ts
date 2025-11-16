import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Importa la libreria per il calcolo del tema natale
// Nota: circular-natal-horoscope-js non è disponibile direttamente su Deno
// Useremo un'alternativa o implementeremo i calcoli base
// Per ora, creiamo la struttura base che salva i dati

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

    // TODO: Implementare calcolo tema natale
    // Per ora creiamo una struttura dati di esempio
    // In una versione successiva, integreremo una libreria di calcolo astrologico
    
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
      // Placeholder: questi dati dovranno essere calcolati con una libreria astrologica
      planets: {
        sun: { sign: 'Leo', house: 5, degree: 15.3, retrograde: false },
        moon: { sign: 'Cancer', house: 4, degree: 22.1, retrograde: false },
        mercury: { sign: 'Virgo', house: 6, degree: 8.5, retrograde: false },
        venus: { sign: 'Libra', house: 7, degree: 12.8, retrograde: false },
        mars: { sign: 'Aries', house: 1, degree: 5.2, retrograde: false },
        jupiter: { sign: 'Sagittarius', house: 9, degree: 18.7, retrograde: false },
        saturn: { sign: 'Capricorn', house: 10, degree: 23.4, retrograde: false },
        uranus: { sign: 'Aquarius', house: 11, degree: 10.2, retrograde: false },
        neptune: { sign: 'Pisces', house: 12, degree: 15.8, retrograde: false },
        pluto: { sign: 'Scorpio', house: 8, degree: 20.3, retrograde: false },
        chiron: { sign: 'Leo', house: 5, degree: 18.2, retrograde: false },
        northNode: { sign: 'Gemini', house: 3, degree: 12.5, retrograde: true },
        southNode: { sign: 'Sagittarius', house: 9, degree: 12.5, retrograde: true }
      },
      houses: [
        { number: 1, sign: 'Aries', degree: 0 },
        { number: 2, sign: 'Taurus', degree: 30 },
        { number: 3, sign: 'Gemini', degree: 60 },
        { number: 4, sign: 'Cancer', degree: 90 },
        { number: 5, sign: 'Leo', degree: 120 },
        { number: 6, sign: 'Virgo', degree: 150 },
        { number: 7, sign: 'Libra', degree: 180 },
        { number: 8, sign: 'Scorpio', degree: 210 },
        { number: 9, sign: 'Sagittarius', degree: 240 },
        { number: 10, sign: 'Capricorn', degree: 270 },
        { number: 11, sign: 'Aquarius', degree: 300 },
        { number: 12, sign: 'Pisces', degree: 330 }
      ],
      ascendant: { sign: 'Aries', degree: 5.2 },
      midheaven: { sign: 'Capricorn', degree: 10.5 },
      aspects: [
        { planet1: 'sun', planet2: 'moon', type: 'trine', angle: 120 },
        { planet1: 'mercury', planet2: 'venus', type: 'conjunction', angle: 0 },
        { planet1: 'mars', planet2: 'jupiter', type: 'square', angle: 90 }
      ],
      note: 'Calcolo placeholder - da implementare con libreria astrologica reale'
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
        message: 'Tema natale calcolato e salvato con successo' 
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
