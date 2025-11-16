import { useMemo } from "react";

interface Planet {
  sign: string;
  house: number;
  degree: number;
  retrograde?: boolean;
}

interface NatalChartData {
  planets: {
    sun?: Planet;
    moon?: Planet;
    mercury?: Planet;
    venus?: Planet;
    mars?: Planet;
    jupiter?: Planet;
    saturn?: Planet;
    uranus?: Planet;
    neptune?: Planet;
    pluto?: Planet;
    chiron?: Planet;
    northNode?: Planet;
  };
  houses: Array<{ number: number; sign: string; degree: number }>;
  ascendant: { sign: string; degree: number };
}

interface NatalChartWheelProps {
  data: NatalChartData;
  size?: number;
}

const zodiacSigns = [
  "Ariete", "Toro", "Gemelli", "Cancro", "Leone", "Vergine",
  "Bilancia", "Scorpione", "Sagittario", "Capricorno", "Acquario", "Pesci"
];

const zodiacSymbols: Record<string, string> = {
  "Aries": "♈", "Taurus": "♉", "Gemini": "♊", "Cancer": "♋",
  "Leo": "♌", "Virgo": "♍", "Libra": "♎", "Scorpio": "♏",
  "Sagittarius": "♐", "Capricorn": "♑", "Aquarius": "♒", "Pisces": "♓"
};

const planetSymbols: Record<string, string> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  uranus: "♅",
  neptune: "♆",
  pluto: "♇",
  chiron: "⚷",
  northNode: "☊"
};

const zodiacColors: Record<string, string> = {
  "Aries": "hsl(var(--destructive))",
  "Taurus": "hsl(var(--success))",
  "Gemini": "hsl(var(--warning))",
  "Cancer": "hsl(var(--info))",
  "Leo": "hsl(var(--accent))",
  "Virgo": "hsl(var(--muted))",
  "Libra": "hsl(var(--primary))",
  "Scorpio": "hsl(var(--destructive))",
  "Sagittarius": "hsl(var(--warning))",
  "Capricorn": "hsl(var(--muted-foreground))",
  "Aquarius": "hsl(var(--info))",
  "Pisces": "hsl(var(--primary))"
};

export function NatalChartWheel({ data, size = 400 }: NatalChartWheelProps) {
  const center = size / 2;
  const outerRadius = size / 2 - 10;
  const innerRadius = outerRadius * 0.7;
  const houseRadius = outerRadius * 0.5;
  const planetRadius = outerRadius * 0.85;

  // Calcola la posizione angolare per ogni segno zodiacale (12 segni, 30° ciascuno)
  const getSignAngle = (signIndex: number) => {
    return (signIndex * 30 - 90) * (Math.PI / 180); // -90 per iniziare dall'alto
  };

  // Calcola posizione di un pianeta basandosi su segno e grado
  const getPlanetPosition = (planet: Planet) => {
    const signIndex = Object.keys(zodiacSymbols).indexOf(planet.sign);
    if (signIndex === -1) return { x: 0, y: 0 };
    
    const baseAngle = signIndex * 30;
    const angle = (baseAngle + planet.degree - 90) * (Math.PI / 180);
    
    return {
      x: center + planetRadius * Math.cos(angle),
      y: center + planetRadius * Math.sin(angle)
    };
  };

  // Genera i segmenti del cerchio zodiacale
  const zodiacSegments = useMemo(() => {
    return zodiacSigns.map((sign, index) => {
      const startAngle = getSignAngle(index);
      const endAngle = getSignAngle(index + 1);
      
      const x1 = center + outerRadius * Math.cos(startAngle);
      const y1 = center + outerRadius * Math.sin(startAngle);
      const x2 = center + innerRadius * Math.cos(startAngle);
      const y2 = center + innerRadius * Math.sin(startAngle);
      const x3 = center + innerRadius * Math.cos(endAngle);
      const y3 = center + innerRadius * Math.sin(endAngle);
      const x4 = center + outerRadius * Math.cos(endAngle);
      const y4 = center + outerRadius * Math.sin(endAngle);

      const path = `M ${x1} ${y1} L ${x2} ${y2} A ${innerRadius} ${innerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${outerRadius} ${outerRadius} 0 0 0 ${x1} ${y1}`;
      
      const midAngle = (startAngle + endAngle) / 2;
      const textRadius = (outerRadius + innerRadius) / 2;
      const textX = center + textRadius * Math.cos(midAngle);
      const textY = center + textRadius * Math.sin(midAngle);

      return { sign, path, textX, textY, index };
    });
  }, [size]);

  // Linee delle case
  const houseLines = useMemo(() => {
    if (!data.houses) return [];
    
    return data.houses.map((house, index) => {
      const angle = (house.degree - 90) * (Math.PI / 180);
      const x1 = center + houseRadius * Math.cos(angle);
      const y1 = center + houseRadius * Math.sin(angle);
      const x2 = center + outerRadius * Math.cos(angle);
      const y2 = center + outerRadius * Math.sin(angle);
      
      return { x1, y1, x2, y2, number: house.number };
    });
  }, [data.houses, size]);

  // Posizioni dei pianeti
  const planetPositions = useMemo(() => {
    if (!data.planets) return [];
    
    return Object.entries(data.planets)
      .filter(([_, planet]) => planet)
      .map(([name, planet]) => {
        const pos = getPlanetPosition(planet as Planet);
        return {
          name,
          symbol: planetSymbols[name] || name[0].toUpperCase(),
          x: pos.x,
          y: pos.y,
          retrograde: planet?.retrograde
        };
      });
  }, [data.planets, size]);

  return (
    <div className="flex justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="natal-chart-wheel"
      >
        {/* Cerchio esterno */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />

        {/* Segmenti zodiacali */}
        {zodiacSegments.map(({ sign, path, textX, textY, index }) => (
          <g key={sign}>
            <path
              d={path}
              fill={`hsl(var(--muted))`}
              fillOpacity="0.1"
              stroke="hsl(var(--border))"
              strokeWidth="1"
            />
            <text
              x={textX}
              y={textY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-muted-foreground"
            >
              {zodiacSymbols[Object.keys(zodiacSymbols)[index]] || sign.slice(0, 3)}
            </text>
          </g>
        ))}

        {/* Cerchio interno (case) */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />

        {/* Cerchio delle case */}
        <circle
          cx={center}
          cy={center}
          r={houseRadius}
          fill="hsl(var(--background))"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />

        {/* Linee delle case */}
        {houseLines.map((house, index) => (
          <g key={index}>
            <line
              x1={house.x1}
              y1={house.y1}
              x2={house.x2}
              y2={house.y2}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          </g>
        ))}

        {/* Ascendente (linea speciale) */}
        {data.ascendant && (
          <line
            x1={center}
            y1={center}
            x2={center + outerRadius}
            y2={center}
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        )}

        {/* Marker per l'ascendente */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3, 0 6"
              fill="hsl(var(--primary))"
            />
          </marker>
        </defs>

        {/* Pianeti */}
        {planetPositions.map(({ name, symbol, x, y, retrograde }, index) => (
          <g key={name}>
            {/* Cerchio di sfondo */}
            <circle
              cx={x}
              cy={y}
              r="12"
              fill="hsl(var(--background))"
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
            />
            {/* Simbolo del pianeta */}
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm font-bold fill-primary"
            >
              {symbol}
            </text>
            {/* Indicatore retrogrado */}
            {retrograde && (
              <text
                x={x + 10}
                y={y - 10}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-destructive"
              >
                ℞
              </text>
            )}
          </g>
        ))}

        {/* Etichetta Ascendente */}
        {data.ascendant && (
          <text
            x={center + outerRadius + 15}
            y={center}
            textAnchor="start"
            dominantBaseline="middle"
            className="text-xs font-semibold fill-primary"
          >
            ASC
          </text>
        )}
      </svg>
    </div>
  );
}
