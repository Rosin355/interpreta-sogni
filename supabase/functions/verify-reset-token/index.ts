import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, newPassword } = await req.json();

    // Validate inputs
    if (!email || !code || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Tutti i campi sono obbligatori.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: 'Il codice deve essere di 6 cifre.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'La password deve contenere almeno 8 caratteri.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return new Response(
        JSON.stringify({ error: 'La password deve contenere almeno una maiuscola e un numero.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const normalizedEmail = email.toLowerCase().trim();

    // Find the latest unused, non-expired token for this email
    const { data: tokens, error: fetchError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Codice non valido o scaduto. Richiedi un nuovo codice.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenRecord = tokens[0];

    // Check max attempts
    if (tokenRecord.attempts >= 5) {
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('id', tokenRecord.id);

      return new Response(
        JSON.stringify({ error: 'Troppi tentativi. Richiedi un nuovo codice.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment attempts
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ attempts: tokenRecord.attempts + 1 })
      .eq('id', tokenRecord.id);

    // Verify hash
    const hashedInput = await hashToken(code);
    if (hashedInput !== tokenRecord.token) {
      const remainingAttempts = 4 - tokenRecord.attempts;
      return new Response(
        JSON.stringify({ 
          error: `Codice errato. ${remainingAttempts > 0 ? `Hai ancora ${remainingAttempts} tentativ${remainingAttempts === 1 ? 'o' : 'i'}.` : 'Richiedi un nuovo codice.'}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Code is valid! Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenRecord.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return new Response(
        JSON.stringify({ error: 'Errore durante l\'aggiornamento della password.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark token as used
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenRecord.id);

    console.log('Password reset successful for:', normalizedEmail);

    return new Response(
      JSON.stringify({ message: 'Password aggiornata con successo!' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-reset-token:', error);
    return new Response(
      JSON.stringify({ error: 'Si è verificato un errore. Riprova più tardi.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
