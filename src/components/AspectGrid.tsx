import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
  sextile: { symbol: '⚹', color: '#66b266', shortName: 'Sest' }
};

export function AspectGrid({ aspects }: AspectGridProps) {
  const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

  // Create aspect lookup map
  const aspectMap = new Map<string, typeof aspects[0]>();
  aspects.forEach(aspect => {
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
                    className="p-2 border border-gray-200 bg-gray-50 text-lg font-normal"
                    title={planet.charAt(0).toUpperCase() + planet.slice(1)}
                  >
                    {PLANET_SYMBOLS[planet]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planets.map((planet1, i) => (
                <tr key={planet1}>
                  <th 
                    className="p-2 border border-gray-200 bg-gray-50 text-lg font-normal"
                    title={planet1.charAt(0).toUpperCase() + planet1.slice(1)}
                  >
                    {PLANET_SYMBOLS[planet1]}
                  </th>
                  {planets.map((planet2, j) => {
                    // Only show upper triangle (excluding diagonal)
                    if (j <= i) {
                      return (
                        <td 
                          key={planet2} 
                          className="p-2 border border-gray-200 bg-gray-100"
                        ></td>
                      );
                    }

                    const aspect = getAspect(planet1, planet2);
                    
                    if (!aspect) {
                      return (
                        <td 
                          key={planet2} 
                          className="p-2 border border-gray-200 text-center text-gray-300"
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
                        title={`${aspect.type.toUpperCase()}: ${aspect.angle.toFixed(1)}° (orb: ${aspect.orb.toFixed(1)}°)`}
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
                          <div>Angolo: {aspect.angle.toFixed(1)}°</div>
                          <div>Orb: ±{aspect.orb.toFixed(1)}°</div>
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
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-semibold text-sm text-gray-900 mb-3">Legenda Simboli</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(ASPECT_SYMBOLS).map(([type, info]) => (
              <div key={type} className="flex items-center gap-2">
                <span 
                  className="text-2xl font-bold"
                  style={{ color: info.color }}
                >
                  {info.symbol}
                </span>
                <span className="text-sm text-gray-600 capitalize">
                  {type === 'conjunction' ? 'Congiunzione' : 
                   type === 'opposition' ? 'Opposizione' :
                   type === 'trine' ? 'Trigono' :
                   type === 'square' ? 'Quadratura' :
                   type === 'sextile' ? 'Sestile' : type}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            <p><strong>Nota:</strong> La griglia mostra solo la metà superiore per evitare duplicazioni (gli aspetti sono simmetrici).</p>
            <p className="mt-1">Passa il mouse sopra ogni aspetto per vedere i dettagli completi.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
