import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, Music, Shield, TrendingUp, Moon } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalDreams: number;
  totalAudioTracks: number;
  totalProfessionals: number;
  pendingProfessionals: number;
  dreamsThisWeek: number;
}

const AdminStatsCards = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0, totalDreams: 0, totalAudioTracks: 0,
    totalProfessionals: 0, pendingProfessionals: 0, dreamsThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [users, dreams, dreamsWeek, audio, profsAll, profsPending] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('dreams').select('id', { count: 'exact', head: true }),
        supabase.from('dreams').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo.toISOString()),
        supabase.from('audio_tracks').select('id', { count: 'exact', head: true }),
        supabase.from('professional_profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('professional_profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        totalUsers: users.count ?? 0,
        totalDreams: dreams.count ?? 0,
        dreamsThisWeek: dreamsWeek.count ?? 0,
        totalAudioTracks: audio.count ?? 0,
        totalProfessionals: profsAll.count ?? 0,
        pendingProfessionals: profsPending.count ?? 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const cards = [
    { label: "Utenti totali", value: stats.totalUsers, icon: Users, color: "text-blue-400" },
    { label: "Sogni totali", value: stats.totalDreams, icon: Moon, color: "text-purple-400" },
    { label: "Sogni questa settimana", value: stats.dreamsThisWeek, icon: TrendingUp, color: "text-green-400" },
    { label: "Tracce audio", value: stats.totalAudioTracks, icon: Music, color: "text-amber-400" },
    { label: "Professionisti attivi", value: stats.totalProfessionals, icon: Shield, color: "text-cyan-400" },
    { label: "Richieste in attesa", value: stats.pendingProfessionals, icon: BookOpen, color: "text-red-400" },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <card.icon className={`h-8 w-8 ${card.color} shrink-0`} />
            <div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminStatsCards;
