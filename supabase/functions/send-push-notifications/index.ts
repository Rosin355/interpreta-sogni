import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting send-push-notifications function');
    
    const WONDERPUSH_ACCESS_TOKEN = Deno.env.get('WONDERPUSH_ACCESS_TOKEN');
    const WONDERPUSH_APPLICATION_ID = Deno.env.get('WONDERPUSH_APPLICATION_ID');
    
    if (!WONDERPUSH_ACCESS_TOKEN || !WONDERPUSH_APPLICATION_ID) {
      throw new Error('WONDERPUSH credentials not configured');
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`Current time: ${currentHour}:${currentMinute}`);

    const { data: preferences, error: preferencesError } = await supabaseClient
      .from('notification_preferences')
      .select('user_id, preferred_time, last_notification_sent')
      .eq('enabled', true);

    if (preferencesError) {
      console.error('Error fetching preferences:', preferencesError);
      throw preferencesError;
    }

    console.log(`Found ${preferences?.length || 0} users with notifications enabled`);

    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to notify', count: 0 }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const usersToNotify = preferences.filter(pref => {
      const [prefHour, prefMinute] = pref.preferred_time.split(':').map(Number);
      
      const lastSent = pref.last_notification_sent ? new Date(pref.last_notification_sent) : null;
      const today = new Date().setHours(0, 0, 0, 0);
      const alreadySentToday = lastSent && lastSent.getTime() >= today;
      
      if (alreadySentToday) {
        console.log(`User ${pref.user_id} already received notification today`);
        return false;
      }
      
      const timeMatches = currentHour === prefHour;
      
      if (timeMatches) {
        console.log(`User ${pref.user_id} should receive notification (preferred: ${prefHour}:${prefMinute})`);
      }
      
      return timeMatches;
    });

    console.log(`${usersToNotify.length} users match notification criteria`);

    let notificationsSent = 0;
    
    for (const pref of usersToNotify) {
      try {
        const { data: devices, error: deviceError } = await supabaseClient
          .from('wonderpush_devices')
          .select('installation_id')
          .eq('user_id', pref.user_id);

        if (deviceError) {
          console.error(`Error fetching devices for user ${pref.user_id}:`, deviceError);
          continue;
        }

        if (!devices || devices.length === 0) {
          console.log(`No devices found for user ${pref.user_id}`);
          continue;
        }

        const notificationPayload = {
          targetInstallationIds: devices.map(d => d.installation_id),
          notification: {
            alert: {
              title: '🌙 Ricorda i tuoi Sogni',
              text: 'Buongiorno! Hai sognato qualcosa stanotte? Registra ora i tuoi sogni prima di dimenticarli!'
            },
            ios: {
              sound: 'default',
              badge: 'auto'
            },
            android: {
              sound: 'default',
              channelId: 'dream_reminders'
            }
          },
          targetUrl: '/dreams/new'
        };

        console.log(`Sending notification to ${devices.length} devices for user ${pref.user_id}`);

        const wpResponse = await fetch('https://management-api.wonderpush.com/v1/deliveries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WONDERPUSH_ACCESS_TOKEN}`,
            'X-WonderPush-Application': WONDERPUSH_APPLICATION_ID
          },
          body: JSON.stringify(notificationPayload)
        });

        if (!wpResponse.ok) {
          const errorText = await wpResponse.text();
          console.error(`WonderPush API error for user ${pref.user_id}:`, errorText);
          continue;
        }

        const wpResult = await wpResponse.json();
        console.log(`WonderPush delivery result:`, wpResult);
        
        const { error: updateError } = await supabaseClient
          .from('notification_preferences')
          .update({ last_notification_sent: now.toISOString() })
          .eq('user_id', pref.user_id);

        if (updateError) {
          console.error(`Error updating last_notification_sent for user ${pref.user_id}:`, updateError);
        } else {
          notificationsSent++;
        }
      } catch (error) {
        console.error(`Error processing user ${pref.user_id}:`, error);
      }
    }

    console.log(`Notifications sent: ${notificationsSent}`);

    return new Response(
      JSON.stringify({ 
        message: `Notifications processed successfully`,
        count: notificationsSent 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in send-push-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
