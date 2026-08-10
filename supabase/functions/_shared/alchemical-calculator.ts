/**
 * Sistema di Classificazione Alchemica dei Sogni per Edge Functions
 * Versione standalone per Supabase Edge Functions
 */

export type AlchemicalPhase = 'nigredo' | 'albedo' | 'rubedo';

interface PhaseDefinition {
  id: AlchemicalPhase;
  moodWeights: Record<string, number>;
  tagWeights: Record<string, number>;
  keywords: string[];
}

/**
 * Definizioni semplificate delle fasi alchemiche per calcolo rapido
 */
const alchemicalPhases: Record<AlchemicalPhase, PhaseDefinition> = {
  nigredo: {
    id: 'nigredo',
    moodWeights: {
      'paura': 1.0,
      'angoscia': 1.0,
      'tristezza': 0.8,
      'rabbia': 0.7,
      'disgusto': 0.7,
      'confusione': 0.3
    },
    tagWeights: {
      'incubo': 1.0,
      'paura': 1.0,
      'terrore': 1.0,
      'angoscia': 1.0,
      'morte': 0.9,
      'inseguimento': 0.8,
      'pericolo': 0.8,
      'oscurità': 0.8,
      'mostro': 0.8,
      'violenza': 0.7,
      'caduta': 0.7,
      'perdita': 0.7,
      'dolore': 0.7,
      'sangue': 0.9,
      'corvo': 1.0,
      'serpente': 0.7,
      'coccodrillo': 0.7,
      'rinoceronte': 0.6,
      'scimmione': 0.6,
      'topo': 0.6,
      'elefante': 0.5,
      'maiale': 0.7,
      'squalo': 0.8,
      'calamaro': 0.7,
      'calamaro gigante': 0.8,
      'orca': 0.7,
      'fango': 0.7,
      'palude': 0.7
    },
    keywords: [
      'morte', 'buio', 'ombra', 'paura', 'angoscia', 'terrore', 'incubo',
      'oscurità', 'abisso', 'caduta', 'inseguimento', 'fuga', 'pericolo',
      'mostro', 'demone', 'sangue', 'violenza', 'distruzione', 'perdita',
      'lutto', 'dolore', 'sofferenza', 'tormento', 'prigionia', 'trappola',
      'scimmione', 'corvo', 'rinoceronte', 'coccodrillo', 'serpente',
      'topo', 'ratto', 'elefante', 'maiale', 'squalo', 'calamaro', 'orca',
      'fango', 'melma', 'palude',
      'acqua sporca', 'acqua nera', 'terra nera', 'cielo nero', 'putrido',
      'indifferenziazione', 'primordiale'
    ]
  },
  albedo: {
    id: 'albedo',
    moodWeights: {
      'serenità': 1.0,
      'pace': 1.0,
      'calma': 0.9,
      'tranquillità': 0.9,
      'chiarezza': 0.8,
      'speranza': 0.7,
      'fiducia': 0.7
    },
    tagWeights: {
      'pace': 1.0,
      'serenità': 1.0,
      'chiarezza': 0.9,
      'guarigione': 0.9,
      'purificazione': 0.9,
      'luce': 0.8,
      'acqua': 0.7,
      'pulizia': 0.7,
      'risveglio': 0.7,
      'meditazione': 0.7,
      'spiritualità': 0.6,
      'luna': 0.9,
      'stelle': 0.8,
      'unicorno': 1.0,
      'airone': 0.8,
      'colomba': 0.8,
      'cigno': 0.8,
      'oca': 0.6,
      'coniglio': 0.6
    },
    keywords: [
      'luce', 'bianco', 'chiaro', 'puro', 'pulizia', 'lavare', 'purificare',
      'alba', 'mattina', 'chiarezza', 'luna piena', 'argenteo', 'cristallo',
      'acqua limpida', 'neve', 'nuvole bianche', 'pace', 'serenità', 'calma',
      'meditazione', 'risveglio', 'consapevolezza', 'riflessione', 'specchio',
      'luna', 'stelle', 'unicorno', 'airone', 'colomba', 'cigno', 'oca',
      'coniglio', 'uccello bianco', 'animale bianco', 'leggiadro', 'grazia'
    ]
  },
  rubedo: {
    id: 'rubedo',
    moodWeights: {
      'gioia': 1.0,
      'amore': 1.0,
      'felicità': 0.9,
      'passione': 0.9,
      'entusiasmo': 0.8,
      'eccitazione': 0.8,
      'ispirazione': 0.7,
      'gratitudine': 0.7
    },
    tagWeights: {
      'amore': 1.0,
      'gioia': 1.0,
      'felicità': 0.9,
      'passione': 0.9,
      'successo': 0.8,
      'realizzazione': 0.8,
      'celebrazione': 0.8,
      'unione': 0.8,
      'matrimonio': 0.8,
      'creatività': 0.7,
      'trasformazione': 0.7,
      'sole': 1.0,
      'oro': 0.9,
      'rubino': 1.0,
      'diamante': 1.0,
      'gioielli': 0.9,
      'arcobaleno': 0.9,
      'grano': 0.7,
      'fertilità': 0.8,
      'paradiso': 0.8,
      'divinità': 0.7
    },
    keywords: [
      'rosso', 'oro', 'fuoco', 'sole', 'calore', 'passione', 'amore',
      'unione', 'matrimonio', 'coppia', 'abbraccio', 'bacio', 'cuore',
      'sangue vitale', 'energia', 'vitalità', 'gioia', 'celebrazione',
      'festa', 'danza', 'musica', 'creatività', 'arte', 'realizzazione',
      'campo di grano', 'grano', 'spighe', 'raccolto', 'arcobaleno',
      'sole splendente', 'nuvole paradisiache', 'paradiso', 'cielo dorato',
      'rubino', 'diamante', 'gioielli', 'unione sessuale', 'unione amorosa',
      'abbraccio luminoso', 'divinità benevola', 'dio benevolo', 'dea benevola'
    ]
  }
};

interface DreamForPhase {
  content?: string;
  mood?: string;
  tags?: string[];
  interpretation?: string;
}

/**
 * Punteggia le tre fasi (nigredo/albedo/rubedo) da mood (30%), tag (40%) e
 * testo di contenuto+interpretazione (30%).
 */
const scoreDreamPhases = (dream: DreamForPhase): Record<AlchemicalPhase, number> => {
  const scores: Record<AlchemicalPhase, number> = { nigredo: 0, albedo: 0, rubedo: 0 };

  // 1. Analisi del mood (peso: 30%)
  if (dream.mood) {
    const moodLower = dream.mood.toLowerCase();
    Object.entries(alchemicalPhases).forEach(([phaseId, phase]) => {
      Object.entries(phase.moodWeights).forEach(([moodKey, weight]) => {
        if (moodLower.includes(moodKey)) {
          scores[phaseId as AlchemicalPhase] += weight * 30;
        }
      });
    });
  }

  // 2. Analisi dei tag (peso: 40%)
  if (dream.tags && dream.tags.length > 0) {
    dream.tags.forEach(tag => {
      const tagLower = tag.toLowerCase();
      Object.entries(alchemicalPhases).forEach(([phaseId, phase]) => {
        Object.entries(phase.tagWeights).forEach(([tagKey, weight]) => {
          if (tagLower.includes(tagKey) || tagKey.includes(tagLower)) {
            scores[phaseId as AlchemicalPhase] += weight * 40;
          }
        });
      });
    });
  }

  // 3. Analisi del contenuto testuale (peso: 30%)
  const textToAnalyze = [dream.content, dream.interpretation]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (textToAnalyze) {
    Object.entries(alchemicalPhases).forEach(([phaseId, phase]) => {
      let keywordMatches = 0;
      phase.keywords.forEach(keyword => {
        if (textToAnalyze.includes(keyword.toLowerCase())) {
          keywordMatches++;
        }
      });

      // Normalizza il punteggio delle keyword (massimo 30 punti)
      const keywordScore = Math.min((keywordMatches / phase.keywords.length) * 30, 30);
      scores[phaseId as AlchemicalPhase] += keywordScore;
    });
  }

  return scores;
};

// Soglia minima di segnale: sotto questa il calcolo è "cieco".
const PHASE_SIGNAL_THRESHOLD = 10;

export type PhaseComputation =
  | { phase: AlchemicalPhase; blind: false }
  | { phase: null; blind: true; reason: 'low_signal' | 'tie' };

/**
 * Calcolo euristico della fase, con i casi CIECHI resi espliciti invece di
 * ripiegare silenziosamente su 'nigredo':
 *   - segnale totale sotto la soglia -> { phase: null, reason: 'low_signal' }
 *   - pareggio tra due o più fasi     -> { phase: null, reason: 'tie' }
 * Il chiamante decide se salvare null. Vedi calculateDreamPhase per il
 * comportamento legacy (default a 'nigredo').
 */
export const computeDreamPhase = (dream: DreamForPhase): PhaseComputation => {
  const scores = scoreDreamPhases(dream);
  const totalScore = scores.nigredo + scores.albedo + scores.rubedo;

  // Se non c'è abbastanza informazione, il risultato è cieco (niente default).
  if (totalScore < PHASE_SIGNAL_THRESHOLD) {
    return { phase: null, blind: true, reason: 'low_signal' };
  }

  // Fase dominante = unico massimo. Un pareggio è cieco (prima veniva risolto
  // silenziosamente a 'nigredo', la fase inizializzata come dominante).
  const maxScore = Math.max(scores.nigredo, scores.albedo, scores.rubedo);
  const winners = PHASE_WORDS.filter((p) => scores[p] === maxScore);
  if (winners.length !== 1) {
    return { phase: null, blind: true, reason: 'tie' };
  }

  return { phase: winners[0], blind: false };
};

/**
 * Legacy: come computeDreamPhase ma non restituisce mai null — i casi ciechi
 * ripiegano su 'nigredo' (comportamento storico). Mantenuto per compatibilità;
 * le edge function di interpretazione usano computeDreamPhase per poter salvare
 * null nei casi ciechi.
 */
export const calculateDreamPhase = (dream: DreamForPhase): AlchemicalPhase => {
  return computeDreamPhase(dream).phase ?? 'nigredo';
};

const PHASE_WORDS: AlchemicalPhase[] = ['nigredo', 'albedo', 'rubedo'];

/**
 * Authoritative phase = the one the AI DECLARED in the closing "✦ Alchimia"
 * section. Hardened parser (before/after for cases a-e is in the PR):
 *   - Requires the ✦ section marker; without it returns null (NEVER scans the
 *     whole interpretation, so a stray "non è Nigredo ma Rubedo" can't win).
 *   - Neutralises an echoed options menu ("(Nigredo / Albedo / Rubedo)") so it
 *     isn't mistaken for a declaration (this was the main nigredo-bias source).
 *   - Prefers an explicit declaration ("fase ... X" in one sentence, or bold
 *     **X**) over a bare mention.
 *   - Returns null on genuine ambiguity (0 or >1 distinct phase words left),
 *     letting the heuristic decide instead of guessing.
 *
 * Keeps public.dreams.alchemical_phase consistent with the text the user reads.
 */
export const extractPhaseFromInterpretation = (
  interpretation?: string,
  functionName?: string, // optional: only tags the diagnostic log line
): AlchemicalPhase | null => {
  // INFO-level diagnostics: log WHY the parse returned null, so a missing ✦
  // marker can be told apart from a missing/ambiguous phase word. No dream
  // content is logged.
  const nullReason = (reason: string): null => {
    if (functionName) console.log(`PHASE_PARSE_NULL function=${functionName} reason=${reason}`);
    return null;
  };

  if (!interpretation) return nullReason('empty_interpretation');

  // Require the explicit ✦ section marker.
  const marker = interpretation.indexOf('✦');
  if (marker < 0) return nullReason('no_marker');

  // Strip an echoed options menu: 2-3 phase words separated only by "/" or ","
  // (e.g. "Nigredo / Albedo / Rubedo" or "nigredo, albedo, rubedo").
  const rawSection = interpretation.slice(marker);
  const section = rawSection
    .replace(
      /\b(?:nigredo|albedo|rubedo)\b(?:\s*[/,]\s*\b(?:nigredo|albedo|rubedo)\b){1,2}/gi,
      ' ',
    )
    .toLowerCase();
  const menuStripped = section.length !== rawSection.toLowerCase().length;

  // 1) Explicit declaration wins: "fase ... X" within one sentence, or bold **X**.
  const declaration =
    section.match(/fase\b[^.\n]*?\b(nigredo|albedo|rubedo)\b/) ??
    section.match(/\*\*\s*(nigredo|albedo|rubedo)\s*\*\*/);
  if (declaration) return declaration[1] as AlchemicalPhase;

  // 2) Otherwise accept a single unambiguous bare mention; 0 or >1 distinct
  //    phases remaining => ambiguous => null (heuristic decides).
  const present = PHASE_WORDS.filter((p) => new RegExp(`\\b${p}\\b`).test(section));
  if (present.length === 1) return present[0];
  return nullReason(
    present.length === 0
      ? 'no_phase_word'
      : `ambiguous count=${present.length} menu_stripped=${menuStripped}`,
  );
};

// Common English emotion words → Italian. Used only to repair stray English mood
// words when the locale is Italian (the prompt is the primary guard).
const EN_TO_IT_MOOD: Record<string, string> = {
  joy: 'gioia',
  happiness: 'felicità',
  fear: 'paura',
  sadness: 'tristezza',
  anger: 'rabbia',
  love: 'amore',
  peace: 'pace',
  serenity: 'serenità',
  hope: 'speranza',
  calm: 'calma',
  anxiety: 'angoscia',
  disgust: 'disgusto',
};

/**
 * Conservative repair of stray English mood words in Italian-locale text
 * (e.g. "Joy" → "gioia"). Only replaces exact whitelist words, preserving a
 * leading capital. Markdown bold is preserved (asterisks are not word chars, so
 * "**Joy**" → "**gioia**"). Never touches other words.
 */
export const localizeItalianMoodWords = (text: string): string => {
  if (!text) return text;
  return text.replace(/\b([A-Za-z]+)\b/g, (whole, word: string) => {
    const it = EN_TO_IT_MOOD[word.toLowerCase()];
    if (!it) return whole;
    return /^[A-Z]/.test(word) ? it.charAt(0).toUpperCase() + it.slice(1) : it;
  });
};
