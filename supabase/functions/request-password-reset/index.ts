import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getOTPEmailHTML(code: string): string {
  const digits = code.split('');
  const digitBoxes = digits.map(d => `
    <td style="width:48px;height:56px;text-align:center;vertical-align:middle;font-family:'Georgia',serif;font-size:28px;font-weight:bold;color:#f5e6a3;background:linear-gradient(135deg,rgba(139,92,246,0.3),rgba(30,15,60,0.8));border:2px solid #c9a84c;border-radius:10px;letter-spacing:0;padding:0;margin:0 4px;">
      ${d}
    </td>
  `).join('<td style="width:8px"></td>');

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0118;font-family:'Georgia','Times New Roman',serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(180deg,#0a0118 0%,#1a0a2e 50%,#0d0520 100%);">
<tr><td align="center" style="padding:40px 20px;">

<!-- Main card -->
<table role="presentation" cellpadding="0" cellspacing="0" width="480" style="max-width:480px;width:100%;background:linear-gradient(135deg,rgba(20,10,40,0.95),rgba(15,5,30,0.98));border:1px solid rgba(201,168,76,0.4);border-radius:20px;box-shadow:0 0 60px rgba(139,92,246,0.2),0 0 120px rgba(201,168,76,0.1);">

<!-- Header stars -->
<tr><td align="center" style="padding:30px 30px 10px;">
  <div style="font-size:32px;letter-spacing:8px;">✦ ✧ ★ ✧ ✦</div>
</td></tr>

<!-- Moon icon -->
<tr><td align="center" style="padding:10px;">
  <div style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#c9a84c,#f5e6a3);display:inline-block;line-height:70px;font-size:36px;box-shadow:0 0 30px rgba(201,168,76,0.5);">🌙</div>
</td></tr>

<!-- Title -->
<tr><td align="center" style="padding:15px 30px 5px;">
  <h1 style="margin:0;font-size:22px;font-weight:bold;color:#f5e6a3;font-family:'Georgia',serif;text-shadow:0 0 20px rgba(245,230,163,0.3);">Recupera la tua Password</h1>
</td></tr>

<tr><td align="center" style="padding:5px 30px 20px;">
  <p style="margin:0;font-size:14px;color:#b8a9d4;line-height:1.6;">Hai richiesto di reimpostare la tua password.<br/>Usa questo codice magico per proseguire:</p>
</td></tr>

<!-- Divider -->
<tr><td align="center" style="padding:0 40px;">
  <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.5),transparent);"></div>
</td></tr>

<!-- OTP Code -->
<tr><td align="center" style="padding:25px 20px;">
  <table role="presentation" cellpadding="0" cellspacing="0">
    <tr>${digitBoxes}</tr>
  </table>
</td></tr>

<!-- Divider -->
<tr><td align="center" style="padding:0 40px;">
  <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(201,168,76,0.5),transparent);"></div>
</td></tr>

<!-- Warning -->
<tr><td align="center" style="padding:20px 30px 10px;">
  <p style="margin:0;font-size:13px;color:#8b7fb8;line-height:1.5;">⏳ Questo codice scade tra <strong style="color:#f5e6a3;">15 minuti</strong></p>
  <p style="margin:5px 0 0;font-size:12px;color:#6b5f8a;line-height:1.5;">Se non hai richiesto tu il reset, ignora questa email.</p>
</td></tr>

<!-- Footer -->
<tr><td align="center" style="padding:20px 30px 30px;">
  <p style="margin:0;font-size:11px;color:#4a3f6b;">✨ Dream Alchemist — Interpreta i tuoi Sogni ✨</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string' || email.length > 255) {
      return new Response(
        JSON.stringify({ message: 'Se l\'email è registrata, riceverai un codice di verifica.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ message: 'Se l\'email è registrata, riceverai un codice di verifica.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Rate limiting: max 3 requests per email in 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentTokens } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .gte('created_at', fifteenMinutesAgo);

    if (recentTokens && recentTokens.length >= 3) {
      return new Response(
        JSON.stringify({ message: 'Se l\'email è registrata, riceverai un codice di verifica.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user
    const { data: userId } = await supabaseAdmin.rpc('find_user_by_email', {
      user_email: email.toLowerCase().trim()
    });

    if (!userId) {
      // Don't reveal if user exists
      return new Response(
        JSON.stringify({ message: 'Se l\'email è registrata, riceverai un codice di verifica.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invalidate previous tokens
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('email', email.toLowerCase().trim())
      .eq('used', false);

    // Generate OTP and hash it
    const otp = generateOTP();
    const hashedToken = await hashToken(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Save token
    const { error: insertError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({
        user_id: userId,
        email: email.toLowerCase().trim(),
        token: hashedToken,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('Error saving token:', insertError);
      throw new Error('Failed to save token');
    }

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Interpreta i tuoi Sogni <noreply@dreamalchemist.app>',
        to: [email.toLowerCase().trim()],
        subject: '🌙 Il tuo codice di recupero password',
        html: getOTPEmailHTML(otp),
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend error:', errorData);
      throw new Error('Failed to send email');
    }

    console.log('Password reset OTP sent successfully to:', email);

    return new Response(
      JSON.stringify({ message: 'Se l\'email è registrata, riceverai un codice di verifica.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in request-password-reset:', error);
    return new Response(
      JSON.stringify({ error: 'Si è verificato un errore. Riprova più tardi.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
