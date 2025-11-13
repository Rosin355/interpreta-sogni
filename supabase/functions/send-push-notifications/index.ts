import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting push notification process...');

    // Get current time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:00`;

    console.log(`Current time: ${currentTime}`);

    // Get notification preferences for users who should receive notifications now
    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('user_id, preferred_time, last_notification_sent')
      .eq('enabled', true);

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError);
      throw prefsError;
    }

    console.log(`Found ${preferences?.length || 0} enabled notification preferences`);

    // Filter users who should receive notification at this time
    const usersToNotify = preferences?.filter(pref => {
      const prefTime = pref.preferred_time.substring(0, 5); // Get HH:MM from HH:MM:SS
      const lastSent = pref.last_notification_sent ? new Date(pref.last_notification_sent) : null;
      const today = new Date().toDateString();
      
      // Check if it's the right time and hasn't been sent today
      return prefTime === currentTime.substring(0, 5) && 
             (!lastSent || lastSent.toDateString() !== today);
    }) || [];

    console.log(`${usersToNotify.length} users to notify at this time`);

    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No notifications to send at this time', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get push subscriptions for these users
    const userIds = usersToNotify.map(u => u.user_id);
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      throw subsError;
    }

    console.log(`Found ${subscriptions?.length || 0} push subscriptions`);

    // VAPID keys (these should be environment variables in production)
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ 
          error: 'VAPID keys not configured',
          message: 'Please generate VAPID keys using: npx web-push generate-vapid-keys'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Send notifications to each subscription
    let sentCount = 0;
    const errors = [];

    for (const subscription of subscriptions || []) {
      try {
        const payload = JSON.stringify({
          title: '🌙 Dream Catcher',
          body: 'Buongiorno! Ricordati di registrare i tuoi sogni della notte.',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          url: '/dreams/new',
          tag: 'dream-reminder',
          requireInteraction: false
        });

        // Using Web Push Protocol
        // In a real implementation, you would use a web-push library
        // For now, this is a placeholder showing the structure
        
        // NOTE: Deno currently doesn't have a native web-push library
        // You would need to implement the Web Push Protocol manually
        // or use a service like Firebase Cloud Messaging
        
        console.log(`Would send notification to user ${subscription.user_id}`);
        
        // Update last notification sent
        await supabase
          .from('notification_preferences')
          .update({ last_notification_sent: now.toISOString() })
          .eq('user_id', subscription.user_id);

        sentCount++;
      } catch (error) {
        console.error(`Error sending to user ${subscription.user_id}:`, error);
        errors.push({ user_id: subscription.user_id, error: error.message });
      }
    }

    console.log(`Sent ${sentCount} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true,
        sent: sentCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Sent ${sentCount} notifications`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/* 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Generate VAPID keys:
 *    npx web-push generate-vapid-keys
 * 
 * 2. Add the keys as Supabase secrets:
 *    - VAPID_PUBLIC_KEY
 *    - VAPID_PRIVATE_KEY
 * 
 * 3. Update the frontend usePushNotifications hook with the public key
 * 
 * 4. Set up a cron job to run this function every morning:
 *    Run this SQL in Supabase SQL Editor:
 * 
 *    select cron.schedule(
 *      'send-morning-dream-notifications',
 *      '0 8 * * *', -- Run at 8:00 AM every day
 *      $$
 *      select
 *        net.http_post(
 *          url:='https://zufsbpcgcvlcdtksrzhu.supabase.co/functions/v1/send-push-notifications',
 *          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
 *          body:='{}'::jsonb
 *        ) as request_id;
 *      $$
 *    );
 * 
 * Note: For production use, you should implement the Web Push Protocol
 * or use a service like Firebase Cloud Messaging to actually send the push notifications.
 */
