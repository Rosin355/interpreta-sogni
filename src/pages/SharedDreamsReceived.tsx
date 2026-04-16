import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Check, X, Eye, Mail } from "lucide-react";
import { DreamCardSkeleton } from "@/components/ui/dream-skeleton";
import Navigation from "@/components/Navigation";

interface DreamShare {
  id: string;
  dream_id: string;
  user_id: string;
  message: string | null;
  status: string;
  created_at: string;
  dreams: {
    title: string;
    dream_date: string;
    mood: string | null;
    content: string;
  };
  profiles: {
    username: string | null;
  };
}

export default function SharedDreamsReceived() {
  const [shares, setShares] = useState<DreamShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadShares();

    // Real-time subscription for new shares
    const channel = supabase
      .channel("dream_shares_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dream_shares",
        },
        () => {
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
      if (!user) return;

      const { data, error } = await supabase
        .from('dream_shares')
        .select(`
          *,
          dreams(title, dream_date, mood, content)
        `)
        .eq('shared_with_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with sender username
      const enrichedData = await Promise.all(
        (data || []).map(async (share) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', share.user_id)
            .single();
          
          return {
            ...share,
            profiles: { username: profile?.username || null }
          };
        })
      );

      console.log("[SharedDreamsReceived] Loaded shares:", enrichedData.map(s => ({ id: s.id, status: s.status, shared_with_user_id: (s as any).shared_with_user_id, dream_id: s.dream_id })));
      setShares(enrichedData);
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

  const handleUpdateStatus = async (shareId: string, newStatus: "accepted" | "declined") => {
    try {
      setActionLoading(shareId);
      
      const { error } = await supabase
        .from("dream_shares")
        .update({ status: newStatus })
        .eq("id", shareId);

      if (error) throw error;

      toast({
        title: newStatus === "accepted" ? "Condivisione accettata" : "Condivisione rifiutata",
        description: newStatus === "accepted" 
          ? "Ora puoi visualizzare il sogno condiviso" 
          : "La condivisione è stata rifiutata",
      });

      loadShares();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato della condivisione",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">In Attesa</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500">Accettato</Badge>;
      case "declined":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500">Rifiutato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredShares = (status: string) => {
    if (status === "all") return shares;
    return shares.filter(share => share.status === status);
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container max-w-6xl mx-auto py-8 px-4" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Sogni Condivisi con Te</h1>
            <p className="text-muted-foreground">Visualizza e gestisci i sogni che altri utenti hanno condiviso con te</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <DreamCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container max-w-6xl mx-auto py-8 px-4" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Sogni Condivisi con Te
        </h1>
        <p className="text-muted-foreground">
          Visualizza e gestisci i sogni che altri utenti hanno condiviso con te
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">Tutti ({shares.length})</TabsTrigger>
          <TabsTrigger value="pending">In Attesa ({filteredShares("pending").length})</TabsTrigger>
          <TabsTrigger value="accepted">Accettati ({filteredShares("accepted").length})</TabsTrigger>
          <TabsTrigger value="declined">Rifiutati ({filteredShares("declined").length})</TabsTrigger>
        </TabsList>

        {["all", "pending", "accepted", "declined"].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {filteredShares(status).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Mail className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {status === "pending" && "Nessuna condivisione in attesa"}
                    {status === "accepted" && "Nessuna condivisione accettata"}
                    {status === "declined" && "Nessuna condivisione rifiutata"}
                    {status === "all" && "Nessun sogno condiviso con te"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredShares(status).map((share) => (
                  <Card key={share.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-xl">{share.dreams.title}</CardTitle>
                        {getStatusBadge(share.status)}
                      </div>
                      <CardDescription className="space-y-1">
                        <p>📅 {format(new Date(share.dreams.dream_date), "d MMMM yyyy", { locale: it })}</p>
                        <p>👤 Condiviso da: <strong>{share.profiles.username || "Utente"}</strong></p>
                        {share.dreams.mood && <p>😊 {share.dreams.mood}</p>}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm line-clamp-3">{share.dreams.content}</p>
                      
                      {share.message && (
                        <div className="bg-muted p-3 rounded-md">
                          <p className="text-sm font-semibold mb-1">Messaggio:</p>
                          <p className="text-sm">{share.message}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {share.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(share.id, "accepted")}
                              disabled={actionLoading === share.id}
                              className="flex-1"
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Accetta
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(share.id, "declined")}
                              disabled={actionLoading === share.id}
                              className="flex-1"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Rifiuta
                            </Button>
                          </>
                        )}
                        {share.status === "accepted" && (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/dream/${share.dream_id}`)}
                            className="w-full"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizza Sogno
                          </Button>
                        )}
                        {share.status === "declined" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(share.id, "accepted")}
                            disabled={actionLoading === share.id}
                            className="w-full"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Riaccetta
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
    </>
  );
}
