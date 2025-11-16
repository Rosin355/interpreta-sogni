import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TransitNotification {
  userId: string;
  type: 'transit' | 'moon_phase' | 'dream_reminder';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current date and time
    const now = new Date();
    const currentHour = now.getHours();
    
    // Fetch all users with natal chart data and notification preferences
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, birth_date, birth_time, birth_timezone, natal_chart_data')
      .not('natal_chart_data', 'is', null);

    if (profilesError) throw profilesError;

    const { data: preferences, error: preferencesError } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('enabled', true);

    if (preferencesError) throw preferencesError;

    const notifications: TransitNotification[] = [];

    // Check for each user
    for (const profile of profiles || []) {
      const userPreference = preferences?.find(p => p.user_id === profile.id);
      if (!userPreference) continue;

      const preferredTime = userPreference.preferred_time;
      const [prefHour, prefMinute] = preferredTime.split(':').map(Number);

      // Check if it's time to send notification (within 1 hour window)
      if (Math.abs(currentHour - prefHour) <= 1) {
        // Calculate moon phase
        const moonPhase = calculateMoonPhase(now);
        
        // Check for significant transits based on natal chart
        const transits = checkSignificantTransits(profile.natal_chart_data, now);

        // Create notifications based on transits and moon phase
        if (transits.length > 0) {
          notifications.push({
            userId: profile.id,
            type: 'transit',
            title: '✨ Transito Astrologico Importante',
            message: `Oggi è un momento speciale: ${transits[0].description}. È il momento perfetto per registrare i tuoi sogni!`,
            priority: transits[0].priority
          });
        } else if (moonPhase.isSignificant) {
          notifications.push({
            userId: profile.id,
            type: 'moon_phase',
            title: `🌙 ${moonPhase.name}`,
            message: `Siamo in fase di ${moonPhase.name}. Questo è un momento propizio per l'introspezione e la registrazione dei sogni.`,
            priority: 'medium'
          });
        } else {
          // Regular dream reminder
          notifications.push({
            userId: profile.id,
            type: 'dream_reminder',
            title: '🌟 Ricorda i Tuoi Sogni',
            message: 'Buongiorno! Hai fatto sogni interessanti stanotte? Registrali prima che svaniscano.',
            priority: 'low'
          });
        }

        // Update last notification sent
        await supabaseClient
          .from('notification_preferences')
          .update({ last_notification_sent: now.toISOString() })
          .eq('user_id', profile.id);
      }
    }

    // Send push notifications
    for (const notification of notifications) {
      try {
        await supabaseClient.functions.invoke('send-push-notifications', {
          body: {
            userId: notification.userId,
            title: notification.title,
            body: notification.message,
            data: { type: notification.type, priority: notification.priority }
          }
        });
      } catch (error) {
        console.error(`Error sending notification to user ${notification.userId}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
        timestamp: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-astrological-transits:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function calculateMoonPhase(date: Date): { name: string; isSignificant: boolean } {
  // Simplified moon phase calculation
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Reference new moon: January 6, 2000
  const referenceDate = new Date(2000, 0, 6);
  const daysSinceReference = Math.floor((date.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  const lunarCycle = 29.53059; // days
  
  const phase = (daysSinceReference % lunarCycle) / lunarCycle;
  
  if (phase < 0.03 || phase > 0.97) {
    return { name: 'Luna Nuova', isSignificant: true };
  } else if (phase >= 0.47 && phase <= 0.53) {
    return { name: 'Luna Piena', isSignificant: true };
  } else if (phase >= 0.22 && phase <= 0.28) {
    return { name: 'Primo Quarto', isSignificant: false };
  } else if (phase >= 0.72 && phase <= 0.78) {
    return { name: 'Ultimo Quarto', isSignificant: false };
  } else if (phase < 0.5) {
    return { name: 'Luna Crescente', isSignificant: false };
  } else {
    return { name: 'Luna Calante', isSignificant: false };
  }
}

function checkSignificantTransits(natalChartData: any, currentDate: Date): Array<{ description: string; priority: 'low' | 'medium' | 'high' }> {
  const transits: Array<{ description: string; priority: 'low' | 'medium' | 'high' }> = [];
  
  if (!natalChartData?.planets) return transits;

  // Get current planetary positions (simplified - in production, use an ephemeris API)
  const currentDayOfYear = Math.floor((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const sunPosition = (currentDayOfYear * 360 / 365) % 360; // Approximate sun position

  // Find natal moon position
  const natalMoon = natalChartData.planets.find((p: any) => p.name === 'moon');
  const natalMercury = natalChartData.planets.find((p: any) => p.name === 'mercury');
  const natalNeptune = natalChartData.planets.find((p: any) => p.name === 'neptune');

  // Check for Sun conjunct natal Moon (emotional day, good for dream recall)
  if (natalMoon && Math.abs(sunPosition - natalMoon.position) < 10) {
    transits.push({
      description: 'Il Sole transita vicino alla tua Luna natale. Le emozioni sono amplificate e i sogni più vividi',
      priority: 'high'
    });
  }

  // Check for Sun conjunct natal Mercury (mental clarity, good for dream interpretation)
  if (natalMercury && Math.abs(sunPosition - natalMercury.position) < 10) {
    transits.push({
      description: 'Il Sole illumina il tuo Mercurio natale. La mente è chiara per interpretare i sogni',
      priority: 'medium'
    });
  }

  // Check for Sun conjunct natal Neptune (heightened intuition and dream activity)
  if (natalNeptune && Math.abs(sunPosition - natalNeptune.position) < 10) {
    transits.push({
      description: 'Il Sole attiva il tuo Nettuno natale. L\'intuizione e l\'attività onirica sono al massimo',
      priority: 'high'
    });
  }

  return transits;
}
