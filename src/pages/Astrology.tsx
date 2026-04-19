import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AstroChartWheel } from "@/components/AstroChartWheel";
import { AspectGrid } from "@/components/AspectGrid";
import { BirthDataForm } from "@/components/BirthDataForm";
import { AstrologicalPillars } from "@/components/AstrologicalPillars";
import { BirthDataSummary } from "@/components/BirthDataSummary";
import { translateSign, translatePlanet, getZodiacSymbol, getPlanetSymbol } from "@/utils/astrology-translations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, Star, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePageLoading } from "@/contexts/RouteLoadingContext";

const Astrology = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [natalChartData, setNatalChartData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(profileData);
      
      // Convert natal chart data structure if needed
      const rawData = profileData?.natal_chart_data as any;
      if (rawData && typeof rawData === 'object') {
        // Ensure planets is in array format for rendering
        const planetsArray = rawData.planets && typeof rawData.planets === 'object' 
          ? Object.entries(rawData.planets).map(([name, data]: [string, any]) => ({
              name,
              label: `${getPlanetSymbol(name)} ${translatePlanet(name)}`,
              sign: data.sign,
              house: data.house,
              position: data.degree || data.position || 0,
              isRetrograde: data.retrograde || false
            })) 
          : [];
        
        setNatalChartData({
          ...rawData,
          planetsArray // Add array version for mapping
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleNatalChartSuccess = () => {
    setShowEditForm(false);
    loadUserData();
  };

  const getPlanetInfo = (planet: string) => {
    const descriptions: Record<string, { meaning: string; influence: string }> = {
      sun: {
        meaning: "Identità ed Ego",
        influence: "Il Sole rappresenta la tua essenza, la tua volontà e il tuo scopo di vita. È il centro della tua personalità."
      },
      moon: {
        meaning: "Emozioni e Intuito",
        influence: "La Luna governa le tue emozioni, i tuoi bisogni emotivi e il tuo mondo interiore. Influenza i sogni e l'inconscio."
      },
      mercury: {
        meaning: "Comunicazione e Pensiero",
        influence: "Mercurio regola la comunicazione, il pensiero logico e l'apprendimento. Influenza come elabori e condividi le informazioni."
      },
      venus: {
        meaning: "Amore e Bellezza",
        influence: "Venere governa l'amore, le relazioni, l'arte e ciò che trovi bello. Influenza come ami e ciò che apprezzi."
      },
      mars: {
        meaning: "Azione e Desiderio",
        influence: "Marte rappresenta la tua energia, il tuo coraggio e la tua capacità di agire. È il pianeta dell'azione e della determinazione."
      },
      jupiter: {
        meaning: "Espansione e Fortuna",
        influence: "Giove porta espansione, ottimismo e opportunità. Indica dove puoi crescere e trovare abbondanza."
      },
      saturn: {
        meaning: "Disciplina e Struttura",
        influence: "Saturno rappresenta la disciplina, le responsabilità e le lezioni di vita. Indica dove devi impegnarti e maturare."
      },
      chiron: {
        meaning: "Ferita Guaritrice",
        influence: "Chirone rappresenta la ferita profonda che può diventare la tua forza più grande. È il ponte tra dolore e saggezza."
      },
      uranus: {
        meaning: "Innovazione e Libertà",
        influence: "Urano porta cambiamento improvviso, originalità e desiderio di libertà. Indica dove sei unico e innovativo."
      },
      neptune: {
        meaning: "Intuizione e Spiritualità",
        influence: "Nettuno governa l'immaginazione, la spiritualità e i sogni. Influenza la tua connessione con il divino e l'inconscio."
      },
      pluto: {
        meaning: "Trasformazione e Potere",
        influence: "Plutone rappresenta la trasformazione profonda, il potere personale e la rinascita. Indica dove puoi trasformarti."
      },
      north_node: {
        meaning: "Destino e Crescita",
        influence: "Il Nodo Nord indica la direzione della tua crescita spirituale e il tuo scopo karmico in questa vita."
      },
      south_node: {
        meaning: "Karma e Passato",
        influence: "Il Nodo Sud rappresenta le tue abilità innate e il karma passato da cui devi evolvere."
      },
      ascendant: {
        meaning: "Maschera e Prima Impressione",
        influence: "L'Ascendente è la maschera che indossi e come gli altri ti percepiscono. È la porta verso la tua personalità."
      }
    };
    return descriptions[planet.toLowerCase()] || { meaning: "", influence: "" };
  };

  const getHouseInfo = (houseNum: number) => {
    const houses: Record<number, { area: string; description: string }> = {
      1: { area: "Identità e Apparenza", description: "Rappresenta te stesso, la tua personalità e come ti presenti al mondo." },
      2: { area: "Valori e Risorse", description: "Governa i tuoi valori, le tue risorse materiali e l'autostima." },
      3: { area: "Comunicazione e Apprendimento", description: "Rappresenta la comunicazione, i fratelli, l'apprendimento e i viaggi brevi." },
      4: { area: "Casa e Famiglia", description: "Governa la famiglia, le radici, la casa e la vita privata." },
      5: { area: "Creatività e Piacere", description: "Rappresenta la creatività, i figli, il romanticismo e il divertimento." },
      6: { area: "Salute e Lavoro", description: "Governa il lavoro quotidiano, la salute e le routine." },
      7: { area: "Relazioni e Partnership", description: "Rappresenta le partnership, il matrimonio e le relazioni one-to-one." },
      8: { area: "Trasformazione e Intimità", description: "Governa la trasformazione, la sessualità, le risorse condivise e la morte/rinascita." },
      9: { area: "Filosofia e Espansione", description: "Rappresenta la filosofia, i viaggi lontani, l'istruzione superiore e la spiritualità." },
      10: { area: "Carriera e Status", description: "Governa la carriera, lo status pubblico e gli obiettivi di vita." },
      11: { area: "Amicizia e Ideali", description: "Rappresenta le amicizie, i gruppi, gli ideali e le speranze per il futuro." },
      12: { area: "Spiritualità e Inconscio", description: "Governa l'inconscio, la spiritualità, i segreti e ciò che è nascosto." }
    };
    return houses[houseNum] || { area: "", description: "" };
  };

  usePageLoading(loading, "astrology");

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
      </div>
    );
  }

  if (!natalChartData) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pb-16 px-6 container mx-auto max-w-4xl" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Calcola il Tuo Tema Natale
              </CardTitle>
              <CardDescription>
                Per visualizzare il tuo tema natale completo, inserisci i tuoi dati di nascita.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/50 rounded-lg border border-border/50 mb-6">
                <p className="text-sm text-muted-foreground mb-3">
                  Il tema natale ti permette di comprendere meglio i tuoi sogni attraverso 
                  l'astrologia. Le posizioni dei pianeti nel momento della tua nascita possono 
                  rivelare aspetti profondi della tua psiche e dei tuoi sogni ricorrenti.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Chirone</strong> indica la tua ferita emotiva principale</li>
                  <li><strong>Mercurio</strong> rivela il tuo stile comunicativo</li>
                  <li><strong>Venere</strong> mostra il tuo modo di amare</li>
                </ul>
              </div>
              
              <BirthDataForm onSuccess={handleNatalChartSuccess} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pb-16 px-6 container mx-auto" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary" />
                Il Tuo Tema Natale
              </h1>
              <p className="text-muted-foreground mt-2">
                Esplora il tuo universo astrologico e scopri come i pianeti influenzano i tuoi sogni
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowEditForm(!showEditForm)} 
                variant="outline"
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Modifica Dati
              </Button>
            </div>
          </div>

          {/* Edit Form */}
          {showEditForm && (
            <Card>
              <CardHeader>
                <CardTitle>Modifica Dati di Nascita</CardTitle>
                <CardDescription>
                  Aggiorna i tuoi dati per ricalcolare il tema natale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BirthDataForm 
                  onSuccess={handleNatalChartSuccess}
                  initialData={{
                    birthDate: profile?.birth_date,
                    birthTime: profile?.birth_time,
                    birthPlace: profile?.birth_place_name,
                    latitude: profile?.birth_latitude,
                    longitude: profile?.birth_longitude,
                  }}
                />
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditForm(false)}
                  className="w-full mt-4"
                >
                  Annulla
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Birth Data Summary */}
          <BirthDataSummary
            birthDate={profile?.birth_date}
            birthTime={profile?.birth_time}
            birthPlace={profile?.birth_place_name}
            latitude={profile?.birth_latitude}
            longitude={profile?.birth_longitude}
            timezone={profile?.birth_timezone}
            houseSystem={natalChartData?.houseSystem}
          />

          {/* Astrological Pillars */}
          <AstrologicalPillars
            sun={natalChartData?.planets?.sun}
            moon={natalChartData?.planets?.moon}
            ascendant={natalChartData?.ascendant}
          />

          {/* Aspect Grid */}
          {natalChartData.aspects && natalChartData.aspects.length > 0 && (
            <AspectGrid aspects={natalChartData.aspects} />
          )}

          {/* Detailed Information */}
          <Tabs defaultValue="planets" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="planets">Pianeti</TabsTrigger>
              <TabsTrigger value="houses">Case</TabsTrigger>
              <TabsTrigger value="aspects">Aspetti</TabsTrigger>
            </TabsList>

            {/* Planets Tab */}
            <TabsContent value="planets" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {natalChartData.planetsArray?.map((planet: any) => {
                  const info = getPlanetInfo(planet.name);
                  return (
                    <Card key={planet.name}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-primary" />
                          {planet.label}
                          {planet.isRetrograde && <Badge variant="secondary">℞</Badge>}
                        </CardTitle>
                        <CardDescription>{info.meaning}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Segno:</span>
                          <Badge>{planet.sign}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Casa:</span>
                          <Badge variant="outline">{planet.house}ª Casa</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Grado:</span>
                          <span className="text-sm font-medium">{planet.position?.toFixed(2) || 0}°</span>
                        </div>
                        <p className="text-sm text-muted-foreground pt-2 border-t">
                          {info.influence}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Houses Tab */}
            <TabsContent value="houses" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {natalChartData.houses && Array.isArray(natalChartData.houses) && natalChartData.houses.map((house: any, index: number) => {
                  const houseNum = house.number || index + 1;
                  const info = getHouseInfo(houseNum);
                  return (
                    <Card key={houseNum}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-primary" />
                          {houseNum}ª Casa
                        </CardTitle>
                        <CardDescription>{info.area}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Cuspide:</span>
                          <Badge>{house.sign}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Grado:</span>
                          <span className="text-sm font-medium">{(house.position || house.degree)?.toFixed(2) || 0}°</span>
                        </div>
                        <p className="text-sm text-muted-foreground pt-2 border-t">
                          {info.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Aspects Tab */}
            <TabsContent value="aspects" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Aspetti Planetari</CardTitle>
                  <CardDescription>
                    Gli aspetti rappresentano le relazioni angolari tra i pianeti e influenzano come le loro energie interagiscono
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {natalChartData.aspects && Array.isArray(natalChartData.aspects) && natalChartData.aspects.length > 0 ? (
                    <div className="space-y-3">
                      {natalChartData.aspects.map((aspect: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant={
                              aspect.type === 'conjunction' ? 'default' :
                              aspect.type === 'trine' ? 'secondary' :
                              aspect.type === 'sextile' ? 'outline' :
                              'destructive'
                            }>
                              {aspect.type}
                            </Badge>
                            <span className="text-sm">
                              {aspect.planet1} - {aspect.planet2}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {aspect.angle}°
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nessun aspetto calcolato disponibile
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Astrology;
