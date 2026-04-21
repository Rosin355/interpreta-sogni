import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  getAllPhases,
  getPhaseAdvice,
  getEmergedSymbols,
  getPhaseNarrative,
  alchemicalPhases,
  type AlchemicalPhase,
} from "@/utils/alchemical-phases";
import { AlchemicalJourneyMap } from "@/components/AlchemicalJourneyMap";
import { AlchemicalTransitionsList } from "@/components/AlchemicalTransitionsList";
import { Loader2, TrendingUp, TrendingDown, Minus, Sparkles, ChevronDown, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useAlchemicalCelebration } from "@/hooks/useAlchemicalCelebration";
import { AlchemicalTransitionCelebration } from "@/components/AlchemicalTransitionCelebration";
import { cn } from "@/lib/utils";
import { useAlchemyJourney } from "@/hooks/useAlchemyJourney";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { formatPercentage } from "@/contexts/AppCacheContext";
import { usePageLoading } from "@/contexts/RouteLoadingContext";

const phaseBadgeClass: Record<AlchemicalPhase, string> = {
  nigredo: "border-border bg-secondary text-secondary-foreground",
  albedo: "border-accent/30 bg-accent/10 text-accent",
  rubedo: "border-primary/30 bg-primary/10 text-primary",
};

const Alchemy = () => {
  const { journey, dreamsCount, dreams, loading, isRefreshing: isAlchemyRefreshing, refresh } = useAlchemyJourney();

  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTransition, setCelebrationTransition] = useState<{
    from: AlchemicalPhase;
    to: AlchemicalPhase;
  } | null>(null);

  const { celebrate } = useAlchemicalCelebration();

  useEffect(() => {
    const checkForTransitions = async () => {
      if (!journey || !journey.transitions || journey.transitions.length === 0) return;

      const lastTransition = journey.transitions[journey.transitions.length - 1];
      const celebratedTransitions = JSON.parse(
        localStorage.getItem("celebratedAlchemicalTransitions") || "[]",
      );
      const transitionId = `${lastTransition.date}-${lastTransition.from}-${lastTransition.to}`;

      if (!celebratedTransitions.includes(transitionId)) {
        const transitionDate = new Date(lastTransition.date);
        const now = new Date();
        const daysDifference = (now.getTime() - transitionDate.getTime()) / (1000 * 3600 * 24);

        if (daysDifference <= 7) {
          setTimeout(() => {
            setCelebrationTransition({
              from: lastTransition.from,
              to: lastTransition.to,
            });
            setShowCelebration(true);
            celebrate({ phase: lastTransition.to, fromPhase: lastTransition.from });

            const updatedCelebrations = [...celebratedTransitions, transitionId];
            localStorage.setItem("celebratedAlchemicalTransitions", JSON.stringify(updatedCelebrations));

            if (updatedCelebrations.length > 10) {
              localStorage.setItem(
                "celebratedAlchemicalTransitions",
                JSON.stringify(updatedCelebrations.slice(-10)),
              );
            }
          }, 800);
        }
      }
    };

    checkForTransitions();
  }, [celebrate, journey]);

  const getTrendMeta = () => {
    if (!journey) return null;

    switch (journey.trend) {
      case "progressing":
        return {
          label: "In evoluzione",
          icon: <TrendingUp className="h-4 w-4 text-primary" />,
        };
      case "regressing":
        return {
          label: "In regressione",
          icon: <TrendingDown className="h-4 w-4 text-accent" />,
        };
      case "stable":
        return {
          label: "Stabile",
          icon: <Minus className="h-4 w-4 text-muted-foreground" />,
        };
    }
  };

  const allPhases = getAllPhases();
  const trendMeta = getTrendMeta();

  // Registra il loading globale: l'overlay RouteSwitchOverlay resta visibile
  // finché i dati del viaggio non sono pronti, evitando un secondo loader interno.
  usePageLoading(loading && !journey, "alchemy");

  if (loading && !journey) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
      </div>
    );
  }

  if (!journey || dreamsCount === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pb-12" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
          <Card>
            <CardHeader>
              <CardTitle>Il Tuo Viaggio Alchemico</CardTitle>
              <CardDescription>
                Registra i tuoi sogni per iniziare a tracciare il tuo percorso di trasformazione interiore.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {celebrationTransition && (
        <AlchemicalTransitionCelebration
          show={showCelebration}
          fromPhase={celebrationTransition.from}
          toPhase={celebrationTransition.to}
          onComplete={() => setShowCelebration(false)}
        />
      )}

      <div className="container mx-auto space-y-8 px-4 pb-12" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Card className="overflow-hidden border-border/80 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--dream-space)/0.55)_100%)]">
            <CardHeader className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                    Mappa interiore
                  </p>
                  <CardTitle className="max-w-3xl text-3xl sm:text-4xl">
                    Il tuo viaggio alchemico, letto in tre fasi essenziali.
                  </CardTitle>
                  <CardDescription className="max-w-2xl text-base leading-7 text-muted-foreground">
                    Una lettura più semplice e narrativa del tuo percorso tra ombra, purificazione e integrazione.
                  </CardDescription>
                </div>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refresh({ force: true })}
                        disabled={isAlchemyRefreshing}
                        aria-label="Aggiorna viaggio alchemico"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw className={`h-4 w-4 ${isAlchemyRefreshing ? "animate-spin" : ""}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Aggiorna</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className={cn("font-medium", phaseBadgeClass[journey.currentPhase])}>
                  Fase attuale: {journey.currentPhase}
                </Badge>
                {trendMeta && (
                  <Badge variant="outline" className="gap-2 border-border bg-card/70 text-foreground">
                    {trendMeta.icon}
                    {trendMeta.label}
                  </Badge>
                )}
                <Badge variant="outline" className="border-border bg-card/70 text-foreground">
                  {dreamsCount} sogni analizzati
                </Badge>
                {isAlchemyRefreshing && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/60" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <AlchemicalJourneyMap
                currentPhase={journey.currentPhase}
                distribution={journey.distribution}
                compact={false}
              />

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-start gap-3 p-5">
                  <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="mb-1 text-sm uppercase tracking-[0.28em] text-muted-foreground">
                      Guida del momento
                    </p>
                    <p className="text-sm leading-6 text-foreground/85">
                      {getPhaseAdvice(journey.currentPhase)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]"
        >
          <Card className="border-border/80 bg-card/60">
            <CardHeader>
              <CardTitle>Le tre fasi</CardTitle>
              <CardDescription>
                Descrizioni brevi per leggere subito il significato del tuo momento attuale.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allPhases.map((phase, index) => (
                <Collapsible key={phase.id} defaultOpen={journey.currentPhase === phase.id}>
                  <div className="rounded-lg border border-border/70 bg-background/30">
                    <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 p-4 text-left">
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="text-sm uppercase tracking-[0.28em] text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold">{phase.name}</h3>
                            <Badge variant="outline" className={cn("font-medium", phaseBadgeClass[phase.id])}>
                              {formatPercentage(journey.distribution[phase.id])}%
                            </Badge>
                            {journey.currentPhase === phase.id && (
                              <Badge variant="outline" className="border-border bg-card/70 text-foreground">
                                Dominante
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{phase.description}</p>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-4 text-sm">
                        <div>
                          <h4 className="mb-1 font-medium">Significato psicologico</h4>
                          <p className="leading-6 text-muted-foreground">{phase.psychologicalMeaning}</p>
                        </div>
                        <div>
                          <h4 className="mb-2 font-medium">Caratteristiche frequenti</h4>
                          <ul className="space-y-1 text-muted-foreground">
                            {phase.dreamCharacteristics.slice(0, 4).map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </CardContent>
          </Card>

          <AlchemicalTransitionsList transitions={journey.transitions} />
        </motion.section>
      </div>
    </div>
  );
};

export default Alchemy;
