import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  calculateUserJourney, 
  getAllPhases, 
  getPhaseAdvice,
  type UserJourney,
  type AlchemicalPhase 
} from "@/utils/alchemical-phases";
import { AlchemicalJourneyMap } from "@/components/AlchemicalJourneyMap";
import { Loader2, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAlchemicalCelebration } from "@/hooks/useAlchemicalCelebration";
import { AlchemicalTransitionCelebration } from "@/components/AlchemicalTransitionCelebration";

const Alchemy = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dreams, setDreams] = useState<any[]>([]);
  const [journey, setJourney] = useState<UserJourney | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTransition, setCelebrationTransition] = useState<{
    from: AlchemicalPhase;
    to: AlchemicalPhase;
  } | null>(null);
  
  const { celebrate } = useAlchemicalCelebration();

  useEffect(() => {
    checkAuth();
    
    // Controlla se c'è una transizione recente da celebrare
    const checkForTransitions = async () => {
      // Aspetta che i dati siano caricati
      if (!journey || !journey.transitions || journey.transitions.length === 0) return;
      
      // Prendi l'ultima transizione
      const lastTransition = journey.transitions[journey.transitions.length - 1];
      
      // Controlla se abbiamo già celebrato questa transizione
      const celebratedTransitions = JSON.parse(
        localStorage.getItem('celebratedAlchemicalTransitions') || '[]'
      );
      
      // Crea un ID unico per questa transizione (data + from + to)
      const transitionId = `${lastTransition.date}-${lastTransition.from}-${lastTransition.to}`;
      
      // Se non abbiamo celebrato questa transizione E è recente (ultimi 7 giorni)
      if (!celebratedTransitions.includes(transitionId)) {
        const transitionDate = new Date(lastTransition.date);
        const now = new Date();
        const daysDifference = (now.getTime() - transitionDate.getTime()) / (1000 * 3600 * 24);
        
        if (daysDifference <= 7) {
          // Celebra la transizione!
          setTimeout(() => {
            setCelebrationTransition({
              from: lastTransition.from,
              to: lastTransition.to
            });
            setShowCelebration(true);
            celebrate({ phase: lastTransition.to, fromPhase: lastTransition.from });
            
            // Segna questa transizione come celebrata
            const updatedCelebrations = [...celebratedTransitions, transitionId];
            localStorage.setItem('celebratedAlchemicalTransitions', JSON.stringify(updatedCelebrations));
            
            // Mantieni solo le ultime 10 celebrazioni per non riempire localStorage
            if (updatedCelebrations.length > 10) {
              localStorage.setItem(
                'celebratedAlchemicalTransitions',
                JSON.stringify(updatedCelebrations.slice(-10))
              );
            }
          }, 800);
        }
      }
    };
    
    checkForTransitions();
  }, [celebrate, journey]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchDreams();
  };

  const fetchDreams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("dreams")
        .select("*")
        .eq("user_id", user.id)
        .order("dream_date", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setDreams(data);
        const userJourney = calculateUserJourney(data);
        setJourney(userJourney);
      }
    } catch (error) {
      console.error("Error fetching dreams:", error);
      toast.error("Errore nel caricamento dei sogni");
    } finally {
      setLoading(false);
    }
  };

  const getPhaseColor = (phase: AlchemicalPhase) => {
    switch (phase) {
      case "nigredo":
        return "bg-black text-white hover:bg-black/90";
      case "albedo":
        return "bg-white text-black border-2 border-border hover:bg-gray-50";
      case "rubedo":
        return "bg-gradient-to-r from-red-500 to-amber-500 text-white hover:from-red-600 hover:to-amber-600";
    }
  };

  const getTrendIcon = () => {
    if (!journey) return null;
    switch (journey.trend) {
      case "progressing":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "regressing":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case "stable":
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };


  const allPhases = getAllPhases();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!journey || dreams.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <Card>
            <CardHeader>
              <CardTitle>Il Tuo Viaggio Alchemico</CardTitle>
              <CardDescription>
                Registra i tuoi sogni per iniziare a tracciare il tuo percorso di trasformazione interiore
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
      
      {/* Componente di celebrazione */}
      {celebrationTransition && (
        <AlchemicalTransitionCelebration
          show={showCelebration}
          fromPhase={celebrationTransition.from}
          toPhase={celebrationTransition.to}
          onComplete={() => setShowCelebration(false)}
        />
      )}
      
      <div className="container mx-auto px-4 pt-24 pb-12 space-y-8">
        {/* Header con fase corrente */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl sm:text-3xl mb-2">Il Tuo Viaggio Alchemico</CardTitle>
                  <CardDescription className="text-sm">
                    Mappa della tua trasformazione interiore attraverso i sogni
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {getTrendIcon()}
                  <Badge variant="outline" className="text-xs sm:text-sm">
                    {journey.trend === "progressing" && "In Progresso"}
                    {journey.trend === "regressing" && "In Regressione"}
                    {journey.trend === "stable" && "Stabile"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-1 sm:px-4 md:px-6 py-4">
              <AlchemicalJourneyMap
                currentPhase={journey.currentPhase}
                distribution={journey.distribution}
                compact={false}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Consiglio per la fase attuale */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Guida per la Fase Attuale</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/80">{getPhaseAdvice(journey.currentPhase)}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs con contenuti dettagliati */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs defaultValue="phases" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="phases" className="text-xs sm:text-sm">Le Tre Fasi</TabsTrigger>
              <TabsTrigger value="evolution" className="text-xs sm:text-sm">Transizioni</TabsTrigger>
            </TabsList>

            <TabsContent value="phases" className="space-y-4 mt-6">
              {allPhases.map((phase, index) => (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className={journey.currentPhase === phase.id ? "border-2 border-primary" : ""}>
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <CardTitle className="text-2xl mb-2">{phase.name}</CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getPhaseColor(phase.id)}>
                              {phase.id}
                            </Badge>
                            <span className="text-2xl">{phase.icon}</span>
                          </div>
                        </div>
                        {journey.currentPhase === phase.id && (
                          <Badge variant="default">Fase Attuale</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Significato</h4>
                        <p className="text-muted-foreground">{phase.description}</p>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-2">Significato Psicologico</h4>
                        <p className="text-muted-foreground">{phase.psychologicalMeaning}</p>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-2">Caratteristiche nei Sogni</h4>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                          {phase.dreamCharacteristics.map((char, i) => (
                            <li key={i}>{char}</li>
                          ))}
                        </ul>
                      </div>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-2">Parole Chiave</h4>
                        <div className="flex gap-2 flex-wrap">
                          {phase.keywords.slice(0, 10).map((keyword) => (
                            <Badge key={keyword} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>


            <TabsContent value="evolution" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Le Tue Transizioni</CardTitle>
                  <CardDescription>
                    Storico dei cambiamenti tra le fasi alchemiche
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {journey.transitions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Continua a registrare i tuoi sogni per vedere le transizioni tra le fasi
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {journey.transitions.map((transition, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.05 }}
                          className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                        >
                          <Badge className={getPhaseColor(transition.from)}>
                            {transition.from}
                          </Badge>
                          <span className="text-muted-foreground">→</span>
                          <Badge className={getPhaseColor(transition.to)}>
                            {transition.to}
                          </Badge>
                          <span className="text-sm text-muted-foreground ml-auto">
                            {new Date(transition.date).toLocaleDateString("it-IT")}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Alchemy;
