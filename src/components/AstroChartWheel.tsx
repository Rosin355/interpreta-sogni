import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';

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

        // AstroChart settings
        const settings = {
          SYMBOL_SCALE: 1.5,
          COLOR_BACKGROUND: 'hsl(var(--background))',
          COLOR_LINES: 'hsl(var(--foreground))',
          COLOR_POINTS: 'hsl(var(--primary))',
          COLOR_CUSPS: 'hsl(var(--muted-foreground))',
          STROKE_ONLY: false,
          RADIX_POINTS: true,
          MARGIN: 50,
          PADDING: 20,
        };

        // Create the chart
        const chart = new Chart('astrochart-container', size, size, settings);
        chart.radix(chartData);

        // Add retrograde markers
        const svg = chartRef.current?.querySelector('svg');
        if (svg) {
          Object.entries(natalChartData.planets).forEach(([name, planet]) => {
            if (planet.retrograde) {
              // Add "R" text near the planet symbol
              const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              text.setAttribute('fill', 'hsl(var(--destructive))');
              text.setAttribute('font-size', '12');
              text.setAttribute('font-weight', 'bold');
              text.textContent = 'R';
              
              // Calculate position (simplified)
              const angle = planet.longitude * Math.PI / 180;
              const radius = size / 2 - 80;
              const x = size / 2 + radius * Math.cos(angle);
              const y = size / 2 + radius * Math.sin(angle);
              
              text.setAttribute('x', x.toString());
              text.setAttribute('y', y.toString());
              svg.appendChild(text);
            }
          });
        }

      } catch (error) {
        console.error('Error loading AstroChart:', error);
        // Fallback: show error message
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

    // Cleanup
    return () => {
      if (chartRef.current) {
        chartRef.current.innerHTML = '';
      }
    };
  }, [natalChartData, size]);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div id="astrochart-container" ref={chartRef} className="flex items-center justify-center" />
        
        {natalChartData.calculationMethod && (
          <div className="text-center text-sm text-muted-foreground space-y-1">
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
  );
}
