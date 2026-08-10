import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { computeDreamPhase, extractPhaseFromInterpretation } from "../_shared/alchemical-calculator.ts";
import { RateLimiter } from "../_shared/rate-limiter.ts";
import { captureDreamSymbols } from "../_shared/symbol-extraction.ts";

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
      return new Response(
        JSON.stringify({ error: 'Autenticazione richiesta', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      return new Response(
        JSON.stringify({ error: 'Autenticazione non valida', success: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting — stricter than interpret-dream (50/h). Each call makes up to
    // 2 PAID RapidAPI requests (transit + moon phase) plus 1-2 AI calls, so we
    // cap at 20/hour per user to bound third-party cost. Fails open if the
    // limiter backend is unavailable (see RateLimiter.checkLimit).
    const RATE_LIMIT_CONFIG = { maxRequests: 20, windowSeconds: 3600 };
    const rateLimiter = new RateLimiter();
    const rateLimit = await rateLimiter.checkLimit(
      user.id,
      'interpret-dream-with-astrology',
      RATE_LIMIT_CONFIG
    );

    // Fail-open visibility: checkLimit ALLOWS the request when its backend
    // (Upstash) is unreachable, silently dropping the cap on this metered
    // function. That path returns the full quota as `remaining`, whereas a
    // genuine allow always decrements by at least 1 — so remaining === the max
    // uniquely marks a fail-open. Emit a distinct, greppable marker so this
    // condition is findable in the Edge Function logs instead of invisible.
    // No user content is logged.
    if (rateLimit.allowed && rateLimit.remaining === RATE_LIMIT_CONFIG.maxRequests) {
      console.error(
        'RATE_LIMITER_UNAVAILABLE function=interpret-dream-with-astrology failed_open=true'
      );
    }

    if (!rateLimit.allowed) {
      const resetDate = new Date(rateLimit.resetAt);
      return new Response(
        JSON.stringify({
          error: 'Limite di richieste raggiunto. Riprova più tardi.',
          resetAt: resetDate.toISOString(),
          success: false
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetDate.toISOString()
          }
        }
      );
    }

    const { dreamId, dreamContent, dreamTags, dreamMood } = await req.json();

    console.log('Interpreting dream with astrology for user:', user.id);

    if (!dreamContent) {
      throw new Error('Dream content is required');
    }

    if (!dreamId) {
      throw new Error('Dream ID is required');
    }

    // Carica il sogno con un client service-role, così il controllo di
    // proprietà qui sotto è autoritativo e non dipende solo dalla RLS.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select('user_id, created_at')
      .eq('id', dreamId)
      .single();

    if (dreamError || !dream) {
      console.error('Error loading dream:', dreamError);
      return new Response(
        JSON.stringify({ error: 'Sogno non trovato', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Controllo esplicito di proprietà: non affidarsi solo alla RLS per una
    // funzione che riscrive l'interpretazione sulla riga del sogno.
    if (dream.user_id !== user.id) {
      console.error('Ownership verification failed:', { dreamUserId: dream.user_id, requestUserId: user.id });
      return new Response(
        JSON.stringify({ error: 'Non sei autorizzato ad interpretare questo sogno', success: false }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Carica il profilo con i dati del tema natale e del contesto
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('natal_chart_data, natal_context, gender, birth_date, birth_time, birth_latitude, birth_longitude, birth_timezone')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error loading profile:', profileError);
    }

    const natalChartData = profile?.natal_chart_data;
    const natalContext = profile?.natal_context;
    const hasNatalChart = natalChartData && natalChartData.planets;

    // Recupera transiti e fase lunare in tempo reale (RapidAPI)
    let transitContext = "";
    let moonContext = "";

    if (hasNatalChart && profile.birth_latitude && profile.birth_longitude) {
      try {
        const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
        if (rapidApiKey) {
          const dreamDate = new Date(dream.created_at);
          const [bYear, bMonth, bDay] = (profile.birth_date || "").split('-').map(Number);
          const [bHour, bMinute] = (profile.birth_time || "12:00").split(':').map(Number);
          
          // Helper per il timezone offset numerico
          const tzStr = profile.birth_timezone || "UTC+0";
          const tzOffset = parseFloat(tzStr.replace('UTC', '').replace('+', '')) || 0;

          const transitBody = {
            first_subject: {
              name: "User",
              year: bYear || 2000,
              month: bMonth || 1,
              day: bDay || 1,
              hour: bHour || 12,
              minute: bMinute || 0,
              longitude: parseFloat(profile.birth_longitude),
              latitude: parseFloat(profile.birth_latitude),
              timezone: tzOffset
            },
            transit_subject: {
              name: "Transit",
              year: dreamDate.getFullYear(),
              month: dreamDate.getMonth() + 1,
              day: dreamDate.getDate(),
              hour: 12,
              minute: 0,
              longitude: parseFloat(profile.birth_longitude),
              latitude: parseFloat(profile.birth_latitude),
              timezone: tzOffset
            }
          };

          const moonBody = {
            year: dreamDate.getFullYear(),
            month: dreamDate.getMonth() + 1,
            day: dreamDate.getDate(),
            hour: 12,
            minute: 0,
            longitude: parseFloat(profile.birth_longitude),
            latitude: parseFloat(profile.birth_latitude),
            timezone: tzOffset
          };

          console.log('Calling RapidAPI for transit and moon context...');
          const [transRes, moonRes] = await Promise.all([
            fetch('https://astrologer.p.rapidapi.com/api/v5/context/transit', {
              method: 'POST',
              headers: {
                'X-RapidAPI-Host': 'astrologer.p.rapidapi.com',
                'X-RapidAPI-Key': rapidApiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(transitBody)
            }).then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('https://astrologer.p.rapidapi.com/api/v5/moon-phase/context', {
              method: 'POST',
              headers: {
                'X-RapidAPI-Host': 'astrologer.p.rapidapi.com',
                'X-RapidAPI-Key': rapidApiKey,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(moonBody)
            }).then(r => r.ok ? r.json() : null).catch(() => null)
          ]);

          transitContext = transRes?.context || "";
          moonContext = moonRes?.context || "";
          console.log('RapidAPI transit/moon calls completed');
        }
      } catch (e) {
        console.error('Error fetching live astro context:', e);
      }
    }

    // Costruisci il blocco del tema natale (fallback se manca natal_context)
    const natalContextBlock = natalContext ? `TEMA NATALE DELL'UTENTE:\n${natalContext}` : buildAstrologicalContext(natalChartData);
    
    // Aggiungi informazioni sul genere se disponibili
    const genderContext = profile?.gender ? `\n\nIl sognatore è di genere ${profile.gender}. Considera questo aspetto nelle tue interpretazioni quando rilevante per archetipi, simbolismi o dinamiche psicologiche.` : '';

    // Prepara il prompt per Lovable AI
    const systemPrompt = hasNatalChart ? `Sei un'esperta interprete di sogni che integra la conoscenza astrologica per offrire interpretazioni profonde e personali.
 
${natalContextBlock}

TRANSITI AL MOMENTO DEL SOGNO:
${transitContext || "Non disponibili."}

FASE LUNARE AL MOMENTO DEL SOGNO:
${moonContext || "Non disponibile."}
${genderContext}

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

LESSICO SIMBOLICO ALCHEMICO (griglia di lettura, non tassonomia rigida):

🌑 NIGREDO — oscurità, peso, impurità, primordiale, decomposizione, abisso, indifferenziazione.
Animale tipico: il CORVO.
Immagini guida: sangue; scimmioni, corvi, rinoceronti, coccodrilli, serpenti, topi, elefanti, maiali; animali pesanti / sporchi / primordiali come squalo, calamaro gigante, orca; acqua sporca o nera; terra sporca o nera; cieli neri senza stelle né astri.
Nota: la Nigredo NON è negativa di per sé. È "negativa" perché NEGA la distinzione (Viveka): fase di indifferenziazione necessaria, mai un giudizio.

🌙 ALBEDO — purificazione, chiarezza, lunarità, bianchezza, leggerezza, grazia, mediazione tra terra, acqua e cielo.
Animale tipico: l'UNICORNO.
Immagini guida: luna, stelle, animali e uccelli bianchi dal portamento leggiadro (aironi, colombe, cigni, oche, conigli), creature che toccano terra o acqua e si elevano nel cielo.

☀️ RUBEDO — integrazione, pienezza, luce solare, fertilità, unione, benedizione, amore irradiato, compimento.
Simboli tipici: RUBINO, DIAMANTI, GIOIELLI, SOLE.
Immagini guida: campi di grano e fertilità; sole molto lucente; arcobaleno; nuvole paradisiache; abbracci lucenti che emanano amore estremo; unioni sessuali o romantiche di estremo benessere; divinità benevole verso il sognatore; oro.

REGOLE:
- Massimo 1-2 riferimenti astrologici per interpretazione
- Solo se VERAMENTE pertinenti al tema del sogno
- Linguaggio accessibile: "potrebbe essere collegato a...", "il tuo tema suggerisce..."
- NON forzare mai i collegamenti
- L'astrologia arricchisce, non domina l'interpretazione
- Particolare attenzione a Casa 12 e Nettuno per sogni onirici/simbolici
- I simboli alchemici sono SEGNALI, non verdetti: nessun simbolo decide da solo la fase
- Pesa ogni immagine insieme a tono emotivo, atmosfera e trasformazione narrata
- Se il sogno è misto, riconosci la fase dominante e cita eventuali aperture di un'altra fase

SEZIONE "✦ ALCHIMIA" (OBBLIGATORIA in chiusura):
Concludi sempre con un paragrafo "✦ Alchimia" in cui dichiari la fase dominante — scrivi SOLTANTO il nome della fase, una sola tra Nigredo, Albedo o Rubedo, da solo e SENZA ripetere l'elenco delle opzioni — motivandola con i simboli precisi del sogno, riconosci eventuali aperture di un'altra fase, ed espandi liberamente con ciò che ritieni più utile al sognatore (significato della fase nel suo percorso, cosa chiede di integrare, suggerimenti di consapevolezza). Se la fase è Nigredo, ricorda che non è un giudizio negativo ma indifferenziazione (Viveka) necessaria alla trasformazione.

ISTRUZIONI:
1. Interpreta il sogno usando simbolismo, archetipi junghiani e psicologia dei sogni
2. Considera il tema natale per collegamenti pertinenti (vedi collegamenti sopra)
3. Integra il lessico alchemico in modo poetico, non meccanico
4. Scrivi in italiano, in modo poetico ma chiaro e accessibile
5. Mantieni un tono empatico e non giudicante
6. Lunghezza: 250-350 parole
7. Offri spunti di riflessione alla fine

STILE:
- Usa metafore e linguaggio evocativo
- Bilancia profondità psicologica con praticità
- Integra astrologia in modo sottile, non didascalico
- Enfatizza crescita personale e consapevolezza` : `Sei un'esperta interprete di sogni che usa simbolismo, archetipi junghiani e psicologia dei sogni.
${genderContext}

LESSICO SIMBOLICO ALCHEMICO (griglia di lettura, non tassonomia rigida):

🌑 NIGREDO — oscurità, peso, impurità, primordiale, decomposizione, abisso, indifferenziazione.
Animale tipico: il CORVO.
Immagini: sangue; scimmioni, corvi, rinoceronti, coccodrilli, serpenti, topi, elefanti, maiali; squalo, calamaro gigante, orca; animali pesanti o sporchi; acqua/terra nera o sporca; cieli neri senza stelle.
Nota: la Nigredo NON è negativa di per sé — NEGA la distinzione (Viveka), è indifferenziazione necessaria alla trasformazione.

🌙 ALBEDO — purificazione, chiarezza, lunarità, leggerezza, grazia.
Animale tipico: l'UNICORNO.
Immagini: luna, stelle, animali bianchi leggiadri (aironi, colombe, cigni, oche, conigli), creature che mediano tra terra, acqua e cielo.

☀️ RUBEDO — integrazione, pienezza, luce solare, fertilità, unione, benedizione, amore irradiato.
Simboli tipici: RUBINO, DIAMANTI, GIOIELLI, SOLE.
Immagini: campi di grano, sole molto lucente, arcobaleno, nuvole paradisiache, abbracci lucenti che emanano amore estremo, unioni amorose di estremo benessere, divinità benevole verso il sognatore, oro.

Usa questo lessico come SEGNALE, mai come verdetto: pesa ogni simbolo insieme al tono emotivo e alla narrazione del sogno; se il materiale è misto, motiva la fase dominante e cita eventuali aperture di un'altra fase.

SEZIONE "✦ ALCHIMIA" (OBBLIGATORIA in chiusura):
Concludi sempre con un paragrafo "✦ Alchimia" in cui dichiari la fase dominante — scrivi SOLTANTO il nome della fase (una sola tra Nigredo, Albedo o Rubedo), senza elencare le opzioni — motivandola con i simboli del sogno, riconosci eventuali aperture di un'altra fase, ed espandi liberamente con ciò che ritieni più utile al sognatore (significato nel percorso, cosa chiede di integrare, spunti di consapevolezza). Se Nigredo, ricorda che è indifferenziazione (Viveka), non un giudizio negativo.

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

    // Fase alchemica — stessa precedenza di interpret-dream: vince la fase che
    // il modello ha DICHIARATO nella sezione "✦ Alchimia" (così il valore salvato
    // non contraddice il testo letto dall'utente); altrimenti l'euristica. Sui
    // casi ciechi (segnale basso o pareggio) NON si ripiega su nigredo: si salva
    // null e si logga, per non gonfiare la distribuzione verso la Nigredo.
    console.log('Calculating alchemical phase...');
    const declaredPhase = extractPhaseFromInterpretation(interpretation);
    let alchemicalPhase = declaredPhase;
    let phaseSource = 'interpretation';
    if (!alchemicalPhase) {
      const heuristic = computeDreamPhase({
        content: dreamContent,
        mood: dreamMood,
        tags: dreamTags,
        interpretation: interpretation
      });
      alchemicalPhase = heuristic.phase;
      phaseSource = heuristic.blind ? `heuristic_blind:${heuristic.reason}` : 'heuristic';
      if (heuristic.blind) {
        console.warn(`ALCHEMICAL_PHASE_NULL function=interpret-dream-with-astrology reason=${heuristic.reason}`);
      }
    }
    console.log(`Alchemical phase: ${alchemicalPhase ?? 'null'} source=${phaseSource}`);

    // Salva nel database
    console.log('Saving interpretation to database...');

    const { error: updateError } = await supabase
      .from('dreams')
      .update({ 
        interpretation,
        interpretation_summary: interpretationSummary,
        alchemical_phase: alchemicalPhase
      })
      .eq('id', dreamId);

    if (updateError) {
      console.error('Error updating dream:', updateError);
      console.warn('Continuing despite DB update error');
    }

    console.log('Dream interpretation with astrology saved successfully');

    // Symbol capture — background, best-effort. Runs ONLY because the
    // interpretation succeeded; a failure never blocks or alters it.
    EdgeRuntime.waitUntil(captureDreamSymbols({
      supabase: supabaseAdmin,
      lovableApiKey: LOVABLE_API_KEY,
      dreamId,
      dreamContent,
      interpretation,
      functionName: 'interpret-dream-with-astrology',
    }));

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
        alchemical_phase: alchemicalPhase,
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
