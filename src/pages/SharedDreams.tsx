import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Eye, Check, X, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface DreamShare {
  id: string;
  dream_id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string;
  dreams: {
    title: string;
    dream_date: string;
    mood: string | null;
    content: string;
  };
  profiles: {
    username: string;
  };
}

export default function SharedDreams() {
  const [shares, setShares] = useState<DreamShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "declined">("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadShares();

    // Real-time subscription for new shares
    const channel = supabase
      .channel("dream-shares-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dream_shares",
        },
        (payload) => {
          console.log("New share received:", payload);
          toast({
            title: "🌙 Nuovo sogno condiviso!",
            description: "Hai ricevuto un nuovo sogno da analizzare",
          });
          loadShares();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadShares = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get shares
      const { data: sharesData, error: sharesError } = await supabase
        .from("dream_shares")
        .select("*")
        .eq("professional_id", user.id)
        .order("created_at", { ascending: false });

      if (sharesError) throw sharesError;

      // Enrich with dreams and profiles data
      const enrichedShares = await Promise.all(
        (sharesData || []).map(async (share) => {
          const { data: dreamData } = await supabase
            .from("dreams")
            .select("title, dream_date, mood, content")
            .eq("id", share.dream_id)
            .single();

          const { data: profileData } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", share.user_id)
            .single();

          return {
            ...share,
            dreams: dreamData || { title: "", dream_date: "", mood: null, content: "" },
            profiles: profileData || { username: "Utente" },
          };
        })
      );

      setShares(enrichedShares);
    } catch (error: any) {
      console.error("Error loading shares:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i sogni condivisi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (shareId: string, status: "accepted" | "declined") => {
    try {
      setActionLoading(shareId);

      const { error } = await supabase
        .from("dream_shares")
        .update({ status })
        .eq("id", shareId);

      if (error) throw error;

      toast({
        title: status === "accepted" ? "✅ Condivisione accettata" : "❌ Condivisione rifiutata",
        description: status === "accepted" 
          ? "Ora puoi visualizzare il sogno completo e lasciare un feedback"
          : "La condivisione è stata rifiutata",
      });

      loadShares();
    } catch (error: any) {
      console.error("Error updating share status:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">In Attesa</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Accettato</Badge>;
      case "declined":
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Rifiutato</Badge>;
      default:
        return null;
    }
  };

  const filteredShares = filter === "all" 
    ? shares 
    : shares.filter(share => share.status === filter);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sogni Condivisi</h1>
          <p className="text-muted-foreground">
            Visualizza e gestisci i sogni che gli utenti hanno condiviso con te
          </p>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Tutti ({shares.length})</TabsTrigger>
            <TabsTrigger value="pending">In Attesa ({shares.filter(s => s.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="accepted">Accettati ({shares.filter(s => s.status === "accepted").length})</TabsTrigger>
            <TabsTrigger value="declined">Rifiutati ({shares.filter(s => s.status === "declined").length})</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-6">
            {filteredShares.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {filter === "all" 
                      ? "Nessun sogno condiviso al momento" 
                      : `Nessun sogno ${filter === "pending" ? "in attesa" : filter === "accepted" ? "accettato" : "rifiutato"}`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredShares.map((share) => (
                  <Card key={share.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="mb-2">{share.dreams.title}</CardTitle>
                          <CardDescription className="flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(share.dreams.dream_date), "d MMMM yyyy", { locale: it })}
                            </span>
                            {share.dreams.mood && (
                              <Badge variant="secondary">{share.dreams.mood}</Badge>
                            )}
                            <span>da {share.profiles.username || "Utente"}</span>
                          </CardDescription>
                        </div>
                        {getStatusBadge(share.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {share.message && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Messaggio dall'utente:</p>
                          <p className="text-sm text-muted-foreground">{share.message}</p>
                        </div>
                      )}
                      <p className="text-sm line-clamp-3">{share.dreams.content}</p>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      {share.status === "pending" && (
                        <>
                          <Button
                            variant="default"
                            onClick={() => handleUpdateStatus(share.id, "accepted")}
                            disabled={actionLoading === share.id}
                          >
                            {actionLoading === share.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-2 h-4 w-4" />
                            )}
                            Accetta
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleUpdateStatus(share.id, "declined")}
                            disabled={actionLoading === share.id}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Rifiuta
                          </Button>
                        </>
                      )}
                      {share.status === "accepted" && (
                        <Button
                          variant="default"
                          onClick={() => navigate(`/dream/${share.dream_id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizza e Commenta
                        </Button>
                      )}
                      {share.status === "declined" && (
                        <Button
                          variant="ghost"
                          onClick={() => navigate(`/dream/${share.dream_id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizza
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
