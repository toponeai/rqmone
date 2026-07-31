import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { openai as buildOpenAI } from "@ai-sdk/openai";
import { google as buildGoogle } from "@ai-sdk/google";
import type { AiProvider, AiModel } from "./types";
import { AiError } from "./types";

/**
 * Resolve a language model from provider + model identifiers.
 *
 * Resolution order:
 *  1. provider === "openai" AND OPENAI_API_KEY set → direct OpenAI SDK
 *  2. provider === "google" AND GOOGLE_GENERATIVE_AI_API_KEY set → direct Google SDK
 *  3. All others → Lovable AI Gateway (OpenAI-compatible, supports Gemini / GPT / Claude)
 */
export function getModel(provider: AiProvider, model: AiModel) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (provider === "openai" && openaiKey) {
    const client = buildOpenAI({ apiKey: openaiKey });
    const modelId = model.startsWith("openai/") ? model.slice("openai/".length) : model;
    return client(modelId);
  }

  if (provider === "google" && googleKey) {
    const client = buildGoogle({ apiKey: googleKey });
    const modelId = model.startsWith("google/") ? model.slice("google/".length) : model;
    return client(modelId);
  }

  // Default: Lovable AI Gateway (always available; supports all provider prefixes)
  if (!lovableKey) {
    throw new AiError(
      "PROVIDER",
      "LOVABLE_API_KEY is not configured. Add it to your environment variables.",
      500,
    );
  }

  const gateway = createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": lovableKey },
  });

  return gateway(model);
}

export const DEFAULT_MODEL: AiModel = "google/gemini-2.5-flash";
export const DEFAULT_PROVIDER: AiProvider = "lovable-gateway";
