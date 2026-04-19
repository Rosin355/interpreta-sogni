import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  calculateUserJourney,
  getAllPhases,
  getPhaseAdvice,
  type UserJourney,
  type AlchemicalPhase,
} from "@/utils/alchemical-phases";
import { AlchemicalJourneyMap } from "@/components/AlchemicalJourneyMap";
import { AlchemicalTransitionsList } from "@/components/AlchemicalTransitionsList";
import { Loader2, TrendingUp, TrendingDown, Minus, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAlchemicalCelebration } from "@/hooks/useAlchemicalCelebration";
import { AlchemicalTransitionCelebration } from "@/components/AlchemicalTransitionCelebration";
import { cn } from "@/lib/utils";
import { useAppCache } from "@/contexts/AppCacheContext";

const phaseBadgeClass: Record<AlchemicalPhase, string> = {
  nigredo: "border-border bg-secondary text-secondary-foreground",
  albedo: "border-accent/30 bg-accent/10 text-accent",
  rubedo: "border-primary/30 bg-primary/10 text-primary",
};

const Alchemy = () => {
  const navigate = useNavigate();
  const {
    getAlchemyCache,
    setAlchemyCache,
    isStale,
    alchemyLastFetchedAt,
    isAlchemyRefreshing,
    setAlchemyRefreshing,
  } = useAppCache();

  const cachedAlchemy = getAlchemyCache();

  const [loading, setLoading] = useState(!cachedAlchemy);
  const [dreams, setDreams] = useState<any[]>([]);
  const [journey, setJourney] = useState<UserJourney | null>(cachedAlchemy?.journey ?? null);
  const [dreamsCount, setDreamsCount] = useState<number>(cachedAlchemy?.dreamsCount ?? 0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTransition, setCelebrationTransition] = useState<{
    from: AlchemicalPhase;
    to: AlchemicalPhase;
  } | null>(null);

  const { celebrate } = useAlchemicalCelebration();

  useEffect(() => {
    // Cache fresca → niente refetch
    if (cachedAlchemy && !isStale(alchemyLastFetchedAt)) {
      return;
    }
    checkAuth(!!cachedAlchemy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const checkAuth = async (background = false) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchDreams(background);
  };

  const fetchDreams = async (background = false) => {
    if (background) setAlchemyRefreshing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Payload ridotto: solo campi utili al calcolo alchemico
      const { data, error } = await supabase
        .from("dreams")
        .select("id, dream_date, content, mood, tags, interpretation, alchemical_phase")
        .eq("user_id", user.id)
        .order("dream_date", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setDreams(data);
        const userJourney = calculateUserJourney(data);
        setJourney(userJourney);
        setDreamsCount(data.length);
        setAlchemyCache({ journey: userJourney, dreamsCount: data.length });
      }
    } catch (error) {
      console.error("Error fetching dreams:", error);
      toast.error("Errore nel caricamento dei sogni");
    } finally {
      setLoading(false);
      if (background) setAlchemyRefreshing(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto flex items-center justify-center px-4 pb-12" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!journey || (dreams.length === 0 && dreamsCount === 0)) {
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
                  {dreamsCount || dreams.length} sogni analizzati
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
                              {Math.round(journey.distribution[phase.id])}%
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
