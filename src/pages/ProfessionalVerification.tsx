import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import Navigation from "@/components/Navigation";

const ProfessionalVerification = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('professional_profiles')
        .select('status, rejection_reason')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching professional status:', error);
        setLoading(false);
        return;
      }

      setStatus(data.status as 'pending' | 'approved' | 'rejected');
      setRejectionReason(data.rejection_reason);
      setLoading(false);
    };

    checkStatus();
  }, [navigate]);

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

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background px-4" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
        <div className="container max-w-2xl mx-auto py-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Verifica Professionista</CardTitle>
              <CardDescription>
                Stato della tua richiesta di registrazione come professionista
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {status === 'pending' && (
                <div className="flex flex-col items-center text-center space-y-4">
                  <Clock className="h-16 w-16 text-yellow-500" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Richiesta in Attesa</h3>
                    <p className="text-muted-foreground">
                      La tua richiesta di registrazione come professionista è in fase di revisione. 
                      Riceverai una notifica via email quando verrà approvata o rifiutata.
                    </p>
                  </div>
                </div>
              )}

              {status === 'approved' && (
                <div className="flex flex-col items-center text-center space-y-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Richiesta Approvata!</h3>
                    <p className="text-muted-foreground mb-4">
                      Congratulazioni! La tua richiesta è stata approvata. Ora puoi accedere 
                      a tutte le funzionalità riservate ai professionisti.
                    </p>
                    <Button onClick={() => navigate('/dashboard')}>
                      Vai alla Dashboard
                    </Button>
                  </div>
                </div>
              )}

              {status === 'rejected' && (
                <div className="flex flex-col items-center text-center space-y-4">
                  <XCircle className="h-16 w-16 text-red-500" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Richiesta Rifiutata</h3>
                    <p className="text-muted-foreground mb-4">
                      Ci dispiace, ma la tua richiesta è stata rifiutata.
                    </p>
                    {rejectionReason && (
                      <div className="bg-muted p-4 rounded-lg text-left">
                        <p className="font-semibold mb-1">Motivo:</p>
                        <p className="text-sm">{rejectionReason}</p>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/')}
                      className="mt-4"
                    >
                      Torna alla Home
                    </Button>
                  </div>
                </div>
              )}

              {!status && (
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Non hai ancora inviato una richiesta di registrazione come professionista.
                  </p>
                  <Button onClick={() => navigate('/auth?mode=professional')} className="mt-4">
                    Registrati come Professionista
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ProfessionalVerification;