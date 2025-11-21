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

  const planets = natalData.planets;
  const sun = planets.sun;
  const moon = planets.moon;
  const mercury = planets.mercury;
  const venus = planets.venus;
  const mars = planets.mars;
  const jupiter = planets.jupiter;
  const saturn = planets.saturn;
  const neptune = planets.neptune;
  const pluto = planets.pluto;
  const chiron = planets.chiron;
  
  let context = "DATI ASTROLOGICI DELLA PERSONA:\n\n";
  
  // LUMINARI E PILASTRI
  if (sun) {
    context += `- SOLE in ${translateSign(sun.sign)}, Casa ${sun.house}: identità e coscienza di sé\n`;
  }
  
  if (moon) {
    context += `- LUNA in ${translateSign(moon.sign)}, Casa ${moon.house}: emozioni e mondo inconscio - ${getHouseContext(moon.house)}\n`;
  }
  
  if (natalData.ascendant) {
    context += `- ASCENDENTE in ${translateSign(natalData.ascendant.sign)}: come si presenta al mondo\n`;
  }
  
  context += "\n";
  
  // PIANETI PERSONALI
  if (mercury) {
    context += `- MERCURIO in ${translateSign(mercury.sign)}, Casa ${mercury.house}: comunicazione ${getMercuryStyle(mercury.sign)}\n`;
  }
  
  if (venus) {
    context += `- VENERE in ${translateSign(venus.sign)}, Casa ${venus.house}: amore ${getVenusStyle(venus.sign)}\n`;
  }
  
  if (mars) {
    context += `- MARTE in ${translateSign(mars.sign)}, Casa ${mars.house}: ${getMarsTheme(mars.sign, mars.house)}\n`;
  }
  
  context += "\n";
  
  // PIANETI SOCIALI E TRANSPERSONALI
  if (jupiter) {
    context += `- GIOVE in ${translateSign(jupiter.sign)}, Casa ${jupiter.house}: ${getJupiterTheme(jupiter.sign, jupiter.house)}\n`;
  }
  
  if (saturn) {
    context += `- SATURNO in ${translateSign(saturn.sign)}, Casa ${saturn.house}: ${getSaturnLesson(saturn.sign, saturn.house)}\n`;
  }
  
  if (neptune) {
    context += `- NETTUNO in ${translateSign(neptune.sign)}, Casa ${neptune.house}: ${getNeptuneTheme(neptune.sign, neptune.house)}\n`;
  }
  
  if (pluto) {
    context += `- PLUTONE in ${translateSign(pluto.sign)}, Casa ${pluto.house}: ${getPlutoTransformation(pluto.sign, pluto.house)}\n`;
  }
  
  context += "\n";
  
  // PUNTI SPECIALI
  if (chiron) {
    context += `- CHIRONE in ${translateSign(chiron.sign)}, Casa ${chiron.house}: ${getChironTheme(chiron.sign, chiron.house)}\n`;
  }
  
  // CASE RILEVANTI (menziona solo case con più pianeti o case chiave)
  const houseCounts: Record<number, string[]> = {};
  Object.entries(planets).forEach(([planetName, data]: [string, any]) => {
    if (data && data.house) {
      if (!houseCounts[data.house]) houseCounts[data.house] = [];
      houseCounts[data.house].push(planetName.toUpperCase());
    }
  });
  
  const relevantHouses = Object.entries(houseCounts)
    .filter(([house, planetsInHouse]) => planetsInHouse.length > 1 || [4, 7, 8, 12].includes(Number(house)))
    .sort((a, b) => b[1].length - a[1].length);
  
  if (relevantHouses.length > 0) {
    context += "\nCASE RILEVANTI:\n";
    relevantHouses.slice(0, 3).forEach(([house, planetsInHouse]) => {
      context += `- Casa ${house} (${getHouseContext(Number(house))}): contiene ${planetsInHouse.join(', ')}\n`;
    });
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

function getMarsTheme(sign: string, house: number): string {
  const themes: Record<string, string> = {
    'Aries': 'energia diretta e assertiva',
    'Taurus': 'energia lenta ma persistente',
    'Gemini': 'energia mentale e dispersiva',
    'Cancer': 'energia difensiva e protettiva',
    'Leo': 'energia creativa e orgogliosa',
    'Virgo': 'energia precisa e critica',
    'Libra': 'energia indiretta e diplomatica',
    'Scorpio': 'energia intensa e controllata',
    'Sagittarius': 'energia espansiva e avventurosa',
    'Capricorn': 'energia disciplinata e ambiziosa',
    'Aquarius': 'energia ribelle e innovativa',
    'Pisces': 'energia diffusa, difficoltà nell\'esprimere rabbia'
  };
  const baseTheme = themes[sign] || 'energia unica';
  if (house === 12) return `${baseTheme}, spesso repressa nell'inconscio`;
  if (house === 1) return `${baseTheme}, espressa apertamente`;
  return baseTheme;
}

function getSaturnLesson(sign: string, house: number): string {
  const lessons: Record<string, string> = {
    'Aries': 'imparare pazienza e disciplinare l\'impulso',
    'Taurus': 'superare paura di perdere sicurezza materiale',
    'Gemini': 'strutturare il pensiero dispersivo',
    'Cancer': 'affrontare vulnerabilità emotiva',
    'Leo': 'umiltà e accettazione dei limiti',
    'Virgo': 'perfezionismo e autocritica',
    'Libra': 'paura del rifiuto nelle relazioni',
    'Scorpio': 'controllo e paura della perdita di potere',
    'Sagittarius': 'limitazioni nelle opportunità di crescita',
    'Capricorn': 'peso della responsabilità e del dovere',
    'Aquarius': 'isolamento e difficoltà nel gruppo',
    'Pisces': 'confini deboli e senso di sacrificio'
  };
  const baseLesson = lessons[sign] || 'lezioni karmiche';
  if (house === 4) return `${baseLesson}, questioni con famiglia e figura paterna`;
  if (house === 10) return `${baseLesson}, pressione professionale e sociale`;
  if (house === 12) return `${baseLesson}, paure inconsce profonde`;
  return baseLesson;
}

function getNeptuneTheme(sign: string, house: number): string {
  const themes: Record<string, string> = {
    'Pisces': 'sensibilità psichica molto elevata',
    'Aquarius': 'idealismo umanitario',
    'Capricorn': 'dissoluzione delle strutture rigide',
    'Sagittarius': 'ricerca mistica e spirituale',
    'Scorpio': 'intuizione profonda dei misteri',
    'Libra': 'idealizzazione delle relazioni',
    'Virgo': 'servizio compassionevole',
    'Leo': 'creatività artistica e ispirata',
    'Cancer': 'empatia emotiva intensa',
    'Gemini': 'immaginazione e fantasia mentale',
    'Taurus': 'connessione con la bellezza naturale',
    'Aries': 'ispirazione visionaria'
  };
  const baseTheme = themes[sign] || 'confini sottili e sensibilità';
  if (house === 12) return `${baseTheme}, confine molto sottile tra sogno e realtà`;
  if (house === 8) return `${baseTheme}, percezione dell'invisibile`;
  if (house === 4) return `${baseTheme}, atmosfera familiare eterea`;
  return baseTheme;
}

function getPlutoTransformation(sign: string, house: number): string {
  const themes: Record<string, string> = {
    'Scorpio': 'intensi processi di morte e rinascita',
    'Leo': 'trasformazione dell\'ego e del potere personale',
    'Cancer': 'trasformazione emotiva profonda',
    'Libra': 'trasformazione attraverso le relazioni',
    'Virgo': 'perfezionamento ossessivo',
    'Sagittarius': 'trasformazione delle credenze',
    'Capricorn': 'ristrutturazione dell\'autorità',
    'Aquarius': 'rivoluzione e innovazione radicale',
    'Pisces': 'dissoluzione dell\'ego',
    'Aries': 'rinascita dell\'identità',
    'Taurus': 'trasformazione dei valori',
    'Gemini': 'trasformazione mentale'
  };
  const baseTheme = themes[sign] || 'trasformazione profonda';
  if (house === 8) return `${baseTheme}, potere di rigenerazione`;
  if (house === 12) return `${baseTheme}, nell'inconscio`;
  return baseTheme;
}

function getJupiterTheme(sign: string, house: number): string {
  const themes: Record<string, string> = {
    'Sagittarius': 'grande espansione e ricerca di significato',
    'Pisces': 'crescita spirituale e compassione',
    'Cancer': 'crescita emotiva e protezione',
    'Aries': 'ottimismo e iniziativa',
    'Taurus': 'abbondanza materiale',
    'Gemini': 'curiosità intellettuale',
    'Leo': 'generosità e creatività',
    'Virgo': 'crescita attraverso il servizio',
    'Libra': 'espansione nelle relazioni',
    'Scorpio': 'crescita attraverso la crisi',
    'Capricorn': 'successo attraverso la disciplina',
    'Aquarius': 'visione umanitaria'
  };
  return themes[sign] || 'opportunità di crescita';
}

function getHouseContext(house: number): string {
  const contexts: Record<number, string> = {
    1: 'identità e autoimmagine',
    2: 'risorse e valori personali',
    3: 'comunicazione e apprendimento',
    4: 'famiglia, radici, sicurezza emotiva',
    5: 'creatività, piacere, espressione di sé',
    6: 'lavoro quotidiano e salute',
    7: 'relazioni e partnerships',
    8: 'trasformazione, intimità, morte e rinascita',
    9: 'filosofia, viaggi, espansione',
    10: 'carriera, ambizioni, immagine pubblica',
    11: 'amicizie, gruppi, ideali',
    12: 'inconscio, spiritualità, segreti'
  };
  return contexts[house] || `area di vita ${house}`;
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

    const { dreamId, dreamContent, dreamTags, dreamMood } = await req.json();

    console.log('Interpreting dream with astrology for user:', user.id);

    if (!dreamContent) {
      throw new Error('Dream content is required');
    }

    if (!dreamId) {
      throw new Error('Dream ID is required');
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

COLLEGAMENTI PRIMARI (menziona SOLO se pertinenti al sogno):

🌟 IDENTITÀ E AUTOSTIMA:
- Chirone (ferita), Sole (essenza), Casa 1 (maschera), Casa 5 (creatività)

💬 COMUNICAZIONE E PENSIERO:
- Mercurio (stile comunicativo), Casa 3 (apprendimento)

❤️ AMORE E RELAZIONI:
- Venere (modo di amare), Casa 7 (partnerships)

🌙 EMOZIONI E INCONSCIO:
- Luna (emozioni), Casa 4 (famiglia/madre), Nettuno (confini), Casa 12 (inconscio/segreti/spiritualità)

🔥 ENERGIA, RABBIA, CONFLITTI:
- Marte (assertività/conflitto), Casa 1 (azione diretta), Casa 12 (rabbia repressa)

⚠️ PAURE, LIMITI, ANSIA:
- Saturno (struttura/limite/paura), Casa 4 (famiglia/padre), Casa 10 (autorità), Casa 12 (paure inconsce)

🌊 SOGNI, ILLUSIONI, SPIRITUALITÀ:
- Nettuno (dissoluzione/spiritualità), Casa 12 (inconscio), Casa 8 (misteri)

💀 TRASFORMAZIONE, MORTE, POTERE:
- Plutone (morte/rinascita), Casa 8 (sessualità/trasformazione)

🎯 CRESCITA, OPPORTUNITÀ:
- Giove (espansione), Casa 9 (ricerca di significato)

REGOLE:
- Massimo 1-2 riferimenti astrologici per interpretazione
- Solo se VERAMENTE pertinenti al tema del sogno
- Linguaggio accessibile: "potrebbe essere collegato a...", "il tuo tema suggerisce..."
- NON forzare mai i collegamenti
- L'astrologia arricchisce, non domina l'interpretazione
- Particolare attenzione a Casa 12 e Nettuno per sogni onirici/simbolici

ISTRUZIONI:
1. Interpreta il sogno usando simbolismo, archetipi junghiani e psicologia dei sogni
2. Considera il tema natale per collegamenti pertinenti (vedi collegamenti sopra)
3. Scrivi in italiano, in modo poetico ma chiaro e accessibile
4. Mantieni un tono empatico e non giudicante
5. Lunghezza: 250-350 parole
6. Offri spunti di riflessione alla fine

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
5. IMPORTANTE: concludi sempre il pensiero con una frase completa e significativa, anche se stai raggiungendo il limite di lunghezza
6. Termina sempre con una frase conclusiva completa
7. Non lasciare mai concetti incompleti o frasi troncate
8. Se stai per raggiungere il limite, concludi elegantemente il discorso
9. È meglio una interpretazione più breve ma completa che una lunga ma tagliata
10. Offri spunti di riflessione alla fine

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
        max_tokens: 1200
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

    console.log(`Dream interpretation with astrology generated: ${interpretation.length} characters`);

    // Genera riassunto intelligente se > 500 caratteri
    let interpretationSummary = interpretation;

    if (interpretation.length > 500) {
      console.log('Generating TTS summary...');
      
      const summaryPrompt = `Riassumi questa interpretazione di sogno in MASSIMO 500 caratteri, mantenendo:
- I concetti chiave e simboli principali
- I riferimenti astrologici più importanti
- Il tono empatico
- Le conclusioni importanti
IMPORTANTE: termina sempre con una frase completa e significativa.

Interpretazione completa:
${interpretation}

Riassunto (max 500 caratteri):`;

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: summaryPrompt }
          ],
          max_tokens: 200,
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        const generatedSummary = summaryData.choices?.[0]?.message?.content?.trim();
        
        if (generatedSummary && generatedSummary.length <= 500) {
          interpretationSummary = generatedSummary;
          console.log(`Summary generated: ${interpretationSummary.length} characters`);
        } else {
          interpretationSummary = interpretation.substring(0, 497) + '...';
          console.log('Fallback: truncated summary');
        }
      } else {
        interpretationSummary = interpretation.substring(0, 497) + '...';
        console.log('Fallback: truncated summary (API error)');
      }
    }

    // Salva nel database
    console.log('Saving interpretation to database...');

    const { error: updateError } = await supabase
      .from('dreams')
      .update({ 
        interpretation,
        interpretation_summary: interpretationSummary 
      })
      .eq('id', dreamId);

    if (updateError) {
      console.error('Error updating dream:', updateError);
      console.warn('Continuing despite DB update error');
    }

    console.log('Dream interpretation with astrology saved successfully');

    // Pre-cache TTS audio in background (non-blocking) for both interpretation and dream content
    if (interpretationSummary && interpretationSummary.length > 0) {
      console.log('Starting background TTS pre-caching for astrological interpretation');
      
      const precacheTTS = async () => {
        try {
          // Pre-cache interpretation summary
          console.log('Pre-caching astrological interpretation summary');
          const summaryResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/text-to-speech-elevenlabs`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              },
              body: JSON.stringify({
                text: interpretationSummary,
                voiceId: 'cnDF6tD6CWVBeLKYlCXW'
              })
            }
          );
          
          if (summaryResponse.ok) {
            console.log('TTS audio pre-cached successfully for astrological interpretation');
          } else {
            console.error('TTS pre-caching failed for summary:', await summaryResponse.text());
          }

          // Pre-cache dream content
          if (dreamContent && dreamContent.length > 0) {
            console.log('Pre-caching dream content');
            const contentResponse = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/text-to-speech-elevenlabs`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                },
                body: JSON.stringify({
                  text: dreamContent,
                  voiceId: 'cnDF6tD6CWVBeLKYlCXW'
                })
              }
            );
            
            if (contentResponse.ok) {
              console.log('TTS audio pre-cached successfully for dream content');
            } else {
              console.error('TTS pre-caching failed for content:', await contentResponse.text());
            }
          }
        } catch (error) {
          console.error('Error pre-caching TTS:', error);
        }
      };
      
      // Run in background without blocking response
      EdgeRuntime.waitUntil(precacheTTS());
    }

    return new Response(
      JSON.stringify({ 
        interpretation,
        interpretation_summary: interpretationSummary,
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
