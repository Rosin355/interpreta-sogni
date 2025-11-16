import { useMemo, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

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
  aspects?: Array<{ planet1: string; planet2: string; type: string; angle: number }>;
}

interface NatalChartWheelProps {
  data: NatalChartData;
  size?: number;
  showAspects?: boolean;
}

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

const planetColors: Record<string, string> = {
  sun: "#FDB813",
  moon: "#C0C0C0",
  mercury: "#FFD700",
  venus: "#FF69B4",
  mars: "#EF4444",
  jupiter: "#F97316",
  saturn: "#A855F7",
  uranus: "#06B6D4",
  neptune: "#8B5CF6",
  pluto: "#DC2626",
  chiron: "#10B981",
  northNode: "#22C55E"
};

const zodiacColors: Record<string, string> = {
  "Aries": "#EF4444",
  "Taurus": "#10B981",
  "Gemini": "#FDB813",
  "Cancer": "#3B82F6",
  "Leo": "#F97316",
  "Virgo": "#64748B",
  "Libra": "#A855F7",
  "Scorpio": "#DC2626",
  "Sagittarius": "#F59E0B",
  "Capricorn": "#475569",
  "Aquarius": "#06B6D4",
  "Pisces": "#8B5CF6"
};

const aspectColors: Record<string, string> = {
  "conjunction": "#FDB813",
  "opposition": "#EF4444",
  "trine": "#10B981",
  "square": "#F97316",
  "sextile": "#3B82F6",
  "major": "#10B981"
};

export function NatalChartWheel({ data, size = 600, showAspects = true }: NatalChartWheelProps) {
  const center = size / 2;
  const outerRadius = size / 2 - 20;
  const zodiacInnerRadius = outerRadius * 0.82;
  const houseInnerRadius = outerRadius * 0.60;
  const aspectRadius = outerRadius * 0.50;
  const planetRadius = outerRadius * 0.71;
  
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);

  // Convert sign name to index (0-11)
  const getSignIndex = (signName: string): number => {
    const signs = Object.keys(zodiacSymbols);
    return signs.indexOf(signName);
  };

  // Get angle from degree (0° = East/right, rotating counter-clockwise)
  const degreeToAngle = (degree: number): number => {
    return ((degree - 90) * Math.PI) / 180;
  };

  // Calculate planet position from its ecliptic longitude
  const getPlanetPosition = (planet: Planet) => {
    const signIndex = getSignIndex(planet.sign);
    if (signIndex === -1) return { x: center, y: center };
    
    // Calculate total ecliptic longitude
    const totalDegree = signIndex * 30 + planet.degree;
    const angle = degreeToAngle(totalDegree);
    
    return {
      x: center + planetRadius * Math.cos(angle),
      y: center + planetRadius * Math.sin(angle),
      angle: totalDegree
    };
  };

  // Draw zodiac wheel segments
  const zodiacSegments = useMemo(() => {
    const signs = Object.keys(zodiacSymbols);
    return signs.map((sign, index) => {
      const startAngle = degreeToAngle(index * 30);
      const endAngle = degreeToAngle((index + 1) * 30);
      
      // Outer arc
      const x1 = center + outerRadius * Math.cos(startAngle);
      const y1 = center + outerRadius * Math.sin(startAngle);
      const x2 = center + outerRadius * Math.cos(endAngle);
      const y2 = center + outerRadius * Math.sin(endAngle);
      
      // Inner arc
      const x3 = center + zodiacInnerRadius * Math.cos(endAngle);
      const y3 = center + zodiacInnerRadius * Math.sin(endAngle);
      const x4 = center + zodiacInnerRadius * Math.cos(startAngle);
      const y4 = center + zodiacInnerRadius * Math.sin(startAngle);
      
      const path = `M ${x1},${y1} A ${outerRadius},${outerRadius} 0 0,1 ${x2},${y2} L ${x3},${y3} A ${zodiacInnerRadius},${zodiacInnerRadius} 0 0,0 ${x4},${y4} Z`;
      
      // Symbol position
      const midAngle = degreeToAngle(index * 30 + 15);
      const symbolRadius = (outerRadius + zodiacInnerRadius) / 2;
      const symbolX = center + symbolRadius * Math.cos(midAngle);
      const symbolY = center + symbolRadius * Math.sin(midAngle);
      
      return { sign, path, symbolX, symbolY, color: zodiacColors[sign] };
    });
  }, [size]);

  // Draw house lines
  const houseLines = useMemo(() => {
    if (!data.houses) return [];
    
    return data.houses.map((house) => {
      const angle = degreeToAngle(house.degree);
      const x1 = center + houseInnerRadius * Math.cos(angle);
      const y1 = center + houseInnerRadius * Math.sin(angle);
      const x2 = center + zodiacInnerRadius * Math.cos(angle);
      const y2 = center + zodiacInnerRadius * Math.sin(angle);
      
      // Position for house number
      const numberRadius = (houseInnerRadius + zodiacInnerRadius) / 2;
      const nextHouseDegree = data.houses[(house.number % 12)];
      const midDegree = house.number < 12 && nextHouseDegree
        ? (house.degree + nextHouseDegree.degree) / 2
        : house.degree + 15;
      const midAngle = degreeToAngle(midDegree);
      const numX = center + numberRadius * Math.cos(midAngle);
      const numY = center + numberRadius * Math.sin(midAngle);
      
      return { x1, y1, x2, y2, number: house.number, numX, numY };
    });
  }, [data.houses, size]);

  // Calculate planet positions
  const planetPositions = useMemo(() => {
    if (!data.planets) return [];
    
    return Object.entries(data.planets)
      .filter(([_, planet]) => planet)
      .map(([name, planet]) => {
        const pos = getPlanetPosition(planet as Planet);
        return {
          name,
          symbol: planetSymbols[name] || name[0].toUpperCase(),
          color: planetColors[name] || "#94A3B8",
          x: pos.x,
          y: pos.y,
          planet: planet as Planet,
          retrograde: planet?.retrograde
        };
      });
  }, [data.planets, size]);

  // Calculate aspects
  const aspects = useMemo(() => {
    if (!data.planets || !showAspects || !data.aspects) return [];
    
    const positions = planetPositions;
    const calculatedAspects: Array<{
      from: typeof positions[0];
      to: typeof positions[0];
      type: string;
      color: string;
    }> = [];

    data.aspects.forEach((aspect) => {
      const fromPlanet = positions.find(p => p.name === aspect.planet1);
      const toPlanet = positions.find(p => p.name === aspect.planet2);
      
      if (fromPlanet && toPlanet) {
        // Draw aspect lines from center area
        const fromAngle = Math.atan2(fromPlanet.y - center, fromPlanet.x - center);
        const toAngle = Math.atan2(toPlanet.y - center, toPlanet.x - center);
        
        calculatedAspects.push({
          from: {
            ...fromPlanet,
            x: center + aspectRadius * Math.cos(fromAngle),
            y: center + aspectRadius * Math.sin(fromAngle)
          },
          to: {
            ...toPlanet,
            x: center + aspectRadius * Math.cos(toAngle),
            y: center + aspectRadius * Math.sin(toAngle)
          },
          type: aspect.type,
          color: aspectColors[aspect.type] || "#64748B"
        });
      }
    });

    return calculatedAspects;
  }, [data.planets, data.aspects, planetPositions, showAspects]);

  return (
    <div className="space-y-4" data-natal-chart-wheel>
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={3}
        centerOnInit
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => zoomIn()}
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => zoomOut()}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => resetTransform()}
                  title="Reset View"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
              
              {selectedPlanet && (
                <Badge variant="secondary" className="gap-1">
                  <span style={{ color: planetColors[selectedPlanet] }}>
                    {planetSymbols[selectedPlanet]}
                  </span>
                  {selectedPlanet}
                </Badge>
              )}
            </div>

            <TransformComponent
              wrapperClass="!w-full !h-full rounded-lg border border-border overflow-hidden"
              contentClass="flex items-center justify-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="p-4"
              >
                <svg
                  width={size}
                  height={size}
                  viewBox={`0 0 ${size} ${size}`}
                  className="natal-chart-wheel"
                  style={{ background: "hsl(var(--background))" }}
                >
                  {/* Zodiac wheel segments */}
                  {zodiacSegments.map(({ sign, path, symbolX, symbolY, color }, idx) => (
                    <motion.g
                      key={sign}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03, duration: 0.3 }}
                    >
                      <path
                        d={path}
                        fill={`${color}25`}
                        stroke={color}
                        strokeWidth="1"
                        className="transition-all duration-300"
                      />
                      <text
                        x={symbolX}
                        y={symbolY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xl font-bold"
                        fill={color}
                        style={{ fontSize: '20px' }}
                      >
                        {zodiacSymbols[sign]}
                      </text>
                    </motion.g>
                  ))}

                  {/* Inner circle for houses */}
                  <motion.circle
                    cx={center}
                    cy={center}
                    r={zodiacInnerRadius}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />

                  {/* House division lines */}
                  {houseLines.map((house, index) => (
                    <motion.g
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + index * 0.03 }}
                    >
                      <line
                        x1={house.x1}
                        y1={house.y1}
                        x2={house.x2}
                        y2={house.y2}
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth="1"
                        opacity="0.6"
                      />
                      <text
                        x={house.numX}
                        y={house.numY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-base font-semibold"
                        fill="hsl(var(--foreground))"
                        style={{ fontSize: '18px' }}
                      >
                        {house.number}
                      </text>
                    </motion.g>
                  ))}

                  {/* Middle circle for aspects */}
                  <motion.circle
                    cx={center}
                    cy={center}
                    r={houseInnerRadius}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                  />

                  {/* Aspect circle background */}
                  <circle
                    cx={center}
                    cy={center}
                    r={aspectRadius}
                    fill="hsl(var(--muted))"
                    opacity="0.2"
                  />

                  {/* Aspect lines */}
                  {aspects.map((aspect, index) => (
                    <motion.line
                      key={`aspect-${index}`}
                      x1={aspect.from.x}
                      y1={aspect.from.y}
                      x2={aspect.to.x}
                      y2={aspect.to.y}
                      stroke={aspect.color}
                      strokeWidth="1.5"
                      opacity="0.6"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.6 }}
                      transition={{ delay: 1 + index * 0.05, duration: 0.5 }}
                      className="transition-opacity duration-300 hover:opacity-100"
                    />
                  ))}

                  {/* Ascendant line */}
                  {data.ascendant && (
                    <motion.line
                      x1={center}
                      y1={center}
                      x2={center + zodiacInnerRadius}
                      y2={center}
                      stroke="hsl(var(--primary))"
                      strokeWidth="3"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                    />
                  )}

                  {/* Ascendant marker */}
                  {data.ascendant && (
                    <motion.g
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1, type: "spring" }}
                    >
                      <text
                        x={center + zodiacInnerRadius - 30}
                        y={center}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-sm font-bold"
                        fill="hsl(var(--primary))"
                      >
                        Asc
                      </text>
                    </motion.g>
                  )}

                  {/* Planets */}
                  {planetPositions.map(({ name, symbol, color, x, y, retrograde }, index) => (
                    <motion.g
                      key={name}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 1.2 + index * 0.05, type: "spring", stiffness: 200 }}
                      onMouseEnter={() => setHoveredPlanet(name)}
                      onMouseLeave={() => setHoveredPlanet(null)}
                      onClick={() => setSelectedPlanet(name === selectedPlanet ? null : name)}
                      className="cursor-pointer"
                    >
                      <motion.circle
                        cx={x}
                        cy={y}
                        r={hoveredPlanet === name || selectedPlanet === name ? 18 : 14}
                        fill="hsl(var(--background))"
                        stroke={color}
                        strokeWidth={selectedPlanet === name ? 3 : 2}
                        className="transition-all duration-200"
                        animate={{
                          scale: hoveredPlanet === name ? 1.15 : 1,
                        }}
                      />
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-base font-bold pointer-events-none"
                        fill={color}
                        style={{ fontSize: hoveredPlanet === name ? '18px' : '16px' }}
                      >
                        {symbol}
                      </text>
                      {retrograde && (
                        <text
                          x={x + 12}
                          y={y - 12}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-xs pointer-events-none"
                          fill="#EF4444"
                        >
                          ℞
                        </text>
                      )}
                      {(hoveredPlanet === name || selectedPlanet === name) && (
                        <motion.g
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <rect
                            x={x - 35}
                            y={y + 22}
                            width="70"
                            height="20"
                            fill="hsl(var(--popover))"
                            stroke="hsl(var(--border))"
                            strokeWidth="1"
                            rx="4"
                          />
                          <text
                            x={x}
                            y={y + 34}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-xs font-medium"
                            fill="hsl(var(--popover-foreground))"
                          >
                            {name.charAt(0).toUpperCase() + name.slice(1)}
                          </text>
                        </motion.g>
                      )}
                    </motion.g>
                  ))}
                </svg>
              </motion.div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
