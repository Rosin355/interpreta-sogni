import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { translateSign, translatePlanet, getZodiacSymbol, getPlanetSymbol } from '@/utils/astrology-translations';

interface NatalChartData {
  planets: {
    [key: string]: {
      longitude: number;
      sign: string;
      degree: number;
      house: number;
      retrograde: boolean;
    };
  };
  houses: Array<{
    number: number;
    longitude: number;
    sign: string;
    degree: number;
  }>;
  ascendant: {
    longitude: number;
    sign: string;
    degree: number;
  };
  midheaven: {
    longitude: number;
    sign: string;
    degree: number;
  };
  calculationMethod?: string;
  houseSystem?: string;
}

interface AstroChartWheelProps {
  natalChartData: NatalChartData;
  size?: number;
}

export function AstroChartWheel({ natalChartData, size = 700 }: AstroChartWheelProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const effectiveSize = typeof window !== 'undefined' && window.innerWidth < 768 ? Math.min(size, window.innerWidth - 40) : size;

  useEffect(() => {
    if (!chartRef.current || !natalChartData) return;

    const loadChart = async () => {
      try {
        // @ts-ignore - AstroChart uses global namespace
        const { Chart } = await import('@astrodraw/astrochart');

        // Clear previous chart
        if (chartRef.current) {
          chartRef.current.innerHTML = '';
        }

        // Prepare data for AstroChart
        const chartData = {
          planets: {
            Sun: [natalChartData.planets.sun?.longitude || 0],
            Moon: [natalChartData.planets.moon?.longitude || 0],
            Mercury: [natalChartData.planets.mercury?.longitude || 0],
            Venus: [natalChartData.planets.venus?.longitude || 0],
            Mars: [natalChartData.planets.mars?.longitude || 0],
            Jupiter: [natalChartData.planets.jupiter?.longitude || 0],
            Saturn: [natalChartData.planets.saturn?.longitude || 0],
            Uranus: [natalChartData.planets.uranus?.longitude || 0],
            Neptune: [natalChartData.planets.neptune?.longitude || 0],
            Pluto: [natalChartData.planets.pluto?.longitude || 0],
          },
          cusps: natalChartData.houses.map(h => h.longitude)
        };

        // Zodiac sign colors (Fire=red/orange, Earth=brown, Air=light blue, Water=green)
        const settings = {
          SYMBOL_SCALE: 2.0,
          COLOR_BACKGROUND: '#ffffff',
          COLOR_LINES: '#000000',
          COLOR_POINTS: '#000000',
          COLOR_CUSPS: '#666666',
          
          // Zodiac sign colors - matching reference image
          COLOR_ARIES: '#ff6b47',        // Fire - red/orange
          COLOR_TAURUS: '#8b6f47',       // Earth - brown
          COLOR_GEMINI: '#87ceeb',       // Air - light blue
          COLOR_CANCER: '#66b266',       // Water - green
          COLOR_LEO: '#ff6b47',          // Fire - red/orange
          COLOR_VIRGO: '#8b6f47',        // Earth - brown
          COLOR_LIBRA: '#87ceeb',        // Air - light blue
          COLOR_SCORPIO: '#66b266',      // Water - green
          COLOR_SAGITTARIUS: '#ff6b47',  // Fire - red/orange
          COLOR_CAPRICORN: '#8b6f47',    // Earth - brown
          COLOR_AQUARIUS: '#87ceeb',     // Air - light blue
          COLOR_PISCES: '#66b266',       // Water - green
          
          // Aspect colors
          STROKE_ONLY: false,
          ASPECTS_STROKE: 2,
          
          // Show aspects with colors
          SHOW_ASPECTS: true,
          
          RADIX_POINTS: true,
          MARGIN: 40,
          PADDING: 20,
          CUSPS_FONT_SIZE: 16,
          POINTS_FONT_SIZE: 14,
        };

        // Create the chart
        const chart = new Chart('astrochart-container', effectiveSize, effectiveSize, settings);
        chart.radix(chartData);

        // Add retrograde markers
        const svg = chartRef.current?.querySelector('svg');
        if (svg) {
          Object.entries(natalChartData.planets).forEach(([name, planet]) => {
            if (planet.retrograde) {
              const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              text.setAttribute('fill', '#dc2626');
              text.setAttribute('font-size', '10');
              text.setAttribute('font-weight', 'bold');
              text.textContent = 'R';
              
              const angle = (planet.longitude - 90) * Math.PI / 180;
              const radius = size / 2 - 70;
              const x = size / 2 + radius * Math.cos(angle);
              const y = size / 2 + radius * Math.sin(angle);
              
              text.setAttribute('x', (x + 12).toString());
              text.setAttribute('y', (y + 4).toString());
              svg.appendChild(text);
            }
          });
        }

      } catch (error) {
        console.error('Error loading AstroChart:', error);
        if (chartRef.current) {
          chartRef.current.innerHTML = `
            <div class="flex items-center justify-center h-full text-muted-foreground">
              <p>Errore nel caricamento del grafico astrologico</p>
            </div>
          `;
        }
      }
    };

    loadChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.innerHTML = '';
      }
    };
  }, [natalChartData, size]);

  // Aspect legend data
  const aspectsLegend = [
    {
      type: 'Congiunzione',
      angle: '0°',
      color: '#ff6b47',
      description: 'Fusione di energie. Potere intensificato quando due pianeti si uniscono.',
      orb: '±8°'
    },
    {
      type: 'Opposizione',
      angle: '180°',
      color: '#ff6b47',
      description: 'Tensione e polarità. Necessità di bilanciare energie opposte.',
      orb: '±8°'
    },
    {
      type: 'Trigono',
      angle: '120°',
      color: '#66b266',
      description: 'Armonia e fluidità. Talenti naturali e facilità nelle espressioni.',
      orb: '±8°'
    },
    {
      type: 'Quadratura',
      angle: '90°',
      color: '#ff6b47',
      description: 'Sfida e crescita. Attriti che stimolano azione e sviluppo.',
      orb: '±8°'
    },
    {
      type: 'Sestile',
      angle: '60°',
      color: '#66b266',
      description: 'Opportunità e cooperazione. Facilita la manifestazione di potenziali.',
      orb: '±6°'
    }
  ];

  return (
    <Card className="bg-background">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Ruota Zodiacale</span>
          {natalChartData.houseSystem && (
            <Badge variant="outline">Sistema {natalChartData.houseSystem}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div 
          id="astrochart-container" 
          ref={chartRef}
          className="w-full flex justify-center items-center min-h-[400px] md:min-h-[600px]"
        />
        
        {/* Aspect Legend */}
        <Card className="mt-6 bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Legenda Aspetti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aspectsLegend.map((aspect) => (
                <div key={aspect.type} className="flex items-start gap-3 p-3 rounded-lg bg-background">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: aspect.color }}
                  >
                    {aspect.type === 'Congiunzione' ? '☌' : 
                     aspect.type === 'Opposizione' ? '☍' :
                     aspect.type === 'Trigono' ? '△' :
                     aspect.type === 'Quadratura' ? '□' :
                     aspect.type === 'Sestile' ? '⚹' : ''}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{aspect.type}</span>
                      <Badge variant="outline" className="text-xs">
                        {aspect.angle}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{aspect.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Orbe: {aspect.orb}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#66b266' }}></div>
                  <span className="text-sm">
                    <strong>Aspetti Armonici:</strong> Trigono, Sestile
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ff6b47' }}></div>
                  <span className="text-sm">
                    <strong>Aspetti Dinamici:</strong> Congiunzione, Opposizione, Quadrato
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
