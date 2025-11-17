import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { translatePlanet, translateAspect, getPlanetSymbol } from '@/utils/astrology-translations';

interface AspectGridProps {
  aspects: Array<{
    planet1: string;
    planet2: string;
    type: string;
    angle: number;
    orb: number;
  }>;
}

const PLANET_SYMBOLS: { [key: string]: string } = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇'
};

const ASPECT_SYMBOLS: { [key: string]: { symbol: string; color: string; shortName: string } } = {
  conjunction: { symbol: '☌', color: '#ff6b47', shortName: 'Cong' },
  opposition: { symbol: '☍', color: '#ff6b47', shortName: 'Opp' },
  trine: { symbol: '△', color: '#66b266', shortName: 'Trig' },
  square: { symbol: '□', color: '#ff6b47', shortName: 'Quad' },
  sextile: { symbol: '⚹', color: '#66b266', shortName: 'Sest' },
  quincunx: { symbol: '⚻', color: '#87ceeb', shortName: 'Quin' }
};

export function AspectGrid({ aspects }: AspectGridProps) {
  const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

  // Filter and validate aspects to ensure they have required properties
  const validAspects = aspects.filter(aspect => 
    aspect && 
    aspect.planet1 && 
    aspect.planet2 && 
    aspect.type &&
    typeof aspect.angle === 'number'
  );

  // Create aspect lookup map
  const aspectMap = new Map<string, typeof aspects[0]>();
  validAspects.forEach(aspect => {
    const key1 = `${aspect.planet1}-${aspect.planet2}`;
    const key2 = `${aspect.planet2}-${aspect.planet1}`;
    aspectMap.set(key1, aspect);
    aspectMap.set(key2, aspect);
  });

  const getAspect = (planet1: string, planet2: string) => {
    return aspectMap.get(`${planet1}-${planet2}`);
  };

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Griglia degli Aspetti</CardTitle>
        <CardDescription>
          Matrice completa degli aspetti tra tutti i pianeti del tema natale
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 border border-gray-200 bg-gray-50"></th>
                {planets.map(planet => (
                  <th 
                    key={planet} 
                    className="p-2 border text-lg font-normal"
                    title={translatePlanet(planet)}
                  >
                    {getPlanetSymbol(planet)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planets.map((planet1, i) => (
                <tr key={planet1}>
                  <th 
                    className="p-2 border text-lg font-normal"
                    title={translatePlanet(planet1)}
                  >
                    {getPlanetSymbol(planet1)}
                  </th>
                  {planets.map((planet2, j) => {
                    // Only show upper triangle (excluding diagonal)
                    if (j <= i) {
                      return (
                        <td 
                          key={planet2} 
                          className="p-2 border bg-muted/50"
                        ></td>
                      );
                    }

                    const aspect = getAspect(planet1, planet2);
                    
                    if (!aspect) {
                      return (
                        <td 
                          key={planet2} 
                          className="p-2 border text-center text-muted-foreground/30"
                        >
                          —
                        </td>
                      );
                    }

                    const aspectInfo = ASPECT_SYMBOLS[aspect.type];
                    
                    return (
                      <td 
                        key={planet2} 
                        className="p-2 border border-gray-200 text-center hover:bg-gray-50 transition-colors cursor-help group relative"
                        title={`${aspect.type.toUpperCase()}: ${aspect.angle?.toFixed(1) ?? 'N/A'}° (orb: ${aspect.orb?.toFixed(1) ?? 'N/A'}°)`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span 
                            className="text-2xl font-bold"
                            style={{ color: aspectInfo?.color || '#666' }}
                          >
                            {aspectInfo?.symbol || '•'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {aspectInfo?.shortName}
                          </span>
                        </div>
                        
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                          <div className="font-semibold mb-1">{aspect.type.toUpperCase()}</div>
                          <div>Angolo: {aspect.angle?.toFixed(1) ?? 'N/A'}°</div>
                          <div>Orb: ±{aspect.orb?.toFixed(1) ?? 'N/A'}°</div>
                          <div className="text-gray-300 mt-1">
                            {PLANET_SYMBOLS[aspect.planet1]} ↔ {PLANET_SYMBOLS[aspect.planet2]}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2">Legenda Simboli:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(ASPECT_SYMBOLS).map(([type, info]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-lg" style={{ color: info.color }}>
                  {info.symbol}
                </span>
                <span className="text-sm">{translateAspect(type)}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-xs text-muted-foreground">
            <p><strong>Nota:</strong> La griglia mostra solo la metà superiore per evitare duplicazioni (gli aspetti sono simmetrici).</p>
            <p className="mt-1">Passa il mouse sopra ogni aspetto per vedere i dettagli completi.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
