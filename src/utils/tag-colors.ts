// Utility per assegnare colori ai tag in base al contenuto
export const getTagColor = (tag: string): string => {
  const tagLower = tag.toLowerCase();
  
  // Incubi e paure
  if (
    tagLower.includes('incubo') ||
    tagLower.includes('paura') ||
    tagLower.includes('terrore') ||
    tagLower.includes('angoscia') ||
    tagLower.includes('morte') ||
    tagLower.includes('inseguimento')
  ) {
    return 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)]';
  }
  
  // Sogni lucidi e consapevolezza
  if (
    tagLower.includes('lucido') ||
    tagLower.includes('consapevole') ||
    tagLower.includes('controllo') ||
    tagLower.includes('lucidità')
  ) {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:shadow-[0_0_25px_rgba(251,191,36,0.5)]';
  }
  
  // Volare e libertà
  if (
    tagLower.includes('volar') ||
    tagLower.includes('volo') ||
    tagLower.includes('libertà') ||
    tagLower.includes('ali')
  ) {
    return 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)]';
  }
  
  // Amore e relazioni
  if (
    tagLower.includes('amore') ||
    tagLower.includes('cuore') ||
    tagLower.includes('bacio') ||
    tagLower.includes('romantico') ||
    tagLower.includes('partner') ||
    tagLower.includes('famiglia')
  ) {
    return 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.5)]';
  }
  
  // Natura e acqua
  if (
    tagLower.includes('acqua') ||
    tagLower.includes('mare') ||
    tagLower.includes('oceano') ||
    tagLower.includes('fiume') ||
    tagLower.includes('pioggia') ||
    tagLower.includes('natura') ||
    tagLower.includes('foresta')
  ) {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]';
  }
  
  // Ricorrenti e premonitori
  if (
    tagLower.includes('ricorrent') ||
    tagLower.includes('premonitori') ||
    tagLower.includes('simbolico')
  ) {
    return 'bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]';
  }
  
  // Default - primary color
  return 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)]';
};
