import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_dream_date: string | null;
}

export const useStreak = () => {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setStreak(data || { current_streak: 0, longest_streak: 0, last_dream_date: null });
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreak();
  }, []);

  const getStreakBadge = (streakCount: number) => {
    if (streakCount >= 100) return { emoji: "🏆", label: "Leggenda", color: "text-yellow-500" };
    if (streakCount >= 50) return { emoji: "🔥", label: "Maestro", color: "text-orange-500" };
    if (streakCount >= 30) return { emoji: "⭐", label: "Esperto", color: "text-blue-500" };
    if (streakCount >= 14) return { emoji: "💎", label: "Veterano", color: "text-purple-500" };
    if (streakCount >= 7) return { emoji: "🌟", label: "Costante", color: "text-green-500" };
    if (streakCount >= 3) return { emoji: "✨", label: "Impegnato", color: "text-cyan-500" };
    return { emoji: "🌱", label: "Iniziato", color: "text-gray-500" };
  };

  return { streak, loading, fetchStreak, getStreakBadge };
};
