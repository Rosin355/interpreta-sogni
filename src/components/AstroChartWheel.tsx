import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
          SYMBOL_SCALE: 1.8,
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
        const chart = new Chart('astrochart-container', size, size, settings);
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
    <div className="space-y-6">
      <Card className="p-6 bg-white">
        <div className="space-y-4">
          <div id="astrochart-container" ref={chartRef} className="flex items-center justify-center" />
          
          {natalChartData.calculationMethod && (
            <div className="text-center text-sm text-gray-600 space-y-1">
              <p>
                <strong>Metodo di calcolo:</strong> {natalChartData.calculationMethod}
              </p>
              {natalChartData.houseSystem && (
                <p>
                  <strong>Sistema case:</strong> {natalChartData.houseSystem}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Aspect Legend */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Legenda Aspetti Astrologici</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {aspectsLegend.map((aspect) => (
              <div 
                key={aspect.type}
                className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
                  style={{ backgroundColor: aspect.color }}
                >
                  {aspect.angle}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{aspect.type}</h4>
                    <Badge variant="outline" className="text-xs">{aspect.orb}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{aspect.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Aspetti Armonici</h5>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#66b266]"></div>
                  <span className="text-gray-600">Trigono, Sestile</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Facilitano l'espressione naturale delle energie</p>
              </div>
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Aspetti Dinamici</h5>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff6b47]"></div>
                  <span className="text-gray-600">Quadratura, Opposizione</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Creano tensione che stimola crescita e azione</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
