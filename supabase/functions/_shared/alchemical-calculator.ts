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

/**
 * Calcola la fase alchemica di un sogno
 */
export const calculateDreamPhase = (dream: {
  content?: string;
  mood?: string;
  tags?: string[];
  interpretation?: string;
}): AlchemicalPhase => {
  const scores = {
    nigredo: 0,
    albedo: 0,
    rubedo: 0
  };

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

  // 4. Determina la fase dominante
  const totalScore = scores.nigredo + scores.albedo + scores.rubedo;
  
  // Se non c'è abbastanza informazione, default a Nigredo (inizio del percorso)
  if (totalScore < 10) {
    return 'nigredo';
  }

  // Trova la fase dominante
  let dominantPhase: AlchemicalPhase = 'nigredo';
  let maxScore = scores.nigredo;
  
  if (scores.albedo > maxScore) {
    dominantPhase = 'albedo';
    maxScore = scores.albedo;
  }
  
  if (scores.rubedo > maxScore) {
    dominantPhase = 'rubedo';
    maxScore = scores.rubedo;
  }

  return dominantPhase;
};
