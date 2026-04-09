import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/utils/audit-logger";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
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
  profiles: { username: string | null };
}

const AdminProfessionalApprovals = () => {
  const { toast } = useToast();
  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchProfessionals(); }, []);

  const fetchProfessionals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('professional_profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    const withUsernames = await Promise.all(
      (data || []).map(async (prof) => {
        const { data: profileData } = await supabase
          .from('profiles').select('username').eq('id', prof.user_id).single();
        return { ...prof, profiles: { username: profileData?.username || null } };
      })
    );
    setProfessionals(withUsernames);
    setLoading(false);
  };

  const handleApprove = async (professionalId: string) => {
    setProcessing(true);
    try {
      const professional = professionals.find(p => p.id === professionalId);
      const { error } = await supabase.functions.invoke('approve-professional', {
        body: { professionalId, action: 'approve' }
      });
      if (error) throw error;
      await logAuditEvent({
        action: 'admin_action', tableName: 'professional_profiles',
        recordId: professionalId, targetUserId: professional?.user_id,
        details: { specificAction: 'approved_professional' }
      });
      toast({ title: "Professionista approvato con successo" });
      await fetchProfessionals();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally { setProcessing(false); }
  };

  const handleReject = async () => {
    if (!selectedProfessional || !rejectionReason.trim()) return;
    setProcessing(true);
    try {
      const professional = professionals.find(p => p.id === selectedProfessional);
      const { error } = await supabase.functions.invoke('approve-professional', {
        body: { professionalId: selectedProfessional, action: 'reject', rejectionReason: rejectionReason.trim() }
      });
      if (error) throw error;
      await logAuditEvent({
        action: 'admin_action', tableName: 'professional_profiles',
        recordId: selectedProfessional, targetUserId: professional?.user_id,
        details: { specificAction: 'rejected_professional', rejectionReason: rejectionReason.trim() }
      });
      toast({ title: "Richiesta rifiutata" });
      setShowRejectDialog(false); setSelectedProfessional(null); setRejectionReason("");
      await fetchProfessionals();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally { setProcessing(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (professionals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessuna richiesta in attesa</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
                  <div><span className="font-semibold">Numero Albo:</span> {professional.license_number}</div>
                )}
                {professional.years_of_experience && (
                  <div><span className="font-semibold">Anni di Esperienza:</span> {professional.years_of_experience}</div>
                )}
                {professional.bio && (
                  <div><span className="font-semibold">Biografia:</span><p className="text-muted-foreground mt-1">{professional.bio}</p></div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => handleApprove(professional.id)} disabled={processing} className="flex-1">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Approva
                </Button>
                <Button variant="destructive" onClick={() => { setSelectedProfessional(professional.id); setShowRejectDialog(true); }} disabled={processing} className="flex-1">
                  <XCircle className="h-4 w-4 mr-2" /> Rifiuta
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rifiuta Richiesta</AlertDialogTitle>
            <AlertDialogDescription>Inserisci il motivo del rifiuto.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Motivo del rifiuto..." className="min-h-[100px]" />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowRejectDialog(false); setSelectedProfessional(null); setRejectionReason(""); }}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={!rejectionReason.trim() || processing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Conferma Rifiuto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminProfessionalApprovals;
