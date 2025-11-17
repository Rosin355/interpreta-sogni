import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { translateSign, translatePlanet, getZodiacSymbol, getPlanetSymbol } from '@/utils/astrology-translations';

interface Planet {
  sign: string;
  house: number;
  degree: number;
}

interface AstrologicalPillarsProps {
  sun?: Planet;
  moon?: Planet;
  ascendant?: {
    sign: string;
    degree: number;
  };
}

export function AstrologicalPillars({ sun, moon, ascendant }: AstrologicalPillarsProps) {
  if (!sun || !moon || !ascendant) {
    return null;
  }

  const pillars = [
    {
      title: 'Sole',
      symbol: '☉',
      description: 'La tua essenza e identità',
      sign: sun.sign,
      house: sun.house,
      degree: sun.degree.toFixed(0),
      color: 'from-orange-400 to-yellow-500',
      info: 'Il Sole rappresenta il tuo ego, la tua volontà e la tua individualità. È il cuore della tua personalità e il tuo scopo di vita.'
    },
    {
      title: 'Luna',
      symbol: '☽',
      description: 'Le tue emozioni e intuito',
      sign: moon.sign,
      house: moon.house,
      degree: moon.degree.toFixed(0),
      color: 'from-blue-400 to-purple-500',
      info: 'La Luna governa le tue emozioni, i tuoi bisogni interiori e il tuo mondo inconscio. Influenza i tuoi sogni e le tue reazioni istintive.'
    },
    {
      title: 'Ascendente',
      symbol: 'ASC',
      description: 'La tua maschera sociale',
      sign: ascendant.sign,
      house: 1,
      degree: ascendant.degree.toFixed(0),
      color: 'from-green-400 to-emerald-500',
      info: "L'Ascendente rappresenta come ti presenti al mondo, la tua apparenza esteriore e il modo in cui inizi nuove esperienze."
    }
  ];

  return (
    <Card className="bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          Pilastri Astrologici
        </CardTitle>
        <CardDescription>
          I tre elementi fondamentali del tuo tema natale
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar) => (
            <TooltipProvider key={pillar.title}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`relative group cursor-help p-6 rounded-xl bg-gradient-to-br ${pillar.color} hover:shadow-xl transition-all duration-300 hover:scale-105`}>
                    <div className="flex flex-col items-center text-white">
                      <div className="text-5xl mb-3 drop-shadow-lg">
                        {pillar.symbol}
                      </div>
                      <h3 className="text-xl font-bold mb-1">
                        {pillar.title}
                      </h3>
                      <p className="text-sm text-white/90 mb-4 text-center">
                        {pillar.description}
                      </p>
                      <div className="space-y-2 w-full">
                        <Badge className="w-full justify-center bg-white/20 hover:bg-white/30 text-white border-white/30 text-base py-1">
                          {getZodiacSymbol(pillar.sign)} {translateSign(pillar.sign)} {pillar.degree}°
                        </Badge>
                        <Badge className="w-full justify-center bg-white/20 hover:bg-white/30 text-white border-white/30">
                          Casa {pillar.house}
                        </Badge>
                      </div>
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">{pillar.info}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        
        <div className="mt-6 p-4 rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground text-center">
            <strong>Sole:</strong> Chi sei • <strong>Luna:</strong> Cosa senti • <strong>Ascendente:</strong> Come appari
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
