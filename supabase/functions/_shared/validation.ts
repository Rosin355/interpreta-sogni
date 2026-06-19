/**
 * Input validation utilities using Zod
 */
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// UUID validation
export const uuidSchema = z.string().uuid({ message: 'ID non valido' });

// Text validation with sanitization
export const sanitizeText = (text: string, maxLength: number): string => {
  // Remove control characters and normalize whitespace
  let sanitized = text
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control chars
    .replace(/\s+/g, ' ')                  // Normalize whitespace
    .trim();

  // Truncate if needed
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

// Schemas for edge function inputs

// interpret-dream accepts BOTH the iOS snake_case `dream_id` and the web
// camelCase `dreamId`. Both are optional at the schema level so the function can
// normalize after parsing and return a clear `missing_dream_id` instead of a
// confusing "dreamId Required" error. `style` / `locale` are accepted (iOS sends
// them) but currently advisory — they do not change behavior yet.
export const interpretDreamSchema = z.object({
  dream_id: uuidSchema.optional(),
  dreamId: uuidSchema.optional(),
  style: z.string().max(64).optional(),
  locale: z.string().max(16).optional(),
});

export const generateDreamImageSchema = z.object({
  dreamId: uuidSchema,
  content: z.string().min(1).max(10000),
  mood: z.string().nullable().optional().transform(val => val === '' || val === null ? undefined : val),
  imageStyle: z.enum(['realistico', 'onirico', 'artistico', 'minimalista', 'fantastico'])
    .optional()
    .or(z.literal('').transform(() => undefined)),
  autoStyle: z.boolean().optional(),
  customPrompt: z.string()
    .max(500, 'Il prompt personalizzato deve essere massimo 500 caratteri')
    .optional()
    .transform(val => val && val.trim() !== '' ? sanitizeText(val, 500) : undefined),
});

export const suggestTagsSchema = z.object({
  content: z.string()
    .min(20, 'Il contenuto deve essere di almeno 20 caratteri')
    .max(5000, 'Il contenuto deve essere massimo 5000 caratteri')
    .transform(val => sanitizeText(val, 5000)),
});

export const textToSpeechSchema = z.object({
  text: z.string()
    .min(1, 'Il testo non può essere vuoto')
    .max(500, 'Il testo deve essere massimo 500 caratteri')
    .transform(val => sanitizeText(val, 500)),
  voiceId: z.string().optional(),
});

export const speechToTextSchema = z.object({
  audio: z.string()
    .min(1, 'Audio mancante')
    .refine(
      (val) => {
        // Validate base64 and estimated size (rough check)
        const estimatedBytes = (val.length * 3) / 4;
        return estimatedBytes <= 10 * 1024 * 1024; // 10MB max
      },
      { message: 'File audio troppo grande (max 10MB)' }
    ),
});

export const shareDreamSchema = z.object({
  dreamId: uuidSchema,
  professionalId: uuidSchema,
  message: z.string()
    .max(500, 'Messaggio troppo lungo (max 500 caratteri)')
    .optional()
    .transform(val => val ? sanitizeText(val, 500) : undefined),
});

export const commentSchema = z.object({
  dreamId: uuidSchema,
  content: z.string()
    .min(10, 'Il commento deve essere di almeno 10 caratteri')
    .max(2000, 'Il commento deve essere massimo 2000 caratteri')
    .transform(val => sanitizeText(val, 2000)),
});
