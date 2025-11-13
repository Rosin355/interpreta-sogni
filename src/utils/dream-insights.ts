import { dreamCategories, categorizeDreams, getDreamCategories } from "./dream-categories";

export type Insight = {
  type: 'positive' | 'neutral' | 'warning';
  title: string;
  description: string;
  icon: string;
};

export const calculateInsights = (dreams: any[]): Insight[] => {
  const insights: Insight[] = [];
  
  if (dreams.length === 0) return insights;

  // Periodo di confronto
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  const thisWeekDreams = dreams.filter(d => new Date(d.created_at) > weekAgo);
  const lastWeekDreams = dreams.filter(d => 
    new Date(d.created_at) > twoWeeksAgo && new Date(d.created_at) <= weekAgo
  );

  // Analisi frequenza sogni
  if (thisWeekDreams.length > lastWeekDreams.length) {
    const increase = ((thisWeekDreams.length - lastWeekDreams.length) / (lastWeekDreams.length || 1) * 100).toFixed(0);
    insights.push({
      type: 'positive',
      title: 'Attività onirica in aumento',
      description: `Hai registrato ${thisWeekDreams.length} sogni questa settimana, il ${increase}% in più rispetto alla scorsa settimana.`,
      icon: '📈'
    });
  } else if (thisWeekDreams.length < lastWeekDreams.length && lastWeekDreams.length > 0) {
    insights.push({
      type: 'neutral',
      title: 'Attività onirica ridotta',
      description: `Hai registrato meno sogni questa settimana. Considera di tenere un diario più costante.`,
      icon: '📉'
    });
  }

  // Analisi categorie
  const thisWeekCategories = categorizeDreams(thisWeekDreams);
  const lastWeekCategories = categorizeDreams(lastWeekDreams);

  // Incubi
  const nightmaresThisWeek = thisWeekCategories['nightmare'] || 0;
  const nightmaresLastWeek = lastWeekCategories['nightmare'] || 0;
  if (nightmaresThisWeek > nightmaresLastWeek && nightmaresThisWeek > 2) {
    insights.push({
      type: 'warning',
      title: 'Aumento di incubi',
      description: `Hai avuto ${nightmaresThisWeek} incubi questa settimana. Potrebbe essere utile riflettere sulle possibili fonti di stress.`,
      icon: '😰'
    });
  }

  // Sogni lucidi
  const lucidThisWeek = thisWeekCategories['lucid'] || 0;
  const lucidLastWeek = lastWeekCategories['lucid'] || 0;
  if (lucidThisWeek > lucidLastWeek && lucidThisWeek > 0) {
    const increase = lastWeekDreams.length > 0 
      ? ((lucidThisWeek - lucidLastWeek) / (lucidLastWeek || 1) * 100).toFixed(0)
      : '100';
    insights.push({
      type: 'positive',
      title: 'Sogni lucidi in crescita',
      description: `I tuoi sogni lucidi sono aumentati del ${increase}%! La pratica sta dando i suoi frutti.`,
      icon: '✨'
    });
  }

  // Pattern tematici
  const allCategories = categorizeDreams(dreams);
  const dominantCategory = Object.entries(allCategories)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (dominantCategory) {
    const category = dreamCategories.find(c => c.id === dominantCategory[0]);
    if (category && dominantCategory[1] > dreams.length * 0.3) {
      insights.push({
        type: 'neutral',
        title: `Tema dominante: ${category.name}`,
        description: `Il ${((dominantCategory[1] / dreams.length) * 100).toFixed(0)}% dei tuoi sogni appartiene a questa categoria.`,
        icon: '🎭'
      });
    }
  }

  // Streak di registrazione
  const dreamDates = dreams.map(d => new Date(d.created_at).toDateString());
  const uniqueDates = new Set(dreamDates);
  if (uniqueDates.size >= 7 && thisWeekDreams.length >= 5) {
    insights.push({
      type: 'positive',
      title: 'Ottima costanza!',
      description: `Hai registrato sogni per ${uniqueDates.size} giorni diversi. Mantieni questa abitudine!`,
      icon: '🔥'
    });
  }

  return insights;
};

export const getTemporalData = (dreams: any[], period: '30d' | '3m' | '6m' | '1y') => {
  const now = new Date();
  let startDate: Date;
  let groupBy: 'day' | 'week' | 'month';

  switch (period) {
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      groupBy = 'day';
      break;
    case '3m':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      groupBy = 'week';
      break;
    case '6m':
      startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      groupBy = 'week';
      break;
    case '1y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      groupBy = 'month';
      break;
  }

  const filteredDreams = dreams.filter(d => new Date(d.created_at) >= startDate);
  
  // Raggruppa per periodo
  const grouped: Record<string, Record<string, number>> = {};
  
  filteredDreams.forEach(dream => {
    const date = new Date(dream.created_at);
    let key: string;
    
    if (groupBy === 'day') {
      key = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    } else {
      key = date.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    }
    
    if (!grouped[key]) {
      grouped[key] = {};
    }
    
    if (dream.tags && dream.tags.length > 0) {
      const categories = getDreamCategories(dream.tags);
      categories.forEach(cat => {
        grouped[key][cat.id] = (grouped[key][cat.id] || 0) + 1;
      });
    } else {
      grouped[key]['other'] = (grouped[key]['other'] || 0) + 1;
    }
  });
  
  // Converti in formato per recharts
  return Object.entries(grouped).map(([date, categories]) => ({
    date,
    ...categories
  }));
};
