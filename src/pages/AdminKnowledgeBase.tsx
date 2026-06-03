import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KnowledgeSourcesList from "@/components/admin/KnowledgeSourcesList";
import KnowledgeSourceForm from "@/components/admin/KnowledgeSourceForm";
import KnowledgePdfUploadForm from "@/components/admin/KnowledgePdfUploadForm";

const AdminKnowledgeBase = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data, error } = await supabase.rpc("is_admin", { _user_id: user.id });
      if (error || !data) {
        toast({
          title: "Accesso negato",
          description: "Non hai i permessi per accedere a questa pagina",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      setIsAdmin(true);
      setLoading(false);
    };
    checkAdmin();
  }, [navigate, toast]);

  const handleCreated = useCallback(() => {
    setDialogOpen(false);
    setRefreshKey((k) => k + 1);
  }, []);

  if (loading) {
    return (
      <>
        <Navigation />
        <div
          className="min-h-screen bg-background flex items-center justify-center"
          style={{ paddingTop: "calc(7rem + var(--safe-area-inset-top, 0px))" }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <Navigation />
      <div
        className="min-h-screen bg-background px-4"
        style={{ paddingTop: "calc(7rem + var(--safe-area-inset-top, 0px))" }}
      >
        <div className="container max-w-6xl mx-auto py-12">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
                className="gap-2 mb-3 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Button>
              <h1 className="text-3xl font-bold mb-2">Knowledge Base AI</h1>
              <p className="text-muted-foreground max-w-2xl">
                Gestisci le fonti curatoriali (testi alchemici, astrologici, simbolici)
                che alimenteranno le future interpretazioni AI. Nessun sogno privato
                degli utenti deve essere inserito qui.
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Nuova fonte
            </Button>
          </div>

          <KnowledgeSourcesList refreshKey={refreshKey} />

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuova fonte Knowledge Base</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">Testo manuale</TabsTrigger>
                  <TabsTrigger value="pdf">Documento PDF</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-4">
                  <KnowledgeSourceForm
                    onCreated={handleCreated}
                    onCancel={() => setDialogOpen(false)}
                  />
                </TabsContent>
                <TabsContent value="pdf" className="mt-4">
                  <KnowledgePdfUploadForm
                    onCreated={handleCreated}
                    onCancel={() => setDialogOpen(false)}
                  />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};

export default AdminKnowledgeBase;
