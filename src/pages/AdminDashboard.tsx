import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, Clock, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { logAuditEvent } from "@/utils/audit-logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfessionalProfile {
  id: string;
  user_id: string;
  specialization: string;
  license_number: string | null;
  years_of_experience: number | null;
  bio: string | null;
  status: string;
  created_at: string;
  profiles: {
    username: string | null;
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user is admin
      const { data: isAdminData, error: adminError } = await supabase
        .rpc('is_admin', { _user_id: user.id });

      if (adminError || !isAdminData) {
        toast({
          title: "Accesso negato",
          description: "Non hai i permessi per accedere a questa pagina",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      
      // Log admin dashboard access
      await logAuditEvent({
        action: 'admin_action',
        tableName: 'professional_profiles',
        details: { specificAction: 'accessed_admin_dashboard' }
      });
      
      await fetchProfessionals();
      setLoading(false);
    };

    checkAdminAndFetch();
  }, [navigate, toast]);

  const fetchProfessionals = async () => {
    const { data, error } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching professionals:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i professionisti",
        variant: "destructive",
      });
      return;
    }

    // Fetch usernames separately
    const professionalsWithUsernames = await Promise.all(
      (data || []).map(async (prof) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', prof.user_id)
          .single();
        
        return {
          ...prof,
          profiles: { username: profileData?.username || null }
        };
      })
    );

    setProfessionals(professionalsWithUsernames);
  };

  const handleApprove = async (professionalId: string) => {
    setProcessing(true);
    try {
      // Find the professional to get their user_id for audit
      const professional = professionals.find(p => p.id === professionalId);
      
      const { error } = await supabase.functions.invoke('approve-professional', {
        body: { professionalId, action: 'approve' }
      });

      if (error) throw error;

      // Log the approval action
      await logAuditEvent({
        action: 'admin_action',
        tableName: 'professional_profiles',
        recordId: professionalId,
        targetUserId: professional?.user_id,
        details: { specificAction: 'approved_professional' }
      });

      toast({
        title: "Successo",
        description: "Professionista approvato con successo",
      });

      await fetchProfessionals();
    } catch (error: any) {
      console.error('Error approving professional:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile approvare il professionista",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProfessional || !rejectionReason.trim()) {
      toast({
        title: "Errore",
        description: "Il motivo del rifiuto è obbligatorio",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      // Find the professional to get their user_id for audit
      const professional = professionals.find(p => p.id === selectedProfessional);
      
      const { error } = await supabase.functions.invoke('approve-professional', {
        body: { 
          professionalId: selectedProfessional, 
          action: 'reject',
          rejectionReason: rejectionReason.trim()
        }
      });

      if (error) throw error;

      // Log the rejection action
      await logAuditEvent({
        action: 'admin_action',
        tableName: 'professional_profiles',
        recordId: selectedProfessional,
        targetUserId: professional?.user_id,
        details: { 
          specificAction: 'rejected_professional',
          rejectionReason: rejectionReason.trim()
        }
      });

      toast({
        title: "Successo",
        description: "Richiesta rifiutata",
      });

      setShowRejectDialog(false);
      setSelectedProfessional(null);
      setRejectionReason("");
      await fetchProfessionals();
    } catch (error: any) {
      console.error('Error rejecting professional:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile rifiutare la richiesta",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openRejectDialog = (professionalId: string) => {
    setSelectedProfessional(professionalId);
    setShowRejectDialog(true);
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-background flex items-center justify-center" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background px-4" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
        <div className="container max-w-6xl mx-auto py-12">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard Amministratore</h1>
              <p className="text-muted-foreground">
                Gestisci le richieste di registrazione dei professionisti
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin/audio')} className="gap-2 shrink-0">
              <Music className="h-4 w-4" />
              Gestione Audio
            </Button>
          </div>

          {professionals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nessuna richiesta in attesa</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {professionals.map((professional) => (
                <Card key={professional.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{professional.profiles.username || 'Utente senza nome'}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {new Date(professional.created_at).toLocaleDateString('it-IT')}
                      </span>
                    </CardTitle>
                    <CardDescription>{professional.specialization}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      {professional.license_number && (
                        <div>
                          <span className="font-semibold">Numero Albo:</span> {professional.license_number}
                        </div>
                      )}
                      {professional.years_of_experience && (
                        <div>
                          <span className="font-semibold">Anni di Esperienza:</span> {professional.years_of_experience}
                        </div>
                      )}
                      {professional.bio && (
                        <div>
                          <span className="font-semibold">Biografia:</span>
                          <p className="text-muted-foreground mt-1">{professional.bio}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => handleApprove(professional.id)}
                        disabled={processing}
                        className="flex-1"
                      >
                        {processing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Approva
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => openRejectDialog(professional.id)}
                        disabled={processing}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rifiuta
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rifiuta Richiesta</AlertDialogTitle>
            <AlertDialogDescription>
              Inserisci il motivo del rifiuto. Questo messaggio sarà visibile al professionista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Motivo del rifiuto..."
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowRejectDialog(false);
              setSelectedProfessional(null);
              setRejectionReason("");
            }}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Conferma Rifiuto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminDashboard;