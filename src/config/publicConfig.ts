const FALLBACK_APP_URL = "https://interpreta-sogni.lovable.app";
const FALLBACK_SUPABASE_URL = "https://zufsbpcgcvlcdtksrzhu.supabase.co";
const FALLBACK_SUPPORT_WHATSAPP_NUMBER = "393425855361";

const env = import.meta.env;

const appUrl = env.VITE_PUBLIC_APP_URL?.trim() || FALLBACK_APP_URL;
const supabaseUrl = env.VITE_SUPABASE_URL?.trim() || FALLBACK_SUPABASE_URL;
const supportWhatsappNumber =
  env.VITE_SUPPORT_WHATSAPP_NUMBER?.trim() || FALLBACK_SUPPORT_WHATSAPP_NUMBER;

export const publicConfig = {
  appUrl,
  supabaseFunctionsBaseUrl: `${supabaseUrl}/functions/v1`,
  supportWhatsappNumber,
} as const;

export const buildWhatsAppUrl = (message: string): string => {
  return `https://wa.me/${publicConfig.supportWhatsappNumber}?text=${message}`;
};
