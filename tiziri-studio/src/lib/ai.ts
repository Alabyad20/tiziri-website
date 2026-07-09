import { useSettings } from "@/stores/settings";

/**
 * Thin client for the Anthropic Messages API, called directly from the
 * browser with the key the user stored in Settings. The
 * `anthropic-dangerous-direct-browser-access` header opts into CORS —
 * acceptable here because this is a local, single-user tool and the key
 * never leaves the machine except to call the API itself.
 */

const MODEL = "claude-opus-4-8";
const API_URL = "https://api.anthropic.com/v1/messages";

export class AiError extends Error {
  constructor(
    message: string,
    public readonly kind: "no-key" | "auth" | "rate-limit" | "api" | "network" | "refusal",
  ) {
    super(message);
  }
}

export function hasApiKey(): boolean {
  return useSettings.getState().apiKey.trim().length > 0;
}

interface GenerateOptions {
  system: string;
  /** User turn — plain text prompt. */
  prompt: string;
  /** Optional image (data URL); sent as a vision block before the text. */
  imageDataUrl?: string;
  /** JSON schema — when set, the response is constrained to valid JSON. */
  schema?: Record<string, unknown>;
  maxTokens?: number;
}

function dataUrlToImageBlock(dataUrl: string) {
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new AiError("Unsupported image format", "api");
  return {
    type: "image",
    source: { type: "base64", media_type: match[1], data: match[2] },
  };
}

export async function generate(opts: GenerateOptions): Promise<string> {
  const apiKey = useSettings.getState().apiKey.trim();
  if (!apiKey) {
    throw new AiError("Add your Anthropic API key in Settings to generate", "no-key");
  }

  const content: unknown[] = [];
  if (opts.imageDataUrl) content.push(dataUrlToImageBlock(opts.imageDataUrl));
  content.push({ type: "text", text: opts.prompt });

  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    system: opts.system,
    messages: [{ role: "user", content }],
  };
  if (opts.schema) {
    body.output_config = { format: { type: "json_schema", schema: opts.schema } };
  }

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AiError("Couldn't reach the Anthropic API — check your connection", "network");
  }

  if (!res.ok) {
    if (res.status === 401) throw new AiError("API key was rejected — check it in Settings", "auth");
    if (res.status === 429) throw new AiError("Rate limited — wait a moment and try again", "rate-limit");
    const detail = await res.text().catch(() => "");
    throw new AiError(`Generation failed (${res.status}) ${detail.slice(0, 200)}`, "api");
  }

  const data = (await res.json()) as {
    stop_reason: string;
    content: Array<{ type: string; text?: string }>;
  };

  if (data.stop_reason === "refusal") {
    throw new AiError("The model declined this request", "refusal");
  }

  const text = data.content.find((b) => b.type === "text")?.text;
  if (!text) throw new AiError("The model returned no text", "api");
  return text;
}

/** Generate + parse a schema-constrained JSON response. */
export async function generateJson<T>(opts: GenerateOptions & { schema: Record<string, unknown> }): Promise<T> {
  const text = await generate(opts);
  return JSON.parse(text) as T;
}

export function brandSystemPrompt(role: string): string {
  const s = useSettings.getState();
  return [
    `You are the in-house copywriter for ${s.brandName} (${s.websiteUrl}), a direct-from-Morocco rug brand selling authentic Beni Ourain, Boujaad, Mrirt, Azilal, kilim and contemporary Moroccan rugs, hand-woven by Amazigh women in the Atlas Mountains.`,
    `Voice: ${s.brandVoice}`,
    `Use accurate weaving terminology (hand-knotted pile, flat-woven, virgin wool, cotton warp, natural dyes, lozenge/diamond motifs). Never invent provenance, age, or materials beyond what you are given. Never use exclamation marks, emoji, or the words "stunning", "gorgeous", "must-have".`,
    role,
  ].join("\n\n");
}
