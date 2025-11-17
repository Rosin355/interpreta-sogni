import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Traduzioni segni zodiacali
const zodiacTranslations: Record<string, string> = {
  'Aries': 'Ariete',
  'Taurus': 'Toro',
  'Gemini': 'Gemelli',
  'Cancer': 'Cancro',
  'Leo': 'Leone',
  'Virgo': 'Vergine',
  'Libra': 'Bilancia',
  'Scorpio': 'Scorpione',
  'Sagittarius': 'Sagittario',
  'Capricorn': 'Capricorno',
  'Aquarius': 'Acquario',
  'Pisces': 'Pesci'
};

function translateSign(sign: string): string {
  return zodiacTranslations[sign] || sign;
}

function buildAstrologicalContext(natalData: any): string {
  if (!natalData || !natalData.planets) {
    return "Tema natale non disponibile.";
  }

  const chiron = natalData.planets.chiron;
  const mercury = natalData.planets.mercury;
  const venus = natalData.planets.venus;
  const sun = natalData.planets.sun;
  const moon = natalData.planets.moon;
  
  let context = "DATI ASTROLOGICI DELLA PERSONA:\n\n";
  
  if (sun) {
    context += `- SOLE in ${translateSign(sun.sign)}, Casa ${sun.house}: rappresenta l'identità e la coscienza di sé\n`;
  }
  
  if (moon) {
    context += `- LUNA in ${translateSign(moon.sign)}, Casa ${moon.house}: rappresenta le emozioni e il mondo inconscio\n`;
  }
  
  if (chiron) {
    context += `- CHIRONE in ${translateSign(chiron.sign)}, Casa ${chiron.house}: indica la ferita emotiva principale`;
    context += ` - ${getChironTheme(chiron.sign, chiron.house)}\n`;
  }
  
  if (mercury) {
    context += `- MERCURIO in ${translateSign(mercury.sign)}, Casa ${mercury.house}: stile comunicativo`;
    context += ` - ${getMercuryStyle(mercury.sign)}\n`;
  }
  
  if (venus) {
    context += `- VENERE in ${translateSign(venus.sign)}, Casa ${venus.house}: modo di amare`;
    context += ` - ${getVenusStyle(venus.sign)}\n`;
  }
  
  if (natalData.ascendant) {
    context += `- ASCENDENTE in ${translateSign(natalData.ascendant.sign)}: come si presenta al mondo\n`;
  }

  return context;
}

function getChironTheme(sign: string, house: number): string {
  const themes: Record<string, string> = {
    'Aries': 'ferita legata all\'identità e all\'assertività',
    'Taurus': 'ferita legata alla sicurezza materiale e all\'autostima',
    'Gemini': 'ferita legata alla comunicazione e all\'apprendimento',
    'Cancer': 'ferita legata alle emozioni e al senso di appartenenza',
    'Leo': 'ferita legata all\'autostima, alla creatività e al riconoscimento',
    'Virgo': 'ferita legata al perfezionismo e all\'utilità',
    'Libra': 'ferita legata alle relazioni e all\'armonia',
    'Scorpio': 'ferita legata al potere, all\'intimità e alla trasformazione',
    'Sagittarius': 'ferita legata al significato della vita e alla libertà',
    'Capricorn': 'ferita legata all\'autorità e al successo',
    'Aquarius': 'ferita legata all\'individualità e all\'appartenenza al gruppo',
    'Pisces': 'ferita legata ai confini e alla connessione spirituale'
  };
  return themes[sign] || 'ferita emotiva profonda';
}

function getMercuryStyle(sign: string): string {
  const styles: Record<string, string> = {
    'Aries': 'diretto e impulsivo',
    'Taurus': 'lento, riflessivo e concreto',
    'Gemini': 'veloce, versatile e curioso',
    'Cancer': 'emotivo e intuitivo',
    'Leo': 'drammatico e espressivo',
    'Virgo': 'analitico e preciso',
    'Libra': 'diplomatico e armonioso',
    'Scorpio': 'profondo e intenso',
    'Sagittarius': 'filosofico e diretto',
    'Capricorn': 'strutturato e pratico',
    'Aquarius': 'originale e distaccato',
    'Pisces': 'immaginativo e sfumato'
  };
  return styles[sign] || 'unico';
}

function getVenusStyle(sign: string): string {
  const styles: Record<string, string> = {
    'Aries': 'passionale e impulsivo',
    'Taurus': 'sensuale e stabile',
    'Gemini': 'intellettuale e giocoso',
    'Cancer': 'protettivo e emotivo',
    'Leo': 'generoso e romantico',
    'Virgo': 'pratico e servizievole',
    'Libra': 'armonioso e diplomatico',
    'Scorpio': 'intenso e trasformativo',
    'Sagittarius': 'libero e avventuroso',
    'Capricorn': 'serio e leale',
    'Aquarius': 'indipendente e amichevole',
    'Pisces': 'compassionevole e idealista'
  };
  return styles[sign] || 'unico';
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { dreamContent, dreamTags, dreamMood } = await req.json();

    console.log('Interpreting dream with astrology for user:', user.id);

    if (!dreamContent) {
      throw new Error('Dream content is required');
    }

    // Carica il profilo con i dati del tema natale
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('natal_chart_data, gender')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error loading profile:', profileError);
    }

    const natalChartData = profile?.natal_chart_data;
    const hasNatalChart = natalChartData && natalChartData.planets;

    // Costruisci il contesto astrologico
    const astroContext = hasNatalChart ? buildAstrologicalContext(natalChartData) : '';
    
    // Aggiungi informazioni sul genere se disponibili
    const genderContext = profile?.gender ? `\n\nIl sognatore è di genere ${profile.gender}. Considera questo aspetto nelle tue interpretazioni quando rilevante per archetipi, simbolismi o dinamiche psicologiche.` : '';

    // Prepara il prompt per Lovable AI
    const systemPrompt = hasNatalChart ? `Sei un'esperta interprete di sogni che integra la conoscenza astrologica per offrire interpretazioni profonde e personali.

${astroContext}${genderContext}

ISTRUZIONI PER L'INTERPRETAZIONE:
1. Interpreta il sogno usando simbolismo, archetipi junghiani e psicologia dei sogni
2. Considera il tema natale della persona per collegamenti pertinenti
3. Menziona collegamenti astrologici SOLO quando sono veramente pertinenti al sogno:
   - Se il sogno riguarda autostima, identità, creatività → collega a CHIRONE e SOLE
   - Se il sogno riguarda comunicazione, apprendimento, parole → collega a MERCURIO
   - Se il sogno riguarda amore, relazioni, bellezza → collega a VENERE
   - Se il sogno riguarda emozioni profonde, famiglia → collega a LUNA
4. NON forzare collegamenti astrologici se il sogno non li suggerisce naturalmente
5. Scrivi in italiano, in modo poetico ma chiaro e accessibile
6. Mantieni un tono empatico e non giudicante
7. Lunghezza: 250-350 parole
8. Offri spunti di riflessione alla fine

STILE:
- Usa metafore e linguaggio evocativo
- Bilancia profondità psicologica con praticità
- Integra astrologia in modo sottile, non didascalico
- Enfatizza crescita personale e consapevolezza` : `Sei un'esperta interprete di sogni che usa simbolismo, archetipi junghiani e psicologia dei sogni.
${genderContext}

ISTRUZIONI:
1. Interpreta il sogno in modo profondo e personale
2. Scrivi in italiano, in modo poetico ma chiaro
3. Mantieni un tono empatico e non giudicante
4. Lunghezza: 250-350 parole
5. Offri spunti di riflessione alla fine

STILE:
- Usa metafore e linguaggio evocativo
- Bilancia profondità psicologica con praticità
- Enfatizza crescita personale e consapevolezza`;

    let userPrompt = `Interpreta questo sogno:\n\n${dreamContent}`;
    
    if (dreamTags && dreamTags.length > 0) {
      userPrompt += `\n\nTag del sogno: ${dreamTags.join(", ")}`;
    }
    
    if (dreamMood) {
      userPrompt += `\n\nUmore/sensazione al risveglio: ${dreamMood}`;
    }

    // Chiama Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI...');

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`Lovable AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const interpretation = aiData.choices?.[0]?.message?.content;

    if (!interpretation) {
      throw new Error('No interpretation generated');
    }

    console.log('Dream interpretation generated successfully');

    return new Response(
      JSON.stringify({ 
        interpretation,
        hasAstrologicalContext: hasNatalChart,
        success: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in interpret-dream-with-astrology:', error);
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
