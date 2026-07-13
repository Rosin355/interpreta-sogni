import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'PASSWORD_POLICY_VIOLATION'
  | 'TOKEN_INVALID_OR_EXPIRED'
  | 'TOKEN_ATTEMPTS_EXCEEDED'
  | 'TOKEN_MISMATCH'
  | 'PASSWORD_REUSED'
  | 'UPDATE_FAILED';

const STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  PASSWORD_POLICY_VIOLATION: 400,
  TOKEN_INVALID_OR_EXPIRED: 400,
  TOKEN_ATTEMPTS_EXCEEDED: 400,
  TOKEN_MISMATCH: 400,
  PASSWORD_REUSED: 400,
  UPDATE_FAILED: 500,
};

function errorResponse(code: ErrorCode, message: string) {
  return new Response(
    JSON.stringify({ success: false, code, message }),
    {
      status: STATUS_MAP[code],
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

function successResponse(extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ success: true, ...extra }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPasswordReused(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('should be different') ||
    m.includes('different from the old') ||
    m.includes('same_password') ||
    m.includes('same as the old') ||
    m.includes('new password should be different')
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return errorResponse('VALIDATION_ERROR', 'Corpo della richiesta non valido.');
    }

    const email = typeof body.email === 'string' ? body.email : '';
    const code = typeof body.code === 'string' ? body.code : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : undefined;
    const mode = body.mode === 'verify' || body.mode === 'reset' ? body.mode : 'reset';

    if (body.mode !== undefined && body.mode !== 'verify' && body.mode !== 'reset') {
      return errorResponse('VALIDATION_ERROR', 'Modalità non valida.');
    }

    if (!email || !EMAIL_REGEX.test(email) || email.length > 255) {
      return errorResponse('VALIDATION_ERROR', 'Email non valida.');
    }

    if (!/^\d{6}$/.test(code)) {
      return errorResponse('VALIDATION_ERROR', 'Il codice deve essere di 6 cifre.');
    }

    if (mode === 'reset') {
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
        return errorResponse(
          'PASSWORD_POLICY_VIOLATION',
          'La password deve contenere almeno 8 caratteri.',
        );
      }
      if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return errorResponse(
          'PASSWORD_POLICY_VIOLATION',
          'La password deve contenere almeno una maiuscola e un numero.',
        );
      }
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const normalizedEmail = email.toLowerCase().trim();

    const { data: tokens, error: fetchError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !tokens || tokens.length === 0) {
      return errorResponse(
        'TOKEN_INVALID_OR_EXPIRED',
        'Codice non valido o scaduto. Richiedi un nuovo codice.',
      );
    }

    const tokenRecord = tokens[0];

    if ((tokenRecord.attempts ?? 0) >= 5) {
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('id', tokenRecord.id);
      return errorResponse(
        'TOKEN_ATTEMPTS_EXCEEDED',
        'Troppi tentativi. Richiedi un nuovo codice.',
      );
    }

    const hashedInput = await hashToken(code);
    if (hashedInput !== tokenRecord.token) {
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ attempts: (tokenRecord.attempts ?? 0) + 1 })
        .eq('id', tokenRecord.id);
      return errorResponse('TOKEN_MISMATCH', 'Codice errato.');
    }

    if (mode === 'verify') {
      return successResponse();
    }

    // mode === 'reset'
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenRecord.user_id,
      { password: newPassword! },
    );

    if (updateError) {
      if (isPasswordReused(updateError.message)) {
        return errorResponse(
          'PASSWORD_REUSED',
          'La nuova password non può essere uguale alla precedente.',
        );
      }
      console.error('Error updating password:', updateError);
      return errorResponse(
        'UPDATE_FAILED',
        'Errore durante l\'aggiornamento della password.',
      );
    }

    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenRecord.id);

    console.log('Password reset successful for:', normalizedEmail);
    return successResponse();
  } catch (error) {
    console.error('Error in verify-reset-token:', error);
    return errorResponse('UPDATE_FAILED', 'Si è verificato un errore. Riprova più tardi.');
  }
});
