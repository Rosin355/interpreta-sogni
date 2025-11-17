// Traduzioni italiane per elementi astrologici

export const ZODIAC_SIGNS_IT: Record<string, string> = {
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

export const PLANETS_IT: Record<string, string> = {
  'sun': 'Sole',
  'moon': 'Luna',
  'mercury': 'Mercurio',
  'venus': 'Venere',
  'mars': 'Marte',
  'jupiter': 'Giove',
  'saturn': 'Saturno',
  'uranus': 'Urano',
  'neptune': 'Nettuno',
  'pluto': 'Plutone',
  'north_node': 'Nodo Nord',
  'south_node': 'Nodo Sud',
  'chiron': 'Chirone',
  'mean_node': 'Nodo Medio',
  'true_node': 'Nodo Vero',
  'descendant': 'Discendente',
  'ascendant': 'Ascendente',
  'pallas': 'Pallade',
  'vesta': 'Vesta',
  'ceres': 'Cerere',
  'juno': 'Giunone',
  'ic': 'Imum Coeli',
  'mc': 'Medium Coeli'
};

export const ASPECTS_IT: Record<string, string> = {
  'conjunction': 'Congiunzione',
  'opposition': 'Opposizione',
  'trine': 'Trigono',
  'square': 'Quadrato',
  'sextile': 'Sestile',
  'quincunx': 'Quinconce'
};

export const PLANET_SYMBOLS: Record<string, string> = {
  'sun': '☉',
  'moon': '☽',
  'mercury': '☿',
  'venus': '♀',
  'mars': '♂',
  'jupiter': '♃',
  'saturn': '♄',
  'uranus': '♅',
  'neptune': '♆',
  'pluto': '♇',
  'north_node': '☊',
  'south_node': '☋',
  'chiron': '⚷',
  'mean_node': '☊',
  'true_node': '☊',
  'descendant': 'DSC',
  'ascendant': 'ASC',
  'pallas': '⚴',
  'vesta': '⚶',
  'ceres': '⚳',
  'juno': '⚵',
  'ic': 'IC',
  'mc': 'MC'
};

export const ZODIAC_SYMBOLS: Record<string, string> = {
  'Aries': '♈',
  'Taurus': '♉',
  'Gemini': '♊',
  'Cancer': '♋',
  'Leo': '♌',
  'Virgo': '♍',
  'Libra': '♎',
  'Scorpio': '♏',
  'Sagittarius': '♐',
  'Capricorn': '♑',
  'Aquarius': '♒',
  'Pisces': '♓'
};

export function translateSign(sign: string): string {
  return ZODIAC_SIGNS_IT[sign] || sign;
}

export function translatePlanet(planet: string): string {
  return PLANETS_IT[planet] || planet;
}

export function translateAspect(aspect: string): string {
  return ASPECTS_IT[aspect] || aspect;
}

export function getPlanetSymbol(planet: string): string {
  return PLANET_SYMBOLS[planet] || '';
}

export function getZodiacSymbol(sign: string): string {
  return ZODIAC_SYMBOLS[sign] || '';
}

export const PLANET_DESCRIPTIONS: Record<string, string> = {
  'sun': 'Il Sole rappresenta la tua essenza, il tuo ego e la tua identità. È il centro della tua personalità e del tuo scopo di vita.',
  'moon': 'La Luna governa le tue emozioni, i tuoi bisogni emotivi e il tuo mondo interiore. Influenza i sogni e l\'inconscio.',
  'mercury': 'Mercurio regola la comunicazione, il pensiero logico e l\'apprendimento. Influenza come elabori e condividi le informazioni.',
  'venus': 'Venere governa l\'amore, le relazioni, l\'arte e la bellezza. Influenza come ami e ciò che apprezzi nella vita.',
  'mars': 'Marte rappresenta l\'azione, il desiderio e l\'energia. Governa come agisci e come esprimi la tua assertività.',
  'jupiter': 'Giove è il pianeta dell\'espansione, della fortuna e della saggezza. Rappresenta crescita, abbondanza e ottimismo.',
  'saturn': 'Saturno rappresenta disciplina, responsabilità e struttura. Insegna lezioni importanti attraverso sfide e limitazioni.',
  'uranus': 'Urano è il pianeta dell\'innovazione, della ribellione e del cambiamento improvviso. Rappresenta originalità e libertà.',
  'neptune': 'Nettuno governa l\'immaginazione, la spiritualità e l\'illusione. Rappresenta sogni, intuizione e connessione spirituale.',
  'pluto': 'Plutone rappresenta trasformazione profonda, potere e rinascita. Governa i processi di morte e rinascita interiore.',
  'north_node': 'Il Nodo Nord indica la direzione della tua crescita spirituale e le lezioni che devi imparare in questa vita.',
  'south_node': 'Il Nodo Sud rappresenta le tue abilità innate e i modelli karmici del passato da cui evolverti.',
  'chiron': 'Chirone è il guaritore ferito, rappresenta le tue ferite profonde e il potere di guarigione che sviluppi attraverso di esse.',
  'mean_node': 'Il Nodo Medio è una posizione calcolata matematicamente del Nodo Nord lunare, utilizzata per analisi precise.',
  'true_node': 'Il Nodo Vero rappresenta la posizione effettiva del Nodo Nord nel momento della nascita.',
  'descendant': 'Il Discendente indica il tipo di partner che cerchi e come ti relazioni nelle relazioni intime.',
  'ascendant': 'L\'Ascendente rappresenta la tua maschera sociale, come appari agli altri e come inizi nuove esperienze.',
  'pallas': 'Pallade rappresenta la saggezza strategica, la capacità di risolvere problemi e l\'intelligenza creativa.',
  'vesta': 'Vesta governa la devozione, il focus e ciò a cui ti dedichi con passione. Rappresenta il fuoco sacro interiore.',
  'ceres': 'Cerere rappresenta il nutrimento, la cura e le relazioni madre-figlio. Governa come dai e ricevi sostegno.',
  'juno': 'Giunone governa il matrimonio, le partnership durature e la fedeltà. Rappresenta il tipo di impegno che cerchi.',
  'ic': 'L\'Imum Coeli rappresenta le tue radici, la famiglia d\'origine e il tuo senso di sicurezza emotiva profonda.',
  'mc': 'Il Medium Coeli rappresenta la tua carriera, la reputazione pubblica e ciò che aspiri a diventare nel mondo.'
};

export function getPlanetDescription(planet: string): string {
  return PLANET_DESCRIPTIONS[planet] || '';
}
