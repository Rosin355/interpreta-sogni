/**
 * AI Provider Adapter
 *
 * Lovable is always the default. Claude/OpenAI can only be activated
 * server-side for specific tester user IDs via env vars — never exposed
 * to the mobile client or web app.
 *
 * Security constraints:
 * - Provider API keys are only read from Deno.env (server-side only)
 * - Mobile clients never receive or send provider credentials
 * - Missing/invalid tester config falls back silently to Lovable
 * - Provider errors fall back to Lovable instead of surfacing raw errors
 */

export type AIProvider = "lovable" | "anthropic" | "openai";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionOptions {
  messages: AIMessage[];
  maxTokens?: number;
  /** Lovable model string, e.g. "google/gemini-2.5-flash". Ignored for non-Lovable providers. */
  lovableModel?: string;
  /** Anthropic model, e.g. "claude-haiku-4-5-20251001". Ignored unless provider == anthropic. */
  anthropicModel?: string;
  /** OpenAI model, e.g. "gpt-4o-mini". Ignored unless provider == openai. */
  openaiModel?: string;
}

export interface AICompletionResult {
  content: string;
  provider: AIProvider;
  /** True if the primary tester provider failed and we fell back to Lovable. */
  usedFallback: boolean;
}

// ── Provider resolution ──────────────────────────────────────────────────────

/**
 * Returns the active AI provider for a given user.
 * Only returns a non-Lovable provider if ALL of:
 *   1. AI_PROVIDER_TEST_OVERRIDE env var is set to "anthropic" or "openai"
 *   2. AI_PROVIDER_TEST_USER_IDS env var contains the userId
 *   3. The relevant API key env var is present
 */
export function getActiveProvider(userId: string): AIProvider {
  try {
    const override = Deno.env.get("AI_PROVIDER_TEST_OVERRIDE")?.trim().toLowerCase();
    if (!override || (override !== "anthropic" && override !== "openai")) {
      return "lovable";
    }

    const testerIds = Deno.env.get("AI_PROVIDER_TEST_USER_IDS") ?? "";
    const ids = testerIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!ids.includes(userId)) {
      return "lovable";
    }

    // Verify the key is present before committing to the override
    const keyPresent =
      override === "anthropic"
        ? Boolean(Deno.env.get("ANTHROPIC_API_KEY"))
        : Boolean(Deno.env.get("OPENAI_API_KEY"));

    if (!keyPresent) {
      console.warn(
        `[ai-provider] ${override} override requested for tester ${userId} but key is missing — falling back to lovable`
      );
      return "lovable";
    }

    return override;
  } catch (e) {
    console.warn("[ai-provider] getActiveProvider error, defaulting to lovable", e);
    return "lovable";
  }
}

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Creates an AI completion, routing to the appropriate provider.
 * Always fails open: if the tester provider errors, retries via Lovable.
 */
export async function createAICompletion(
  userId: string,
  options: AICompletionOptions
): Promise<AICompletionResult> {
  const provider = getActiveProvider(userId);

  if (provider === "lovable") {
    const content = await callLovable(options);
    return { content, provider: "lovable", usedFallback: false };
  }

  // Tester path — try the override provider, fall back to Lovable on error
  try {
    if (provider === "anthropic") {
      const content = await callAnthropic(options);
      return { content, provider: "anthropic", usedFallback: false };
    }
    if (provider === "openai") {
      const content = await callOpenAI(options);
      return { content, provider: "openai", usedFallback: false };
    }
  } catch (e) {
    console.warn(
      `[ai-provider] ${provider} failed for tester ${userId}, falling back to lovable:`,
      e
    );
  }

  const content = await callLovable(options);
  return { content, provider: "lovable", usedFallback: true };
}

// ── Provider implementations ─────────────────────────────────────────────────

async function callLovable(options: AICompletionOptions): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const model = options.lovableModel ?? "google/gemini-2.5-flash";

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 1200,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Lovable AI ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Lovable AI returned empty content");
  return content;
}

async function callAnthropic(options: AICompletionOptions): Promise<string> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");

  const model = options.anthropicModel ?? "claude-haiku-4-5-20251001";

  // Anthropic separates system from messages
  const systemMsg = options.messages.find((m) => m.role === "system");
  const chatMsgs = options.messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model,
    max_tokens: options.maxTokens ?? 1200,
    messages: chatMsgs,
  };
  if (systemMsg) body.system = systemMsg.content;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${errBody}`);
  }

  const data = await resp.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error("Anthropic returned empty content");
  return content;
}

async function callOpenAI(options: AICompletionOptions): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const model = options.openaiModel ?? "gpt-4o-mini";

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 1200,
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`OpenAI ${resp.status}: ${errBody}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return content;
}
