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
  "Aries": "#ef4444",
  "Taurus": "#22c55e",
  "Gemini": "#eab308",
  "Cancer": "#3b82f6",
  "Leo": "#f59e0b",
  "Virgo": "#64748b",
  "Libra": "#a855f7",
  "Scorpio": "#dc2626",
  "Sagittarius": "#f97316",
  "Capricorn": "#475569",
  "Aquarius": "#06b6d4",
  "Pisces": "#8b5cf6"
};

const aspectColors: Record<string, string> = {
  "conjunction": "#fbbf24",
  "opposition": "#ef4444",
  "trine": "#22c55e",
  "square": "#f97316",
  "sextile": "#3b82f6"
};

export function NatalChartWheel({ data, size = 400, showAspects = true }: NatalChartWheelProps) {
  const center = size / 2;
  const outerRadius = size / 2 - 10;
  const innerRadius = outerRadius * 0.7;
  const houseRadius = outerRadius * 0.5;
  const planetRadius = outerRadius * 0.85;
  
  const [hoveredPlanet, setHoveredPlanet] = useState<string | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);

  const getSignAngle = (signIndex: number) => {
    return (signIndex * 30 - 90) * (Math.PI / 180);
  };

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

  const houseLines = useMemo(() => {
    if (!data.houses) return [];
    
    return data.houses.map((house) => {
      const angle = (house.degree - 90) * (Math.PI / 180);
      const x1 = center + houseRadius * Math.cos(angle);
      const y1 = center + houseRadius * Math.sin(angle);
      const x2 = center + outerRadius * Math.cos(angle);
      const y2 = center + outerRadius * Math.sin(angle);
      
      return { x1, y1, x2, y2, number: house.number };
    });
  }, [data.houses, size]);

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
          planet: planet as Planet,
          retrograde: planet?.retrograde
        };
      });
  }, [data.planets, size]);

  const aspects = useMemo(() => {
    if (!data.planets || !showAspects || !data.aspects) return [];
    
    const positions = planetPositions;
    const calculatedAspects: Array<{
      from: typeof positions[0];
      to: typeof positions[0];
      type: string;
      angle: number;
    }> = [];

    data.aspects.forEach((aspect) => {
      const fromPlanet = positions.find(p => p.name === aspect.planet1);
      const toPlanet = positions.find(p => p.name === aspect.planet2);
      
      if (fromPlanet && toPlanet) {
        calculatedAspects.push({
          from: fromPlanet,
          to: toPlanet,
          type: aspect.type,
          angle: aspect.angle
        });
      }
    });

    return calculatedAspects;
  }, [data.planets, data.aspects, planetPositions, showAspects]);

  return (
    <div className="space-y-4">
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
                  {planetSymbols[selectedPlanet]} {selectedPlanet}
                </Badge>
              )}
            </div>

            <TransformComponent
              wrapperClass="!w-full !h-full rounded-lg border border-border bg-muted/30"
              contentClass="flex items-center justify-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <svg
                  width={size}
                  height={size}
                  viewBox={`0 0 ${size} ${size}`}
                  className="natal-chart-wheel"
                >
                  <motion.circle
                    cx={center}
                    cy={center}
                    r={outerRadius}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                  />

                  {zodiacSegments.map(({ sign, path, textX, textY, index }, idx) => (
                    <motion.g
                      key={sign}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                    >
                      <path
                        d={path}
                        fill={`${zodiacColors[Object.keys(zodiacSymbols)[index]]}15`}
                        stroke="hsl(var(--border))"
                        strokeWidth="1"
                        className="transition-all duration-300 hover:fill-opacity-30"
                      />
                      <text
                        x={textX}
                        y={textY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-medium"
                        fill={zodiacColors[Object.keys(zodiacSymbols)[index]]}
                      >
                        {zodiacSymbols[Object.keys(zodiacSymbols)[index]] || sign.slice(0, 3)}
                      </text>
                    </motion.g>
                  ))}

                  <motion.circle
                    cx={center}
                    cy={center}
                    r={innerRadius}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 0.3, ease: "easeInOut" }}
                  />

                  <circle
                    cx={center}
                    cy={center}
                    r={houseRadius}
                    fill="hsl(var(--background))"
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                  />

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
                        stroke="hsl(var(--border))"
                        strokeWidth="1"
                        strokeDasharray="3,3"
                      />
                    </motion.g>
                  ))}

                  {aspects.map((aspect, index) => (
                    <motion.line
                      key={`aspect-${index}`}
                      x1={aspect.from.x}
                      y1={aspect.from.y}
                      x2={aspect.to.x}
                      y2={aspect.to.y}
                      stroke={aspectColors[aspect.type] || "#94a3b8"}
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      opacity="0.4"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.4 }}
                      transition={{ delay: 1 + index * 0.05, duration: 0.5 }}
                      className="transition-opacity duration-300 hover:opacity-80"
                    />
                  ))}

                  {data.ascendant && (
                    <motion.line
                      x1={center}
                      y1={center}
                      x2={center + outerRadius}
                      y2={center}
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                    />
                  )}

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

                  {planetPositions.map(({ name, symbol, x, y, retrograde, planet }, index) => (
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
                        r={hoveredPlanet === name || selectedPlanet === name ? 16 : 12}
                        fill="hsl(var(--background))"
                        stroke="hsl(var(--primary))"
                        strokeWidth={selectedPlanet === name ? 2.5 : 1.5}
                        className="transition-all duration-200"
                        animate={{
                          scale: hoveredPlanet === name ? 1.1 : 1,
                        }}
                      />
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-sm font-bold fill-primary pointer-events-none"
                      >
                        {symbol}
                      </text>
                      {retrograde && (
                        <text
                          x={x + 10}
                          y={y - 10}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-xs fill-destructive pointer-events-none"
                        >
                          ℞
                        </text>
                      )}
                      {hoveredPlanet === name && (
                        <motion.g
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <rect
                            x={x - 40}
                            y={y + 20}
                            width="80"
                            height="24"
                            rx="4"
                            fill="hsl(var(--popover))"
                            stroke="hsl(var(--border))"
                            strokeWidth="1"
                          />
                          <text
                            x={x}
                            y={y + 32}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-xs fill-popover-foreground font-medium pointer-events-none"
                          >
                            {planet.sign} {planet.degree.toFixed(1)}°
                          </text>
                        </motion.g>
                      )}
                    </motion.g>
                  ))}

                  {data.ascendant && (
                    <motion.text
                      x={center + outerRadius + 15}
                      y={center}
                      textAnchor="start"
                      dominantBaseline="middle"
                      className="text-xs font-semibold fill-primary"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                    >
                      ASC
                    </motion.text>
                  )}
                </svg>
              </motion.div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {showAspects && aspects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="flex flex-wrap gap-2 justify-center text-xs"
        >
          <Badge variant="outline" className="gap-1">
            <div className="w-3 h-0.5" style={{ backgroundColor: aspectColors.conjunction }} />
            Congiunzione
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-3 h-0.5" style={{ backgroundColor: aspectColors.trine }} />
            Trigono
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-3 h-0.5" style={{ backgroundColor: aspectColors.square }} />
            Quadrato
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-3 h-0.5" style={{ backgroundColor: aspectColors.opposition }} />
            Opposizione
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-3 h-0.5" style={{ backgroundColor: aspectColors.sextile }} />
            Sestile
          </Badge>
        </motion.div>
      )}

      {selectedPlanet && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-muted/50 rounded-lg border border-border"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{planetSymbols[selectedPlanet]}</span>
            <div>
              <h4 className="font-semibold capitalize">{selectedPlanet}</h4>
              <p className="text-sm text-muted-foreground">
                {planetPositions.find(p => p.name === selectedPlanet)?.planet.sign} • 
                Casa {planetPositions.find(p => p.name === selectedPlanet)?.planet.house} • 
                {planetPositions.find(p => p.name === selectedPlanet)?.planet.degree.toFixed(2)}°
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
