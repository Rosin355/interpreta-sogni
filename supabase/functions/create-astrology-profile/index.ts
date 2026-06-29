// Create Astrology Profile — mobile-safe natal chart creation (Phase 2).
//
// Accepts birth data from the authenticated mobile app, supports three birth-time
// states (exact / approximate / unknown), computes + caches the natal chart, and
// records precision metadata on public.profiles. iOS never calls the Astrologer
// API directly — this server-side function orchestrates it.
//
// Chart computation is DELEGATED to the existing `calculate-natal-chart` function
// (the proven Astrologer v5 integration) — no provider logic is duplicated here.
// For unknown birth time we use 12:00 local ONLY as a technical fallback for the
// provider, then store birth_time = NULL so noon is never presented as real.
//
// Privacy: birth date/time/place/coordinates, provider payloads, JWTs, secrets,
// and natal_chart_data are NEVER logged. Logs carry only userIdPrefix + flags.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const prefix = (id: string) => (id ?? "").slice(0, 8);

// Technical fallback time for unknown birth time — provider-only, never stored
// as a real birth_time, never surfaced to the user as a real value.
const NOON_FALLBACK = "12:00";

const BodySchema = z.object({
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "birth_date must be YYYY-MM-DD"),
  birth_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  birth_time_accuracy: z.enum(["exact", "approximate", "unknown"]),
  birth_place_name: z.string().trim().min(1).max(200),
  birth_latitude: z.number().min(-90).max(90),
  birth_longitude: z.number().min(-180).max(180),
  birth_timezone: z.string().trim().min(1).max(64),
}).superRefine((v, ctx) => {
  // exact/approximate require a real time; unknown may omit it.
  if (v.birth_time_accuracy !== "unknown" && !v.birth_time) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["birth_time"],
      message: "birth_time is required when birth_time_accuracy is exact or approximate",
    });
  }
});

// accuracy → precision / source / notes (notes are short Italian strings).
function precisionFor(accuracy: "exact" | "approximate" | "unknown") {
  switch (accuracy) {
    case "exact":
      return { precision: "complete", source: "user", notes: [] as string[] };
    case "approximate":
      return {
        precision: "approximate",
        source: "user",
        notes: ["Ora di nascita approssimativa: ascendente e case sono indicativi."],
      };
    case "unknown":
      return {
        precision: "symbolic",
        source: "estimated_noon",
        notes: [
          "Ora di nascita sconosciuta: ascendente e case non sono affidabili.",
          "La Luna potrebbe essere approssimativa se quel giorno ha cambiato segno.",
        ],
      };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorizzato" }, 401);

    // Validate JWT → resolve user (never trust a client-sent id).
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return json({ error: "Non autorizzato" }, 401);

    let raw: unknown;
    try { raw = await req.json(); } catch { return json({ error: "JSON non valido" }, 400); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "Dati non validi", details: parsed.error.flatten() }, 400);
    }
    const b = parsed.data;
    const accuracy = b.birth_time_accuracy;
    const { precision, source, notes } = precisionFor(accuracy);

    // Time sent to the provider: real time, or noon fallback for unknown.
    const providerTime = accuracy === "unknown" ? NOON_FALLBACK : (b.birth_time as string);

    console.log(
      `[create-astrology-profile] start userIdPrefix=${prefix(user.id)} accuracy=${accuracy} precision=${precision}`,
    );

    const admin = createClient(supabaseUrl, serviceKey);

    // 1) Delegate chart computation to the existing, proven calculate-natal-chart
    //    (Astrologer v5). Forward the user's JWT (that function uses verify_jwt).
    let chartAvailable = false;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/calculate-natal-chart`, {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "apikey": anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          birthDate: b.birth_date,
          birthTime: providerTime,
          birthPlace: {
            latitude: b.birth_latitude,
            longitude: b.birth_longitude,
            placeName: b.birth_place_name,
            timezone: b.birth_timezone,
          },
        }),
      });
      // Parse status only; never log the provider/chart payload.
      let ok = res.ok;
      try {
        const data = await res.json();
        ok = ok && data?.success !== false && !data?.errorCode;
      } catch { /* tolerate non-JSON */ }
      chartAvailable = ok;
      if (!ok) {
        console.warn(
          `[create-astrology-profile] chart delegate not-ok userIdPrefix=${prefix(user.id)} httpStatus=${res.status}`,
        );
      }
    } catch {
      console.warn(`[create-astrology-profile] chart delegate failed userIdPrefix=${prefix(user.id)}`);
    }

    // 2) Persist precision metadata (and ensure birth fields reflect the user's
    //    real input). For unknown time, store birth_time = NULL so the noon
    //    fallback is never presented as a real birth time.
    const update: Record<string, unknown> = {
      birth_date: b.birth_date,
      birth_time: accuracy === "unknown" ? null : b.birth_time,
      birth_place_name: b.birth_place_name,
      birth_latitude: b.birth_latitude,
      birth_longitude: b.birth_longitude,
      birth_timezone: b.birth_timezone,
      birth_time_accuracy: accuracy,
      natal_chart_precision: precision,
      birth_time_source: source,
      natal_chart_notes: notes,
      updated_at: new Date().toISOString(),
    };
    const { error: updErr } = await admin
      .from("profiles")
      .update(update)
      .eq("id", user.id);
    if (updErr) {
      console.error(`[create-astrology-profile] profile update error code=${updErr.code ?? "unknown"}`);
      return json({ error: "Errore salvataggio profilo" }, 500);
    }

    console.log(
      `[create-astrology-profile] done userIdPrefix=${prefix(user.id)} accuracy=${accuracy} precision=${precision} natalChartAvailable=${chartAvailable}`,
    );

    // 3) Safe summary — no raw provider payload, no chart JSON.
    return json({
      saved: true,
      profile_complete: accuracy !== "unknown", // complete needs a real time
      birth_time_accuracy: accuracy,
      natal_chart: {
        available: chartAvailable,
        precision,
        ascendant_reliable: accuracy === "exact",
        houses_reliable: accuracy === "exact",
        notes,
      },
      message: chartAvailable
        ? "Profilo astrologico salvato e tema natale calcolato."
        : "Profilo salvato. Il tema natale non è disponibile ora: riprova più tardi.",
    }, chartAvailable ? 200 : 202);
  } catch (e) {
    console.error(
      `[create-astrology-profile] unhandled: ${String((e as Error)?.message ?? e).slice(0, 100)}`,
    );
    return json({ error: "Errore interno" }, 500);
  }
});
