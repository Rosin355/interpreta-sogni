import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { logAuditEvent } from "@/utils/audit-logger";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminStatsCards from "@/components/admin/AdminStatsCards";
import AdminUsersList from "@/components/admin/AdminUsersList";
import AdminProfessionalApprovals from "@/components/admin/AdminProfessionalApprovals";
import AdminErrorsList from "@/components/admin/AdminErrorsList";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }

      const { data: isAdminData, error } = await supabase.rpc('is_admin', { _user_id: user.id });
      if (error || !isAdminData) {
        toast({ title: "Accesso negato", description: "Non hai i permessi per accedere a questa pagina", variant: "destructive" });
        navigate('/'); return;
      }

      setIsAdmin(true);
      await logAuditEvent({ action: 'admin_action', tableName: 'professional_profiles', details: { specificAction: 'accessed_admin_dashboard' } });
      setLoading(false);
    };
    checkAdmin();
  }, [navigate, toast]);

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

  if (!isAdmin) return null;

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background px-4" style={{ paddingTop: 'calc(7rem + var(--safe-area-inset-top, 0px))' }}>
        <div className="container max-w-6xl mx-auto py-12">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard Amministratore</h1>
              <p className="text-muted-foreground">Panoramica e gestione della piattaforma</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin/audio')} className="gap-2 shrink-0">
              <Music className="h-4 w-4" /> Gestione Audio
            </Button>
          </div>

          {/* Stats overview */}
          <div className="mb-8">
            <AdminStatsCards />
          </div>

          {/* Tabbed sections */}
          <Tabs defaultValue="professionals" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="professionals">Professionisti</TabsTrigger>
              <TabsTrigger value="users">Utenti</TabsTrigger>
              <TabsTrigger value="errors">Errori</TabsTrigger>
            </TabsList>

            <TabsContent value="professionals">
              <AdminProfessionalApprovals />
            </TabsContent>

            <TabsContent value="users">
              <AdminUsersList />
            </TabsContent>

            <TabsContent value="errors">
              <AdminErrorsList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
