// Categorie dei sogni basate sui tag
export type DreamCategory = {
  id: string;
  name: string;
  color: string;
  colorClass: string;
  keywords: string[];
};

export const dreamCategories: DreamCategory[] = [
  {
    id: 'nightmare',
    name: 'Incubi',
    color: 'rgb(239, 68, 68)',
    colorClass: 'text-red-400',
    keywords: ['incubo', 'paura', 'terrore', 'angoscia', 'morte', 'inseguimento']
  },
  {
    id: 'lucid',
    name: 'Sogni Lucidi',
    color: 'rgb(251, 191, 36)',
    colorClass: 'text-amber-300',
    keywords: ['lucido', 'consapevole', 'controllo', 'lucidità']
  },
  {
    id: 'flying',
    name: 'Volare',
    color: 'rgb(14, 165, 233)',
    colorClass: 'text-sky-300',
    keywords: ['volar', 'volo', 'libertà', 'ali']
  },
  {
    id: 'love',
    name: 'Amore',
    color: 'rgb(236, 72, 153)',
    colorClass: 'text-pink-300',
    keywords: ['amore', 'cuore', 'bacio', 'romantico', 'partner', 'famiglia']
  },
  {
    id: 'nature',
    name: 'Natura',
    color: 'rgb(16, 185, 129)',
    colorClass: 'text-emerald-300',
    keywords: ['acqua', 'mare', 'oceano', 'fiume', 'pioggia', 'natura', 'foresta']
  },
  {
    id: 'recurring',
    name: 'Ricorrenti',
    color: 'rgb(139, 92, 246)',
    colorClass: 'text-violet-300',
    keywords: ['ricorrent', 'premonitori', 'simbolico']
  },
  {
    id: 'other',
    name: 'Altro',
    color: 'rgb(86, 54, 205)',
    colorClass: 'text-primary',
    keywords: []
  }
];

export const getCategoryFromTag = (tag: string): DreamCategory => {
  const tagLower = tag.toLowerCase();
  
  for (const category of dreamCategories) {
    if (category.keywords.some(keyword => tagLower.includes(keyword))) {
      return category;
    }
  }
  
  return dreamCategories[dreamCategories.length - 1]; // Ritorna "Altro"
};

export const getDreamCategories = (tags: string[]): DreamCategory[] => {
  const categories = new Set<string>();
  const result: DreamCategory[] = [];
  
  tags.forEach(tag => {
    const category = getCategoryFromTag(tag);
    if (!categories.has(category.id)) {
      categories.add(category.id);
      result.push(category);
    }
  });
  
  return result.length > 0 ? result : [dreamCategories[dreamCategories.length - 1]];
};

export const categorizeDreams = (dreams: any[]) => {
  const categoryCounts: Record<string, number> = {};
  
  dreams.forEach(dream => {
    if (dream.tags && dream.tags.length > 0) {
      const categories = getDreamCategories(dream.tags);
      categories.forEach(category => {
        categoryCounts[category.id] = (categoryCounts[category.id] || 0) + 1;
      });
    } else {
      categoryCounts['other'] = (categoryCounts['other'] || 0) + 1;
    }
  });
  
  return categoryCounts;
};
