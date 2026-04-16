import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify JWT and get user using anon key client with auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    // Service role client for admin operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin using the security definer function
    const { data: isAdminData, error: adminError } = await supabase
      .rpc('is_admin', { _user_id: user.id });

    if (adminError || !isAdminData) {
      console.error('Admin check error:', adminError);
      return new Response(JSON.stringify({ error: 'Accesso negato: solo gli amministratori possono approvare professionisti' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { professionalId, action, rejectionReason } = await req.json();

    console.log('[approve-professional] Request:', { 
      professionalId, 
      action, 
      hasRejectionReason: !!rejectionReason,
      adminUserId: user.id
    });

    if (!professionalId || !action || !['approve', 'reject'].includes(action)) {
      console.error('[approve-professional] Invalid parameters:', { professionalId, action });
      return new Response(JSON.stringify({ error: 'Parametri non validi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reject' && !rejectionReason) {
      return new Response(JSON.stringify({ error: 'Il motivo del rifiuto è obbligatorio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get professional profile
    const { data: professionalProfile, error: profileError } = await supabase
      .from('professional_profiles')
      .select('*, profiles!inner(username)')
      .eq('id', professionalId)
      .single();

    if (profileError || !professionalProfile) {
      console.error('Profile fetch error:', profileError);
      return new Response(JSON.stringify({ error: 'Profilo professionista non trovato' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updates: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (action === 'reject') {
      updates.rejection_reason = rejectionReason;
    }

    // Update professional profile status
    const { error: updateError } = await supabase
      .from('professional_profiles')
      .update(updates)
      .eq('id', professionalId);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Errore nell\'aggiornamento del profilo' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If approved, add professional role and update account_type
    if (action === 'approve') {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: professionalProfile.user_id, role: 'professional' });

      if (roleError) {
        console.error('Role assignment error:', roleError);
      }

      const { error: accountTypeError } = await supabase
        .from('profiles')
        .update({ account_type: 'professional' })
        .eq('id', professionalProfile.user_id);

      if (accountTypeError) {
        console.error('Account type update error:', accountTypeError);
      }

      // Send approval email notification
      try {
        const { data: authData } = await supabase.auth.admin.getUserById(professionalProfile.user_id);
        const professionalEmail = authData?.user?.email;

        if (professionalEmail) {
          await supabase.functions.invoke('send-email-notification', {
            body: {
              type: 'professional_approved',
              recipientEmail: professionalEmail,
              recipientName: professionalProfile.profiles?.username || 'Professionista',
            },
          });
          console.log('Approval email sent to:', professionalEmail);
        }
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
        // Don't fail the approval if email fails
      }
    }

    console.log(`[approve-professional] SUCCESS: Professional ${professionalId} ${action === 'approve' ? 'approved' : 'rejected'} by admin ${user.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: action === 'approve' ? 'Professionista approvato con successo' : 'Richiesta rifiutata'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[approve-professional] FATAL ERROR:', error);
    console.error('[approve-professional] Error stack:', error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});