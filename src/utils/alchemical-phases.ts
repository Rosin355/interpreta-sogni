/**
 * Sistema di Classificazione Alchemica dei Sogni
 * Basato sulle tre fasi dell'Opera Alchemica: Nigredo, Albedo, Rubedo
 */

export type AlchemicalPhase = 'nigredo' | 'albedo' | 'rubedo';

export interface PhaseDefinition {
  id: AlchemicalPhase;
  name: string;
  latinName: string;
  color: string;
  colorGradient: string;
  bgColor: string;
  textColor: string;
  icon: string;
  keywords: string[];
  moodWeights: Record<string, number>;
  tagWeights: Record<string, number>;
  description: string;
  psychologicalMeaning: string;
  dreamCharacteristics: string[];
  advice: string;
}

export interface PhaseDistribution {
  nigredo: number;
  albedo: number;
  rubedo: number;
  dominant: AlchemicalPhase;
}

export interface UserJourney {
  currentPhase: AlchemicalPhase;
  distribution: PhaseDistribution;
  trend: 'progressing' | 'stable' | 'regressing';
  transitions: PhaseTransition[];
  lastPhaseChange: Date | null;
}

export interface PhaseTransition {
  from: AlchemicalPhase;
  to: AlchemicalPhase;
  date: Date;
  dreamId: string;
}

export interface DreamPhaseAnalysis {
  phase: AlchemicalPhase;
  confidence: number;
  scores: {
    nigredo: number;
    albedo: number;
    rubedo: number;
  };
  factors: {
    mood: number;
    tags: number;
    content: number;
  };
}

/**
 * Definizioni complete delle tre fasi alchemiche
 */
export const alchemicalPhases: Record<AlchemicalPhase, PhaseDefinition> = {
  nigredo: {
    id: 'nigredo',
    name: 'Nigredo',
    latinName: 'Opera al Nero',
    color: 'hsl(0, 0%, 15%)',
    colorGradient: 'linear-gradient(135deg, hsl(0, 0%, 10%) 0%, hsl(0, 0%, 25%) 100%)',
    bgColor: 'bg-gray-900',
    textColor: 'text-gray-100',
    icon: '🌑',
    keywords: [
      'morte', 'buio', 'ombra', 'paura', 'angoscia', 'terrore', 'incubo',
      'oscurità', 'abisso', 'caduta', 'inseguimento', 'fuga', 'pericolo',
      'mostro', 'demone', 'sangue', 'violenza', 'distruzione', 'perdita',
      'lutto', 'dolore', 'sofferenza', 'tormento', 'prigionia', 'trappola',
      'smembramento', 'decomposizione', 'putrefazione', 'dissoluzione',
      'caos', 'confusione oscura', 'disperazione', 'vuoto', 'abbandono'
    ],
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
      'violenza': 0.7,
      'perdita': 0.7
    },
    description: 'La fase della Nigredo rappresenta l\'inizio del processo alchemico, caratterizzata dall\'oscurità, dalla decomposizione e dalla morte simbolica. È il momento dell\'attraversamento dell\'ombra e della conoscenza del lato oscuro della psiche.',
    psychologicalMeaning: 'Questa fase corrisponde al confronto con l\'inconscio, l\'elaborazione di traumi, paure profonde e aspetti repressi della personalità. \nQuando un individuo sosta in essa, non conosce ancora i propri veri desideri e potrebbe ignorare i propri potenziali inespressi e le proprie capacità o, in casi non meno comuni, potrebbe non essere ancora in grado di guardare con onestà ai propri agiti, e dunque elaborarli. \nIl processo necessario di dissoluzione dell\'ego e dei vecchi schemi permettere l\'emergere della maturità. Se nel nero il seme era obliato, nel bianco esso vedrà la luce... ',
    dreamCharacteristics: [
      'Atmosfere cupe, oscure e minacciose',
      'Sensazioni di pericolo imminente o morte',
      'Presenza di mostri, demoni o figure persecutorie',
      'Scenari di violenza, distruzione o decomposizione',
      'Sentimenti di impotenza, paura e angoscia',
      'Situazioni di prigionia, trappola o inseguimento',
      'Perdita di controllo e caduta nel vuoto'
    ],
    advice: 'Non temere l\'oscurità: è parte necessaria del percorso. Accogli e integra ciò che emerge, è il primo passo verso la trasformazione.'
  },

  albedo: {
    id: 'albedo',
    name: 'Albedo',
    latinName: 'Opera al Bianco',
    color: 'hsl(200, 80%, 90%)',
    colorGradient: 'linear-gradient(135deg, hsl(200, 70%, 85%) 0%, hsl(180, 60%, 95%) 100%)',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-900',
    icon: '🌙',
    keywords: [
      'acqua', 'mare', 'oceano', 'fiume', 'lago', 'pioggia', 'nebbia',
      'pulizia', 'lavaggio', 'purificazione', 'bagno', 'doccia',
      'bianco', 'argento', 'luce lunare', 'alba', 'aurora',
      'specchio', 'riflessione', 'contemplazione', 'introspezione',
      'calma', 'serenità', 'pace', 'silenzio', 'meditazione',
      'guarigione', 'cura', 'medicina', 'terapia', 'convalescenza',
      'transizione', 'passaggio', 'soglia', 'ponte', 'confine',
      'chiarificazione', 'separazione', 'distillazione', 'filtrazione',
      'luna', 'stella', 'cristallo', 'ghiaccio', 'neve', 'nuvola'
    ],
    moodWeights: {
      'calma': 1.0,
      'serenità': 0.9,
      'pace': 0.9,
      'confusione': 0.5,
      'noia': 0.4,
      'tristezza': 0.3,
      'felicità': 0.3
    },
    tagWeights: {
      'acqua': 1.0,
      'mare': 0.9,
      'oceano': 0.9,
      'fiume': 0.8,
      'pioggia': 0.7,
      'natura': 0.6,
      'foresta': 0.5,
      'meditazione': 0.9,
      'guarigione': 0.8,
      'purificazione': 1.0
    },
    description: 'La fase dell\'Albedo è il momento della purificazione, della chiarificazione e della separazione. Dopo l\'oscurità della Nigredo, emerge una nuova luce, pallida come la luna, che illumina ciò che è stato dissolto e permette di distinguere e sanare.',
    psychologicalMeaning: 'Questa fase rappresenta il processo di purificazione psichica, l\'integrazione degli opposti, la guarigione di ferite emotive e la separazione di ciò che è sano da ciò che è tossico. È un momento di riflessione, introspezione profonda e riorganizzazione interiore.',
    dreamCharacteristics: [
      'Presenza di acqua in tutte le sue forme (mare, fiume, pioggia)',
      'Atmosfere calme, serene e contemplative',
      'Colori pallidi, argentei, bianchi o azzurri',
      'Momenti di pulizia, lavaggio o purificazione',
      'Riflessioni allo specchio o superfici riflettenti',
      'Paesaggi invernali, nebbiosi o all\'alba',
      'Sensazioni di guarigione, convalescenza o riposo',
      'Momenti di transizione o passaggio tra mondi'
    ],
    advice: 'Prenditi tempo per la riflessione e la cura di te stesso. È il momento di purificare, sanare e integrare ciò che hai conosciuto.'
  },

  rubedo: {
    id: 'rubedo',
    name: 'Rubedo',
    latinName: 'Opera al Rosso',
    color: 'hsl(0, 80%, 60%)',
    colorGradient: 'linear-gradient(135deg, hsl(0, 70%, 55%) 0%, hsl(30, 90%, 60%) 100%)',
    bgColor: 'bg-red-50',
    textColor: 'text-red-900',
    icon: '☀️',
    keywords: [
      'sole', 'oro', 'fuoco', 'luce', 'splendore', 'rosso', 'arancione',
      'volo', 'volare', 'ali', 'libertà', 'elevazione', 'ascensione',
      'lucido', 'consapevole', 'controllo', 'lucidità', 'coscienza',
      'amore', 'cuore', 'bacio', 'abbraccio', 'unione', 'matrimonio',
      'creazione', 'nascita', 'bambino', 'gravidanza', 'fertilità',
      'corona', 'trono', 'regalità', 'potere', 'autorità', 'maestria',
      'gioia', 'estasi', 'beatitudine', 'felicità', 'celebrazione',
      'completezza', 'perfezione', 'realizzazione', 'compimento',
      'guarigione', 'miracolo', 'dono', 'benedizione', 'grazia',
      'trasmutazione', 'trasformazione', 'rinascita', 'resurrezione'
    ],
    moodWeights: {
      'felicità': 1.0,
      'gioia': 1.0,
      'eccitazione': 0.9,
      'orgoglio': 0.8,
      'sorpresa': 0.7,
      'amore': 1.0,
      'gratitudine': 0.9,
      'ispirazione': 0.9
    },
    tagWeights: {
      'lucido': 1.0,
      'consapevole': 1.0,
      'controllo': 0.9,
      'volo': 1.0,
      'volare': 1.0,
      'libertà': 0.9,
      'ali': 0.8,
      'amore': 0.9,
      'cuore': 0.8,
      'romantico': 0.7,
      'creazione': 0.8,
      'nascita': 0.8
    },
    description: 'La fase della Rubedo è il coronamento dell\'Opera Alchemica. Rappresenta la perfezione raggiunta, l\'unione degli opposti, la rinascita dell\'individuo trasformato. È il momento dell\'oro filosofale, della luce solare interiore e della piena realizzazione.',
    psychologicalMeaning: 'Questa fase simboleggia l\'individuazione junghiana completa, l\'integrazione di tutti gli aspetti della personalità, la nascita del Sé autentico. È caratterizzata da creatività, consapevolezza lucida, amore incondizionato e capacità di portare guarigione anche agli altri.',
    dreamCharacteristics: [
      'Sogni lucidi con piena consapevolezza e controllo',
      'Esperienze di volo libero e gioioso',
      'Colori vividi, caldi: rosso, oro, arancione',
      'Sensazioni di amore incondizionato e connessione',
      'Momenti di creazione, nascita o manifestazione',
      'Incontri con figure sagge, guide spirituali o divinità',
      'Esperienze di guarigione, miracoli o trasformazione',
      'Sensazioni di completezza, perfezione e realizzazione',
      'Capacità di portare luce e guarigione ad altri nel sogno'
    ],
    advice: 'Sei nel pieno della tua potenza creativa. Usa questa energia per manifestare, creare e condividere i tuoi doni con il mondo.'
  }
};

/**
 * Calcola la fase alchemica di un singolo sogno
 */
export const calculateDreamPhase = (dream: {
  content?: string;
  mood?: string;
  tags?: string[];
  interpretation?: string;
}): DreamPhaseAnalysis => {
  const scores = {
    nigredo: 0,
    albedo: 0,
    rubedo: 0
  };

  const factors = {
    mood: 0,
    tags: 0,
    content: 0
  };

  // 1. Analisi del mood (peso: 30%)
  if (dream.mood) {
    const moodLower = dream.mood.toLowerCase();
    Object.entries(alchemicalPhases).forEach(([phaseId, phase]) => {
      Object.entries(phase.moodWeights).forEach(([moodKey, weight]) => {
        if (moodLower.includes(moodKey)) {
          scores[phaseId as AlchemicalPhase] += weight * 30;
          factors.mood += weight * 30;
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
            factors.tags += weight * 40;
          }
        });
      });
    });
  }

  // 3. Analisi del contenuto testuale (peso: 30%)
  const textToAnalyze = [dream.content, dream.interpretation].filter(Boolean).join(' ').toLowerCase();
  
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
      factors.content += keywordScore;
    });
  }

  // 4. Normalizzazione e determinazione della fase dominante
  const totalScore = scores.nigredo + scores.albedo + scores.rubedo;
  
  // Se non c'è abbastanza informazione, default a Nigredo (inizio del percorso)
  if (totalScore < 10) {
    return {
      phase: 'nigredo',
      confidence: 0.3,
      scores,
      factors
    };
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

  // Calcola la confidence (quanto è chiara la dominanza)
  const confidence = totalScore > 0 ? maxScore / totalScore : 0.3;

  return {
    phase: dominantPhase,
    confidence,
    scores,
    factors
  };
};

/**
 * Calcola la distribuzione delle fasi per un insieme di sogni
 */
export const getPhaseDistribution = (dreams: any[]): PhaseDistribution => {
  const counts = {
    nigredo: 0,
    albedo: 0,
    rubedo: 0
  };

  dreams.forEach(dream => {
    const analysis = calculateDreamPhase(dream);
    counts[analysis.phase]++;
  });

  const total = dreams.length || 1;

  // Largest-remainder rounding: arrotonda a numeri interi che sommano a 100
  const rawValues: Array<{ key: AlchemicalPhase; raw: number }> = [
    { key: 'nigredo', raw: (counts.nigredo / total) * 100 },
    { key: 'albedo', raw: (counts.albedo / total) * 100 },
    { key: 'rubedo', raw: (counts.rubedo / total) * 100 },
  ];

  const floors = rawValues.map(v => ({ ...v, floor: Math.floor(v.raw), rem: v.raw - Math.floor(v.raw) }));
  let assigned = floors.reduce((s, v) => s + v.floor, 0);
  let remainder = 100 - assigned;
  // Distribuisci il resto alle fasi con il resto frazionario più alto
  const sortedByRem = [...floors].sort((a, b) => b.rem - a.rem);
  const finals: Record<AlchemicalPhase, number> = { nigredo: 0, albedo: 0, rubedo: 0 };
  floors.forEach(f => { finals[f.key] = f.floor; });
  for (let i = 0; i < sortedByRem.length && remainder > 0; i++) {
    finals[sortedByRem[i].key] += 1;
    remainder--;
  }

  const distribution: PhaseDistribution = {
    nigredo: finals.nigredo,
    albedo: finals.albedo,
    rubedo: finals.rubedo,
    dominant: 'nigredo'
  };

  if (distribution.albedo > distribution.nigredo && distribution.albedo > distribution.rubedo) {
    distribution.dominant = 'albedo';
  } else if (distribution.rubedo > distribution.nigredo && distribution.rubedo > distribution.albedo) {
    distribution.dominant = 'rubedo';
  }

  return distribution;
};

/**
 * Rileva le transizioni tra fasi nel tempo
 */
export const detectPhaseTransitions = (dreams: any[]): PhaseTransition[] => {
  if (dreams.length < 2) return [];

  const transitions: PhaseTransition[] = [];
  const sortedDreams = [...dreams].sort((a, b) => 
    new Date(a.dream_date).getTime() - new Date(b.dream_date).getTime()
  );

  let previousPhase: AlchemicalPhase | null = null;

  sortedDreams.forEach(dream => {
    const analysis = calculateDreamPhase(dream);
    
    if (previousPhase && previousPhase !== analysis.phase) {
      transitions.push({
        from: previousPhase,
        to: analysis.phase,
        date: new Date(dream.dream_date),
        dreamId: dream.id
      });
    }
    
    previousPhase = analysis.phase;
  });

  return transitions;
};

/**
 * Calcola il percorso alchemico completo dell'utente
 */
export const calculateUserJourney = (dreams: any[]): UserJourney => {
  if (dreams.length === 0) {
    return {
      currentPhase: 'nigredo',
      distribution: { nigredo: 100, albedo: 0, rubedo: 0, dominant: 'nigredo' },
      trend: 'stable',
      transitions: [],
      lastPhaseChange: null
    };
  }

  const distribution = getPhaseDistribution(dreams);
  const transitions = detectPhaseTransitions(dreams);
  
  // Determina la fase corrente (ultimi 5 sogni)
  const recentDreams = dreams
    .sort((a, b) => new Date(b.dream_date).getTime() - new Date(a.dream_date).getTime())
    .slice(0, 5);
  
  const recentDistribution = getPhaseDistribution(recentDreams);
  const currentPhase = recentDistribution.dominant;

  // Determina il trend (confronta ultimi 10 vs precedenti)
  let trend: 'progressing' | 'stable' | 'regressing' = 'stable';
  
  if (dreams.length >= 10) {
    const recent = dreams.slice(0, 10);
    const previous = dreams.slice(10, 20);
    
    if (previous.length >= 5) {
      const recentDist = getPhaseDistribution(recent);
      const previousDist = getPhaseDistribution(previous);
      
      // Progressione: aumento di Rubedo o Albedo, diminuzione di Nigredo
      const rubredoGain = recentDist.rubedo - previousDist.rubedo;
      const albedoGain = recentDist.albedo - previousDist.albedo;
      const nigregoLoss = previousDist.nigredo - recentDist.nigredo;
      
      if (rubredoGain > 10 || (albedoGain > 15 && nigregoLoss > 10)) {
        trend = 'progressing';
      } else if (recentDist.nigredo > previousDist.nigredo + 15) {
        trend = 'regressing';
      }
    }
  }

  const lastPhaseChange = transitions.length > 0 
    ? transitions[transitions.length - 1].date 
    : null;

  return {
    currentPhase,
    distribution,
    trend,
    transitions,
    lastPhaseChange
  };
};

/**
 * Ottiene consigli personalizzati in base alla fase attuale
 */
export const getPhaseAdvice = (phase: AlchemicalPhase): string => {
  return alchemicalPhases[phase].advice;
};

/**
 * Ottiene la definizione completa di una fase
 */
export const getPhaseDefinition = (phase: AlchemicalPhase): PhaseDefinition => {
  return alchemicalPhases[phase];
};

/**
 * Ottiene tutte le fasi in ordine
 */
export const getAllPhases = (): PhaseDefinition[] => {
  return [
    alchemicalPhases.nigredo,
    alchemicalPhases.albedo,
    alchemicalPhases.rubedo
  ];
};
